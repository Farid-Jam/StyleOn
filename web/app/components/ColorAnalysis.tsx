'use client';

import { useCallback, useRef, useState } from 'react';
import type { FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import { ArrowUpRight, RefreshCw, X } from 'lucide-react';
import FaceCamera from './FaceCamera';
import { extractColors, rgbToHex, type RGB } from '../lib/colorExtraction';
import type { AnalysisResult } from '../lib/types';

interface DisplayColors { skin: string; eye: string; hair: string }

const ALPHA = 0.12;
const FRAME_SKIP = 6;

function ema(prev: RGB, next: RGB): RGB {
  return {
    r: prev.r + ALPHA * (next.r - prev.r),
    g: prev.g + ALPHA * (next.g - prev.g),
    b: prev.b + ALPHA * (next.b - prev.b),
  };
}

function LiveSwatch({ label, hex }: { label: string; hex: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="w-14 h-14"
        style={{
          backgroundColor: hex,
          borderRadius: '2px',
          boxShadow: '0 2px 12px rgba(107,112,92,0.18)',
          border: '1px solid rgba(107,112,92,0.18)',
          transition: 'background-color 0.4s ease',
        }}
      />
      <span
        className="text-[10px] uppercase"
        style={{ color: '#a5a58d', letterSpacing: '0.2em' }}
      >
        {label}
      </span>
      <span
        className="text-[11px] font-mono"
        style={{ color: '#6b705c' }}
      >
        {hex}
      </span>
    </div>
  );
}

function ResultSwatch({ hex, index, avoid = false }: { hex: string; index: number; avoid?: boolean }) {
  return (
    <div
      className="flex flex-col items-center gap-2 animate-pop-in"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="relative group">
        <div
          className="w-14 h-14 transition-transform duration-200 group-hover:scale-110"
          style={{
            backgroundColor: hex,
            borderRadius: '2px',
            boxShadow: '0 2px 12px rgba(107,112,92,0.18)',
            border: '1px solid rgba(107,112,92,0.18)',
          }}
        />
        {avoid && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(107,112,92,0.55)', borderRadius: '2px' }}
          >
            <X className="w-5 h-5" style={{ color: '#ffe8d6' }} strokeWidth={2.5} />
          </div>
        )}
      </div>
      <span className="text-[10px] font-mono" style={{ color: '#a5a58d' }}>{hex}</span>
    </div>
  );
}

function SwatchSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-14 h-14 skeleton" style={{ borderRadius: '2px' }} />
      <div className="h-2 w-12 skeleton" style={{ borderRadius: '2px' }} />
    </div>
  );
}

function SkeletonBlock({ w, h = 'h-3' }: { w: string; h?: string }) {
  return <div className={`${h} ${w} skeleton`} style={{ borderRadius: '2px' }} />;
}

function Tag({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex flex-col items-center gap-1 px-5 py-3 min-w-[96px]"
      style={{
        backgroundColor: 'rgba(255, 232, 214, 0.6)',
        border: '1px solid rgba(107,112,92,0.18)',
        borderRadius: '2px',
      }}
    >
      <span
        className="text-[9px] uppercase"
        style={{ color: '#a5a58d', letterSpacing: '0.2em' }}
      >
        {label}
      </span>
      <span
        className="text-sm"
        style={{ color: '#6b705c', fontFamily: "'Georgia', serif", fontWeight: 500 }}
      >
        {value}
      </span>
    </div>
  );
}

function SwatchRow({
  label,
  hexes,
  avoid = false,
  skeletonCount,
  loading,
  indexOffset = 0,
}: {
  label: string;
  hexes?: string[];
  avoid?: boolean;
  skeletonCount: number;
  loading: boolean;
  indexOffset?: number;
}) {
  return (
    <div>
      <p
        className="text-[10px] uppercase mb-4"
        style={{ color: '#cb997e', letterSpacing: '0.25em' }}
      >
        {label}
      </p>
      <div className="flex items-start gap-4 flex-wrap">
        {loading
          ? Array.from({ length: skeletonCount }).map((_, i) => <SwatchSkeleton key={i} />)
          : hexes?.map((hex, i) => (
              <ResultSwatch key={hex} hex={hex} index={indexOffset + i} avoid={avoid} />
            ))}
      </div>
    </div>
  );
}

function seasonAccent(season: string): string {
  const s = season.toLowerCase();
  if (s.includes('spring')) return '#cb997e';
  if (s.includes('summer')) return '#ddbea9';
  if (s.includes('autumn')) return '#a5a58d';
  if (s.includes('winter')) return '#6b705c';
  return '#a5a58d';
}

export default function ColorAnalysis() {
  const [colors, setColors] = useState<DisplayColors | null>(null);
  const [paused, setPaused] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [frozenColors, setFrozenColors] = useState<DisplayColors | null>(null);

  const smoothRef = useRef<{ skin: RGB; eye: RGB; hair: RGB } | null>(null);
  const frameRef = useRef(0);
  const latestColorsRef = useRef<DisplayColors | null>(null);

  const handleLandmarks = useCallback(
    (res: FaceLandmarkerResult, offscreen: HTMLCanvasElement) => {
      const raw = extractColors(res, offscreen);
      if (!raw) return;

      smoothRef.current = smoothRef.current
        ? {
            skin: ema(smoothRef.current.skin, raw.skin),
            eye: ema(smoothRef.current.eye, raw.eye),
            hair: ema(smoothRef.current.hair, raw.hair),
          }
        : raw;

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
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-8">
      {/* Camera card */}
      <div
        className="relative overflow-hidden"
        style={{
          borderRadius: '4px',
          border: '1px solid rgba(107,112,92,0.18)',
          boxShadow: '0 12px 40px rgba(107,112,92,0.18)',
          backgroundColor: '#0a0a0a',
        }}
      >
        <FaceCamera onLandmarks={handleLandmarks} paused={paused} />
      </div>

      {/* Live color readout */}
      <div
        className="px-8 py-6 flex items-center justify-around min-h-[140px]"
        style={{
          backgroundColor: 'rgba(255,232,214,0.7)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(107,112,92,0.18)',
          borderRadius: '4px',
        }}
      >
        {colors ? (
          <>
            <LiveSwatch label="Skin" hex={frozenColors?.skin ?? colors.skin} />
            <div className="w-px h-12" style={{ backgroundColor: 'rgba(107,112,92,0.18)' }} />
            <LiveSwatch label="Eyes" hex={frozenColors?.eye ?? colors.eye} />
            <div className="w-px h-12" style={{ backgroundColor: 'rgba(107,112,92,0.18)' }} />
            <LiveSwatch label="Hair" hex={frozenColors?.hair ?? colors.hair} />
          </>
        ) : (
          <p
            className="text-sm text-center"
            style={{ color: '#a5a58d', letterSpacing: '0.05em' }}
          >
            Position your face in the camera to detect your natural palette&hellip;
          </p>
        )}
      </div>

      {/* Analyze button */}
      {!showDashboard && (
        <button
          onClick={analyzeColors}
          disabled={!colors}
          className="flex items-center justify-center gap-2 w-full py-5 text-xs uppercase transition-all duration-300"
          style={{
            backgroundColor: colors ? '#6b705c' : '#b7b7a4',
            color: '#ffe8d6',
            borderRadius: '2px',
            letterSpacing: '0.25em',
            cursor: colors ? 'pointer' : 'not-allowed',
            opacity: colors ? 1 : 0.7,
            border: 'none',
          }}
          onMouseEnter={(e) => {
            if (colors) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#cb997e';
          }}
          onMouseLeave={(e) => {
            if (colors) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#6b705c';
          }}
        >
          Analyze My Colors
          <ArrowUpRight size={14} />
        </button>
      )}

      {/* Results dashboard */}
      {showDashboard && (
        <div
          className="animate-fade-up overflow-hidden"
          style={{
            backgroundColor: 'rgba(255,232,214,0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(107,112,92,0.18)',
            borderRadius: '4px',
          }}
        >
          {/* Analyzed palette bar */}
          {frozenColors && (
            <div
              className="flex items-center gap-3 px-6 py-4"
              style={{ borderBottom: '1px solid rgba(107,112,92,0.12)' }}
            >
              <span
                className="text-[10px] uppercase"
                style={{ color: '#a5a58d', letterSpacing: '0.25em' }}
              >
                Analyzed Palette
              </span>
              <div className="flex items-center gap-3 ml-auto">
                {[
                  { label: 'Skin', hex: frozenColors.skin },
                  { label: 'Eyes', hex: frozenColors.eye },
                  { label: 'Hair', hex: frozenColors.hair },
                ].map(({ label, hex }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div
                      className="w-4 h-4"
                      style={{
                        backgroundColor: hex,
                        borderRadius: '50%',
                        border: '1px solid rgba(107,112,92,0.25)',
                      }}
                    />
                    <span className="text-[10px] font-mono" style={{ color: '#6b705c' }}>{hex}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-7 md:p-9 flex flex-col gap-8">
            {/* Season + description */}
            {analyzing ? (
              <div className="flex flex-col gap-3">
                <SkeletonBlock w="w-56" h="h-7" />
                <SkeletonBlock w="w-full" h="h-3" />
                <SkeletonBlock w="w-5/6" h="h-3" />
                <SkeletonBlock w="w-3/4" h="h-3" />
              </div>
            ) : error ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm" style={{ color: '#cb997e', fontWeight: 500, letterSpacing: '0.05em' }}>
                  Analysis failed
                </p>
                <p className="text-sm" style={{ color: '#a5a58d' }}>{error}</p>
              </div>
            ) : result ? (
              <div className="flex flex-col gap-4 animate-fade-up">
                <span
                  className="block text-[10px] uppercase"
                  style={{ color: '#cb997e', letterSpacing: '0.3em' }}
                >
                  Your Season
                </span>
                <div className="flex items-baseline gap-4 flex-wrap">
                  <h2
                    className="font-light"
                    style={{
                      fontSize: 'clamp(2rem, 4vw, 3rem)',
                      color: '#6b705c',
                      fontFamily: "'Georgia', serif",
                      lineHeight: 1.05,
                    }}
                  >
                    <em style={{ color: seasonAccent(result.season), fontStyle: 'italic' }}>
                      {result.season}
                    </em>
                  </h2>
                </div>
                <div
                  style={{
                    height: '1px',
                    width: '60px',
                    backgroundColor: '#cb997e',
                  }}
                />
                <p
                  className="text-sm max-w-2xl"
                  style={{ color: '#6b705c', lineHeight: '1.8', opacity: 0.85 }}
                >
                  {result.description}
                </p>
              </div>
            ) : null}

            {/* Tags */}
            <div className="flex items-center gap-3 flex-wrap">
              {analyzing ? (
                <>
                  <div className="h-16 w-28 skeleton" style={{ borderRadius: '2px' }} />
                  <div className="h-16 w-28 skeleton" style={{ borderRadius: '2px' }} />
                  <div className="h-16 w-28 skeleton" style={{ borderRadius: '2px' }} />
                </>
              ) : result ? (
                <>
                  <Tag label="Undertone" value={result.undertone} />
                  <Tag label="Contrast" value={result.contrast} />
                  <Tag label="Metal" value={result.metal} />
                </>
              ) : null}
            </div>

            <SwatchRow
              label="Best Colors"
              hexes={result?.best_colors}
              skeletonCount={5}
              loading={analyzing}
              indexOffset={0}
            />

            <SwatchRow
              label="Best Hair Colors"
              hexes={result?.best_hair_colors}
              skeletonCount={4}
              loading={analyzing}
              indexOffset={5}
            />

            <SwatchRow
              label="Colors to Avoid"
              hexes={result?.avoid_colors}
              avoid
              skeletonCount={3}
              loading={analyzing}
              indexOffset={9}
            />

            {!analyzing && (
              <button
                onClick={handleReanalyze}
                className="flex items-center justify-center gap-2 w-full py-4 text-xs uppercase transition-all duration-200"
                style={{
                  border: '1px solid #a5a58d',
                  color: '#6b705c',
                  borderRadius: '2px',
                  backgroundColor: 'transparent',
                  letterSpacing: '0.2em',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#cb997e';
                  (e.currentTarget as HTMLButtonElement).style.color = '#cb997e';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#a5a58d';
                  (e.currentTarget as HTMLButtonElement).style.color = '#6b705c';
                }}
              >
                <RefreshCw className="w-4 h-4" />
                Re-analyze
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
