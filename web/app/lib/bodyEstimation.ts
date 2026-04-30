import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { BodyMetrics } from './styleon';

const landmarkerReady = (async () => {
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
  );
  return PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
      delegate: 'GPU',
    },
    runningMode: 'IMAGE',
    numPoses: 1,
  });
})();

const LM = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;

interface Pt {
  x: number;
  y: number;
}

const dist = (a: Pt, b: Pt) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
const midpoint = (a: Pt, b: Pt) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function estimateBody(imageDataUrl: string): Promise<BodyMetrics | null> {
  const landmarker = await landmarkerReady;
  const img = await loadImage(imageDataUrl);

  const result = landmarker.detect(img);
  const landmarks = result?.landmarks?.[0];
  if (!landmarks || landmarks.length < 33) return null;

  const lShoulder = landmarks[LM.LEFT_SHOULDER];
  const rShoulder = landmarks[LM.RIGHT_SHOULDER];
  const lHip = landmarks[LM.LEFT_HIP];
  const rHip = landmarks[LM.RIGHT_HIP];
  const lAnkle = landmarks[LM.LEFT_ANKLE];
  const rAnkle = landmarks[LM.RIGHT_ANKLE];

  const shoulderWidth = dist(lShoulder, rShoulder);
  const hipWidth = dist(lHip, rHip);
  const midShoulder = midpoint(lShoulder, rShoulder);
  const midHip = midpoint(lHip, rHip);
  const torsoLength = dist(midShoulder, midHip);
  const midAnkle = midpoint(lAnkle, rAnkle);
  const bodyHeight = dist(midShoulder, midAnkle);

  if (bodyHeight < 0.01) return null;

  const shoulderToHeight = shoulderWidth / bodyHeight;
  const hipToHeight = hipWidth / bodyHeight;
  const torsoToHeight = torsoLength / bodyHeight;
  const shoulderToHip = shoulderWidth / hipWidth;

  let build: string;
  if (shoulderToHeight > 0.32) build = 'broad/large';
  else if (shoulderToHeight > 0.26) build = 'athletic/average';
  else build = 'slim/narrow';

  return {
    shoulderWidth: shoulderToHeight.toFixed(3),
    hipWidth: hipToHeight.toFixed(3),
    torsoLength: torsoToHeight.toFixed(3),
    shoulderToHipRatio: shoulderToHip.toFixed(3),
    build,
  };
}
