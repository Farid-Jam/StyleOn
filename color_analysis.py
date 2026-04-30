import os
import urllib.request

import cv2
import mediapipe as mp
import numpy as np
from sklearn.cluster import KMeans

# ── MODEL BOOTSTRAP ──────────────────────────────────────────────────────────
_MODEL_PATH = os.path.join(os.path.dirname(__file__), "face_landmarker.task")
_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/"
    "face_landmarker/face_landmarker/float16/latest/face_landmarker.task"
)


def _ensure_model() -> None:
    if not os.path.exists(_MODEL_PATH):
        print("Downloading FaceLandmarker model (~3.6 MB)…")
        urllib.request.urlretrieve(_MODEL_URL, _MODEL_PATH)


_ensure_model()

_BaseOptions = mp.tasks.BaseOptions
_FaceLandmarker = mp.tasks.vision.FaceLandmarker
_FaceLandmarkerOptions = mp.tasks.vision.FaceLandmarkerOptions
_VisionRunningMode = mp.tasks.vision.RunningMode

_LANDMARKER_OPTIONS = _FaceLandmarkerOptions(
    base_options=_BaseOptions(model_asset_path=_MODEL_PATH),
    running_mode=_VisionRunningMode.IMAGE,
    output_face_blendshapes=False,
    output_facial_transformation_matrixes=False,
    num_faces=1,
)

# Face silhouette — used to exclude background pixels from skin crops
_FACE_OVAL_IDS = [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
    397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
    172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
]

# Iris landmark layout (center + 4 boundary points, same for each eye)
_RIGHT_IRIS_CENTER = 468
_RIGHT_IRIS_BOUNDARY = [469, 470, 471, 472]
_LEFT_IRIS_CENTER = 473
_LEFT_IRIS_BOUNDARY = [474, 475, 476, 477]


# ── PIXEL UTILITIES ───────────────────────────────────────────────────────────

def _crop(img: np.ndarray, y1: int, y2: int, x1: int, x2: int) -> np.ndarray:
    h, w = img.shape[:2]
    return img[max(0, y1):min(h, y2), max(0, x1):min(w, x2)]


def _subsample(pixels: np.ndarray, n: int = 2000) -> np.ndarray:
    if len(pixels) <= n:
        return pixels
    idx = np.random.default_rng(42).choice(len(pixels), n, replace=False)
    return pixels[idx]


def _dominant(pixels: np.ndarray, k: int = 3) -> list[int]:
    pixels = _subsample(pixels)
    if len(pixels) < k:
        return pixels.mean(axis=0).astype(int).tolist() if len(pixels) else [128, 128, 128]
    km = KMeans(n_clusters=k, random_state=42, n_init=10, max_iter=100)
    km.fit(pixels)
    counts = np.bincount(km.labels_)
    return km.cluster_centers_[counts.argmax()].astype(int).tolist()


def _dominant_median_cluster(pixels: np.ndarray, k: int = 3) -> list[int]:
    """K-means then pick the cluster whose brightness ranks in the middle.
    For eyes: avoids the darkest cluster (residual pupil/lashes) and the
    brightest (residual specular reflection), leaving the actual iris color."""
    pixels = _subsample(pixels)
    if len(pixels) < k:
        return pixels.mean(axis=0).astype(int).tolist() if len(pixels) else [128, 128, 128]
    km = KMeans(n_clusters=k, random_state=42, n_init=10, max_iter=100)
    km.fit(pixels)
    centers = km.cluster_centers_  # shape (k, 3) in RGB
    # Sort clusters by mean brightness (R+G+B)
    brightness = centers.sum(axis=1)
    sorted_idx = np.argsort(brightness)
    # Pick the median-brightness cluster
    median_idx = sorted_idx[len(sorted_idx) // 2]
    return centers[median_idx].astype(int).tolist()


def _rgb_to_hex(rgb: list[int]) -> str:
    return "#{:02X}{:02X}{:02X}".format(int(rgb[0]), int(rgb[1]), int(rgb[2]))


# ── IMPROVEMENT 1: FACE OVAL MASK ─────────────────────────────────────────────
# Prevents background from bleeding into skin crops on non-rectangular faces.

def _face_oval_mask(lms, h: int, w: int) -> np.ndarray:
    pts = np.array(
        [[int(lms[i].x * w), int(lms[i].y * h)] for i in _FACE_OVAL_IDS],
        dtype=np.int32,
    )
    mask = np.zeros((h, w), dtype=np.uint8)
    cv2.fillPoly(mask, [pts], 255)
    return mask


# ── IMPROVEMENT 2: YCRCB SKIN FILTER ─────────────────────────────────────────
# Removes hair, eyebrows, beard, eyelid pixels from skin sample regions.
# Range is intentionally wide to cover diverse skin tones.

def _skin_ycrcb_mask(bgr_roi: np.ndarray) -> np.ndarray:
    ycrcb = cv2.cvtColor(bgr_roi, cv2.COLOR_BGR2YCrCb)
    return cv2.inRange(ycrcb, np.array([0, 130, 75]), np.array([255, 178, 132]))


# ── IMPROVEMENT 3: HIGHLIGHT REMOVAL ─────────────────────────────────────────
# Discards blown-out specular highlights before computing mean LAB values.
# Threshold 215 in OpenCV LAB ≈ L* 84 in CIE LAB.

def _remove_highlights(pixels_lab: np.ndarray, thresh: int = 215) -> np.ndarray:
    return pixels_lab[pixels_lab[:, 0] < thresh]


# ── IMPROVEMENT 4: IRIS ANNULAR MASK + HSV FILTERING ─────────────────────────
# Three sources of error in the old approach:
#   1. Fixed 35% pupil exclusion — too small under bright light
#   2. Limbal ring (dark border at 90-100% of iris radius) drags color dark
#   3. Specular highlights and sclera bleed-in skew the hue
# Fix: sample only the 30–88% annular zone, then filter by HSV to remove
# remaining pupil pixels, sclera, and reflections before running k-means.

def _iris_pixels(
    image_rgb: np.ndarray,
    lms,
    center_id: int,
    boundary_ids: list[int],
    w: int,
    h: int,
) -> np.ndarray:
    if max(center_id, max(boundary_ids)) >= len(lms):
        return np.array([])

    cx = int(lms[center_id].x * w)
    cy = int(lms[center_id].y * h)
    radii = [
        np.hypot(int(lms[b].x * w) - cx, int(lms[b].y * h) - cy)
        for b in boundary_ids
    ]
    iris_r = max(4, int(np.mean(radii)))

    # Capture 1.5× the iris radius so the annular math has clean boundaries
    cap_r = int(iris_r * 1.5) + 2
    x1 = max(0, cx - cap_r); x2 = min(w, cx + cap_r)
    y1 = max(0, cy - cap_r); y2 = min(h, cy + cap_r)
    roi_rgb = image_rgb[y1:y2, x1:x2]
    roi_h, roi_w = roi_rgb.shape[:2]
    if roi_h < 4 or roi_w < 4:
        return np.array([])

    cx_l, cy_l = cx - x1, cy - y1
    Y, X = np.ogrid[:roi_h, :roi_w]
    d2 = (X - cx_l) ** 2 + (Y - cy_l) ** 2

    # Annular zone: skip pupil (inner 45%) AND limbal ring (outer 12%).
    # 45% is necessary because pupils dilate to 40-50% of iris radius in typical
    # indoor lighting — 30% (old value) left too many pupil pixels in the sample.
    inner_r2 = max(1, int(iris_r * 0.45)) ** 2
    outer_r2 = max(4, int(iris_r * 0.88)) ** 2
    ring_mask = (d2 >= inner_r2) & (d2 <= outer_r2)

    # Absolute HSV filter — remove obvious pupil, sclera, and specular highlights
    roi_hsv = cv2.cvtColor(roi_rgb, cv2.COLOR_RGB2HSV)
    V = roi_hsv[:, :, 2]
    S = roi_hsv[:, :, 1]
    is_pupil    = V < 60                   # raised from 35 — catches dilated pupils
    is_sclera   = (S < 20) & (V > 180)    # bright + desaturated → white of eye
    is_specular = (S < 12) & (V > 210)    # blown-out reflection

    valid = ring_mask & ~is_pupil & ~is_sclera & ~is_specular
    pixels = roi_rgb[valid]

    # Adaptive filter: remove pixels darker than half the median brightness of
    # the ring. This catches any remaining pupil leakage regardless of eye color.
    if len(pixels) >= 10:
        v_vals = roi_hsv[:, :, 2][valid]
        adaptive_thresh = max(40, int(np.median(v_vals) * 0.50))
        keep = v_vals > adaptive_thresh
        filtered = pixels[keep]
        if len(filtered) >= 10:
            pixels = filtered

    # Final fallback: if all filtering removed everything (very dark brown eyes
    # where iris ≈ pupil in brightness), use the raw annular ring
    if len(pixels) < 10:
        pixels = roi_rgb[ring_mask]

    return pixels


# ── IMPROVEMENT 5: GRABCUT HAIR SEGMENTATION ─────────────────────────────────
# Uses GrabCut to separate hair from background above the forehead.
# Falls back to raw rectangle if GrabCut yields too few pixels.

def _hair_grabcut(
    image_bgr: np.ndarray,
    fy_min: int,
    fh: int,
    fw: int,
    fcx: int,
    w: int,
    h: int,
) -> tuple[np.ndarray, tuple]:
    # Grab a wide region so GrabCut has background context on the edges
    gy1 = max(0, fy_min - int(fh * 0.55))
    gy2 = max(gy1 + 20, fy_min - int(fh * 0.02))
    gx1 = max(0, fcx - int(fw * 0.65))
    gx2 = min(w, fcx + int(fw * 0.65))
    bounds = (gy1, gy2, gx1, gx2)

    roi = image_bgr[gy1:gy2, gx1:gx2]
    rh, rw = roi.shape[:2]
    if rh < 20 or rw < 20:
        return np.array([]), bounds

    # Inner rect = probable hair foreground; border rows/cols = background
    border = max(5, min(rh, rw) // 6)
    inner_w = rw - 2 * border
    inner_h = rh - 2 * border
    if inner_w <= 0 or inner_h <= 0:
        return np.array([]), bounds

    rect = (border, border, inner_w, inner_h)
    mask = np.zeros((rh, rw), dtype=np.uint8)
    bgd = np.zeros((1, 65), np.float64)
    fgd = np.zeros((1, 65), np.float64)

    try:
        cv2.grabCut(roi, mask, rect, bgd, fgd, 5, cv2.GC_INIT_WITH_RECT)
        fg = np.isin(mask, [cv2.GC_FGD, cv2.GC_PR_FGD])
        pixels = cv2.cvtColor(roi, cv2.COLOR_BGR2RGB)[fg]
        if len(pixels) >= 80:
            return pixels, bounds
    except cv2.error:
        pass

    return np.array([]), bounds


# ── CLASSIFIERS ────────────────────────────────────────────────────────────────

def _classify_eye_color(rgb: list[int]) -> str:
    r, g, b = int(rgb[0]), int(rgb[1]), int(rgb[2])
    bgr = np.uint8([[[b, g, r]]])
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)[0][0]
    h, s, v = int(hsv[0]), int(hsv[1]), int(hsv[2])

    # Very dark — covers dark brown and black irises
    if v < 65:
        return "dark brown / black"

    # Low saturation — gray family
    if s < 30:
        if v > 160: return "light gray"
        return "gray"

    # Medium saturation + dark value = brown or hazel
    if s < 70 and v < 110:
        return "dark brown"

    # Hue-based for saturated or lighter irises
    if h < 18 or h > 163:
        return "hazel" if s < 90 else "brown"
    if 18 <= h < 33:
        return "amber / hazel"
    if 33 <= h < 85:
        return "green" if s > 70 else "hazel / green"
    if 85 <= h < 135:
        return "blue" if s > 55 else "blue-gray"
    if 135 <= h <= 163:
        return "blue-gray"

    return "brown"


def _classify_hair_color(rgb: list[int]) -> str:
    r, g, b = int(rgb[0]), int(rgb[1]), int(rgb[2])
    brightness = (r + g + b) / 3
    redness = r - (g + b) / 2
    if brightness < 35:
        return "black"
    if brightness < 75:
        return "dark brown"
    if brightness < 115:
        return "auburn / chestnut" if redness > 20 else "medium brown"
    if brightness < 155:
        return "copper / red-brown" if redness > 25 else "light brown / dirty blonde"
    if brightness < 195:
        return "strawberry blonde" if redness > 30 else "dark blonde"
    return "blonde / light"


def _classify_skin_depth(L: float) -> str:
    if L > 210: return "very fair / light"
    if L > 175: return "fair / light"
    if L > 140: return "medium-light"
    if L > 105: return "medium"
    if L > 70:  return "medium-dark"
    if L > 35:  return "dark"
    return "very dark / deep"


# ── MAIN ENTRY ────────────────────────────────────────────────────────────────

def analyze_image(image_bytes: bytes) -> dict:
    nparr = np.frombuffer(image_bytes, np.uint8)
    image_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image_bgr is None:
        raise ValueError("Could not decode image. Please upload a valid JPEG or PNG.")

    h, w = image_bgr.shape[:2]
    if h < 100 or w < 100:
        raise ValueError("Image too small. Please upload a higher-resolution photo.")

    image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
    image_lab = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2LAB)

    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
    with _FaceLandmarker.create_from_options(_LANDMARKER_OPTIONS) as landmarker:
        result = landmarker.detect(mp_image)

    if not result.face_landmarks:
        raise ValueError("No face detected. Please use a clear, well-lit frontal photo.")

    lms = result.face_landmarks[0]
    all_pts = [(int(lm.x * w), int(lm.y * h)) for lm in lms]
    xs = [p[0] for p in all_pts]
    ys = [p[1] for p in all_pts]

    fx_min, fx_max = min(xs), max(xs)
    fy_min, fy_max = min(ys), max(ys)
    fw = fx_max - fx_min
    fh = fy_max - fy_min
    fcx = (fx_min + fx_max) // 2

    # ── SKIN TONE ──────────────────────────────────────────────────────────
    oval_mask = _face_oval_mask(lms, h, w)

    skin_regions = [
        # (y1, y2, x1, x2) — forehead center, left cheek, right cheek
        (fy_min,           fy_min + fh // 5,       fcx - fw // 5, fcx + fw // 5),
        (fy_min + fh // 3, fy_min + 2 * fh // 3,  fx_min,        fcx - fw // 8),
        (fy_min + fh // 3, fy_min + 2 * fh // 3,  fcx + fw // 8, fx_max),
    ]

    skin_lab_all = []
    skin_rgb_all = []

    for (y1, y2, x1, x2) in skin_regions:
        y1, y2 = max(0, y1), min(h, y2)
        x1, x2 = max(0, x1), min(w, x2)
        if y2 <= y1 or x2 <= x1:
            continue

        # Mask 1: inside face silhouette
        region_oval = oval_mask[y1:y2, x1:x2]
        # Mask 2: YCrCb skin color
        region_skin = _skin_ycrcb_mask(image_bgr[y1:y2, x1:x2])
        # Combined
        combined = cv2.bitwise_and(region_oval, region_skin)

        px_lab = image_lab[y1:y2, x1:x2][combined > 0]
        px_rgb = image_rgb[y1:y2, x1:x2][combined > 0]

        # If the skin filter is too aggressive (unusual pigmentation), fall back
        if len(px_lab) < 30:
            px_lab = image_lab[y1:y2, x1:x2][region_oval > 0]
            px_rgb = image_rgb[y1:y2, x1:x2][region_oval > 0]

        if len(px_lab) < 9:
            continue

        # Remove specular highlights
        px_lab = _remove_highlights(px_lab)
        px_rgb = px_rgb[:len(px_lab)]  # keep in sync after highlight removal

        if len(px_lab) > 0:
            skin_lab_all.append(px_lab)
            skin_rgb_all.append(px_rgb)

    if not skin_lab_all:
        raise ValueError("Could not extract skin region. Try a clearer frontal photo.")

    skin_lab = np.vstack(skin_lab_all)
    skin_rgb = np.vstack(skin_rgb_all)

    mean_L = float(skin_lab[:, 0].mean())
    mean_b = float(skin_lab[:, 2].mean())

    b_offset = mean_b - 128
    if b_offset > 6:
        undertone = "warm"
    elif b_offset < -6:
        undertone = "cool"
    else:
        undertone = "neutral"

    skin_rgb_mean = skin_rgb.mean(axis=0).astype(int).tolist()

    # ── EYE COLOR (annular iris mask) ──────────────────────────────────────
    eye_pixels = []
    for center_id, boundary_ids in [
        (_RIGHT_IRIS_CENTER, _RIGHT_IRIS_BOUNDARY),
        (_LEFT_IRIS_CENTER,  _LEFT_IRIS_BOUNDARY),
    ]:
        px = _iris_pixels(image_rgb, lms, center_id, boundary_ids, w, h)
        if len(px) >= 4:
            eye_pixels.append(px)

    if eye_pixels:
        ep = _subsample(np.vstack(eye_pixels))
        # k=3: separates remaining dark pixels, mid-tone iris, and bright pixels.
        # Pick the cluster with median brightness — avoids the darkest (residual
        # pupil/lashes) and brightest (residual reflection) clusters.
        eye_dominant = _dominant_median_cluster(ep, k=3)
        eye_name = _classify_eye_color(eye_dominant)
    else:
        eye_dominant = [90, 60, 30]
        eye_name = "brown"

    # ── HAIR COLOR (GrabCut → rectangle fallback) ───────────────────────────
    hair_pixels, (hy1, hy2, hx1, hx2) = _hair_grabcut(
        image_bgr, fy_min, fh, fw, fcx, w, h
    )

    if len(hair_pixels) < 80:
        # Fallback: raw rectangle above forehead
        r_y1 = max(0, fy_min - int(fh * 0.35))
        r_y2 = max(0, fy_min - int(fh * 0.02))
        r_x1 = max(0, fcx - int(fw * 0.45))
        r_x2 = min(w, fcx + int(fw * 0.45))
        fallback_roi = _crop(image_rgb, r_y1, r_y2, r_x1, r_x2)
        hair_pixels = fallback_roi.reshape(-1, 3) if fallback_roi.size >= 9 else np.array([])
        hy1, hy2, hx1, hx2 = r_y1, r_y2, r_x1, r_x2

    hair_detected = len(hair_pixels) >= 9
    if hair_detected:
        hair_dominant = _dominant(hair_pixels, k=3)
        hair_name = _classify_hair_color(hair_dominant)
    else:
        hair_dominant = [60, 40, 25]
        hair_name = "not detected"

    # ── CONTRAST ────────────────────────────────────────────────────────────
    if hair_detected and hy2 > hy1 and hx2 > hx1:
        hair_lab_roi = _crop(image_bgr, hy1, hy2, hx1, hx2)
        hair_L = float(cv2.cvtColor(hair_lab_roi, cv2.COLOR_BGR2LAB)[:, :, 0].mean())
    else:
        hair_L = 50.0

    diff = abs(mean_L - hair_L)
    contrast = "low" if diff < 45 else ("medium" if diff < 90 else "high")

    return {
        "skin_undertone": undertone,
        "skin_depth": _classify_skin_depth(mean_L),
        "skin_tone_hex": _rgb_to_hex(skin_rgb_mean),
        "contrast": contrast,
        "eye_color": eye_name,
        "eye_color_hex": _rgb_to_hex(eye_dominant),
        "hair_color": hair_name,
        "hair_color_hex": _rgb_to_hex(hair_dominant) if hair_detected else None,
    }
