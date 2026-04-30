'use client';

import { useCallback, useRef, useState } from 'react';
import type { FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import { Sparkles } from 'lucide-react';
import FaceCamera from './FaceCamera';
import ResultsDashboard from './ResultsDashboard';
import { extractColors, rgbToHex, type RGB } from '../lib/colorExtraction';
import type { AnalysisResult } from '../lib/types';

interface DisplayColors {
  skin: string;
  eye: string;
  hair: string;
}

// EMA smoothing factor — lower = smoother but laggier
const ALPHA = 0.12;
// Only push a React state update every N frames to avoid 60fps re-renders
const FRAME_SKIP = 6;

function ema(prev: RGB, next: RGB): RGB {
  return {
    r: prev.r + ALPHA * (next.r - prev.r),
    g: prev.g + ALPHA * (next.g - prev.g),
    b: prev.b + ALPHA * (next.b - prev.b),
  };
}

function ColorSwatch({ label, hex }: { label: string; hex: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="w-16 h-16 rounded-2xl shadow-xl ring-1 ring-white/10"
        style={{
          backgroundColor: hex,
          transition: 'background-color 0.4s ease',
        }}
      />
      <span className="text-[10px] uppercase tracking-widest text-white/40">
        {label}
      </span>
      <span className="text-xs font-mono text-white/70">{hex}</span>
    </div>
  );
}

export default function AnalyzerView() {
  const [colors, setColors] = useState<DisplayColors | null>(null);
  const [paused, setPaused] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [frozenColors, setFrozenColors] = useState<DisplayColors | null>(null);

  const smoothRef = useRef<{ skin: RGB; eye: RGB; hair: RGB } | null>(null);
  const frameRef = useRef(0);
  // Ref so the async analyzeColors always reads the latest colors
  // without needing to be in a stale closure
  const latestColorsRef = useRef<DisplayColors | null>(null);

  const handleLandmarks = useCallback(
    (result: FaceLandmarkerResult, offscreen: HTMLCanvasElement) => {
      const raw = extractColors(result, offscreen);
      if (!raw) return;

      // Apply exponential moving average to prevent jitter
      smoothRef.current = smoothRef.current
        ? {
            skin: ema(smoothRef.current.skin, raw.skin),
            eye: ema(smoothRef.current.eye, raw.eye),
            hair: ema(smoothRef.current.hair, raw.hair),
          }
        : raw;

      // Throttle React state updates to ~10fps
      if (++frameRef.current % FRAME_SKIP === 0) {
        const s = smoothRef.current;
        const next = {
          skin: rgbToHex(s.skin),
          eye: rgbToHex(s.eye),
          hair: rgbToHex(s.hair),
        };
        latestColorsRef.current = next;
        setColors(next);
      }
    },
    []
  );

  async function analyzeColors() {
    const snap = latestColorsRef.current;
    if (!snap) return;

    setPaused(true);
    setFrozenColors(snap);
    setResult(null);
    setError(null);
    setAnalyzing(true);

    try {
      const res = await fetch('/api/analyze-color', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skin_hex: snap.skin,
          eye_hex: snap.eye,
          hair_hex: snap.hair,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? 'Analysis failed');
      }

      const data: AnalysisResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setAnalyzing(false);
    }
  }

  function handleReanalyze() {
    setPaused(false);
    setResult(null);
    setError(null);
    setFrozenColors(null);
  }

  const showDashboard = analyzing || !!result || !!error;

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-5">
      <FaceCamera onLandmarks={handleLandmarks} paused={paused} />

      {/* Live color readout */}
      <div className="bg-neutral-900/80 backdrop-blur rounded-2xl px-8 py-6 flex items-center justify-around min-h-[120px] ring-1 ring-white/5">
        {colors ? (
          <>
            <ColorSwatch label="Skin" hex={frozenColors?.skin ?? colors.skin} />
            <div className="w-px h-10 bg-white/10" />
            <ColorSwatch label="Eyes" hex={frozenColors?.eye ?? colors.eye} />
            <div className="w-px h-10 bg-white/10" />
            <ColorSwatch label="Hair" hex={frozenColors?.hair ?? colors.hair} />
          </>
        ) : (
          <p className="text-white/25 text-sm text-center">
            Position your face in the camera to detect colors&hellip;
          </p>
        )}
      </div>

      {/* Analyze button — hidden once dashboard is visible */}
      {!showDashboard && (
        <button
          onClick={analyzeColors}
          disabled={!colors}
          className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 disabled:opacity-30 disabled:cursor-not-allowed text-black font-semibold text-sm tracking-wide transition-all duration-200 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-400/30 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          Analyze My Colors
        </button>
      )}

      {/* Results dashboard */}
      {showDashboard && (
        <ResultsDashboard
          result={result}
          loading={analyzing}
          error={error}
          frozenColors={frozenColors}
          onReanalyze={handleReanalyze}
        />
      )}
    </div>
  );
}
