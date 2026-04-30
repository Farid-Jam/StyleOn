'use client';

import { useRef, useEffect, useState } from 'react';
import {
  FaceLandmarker,
  FilesetResolver,
  DrawingUtils,
} from '@mediapipe/tasks-vision';
import type { FaceLandmarkerResult } from '@mediapipe/tasks-vision';

interface FaceCameraProps {
  onLandmarks?: (result: FaceLandmarkerResult, offscreen: HTMLCanvasElement) => void;
  paused?: boolean;
}

const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm`;
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

export default function FaceCamera({ onLandmarks, paused }: FaceCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  // Intermediate canvas sized to video dimensions so DrawingUtils scales correctly
  const drawRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const rafRef = useRef<number>(0);
  // Use refs for callback/paused so the RAF loop never closes over stale values
  const onLandmarksRef = useRef(onLandmarks);
  const pausedRef = useRef(paused);
  const lastTsRef = useRef(-1);
  const maskOpacityRef = useRef(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => { onLandmarksRef.current = onLandmarks; }, [onLandmarks]);

  useEffect(() => {
    pausedRef.current = paused;
    const video = videoRef.current;
    const overlay = overlayRef.current;
    if (!video) return;
    if (paused) {
      video.pause();
      // Clear the mesh instantly and reset opacity so the next appearance fades in
      if (overlay) {
        const ctx = overlay.getContext('2d');
        ctx?.clearRect(0, 0, overlay.width, overlay.height);
      }
      maskOpacityRef.current = 0;
    } else {
      video.play().catch(() => {});
    }
  }, [paused]);

  useEffect(() => {
    let running = true;
    let stream: MediaStream | null = null;

    function loop() {
      if (!running) return;

      const video = videoRef.current;
      const overlay = overlayRef.current;
      const offscreen = offscreenRef.current;
      const landmarker = landmarkerRef.current;

      if (
        !video || !overlay || !offscreen || !landmarker ||
        video.readyState < 2 || pausedRef.current
      ) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const w = video.videoWidth;
      const h = video.videoHeight;
      if (w === 0 || h === 0) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // Off-screen canvas tracks video dimensions for pixel sampling
      if (offscreen.width !== w) offscreen.width = w;
      if (offscreen.height !== h) offscreen.height = h;

      // Capture current frame into off-screen canvas for pixel sampling
      const offCtx = offscreen.getContext('2d', { willReadFrequently: true })!;
      offCtx.drawImage(video, 0, 0, w, h);

      const now = performance.now();
      if (now <= lastTsRef.current) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      lastTsRef.current = now;
      const result = landmarker.detectForVideo(video, now);

      // Size the overlay canvas to its CSS container dimensions so pixels map
      // 1:1 to display pixels and no browser scaling distorts the mesh.
      const cw = overlay.clientWidth || w;
      const ch = overlay.clientHeight || h;
      if (overlay.width !== cw) overlay.width = cw;
      if (overlay.height !== ch) overlay.height = ch;

      const overlayCtx = overlay.getContext('2d')!;
      overlayCtx.clearRect(0, 0, cw, ch);

      if (result.faceLandmarks.length > 0) {
        // DrawingUtils scales normalized landmarks by canvas.width / canvas.height.
        // We need it to scale by the video dimensions (w × h), so we draw onto a
        // temporary canvas of that size, then blit it with the same object-cover
        // transform the browser applies to the <video> element.
        if (!drawRef.current) drawRef.current = document.createElement('canvas');
        const dc = drawRef.current;
        if (dc.width !== w) dc.width = w;
        if (dc.height !== h) dc.height = h;
        const dcCtx = dc.getContext('2d')!;
        dcCtx.clearRect(0, 0, w, h);

        const du = new DrawingUtils(dcCtx);
        for (const landmarks of result.faceLandmarks) {
          du.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, {
            color: 'rgba(255,255,255,0.10)',
            lineWidth: 0.4,
          });
          du.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, {
            color: 'rgba(100,210,255,0.75)',
            lineWidth: 1.5,
          });
          du.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, {
            color: 'rgba(80,190,255,0.9)',
            lineWidth: 1,
          });
          du.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, {
            color: 'rgba(80,190,255,0.9)',
            lineWidth: 1,
          });
          du.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW, {
            color: 'rgba(80,190,255,0.7)',
            lineWidth: 1,
          });
          du.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW, {
            color: 'rgba(80,190,255,0.7)',
            lineWidth: 1,
          });
          du.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LIPS, {
            color: 'rgba(255,150,150,0.6)',
            lineWidth: 1,
          });
        }

        // Replicate CSS object-cover: scale so the video fills the container,
        // then center (cropping the overflow).
        const scale = Math.max(cw / w, ch / h);
        const blit = { w: w * scale, h: h * scale };
        const ox = (cw - blit.w) / 2;
        const oy = (ch - blit.h) / 2;

        // Fade the mask in smoothly on first appearance (~300ms at 60fps)
        maskOpacityRef.current = Math.min(1, maskOpacityRef.current + 0.06);
        overlayCtx.globalAlpha = maskOpacityRef.current;
        overlayCtx.drawImage(dc, ox, oy, blit.w, blit.h);
        overlayCtx.globalAlpha = 1;

        onLandmarksRef.current?.(result, offscreen);
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);

        landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
        });

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
        });

        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();

        offscreenRef.current = document.createElement('canvas');

        if (running) setStatus('ready');
        rafRef.current = requestAnimationFrame(loop);
      } catch (err) {
        console.error('[FaceCamera] init error:', err);
        if (running) setStatus('error');
      }
    }

    init();

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
      stream?.getTracks().forEach(t => t.stop());
      landmarkerRef.current?.close();
    };
  }, []);

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl">
      {/* Loading overlay */}
      {status === 'loading' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-neutral-950 gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-cyan-400 animate-spin" />
          <p className="text-white/40 text-sm tracking-wide">
            Initializing vision engine&hellip;
          </p>
        </div>
      )}

      {/* Error overlay */}
      {status === 'error' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-950">
          <p className="text-red-400 text-sm">Camera access denied or unavailable.</p>
        </div>
      )}

      {/* Live video – mirrored for natural selfie view */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
        playsInline
        muted
      />

      {/* Wireframe overlay – mirrors to match the video */}
      <canvas
        ref={overlayRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ transform: 'scaleX(-1)' }}
      />
    </div>
  );
}
