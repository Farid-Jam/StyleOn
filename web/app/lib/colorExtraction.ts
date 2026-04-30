import type { FaceLandmarkerResult } from '@mediapipe/tasks-vision';

export interface RGB { r: number; g: number; b: number }
export interface ColorSample { skin: RGB; eye: RGB; hair: RGB }

export function rgbToHex({ r, g, b }: RGB): string {
  return (
    '#' +
    [r, g, b]
      .map(v =>
        Math.max(0, Math.min(255, Math.round(v)))
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  );
}

/**
 * Average all pixels in a flat RGBA Uint8ClampedArray, excluding
 * extreme darks (shadows) and extreme lights (specular highlights)
 * using a perceptual luminance gate.
 */
function averagePixels(
  data: Uint8ClampedArray,
  minLum = 35,
  maxLum = 218
): RGB | null {
  let r = 0, g = 0, b = 0, count = 0;
  for (let i = 0; i < data.length; i += 4) {
    const pr = data[i], pg = data[i + 1], pb = data[i + 2];
    const lum = 0.299 * pr + 0.587 * pg + 0.114 * pb;
    if (lum < minLum || lum > maxLum) continue;
    r += pr; g += pg; b += pb;
    count++;
  }
  return count > 0 ? { r: r / count, g: g / count, b: b / count } : null;
}

function sampleROI(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  roiW: number,
  roiH: number,
  canvasW: number,
  canvasH: number,
  minLum?: number,
  maxLum?: number
): RGB | null {
  const x = Math.max(0, Math.round(cx - roiW / 2));
  const y = Math.max(0, Math.round(cy - roiH / 2));
  const w = Math.min(roiW, canvasW - x);
  const h = Math.min(roiH, canvasH - y);
  if (w <= 0 || h <= 0) return null;
  const { data } = ctx.getImageData(x, y, w, h);
  return averagePixels(data, minLum, maxLum);
}

export function extractColors(
  result: FaceLandmarkerResult,
  canvas: HTMLCanvasElement
): ColorSample | null {
  if (!result.faceLandmarks.length) return null;

  const lm = result.faceLandmarks[0];
  const W = canvas.width;
  const H = canvas.height;
  if (W === 0 || H === 0) return null;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  // Helpers: landmark index → pixel coordinate
  const lx = (i: number) => lm[i].x * W;
  const ly = (i: number) => lm[i].y * H;

  // Adaptive ROI size: 13% of the inter-cheek face width
  const faceW = Math.abs(lx(234) - lx(454));
  const roi = Math.max(18, faceW * 0.13);

  // ── Skin ────────────────────────────────────────────────────────────────
  // Forehead: midpoint between top (10) and a line between the eyebrows
  const eyebrowMidY = (ly(107) + ly(336)) / 2;
  const foreheadCX = lx(10);
  const foreheadCY = (ly(10) + eyebrowMidY) / 2;

  // Cheeks: landmark 205 (user-left cheek apple) and 425 (user-right cheek apple)
  const skinSamples = [
    sampleROI(ctx, foreheadCX, foreheadCY, roi, roi, W, H),
    sampleROI(ctx, lx(205), ly(205), roi, roi, W, H),
    sampleROI(ctx, lx(425), ly(425), roi, roi, W, H),
  ].filter((s): s is RGB => s !== null);

  if (!skinSamples.length) return null;

  const skin: RGB = {
    r: skinSamples.reduce((s, c) => s + c.r, 0) / skinSamples.length,
    g: skinSamples.reduce((s, c) => s + c.g, 0) / skinSamples.length,
    b: skinSamples.reduce((s, c) => s + c.b, 0) / skinSamples.length,
  };

  // ── Eyes ────────────────────────────────────────────────────────────────
  // Sample each iris individually, then average the two RGB values.
  // Averaging the two iris *positions* first (the previous approach) gave a
  // point on the nose bridge, not inside either eye.
  const eyeSize = roi * 0.55;

  let eyeSamples: RGB[];
  if (lm.length > 473) {
    // 478-point model includes dedicated iris-center landmarks
    eyeSamples = [
      sampleROI(ctx, lx(468), ly(468), eyeSize, eyeSize * 0.6, W, H), // right iris
      sampleROI(ctx, lx(473), ly(473), eyeSize, eyeSize * 0.6, W, H), // left iris
    ].filter((s): s is RGB => s !== null);
  } else {
    // Fallback: approximate each iris center from eye-corner landmarks
    // Right eye: outer corner 33, inner corner 133
    // Left eye:  outer corner 263, inner corner 362
    eyeSamples = [
      sampleROI(ctx, (lx(33) + lx(133)) / 2, (ly(33) + ly(133)) / 2, eyeSize, eyeSize * 0.6, W, H),
      sampleROI(ctx, (lx(263) + lx(362)) / 2, (ly(263) + ly(362)) / 2, eyeSize, eyeSize * 0.6, W, H),
    ].filter((s): s is RGB => s !== null);
  }

  const eyeRaw = eyeSamples.length > 0
    ? {
        r: eyeSamples.reduce((s, c) => s + c.r, 0) / eyeSamples.length,
        g: eyeSamples.reduce((s, c) => s + c.g, 0) / eyeSamples.length,
        b: eyeSamples.reduce((s, c) => s + c.b, 0) / eyeSamples.length,
      }
    : null;
  const eye = eyeRaw ?? skin;

  // ── Hair ────────────────────────────────────────────────────────────────
  // Sample above the topmost face landmark (10) — relaxed luminance ceiling
  // so darker hair isn't discarded by the highlight filter.
  const hairCX = lx(10);
  const hairCY = ly(10) - roi * 1.3;
  const hairRaw = sampleROI(ctx, hairCX, hairCY, roi * 2, roi, W, H, 15, 200);
  const hair = hairRaw ?? { r: 58, g: 48, b: 42 }; // neutral dark-brown fallback

  return { skin, eye, hair };
}
