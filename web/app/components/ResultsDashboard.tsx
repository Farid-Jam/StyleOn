'use client';

import { RefreshCw, X } from 'lucide-react';
import type { AnalysisResult } from '../lib/types';

interface Props {
  result: AnalysisResult | null;
  loading: boolean;
  error: string | null;
  frozenColors: { skin: string; eye: string; hair: string } | null;
  onReanalyze: () => void;
}

function seasonGradient(season: string): string {
  if (season.toLowerCase().includes('spring')) return 'from-amber-400 to-orange-400';
  if (season.toLowerCase().includes('summer')) return 'from-sky-400 to-violet-400';
  if (season.toLowerCase().includes('autumn')) return 'from-orange-500 to-amber-500';
  if (season.toLowerCase().includes('winter')) return 'from-indigo-500 to-violet-500';
  return 'from-neutral-500 to-neutral-400';
}

function Swatch({ hex, index, avoid = false }: { hex: string; index: number; avoid?: boolean }) {
  return (
    <div
      className="flex flex-col items-center gap-2 animate-pop-in"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="relative group cursor-default">
        <div
          className="w-14 h-14 rounded-2xl shadow-xl ring-1 ring-white/10 transition-transform duration-200 group-hover:scale-110"
          style={{ backgroundColor: hex }}
        />
        {avoid && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40">
            <X className="w-5 h-5 text-red-400" strokeWidth={2.5} />
          </div>
        )}
      </div>
      <span className="text-[10px] font-mono text-white/45">{hex}</span>
    </div>
  );
}

function SwatchSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-14 h-14 rounded-2xl skeleton" />
      <div className="h-2 w-12 rounded skeleton" />
    </div>
  );
}

function SkeletonBlock({ w, h = 'h-3' }: { w: string; h?: string }) {
  return <div className={`${h} ${w} rounded-full skeleton`} />;
}

function Tag({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-2.5 rounded-xl bg-white/[0.04] ring-1 ring-white/8 min-w-[80px]">
      <span className="text-[9px] uppercase tracking-widest text-white/30">{label}</span>
      <span className="text-sm font-semibold text-white/90">{value}</span>
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
      <p className="text-[11px] uppercase tracking-widest text-white/30 mb-4">{label}</p>
      <div className="flex items-start gap-4 flex-wrap">
        {loading
          ? Array.from({ length: skeletonCount }).map((_, i) => <SwatchSkeleton key={i} />)
          : hexes?.map((hex, i) => (
              <Swatch key={hex} hex={hex} index={indexOffset + i} avoid={avoid} />
            ))}
      </div>
    </div>
  );
}

export default function ResultsDashboard({ result, loading, error, frozenColors, onReanalyze }: Props) {
  if (!loading && !result && !error) return null;

  return (
    <div className="animate-fade-up bg-neutral-900/90 backdrop-blur-md rounded-2xl ring-1 ring-white/8 overflow-hidden">

      {/* Analyzed palette bar */}
      {frozenColors && (
        <div className="flex items-center gap-3 px-6 py-3 border-b border-white/5 bg-white/[0.02]">
          <span className="text-[10px] uppercase tracking-widest text-white/30">Analyzed palette</span>
          <div className="flex items-center gap-2 ml-auto">
            {[
              { label: 'Skin', hex: frozenColors.skin },
              { label: 'Eyes', hex: frozenColors.eye },
              { label: 'Hair', hex: frozenColors.hair },
            ].map(({ label, hex }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full ring-1 ring-white/15 shadow" style={{ backgroundColor: hex }} />
                <span className="text-[10px] font-mono text-white/40">{hex}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-6 flex flex-col gap-7">

        {/* Season + description */}
        {loading ? (
          <div className="flex flex-col gap-3">
            <SkeletonBlock w="w-48" h="h-7" />
            <SkeletonBlock w="w-full" h="h-3" />
            <SkeletonBlock w="w-5/6" h="h-3" />
            <SkeletonBlock w="w-3/4" h="h-3" />
          </div>
        ) : error ? (
          <div className="flex flex-col gap-2">
            <p className="text-red-400 font-medium">Analysis failed</p>
            <p className="text-white/40 text-sm">{error}</p>
          </div>
        ) : result ? (
          <div className="flex flex-col gap-3 animate-fade-up">
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${seasonGradient(result.season)}`}>
                <span className="text-[10px] opacity-80">✦</span>
                {result.season}
              </span>
            </div>
            <p className="text-white/60 text-sm leading-relaxed">{result.description}</p>
          </div>
        ) : null}

        {/* Undertone / Contrast / Metal tags */}
        <div className="flex items-center gap-3 flex-wrap">
          {loading ? (
            <>
              <div className="h-14 w-24 rounded-xl skeleton" />
              <div className="h-14 w-24 rounded-xl skeleton" />
              <div className="h-14 w-24 rounded-xl skeleton" />
            </>
          ) : result ? (
            <>
              <Tag label="Undertone" value={result.undertone} />
              <Tag label="Contrast" value={result.contrast} />
              <Tag label="Metal" value={result.metal} />
            </>
          ) : null}
        </div>

        {/* Best Colors */}
        <SwatchRow
          label="Best Colors"
          hexes={result?.best_colors}
          skeletonCount={5}
          loading={loading}
          indexOffset={0}
        />

        {/* Best Hair Colors */}
        <SwatchRow
          label="Best Hair Colors"
          hexes={result?.best_hair_colors}
          skeletonCount={4}
          loading={loading}
          indexOffset={5}
        />

        {/* Colors to avoid */}
        <SwatchRow
          label="Colors to Avoid"
          hexes={result?.avoid_colors}
          avoid
          skeletonCount={3}
          loading={loading}
          indexOffset={9}
        />

        {/* Re-analyze */}
        {!loading && (
          <button
            onClick={onReanalyze}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 text-white/60 hover:text-white text-sm font-medium transition-all duration-150 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Re-analyze
          </button>
        )}
      </div>
    </div>
  );
}
