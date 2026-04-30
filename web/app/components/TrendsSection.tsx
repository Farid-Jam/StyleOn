'use client';

import { useRef, useEffect } from 'react';

const seasons = [
  {
    season: 'Spring',
    tag: '01',
    theme: 'Bloom & Breathe',
    description: 'Light linens, floral silhouettes, and pastels that move with the breeze.',
    tags: ['Linen', 'Floral', 'Sundress', 'Breathable'],
    image: '/SpringImage.jpeg',
    accent: '#cb997e',
    count: '284 pieces',
  },
  {
    season: 'Summer',
    tag: '02',
    theme: 'Sun & Structure',
    description: 'Bold colors, clean lines, and lightweight fabrics for warm days.',
    tags: ['Cotton', 'Shorts', 'Linen Blazer', 'Breezy'],
    image: '/SummerImage.jpeg',
    accent: '#ddbea9',
    count: '312 pieces',
  },
  {
    season: 'Autumn',
    tag: '03',
    theme: 'Earth & Layer',
    description: 'Rich textures, warm tones, and thoughtful layers that tell a story.',
    tags: ['Wool', 'Knit', 'Trench', 'Earth Tones'],
    image: '/AutumnImage.jpeg',
    accent: '#a5a58d',
    count: '398 pieces',
  },
  {
    season: 'Winter',
    tag: '04',
    theme: 'Warmth & Edge',
    description: 'Deep palettes, structured coats, and materials that hold presence.',
    tags: ['Cashmere', 'Overcoat', 'Boots', 'Layered'],
    image: '/WinterImage.jpeg',
    accent: '#6b705c',
    count: '276 pieces',
  },
];

const N = seasons.length;
const CARD_W = 340;
const GAP = 20;
const STEP = CARD_W + GAP;
const COPIES = 6;
const ITEMS = Array.from({ length: N * COPIES }, (_, i) => seasons[i % N]);

export default function TrendsSection() {
  const trackRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const snapRaf = useRef<number>(0);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollStart = useRef(0);
  const vel = useRef(0);
  const lastX = useRef(0);
  const lastT = useRef(0);
  const lastCenter = useRef(-1);

  const getStartScroll = () => Math.floor(COPIES / 2) * N * STEP;

  const applyStyles = (scrollLeft: number) => {
    const el = trackRef.current;
    if (!el) return;

    const centerCardIndex = scrollLeft / STEP;

    ITEMS.forEach((_, i) => {
      const card = cardRefs.current[i];
      if (!card) return;
      const dist = Math.abs(i - centerCardIndex);
      const t = Math.max(0, 1 - dist / 1.8);
      const scale = 0.80 + 0.22 * t;
      const opacity = 0.25 + 0.75 * t;
      card.style.transform = `scale(${scale.toFixed(3)})`;
      card.style.opacity = opacity.toFixed(3);
      const inner = card.querySelector('.wc-inner') as HTMLElement | null;
      if (inner) {
        inner.style.opacity = t > 0.85 ? String(((t - 0.85) / 0.15).toFixed(3)) : '0';
      }
    });

    const nearestIdx = Math.round(centerCardIndex) % N;
    const safeIdx = ((nearestIdx % N) + N) % N;
    if (safeIdx !== lastCenter.current) {
      lastCenter.current = safeIdx;
      updateInfo(safeIdx);
    }
  };

  const updateInfo = (idx: number) => {
    const s = seasons[idx];
    const el = infoRef.current;
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    setTimeout(() => {
      el.innerHTML = `
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:32px;flex-wrap:wrap">
          <div>
            <span style="display:inline-block;padding:3px 10px;font-size:9px;letter-spacing:0.2em;text-transform:uppercase;border-radius:2px;color:#ffe8d6;background:${s.accent};margin-bottom:10px">${s.tag} — ${s.season}</span>
            <h3 style="font-family:'Georgia',serif;font-weight:300;font-size:1.8rem;color:#6b705c;line-height:1.1;margin-bottom:8px">${s.theme}</h3>
            <p style="font-size:0.875rem;color:#a5a58d;line-height:1.8;max-width:380px">${s.description}</p>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;justify-content:space-between;gap:16px;min-width:160px">
            <div>
              <p style="font-size:10px;text-transform:uppercase;letter-spacing:0.15em;color:#b7b7a4;margin-bottom:4px">Available</p>
              <p style="font-size:1.5rem;font-weight:300;color:#6b705c;font-family:'Georgia',serif">${s.count}</p>
            </div>
            <button style="display:flex;align-items:center;gap:6px;padding:10px 20px;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;border:1px solid #a5a58d;color:#6b705c;border-radius:2px;background:transparent;cursor:pointer">
              Explore ↗
            </button>
          </div>
        </div>
      `;
      el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, 80);
  };

  const checkLoop = (el: HTMLDivElement) => {
    const total = N * STEP;
    if (el.scrollLeft < total) el.scrollLeft += total * 2;
    else if (el.scrollLeft > total * (COPIES - 2)) el.scrollLeft -= total * 2;
  };

  const snapToNearest = (momentumPx = 0) => {
    const el = trackRef.current;
    if (!el) return;
    const target = el.scrollLeft - momentumPx;
    const nearest = Math.round(target / STEP);
    const snapScroll = nearest * STEP;
    const start = el.scrollLeft;
    const diff = snapScroll - start;
    const duration = 400;
    const t0 = performance.now();
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    if (snapRaf.current) cancelAnimationFrame(snapRaf.current);
    const go = (now: number) => {
      const t = Math.min((now - t0) / duration, 1);
      el.scrollLeft = start + diff * easeOut(t);
      checkLoop(el);
      applyStyles(el.scrollLeft);
      if (t < 1) snapRaf.current = requestAnimationFrame(go);
    };
    snapRaf.current = requestAnimationFrame(go);
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const el = trackRef.current;
    if (!el) return;
    if (snapRaf.current) cancelAnimationFrame(snapRaf.current);
    el.scrollLeft += e.deltaY * 0.7;
    checkLoop(el);
    applyStyles(el.scrollLeft);
    clearTimeout((window as unknown as { _wsnap?: ReturnType<typeof setTimeout> })._wsnap);
    (window as unknown as { _wsnap?: ReturnType<typeof setTimeout> })._wsnap = setTimeout(() => snapToNearest(0), 80);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    const el = trackRef.current;
    if (!el) return;
    if (snapRaf.current) cancelAnimationFrame(snapRaf.current);
    isDragging.current = true;
    el.style.cursor = 'grabbing';
    startX.current = e.pageX;
    scrollStart.current = el.scrollLeft;
    vel.current = 0;
    lastX.current = e.pageX;
    lastT.current = performance.now();
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const el = trackRef.current;
    if (!el) return;
    el.scrollLeft = scrollStart.current - (e.pageX - startX.current);
    checkLoop(el);
    applyStyles(el.scrollLeft);
    const now = performance.now();
    vel.current = (e.pageX - lastX.current) / Math.max(now - lastT.current, 1);
    lastX.current = e.pageX;
    lastT.current = now;
  };

  const onMouseUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const el = trackRef.current;
    if (el) el.style.cursor = 'grab';
    snapToNearest(vel.current * 80);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const el = trackRef.current;
    if (!el) return;
    if (snapRaf.current) cancelAnimationFrame(snapRaf.current);
    isDragging.current = true;
    startX.current = e.touches[0].pageX;
    scrollStart.current = el.scrollLeft;
    vel.current = 0;
    lastX.current = e.touches[0].pageX;
    lastT.current = performance.now();
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const el = trackRef.current;
    if (!el) return;
    el.scrollLeft = scrollStart.current - (e.touches[0].pageX - startX.current);
    checkLoop(el);
    applyStyles(el.scrollLeft);
    const now = performance.now();
    vel.current = (e.touches[0].pageX - lastX.current) / Math.max(now - lastT.current, 1);
    lastX.current = e.touches[0].pageX;
    lastT.current = now;
  };

  const onTouchEnd = () => {
    isDragging.current = false;
    snapToNearest(vel.current * 80);
  };

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const start = getStartScroll();
    el.scrollLeft = start;
    applyStyles(start);
    updateInfo(0);
  }, []);

  return (
    <>
      <style>{`
        .wc-track {
          display: flex;
          gap: ${GAP}px;
          overflow: hidden;
          padding: 60px calc(50vw - ${CARD_W / 2}px);
          cursor: grab;
          user-select: none;
          -webkit-user-select: none;
        }
        .wc-card {
          flex-shrink: 0;
          width: ${CARD_W}px;
          height: 440px;
          border-radius: 14px;
          overflow: hidden;
          position: relative;
          will-change: transform, opacity;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .wc-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          pointer-events: none;
          transform: translateZ(0);
          display: block;
        }
        .wc-inner {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(80,85,65,0.96) 0%, transparent 65%);
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 24px;
          opacity: 0;
        }
        .season-badge {
          display: inline-flex;
          padding: 3px 8px;
          font-size: 9px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          border-radius: 2px;
          color: #ffe8d6;
          margin-bottom: 8px;
          width: fit-content;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .trends-enter { animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) forwards; }
      `}</style>

      <section
        className="trends-enter"
        style={{ backgroundColor: '#ffe8d6', padding: '80px 0', overflow: 'hidden' }}
      >
        <div className="flex items-end justify-between px-16 mb-4">
          <div>
            <span className="block text-xs uppercase mb-3" style={{ color: '#cb997e', letterSpacing: '0.3em' }}>
              Seasonal Curation
            </span>
            <h2 className="font-light" style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', color: '#6b705c', fontFamily: "'Georgia', serif", lineHeight: 1.1 }}>
              Dressed for <br />
              <em style={{ color: '#cb997e', fontStyle: 'italic' }}>Every Season</em>
            </h2>
          </div>
          <p className="hidden md:block max-w-xs text-sm" style={{ color: '#a5a58d', lineHeight: '1.7' }}>
            Scroll through four collections, each reflecting the mood and texture of a season.
          </p>
        </div>

        <div
          ref={trackRef}
          className="wc-track"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onWheel={onWheel}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {ITEMS.map((item, i) => (
            <div key={i} className="wc-card" ref={(el) => { cardRefs.current[i] = el; }}>
              <img src={item.image} alt={item.season} draggable={false} />
              <div className="wc-inner">
                <div className="season-badge" style={{ backgroundColor: item.accent }}>
                  {item.tag} — {item.season}
                </div>
                <h3 className="font-light" style={{ color: '#ffe8d6', fontFamily: "'Georgia', serif", fontSize: '1.5rem', lineHeight: 1.1, marginBottom: '6px' }}>
                  {item.theme}
                </h3>
                <p style={{ fontSize: '11px', color: 'rgba(255,232,214,0.7)', lineHeight: 1.6, marginBottom: '10px' }}>
                  {item.description}
                </p>
                <span style={{ fontSize: '10px', color: '#ddbea9', letterSpacing: '0.1em' }}>{item.count}</span>
              </div>
            </div>
          ))}
        </div>

        <div
          ref={infoRef}
          className="px-16 mt-4 pt-10"
          style={{ borderTop: '1px solid rgba(107,112,92,0.15)', opacity: 0 }}
        />
      </section>
    </>
  );
}
