'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { getProducts, type Product } from '../../lib/styleon';
import {
  ANALYSIS_STORAGE_KEY,
  rankProducts,
  type ScoredProduct,
} from '../../lib/colorMatching';
import type { AnalysisResult } from '../../lib/types';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'no-analysis' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; analysis: AnalysisResult; ranked: ScoredProduct[] };

export default function PersonalizedGallery() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let alive = true;

    let analysis: AnalysisResult | null = null;
    try {
      const raw = sessionStorage.getItem(ANALYSIS_STORAGE_KEY);
      if (raw) analysis = JSON.parse(raw) as AnalysisResult;
    } catch {
      /* ignore */
    }

    if (!analysis) {
      setState({ kind: 'no-analysis' });
      return;
    }

    getProducts(undefined, 1000)
      .then((items) => {
        if (!alive) return;
        const ranked = rankProducts(items, analysis!);
        setState({ kind: 'ready', analysis: analysis!, ranked });
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setState({
          kind: 'error',
          message: e instanceof Error ? e.message : 'Could not load items.',
        });
      });

    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <PalettePageHero state={state} />
      <section
        className="relative px-8 md:px-16 pb-24"
        style={{ backgroundColor: '#ffe8d6' }}
      >
        <div className="max-w-6xl mx-auto">
          {state.kind === 'loading' && (
            <p
              className="text-sm py-20 text-center"
              style={{ color: '#6b705c', opacity: 0.7, letterSpacing: '0.05em' }}
            >
              Curating your palette…
            </p>
          )}

          {state.kind === 'no-analysis' && (
            <div className="py-20 text-center flex flex-col items-center gap-6">
              <p
                className="text-sm"
                style={{ color: '#6b705c', opacity: 0.85, letterSpacing: '0.05em', maxWidth: 480 }}
              >
                Run a color analysis first and we'll personalize this rail to your season.
              </p>
              <Link
                href="/find-style"
                className="inline-flex items-center gap-2 px-6 py-3 text-xs uppercase"
                style={{
                  border: '1px solid #6b705c',
                  color: '#6b705c',
                  borderRadius: '2px',
                  letterSpacing: '0.2em',
                }}
              >
                Start Color Analysis <ArrowUpRight size={14} />
              </Link>
            </div>
          )}

          {state.kind === 'error' && (
            <p
              className="text-sm py-20 text-center"
              style={{ color: '#6b705c', opacity: 0.85, letterSpacing: '0.05em' }}
            >
              {state.message}
            </p>
          )}

          {state.kind === 'ready' && <RankedGrid ranked={state.ranked} />}
        </div>
      </section>
    </>
  );
}

function PalettePageHero({ state }: { state: LoadState }) {
  const analysis = state.kind === 'ready' ? state.analysis : null;
  const matchCount =
    state.kind === 'ready' ? state.ranked.filter((s) => s.score > 0).length : null;

  return (
    <section
      className="relative overflow-hidden"
      style={{ paddingTop: '140px', paddingBottom: '40px', backgroundColor: '#ffe8d6' }}
    >
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{
          height: '420px',
          background: 'linear-gradient(180deg, #ddbea9 0%, #ffe8d6 100%)',
          zIndex: 0,
        }}
      />

      <div className="relative z-10 px-8 md:px-16 max-w-6xl mx-auto">
        <span
          className="inline-flex items-center gap-2 text-xs uppercase mb-5"
          style={{ color: '#cb997e', letterSpacing: '0.35em' }}
        >
          <Sparkles size={12} /> Curated for You
        </span>
        <h1
          className="font-light leading-none mb-6"
          style={{
            fontSize: 'clamp(2.5rem, 6vw, 5.5rem)',
            color: '#6b705c',
            fontFamily: "'Georgia', serif",
            lineHeight: '1.05',
          }}
        >
          {analysis ? (
            <>
              Your{' '}
              <em style={{ color: '#cb997e', fontStyle: 'italic' }}>
                {analysis.season}
              </em>
              <br />
              Wardrobe.
            </>
          ) : (
            'Your Palette.'
          )}
        </h1>

        <div
          style={{
            height: '1px',
            width: '60px',
            backgroundColor: '#cb997e',
            marginBottom: '24px',
          }}
        />

        {analysis && (
          <p
            className="max-w-2xl mb-8"
            style={{
              color: '#6b705c',
              opacity: 0.78,
              lineHeight: '1.8',
              fontSize: '0.95rem',
            }}
          >
            Pieces ranked against your season, your best colors, and the tones to
            avoid.
            {matchCount != null && matchCount > 0 && (
              <>
                {' '}
                <span style={{ color: '#cb997e' }}>
                  {matchCount} {matchCount === 1 ? 'piece' : 'pieces'}
                </span>{' '}
                in your palette.
              </>
            )}
          </p>
        )}

        {analysis && (
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className="text-[10px] uppercase mr-2"
              style={{ color: '#a5a58d', letterSpacing: '0.25em' }}
            >
              Best Colors
            </span>
            {analysis.best_colors.map((hex) => (
              <div
                key={hex}
                className="w-8 h-8"
                style={{
                  backgroundColor: hex,
                  borderRadius: '2px',
                  border: '1px solid rgba(107,112,92,0.18)',
                  boxShadow: '0 2px 6px rgba(107,112,92,0.18)',
                }}
                title={hex}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function RankedGrid({ ranked }: { ranked: ScoredProduct[] }) {
  if (ranked.length === 0) {
    return (
      <p
        className="text-sm py-20 text-center"
        style={{ color: '#6b705c', opacity: 0.7, letterSpacing: '0.05em' }}
      >
        No pieces in the catalog yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
      {ranked.map((scored) => (
        <PersonalizedTile key={scored.product.id} scored={scored} />
      ))}
    </div>
  );
}

function PersonalizedTile({ scored }: { scored: ScoredProduct }) {
  const { product, score, matchedColors, seasonMatch } = scored;
  const image = product.image_url ?? product.try_on_ready_image_url ?? '';
  const price =
    product.price != null
      ? `$${Number(product.price).toFixed(0)} ${product.currency ?? ''}`.trim()
      : null;

  const isMatch = score > 0;
  const isStrongMatch = score >= 80;

  return (
    <Link
      href={`/try-on/${product.id}`}
      className="relative overflow-hidden group cursor-pointer block"
      style={{ height: '340px', borderRadius: '3px' }}
    >
      <img
        src={image}
        alt={product.name}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        style={{ filter: isMatch ? 'brightness(0.85) saturate(0.85)' : 'brightness(0.6) saturate(0.4)' }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(107,112,92,0.9) 0%, transparent 55%)',
        }}
      />

      {isStrongMatch && (
        <div
          className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1"
          style={{
            backgroundColor: 'rgba(255,232,214,0.92)',
            borderRadius: '2px',
            border: '1px solid rgba(203,153,126,0.4)',
          }}
        >
          <Sparkles size={10} style={{ color: '#cb997e' }} />
          <span
            className="text-[9px] uppercase"
            style={{ color: '#6b705c', letterSpacing: '0.2em' }}
          >
            {seasonMatch ? 'Season Match' : 'Top Pick'}
          </span>
        </div>
      )}

      <div className="absolute bottom-4 left-4 right-4">
        <span
          className="block text-[0.6rem] tracking-widest uppercase mb-1"
          style={{ color: '#ddbea9', letterSpacing: '0.2em' }}
        >
          {product.subcategory ?? product.category}
        </span>
        <h4
          className="font-light"
          style={{
            color: '#ffe8d6',
            fontFamily: "'Georgia', serif",
            fontSize: '1.05rem',
            lineHeight: '1.25',
          }}
        >
          {product.name}
        </h4>
        <div className="flex items-center justify-between mt-2">
          <p
            className="text-[0.65rem] uppercase"
            style={{
              color: 'rgba(255,232,214,0.7)',
              letterSpacing: '0.18em',
            }}
          >
            {matchedColors.length > 0
              ? matchedColors.slice(0, 2).join(' · ')
              : product.brand ?? price ?? 'Try it on'}
          </p>
          <ArrowUpRight
            size={14}
            style={{ color: '#ddbea9' }}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </div>
      </div>
    </Link>
  );
}
