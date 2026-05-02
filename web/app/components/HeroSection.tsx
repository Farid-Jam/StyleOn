'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';

export default function HeroSection() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let frame: number;
    let pos = 0;
    const animate = () => {
      pos += 0.4;
      el.style.transform = `translateX(-${pos % (el.scrollWidth / 2)}px)`;
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!imgRef.current || !heroRef.current) return;
      const scrollY = window.scrollY;
      const heroHeight = heroRef.current.offsetHeight;
      if (scrollY < heroHeight) {
        imgRef.current.style.transform = `translateY(${scrollY * 0.3}px) scale(1.05)`;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(36px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(1.08); }
          to   { opacity: 1; transform: scale(1.05); }
        }
        @keyframes lineGrow {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes counterUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .hero-img-wrap { overflow: hidden; }

        .hero-section {
          min-height: 100svh;
          background-color: #ddbea9;
        }

        .hero-image {
          height: 110%;
          width: clamp(54%, 63vw, 68%);
          object-fit: cover;
          object-position: 35% center;
          filter: brightness(0.88) saturate(0.85);
          will-change: transform;
          transform-origin: center center;
        }

        .hero-gradient {
          background: linear-gradient(to right, transparent 34%, #ddbea9 63%);
        }

        .hero-content {
          position: relative;
          z-index: 10;
          min-height: 100svh;
          width: min(46vw, 660px);
          margin-left: auto;
          margin-right: clamp(16px, 2vw, 48px);
          padding: clamp(92px, 11svh, 132px) clamp(28px, 4vw, 64px) 84px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .hero-title {
          font-size: clamp(3rem, min(7vw, 10.5svh), 7rem);
          color: #6b705c;
          font-family: 'Georgia', serif;
          line-height: 1.05;
        }

        .hero-actions {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        @media (min-width: 768px) and (max-aspect-ratio: 4 / 3) {
          .hero-image {
            width: 58%;
            object-position: 42% center;
          }
          .hero-gradient {
            background: linear-gradient(to right, transparent 26%, #ddbea9 58%);
          }
          .hero-content {
            width: min(50vw, 620px);
            margin-right: clamp(24px, 4vw, 72px);
            padding-left: clamp(24px, 3vw, 48px);
            padding-right: clamp(24px, 3vw, 48px);
          }
        }

        @media (min-width: 768px) and (min-aspect-ratio: 17 / 10) {
          .hero-image {
            width: clamp(56%, 60vw, 64%);
          }
          .hero-content {
            width: min(44vw, 640px);
            margin-right: clamp(16px, 2.5vw, 56px);
          }
        }

        @media (max-width: 767px) {
          .hero-section {
            min-height: 100svh;
          }
          .hero-image {
            width: 100%;
            height: 62%;
            object-position: 38% top;
          }
          .hero-gradient {
            background:
              linear-gradient(to bottom, transparent 24%, rgba(221,190,169,0.76) 58%, #ddbea9 78%),
              linear-gradient(to right, transparent 18%, #ddbea9 92%);
          }
          .hero-content {
            min-height: 100svh;
            width: 100%;
            margin: 0;
            justify-content: flex-end;
            padding: 54svh 24px 96px;
          }
          .hero-title {
            font-size: clamp(3rem, 17vw, 4.8rem);
            line-height: 0.98;
            margin-bottom: 18px;
            text-shadow: 0 1px 24px rgba(221, 190, 169, 0.75);
          }
          .hero-actions {
            gap: 10px;
          }
          .btn-primary,
          .btn-secondary {
            padding: 13px 18px;
            font-size: 10px;
          }
        }

        @media (max-width: 420px) {
          .hero-content {
            padding-left: 20px;
            padding-right: 20px;
            padding-bottom: 92px;
          }
          .hero-actions {
            align-items: stretch;
            flex-direction: column;
          }
          .btn-primary,
          .btn-secondary {
            justify-content: center;
            width: 100%;
          }
        }

        .hero-img-enter { animation: scaleIn 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .hero-eyebrow-enter { opacity: 0; animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards; }
        .hero-line1-enter { opacity: 0; animation: fadeUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.5s forwards; }
        .hero-line2-enter { opacity: 0; animation: fadeUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.65s forwards; }
        .hero-line3-enter { opacity: 0; animation: fadeUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.8s forwards; }
        .hero-divider-enter { transform-origin: left; animation: lineGrow 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.9s both; }
        .hero-body-enter { opacity: 0; animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 1s forwards; }
        .hero-btn1-enter { opacity: 0; animation: fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) 1.1s forwards; }
        .hero-btn2-enter { opacity: 0; animation: fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) 1.2s forwards; }
        .hero-stat-enter-0 { opacity: 0; animation: counterUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 1.3s forwards; }
        .hero-stat-enter-1 { opacity: 0; animation: counterUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 1.45s forwards; }
        .hero-stat-enter-2 { opacity: 0; animation: counterUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 1.6s forwards; }
        .hero-watermark-enter { opacity: 0; animation: fadeIn 2s ease 1.8s forwards; }
        .hero-ticker-enter { opacity: 0; animation: fadeIn 0.8s ease 1.4s forwards; }

        .btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 16px 32px;
          font-size: 11px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          background-color: #6b705c;
          color: #ffe8d6;
          border: none;
          border-radius: 2px;
          cursor: pointer;
          transition: background-color 0.3s ease, transform 0.2s ease, box-shadow 0.3s ease;
        }
        .btn-primary:hover {
          background-color: #cb997e;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(107,112,92,0.25);
        }
        .btn-primary:active { transform: translateY(0); }

        .btn-secondary {
          padding: 16px 32px;
          font-size: 11px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          border: 1px solid #a5a58d;
          color: #6b705c;
          border-radius: 2px;
          background: transparent;
          cursor: pointer;
          transition: border-color 0.3s ease, color 0.3s ease, transform 0.2s ease;
        }
        .btn-secondary:hover {
          border-color: #cb997e;
          color: #cb997e;
          transform: translateY(-1px);
        }
        .btn-secondary:active { transform: translateY(0); }

        .stat-chip { transition: transform 0.25s ease; cursor: default; }
        .stat-chip:hover { transform: translateY(-3px); }
      `}</style>

      <section
        ref={heroRef}
        className="hero-section relative w-full overflow-hidden"
      >
        <div className="absolute inset-0 hero-img-wrap" style={{ zIndex: 0 }}>
          <img
            ref={imgRef}
            src="/ConHacksLandingPage.jpeg"
            alt="Model"
            className={`hero-image ${loaded ? 'hero-img-enter' : ''}`}
            style={loaded ? undefined : { opacity: 0 }}
          />
          <div className="hero-gradient absolute inset-0" />
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 py-4 overflow-hidden hero-ticker-enter"
          style={{
            borderTop: '1px solid rgba(107, 112, 92, 0.3)',
            zIndex: 10,
            backgroundColor: 'rgba(221, 190, 169, 0.7)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div ref={scrollRef} className="flex whitespace-nowrap" style={{ width: 'max-content' }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-6 mr-10 text-sm tracking-widest uppercase"
                style={{ color: '#6b705c', letterSpacing: '0.2em' }}
              >
                Your Style, Tailored
                <span style={{ color: '#cb997e' }}>&#9670;</span>
                Precision Fit
                <span style={{ color: '#cb997e' }}>&#9670;</span>
                Curated Seasons
                <span style={{ color: '#cb997e' }}>&#9670;</span>
              </span>
            ))}
          </div>
        </div>

        <div className="hero-content">
          <h1 className="hero-title font-light leading-none mb-6">
            <span className={`block ${loaded ? 'hero-line1-enter' : 'opacity-0'}`}>Where</span>
            <span className={`block ${loaded ? 'hero-line2-enter' : 'opacity-0'}`}>
              <em style={{ color: '#cb997e', fontStyle: 'italic' }}>Style</em>
            </span>
            <span className={`block ${loaded ? 'hero-line3-enter' : 'opacity-0'}`}>Meets You.</span>
          </h1>

          <div
            className={loaded ? 'hero-divider-enter' : ''}
            style={{
              height: '1px',
              width: '60px',
              backgroundColor: '#cb997e',
              marginBottom: '24px',
              transformOrigin: 'left',
              transform: loaded ? undefined : 'scaleX(0)',
            }}
          />

          <div className="hero-actions">
            <button
              className={`btn-primary ${loaded ? 'hero-btn1-enter' : 'opacity-0'}`}
              onClick={() => router.push('/find-style')}
            >
              Find My Style
              <ArrowUpRight size={14} />
            </button>
            <button className={`btn-secondary ${loaded ? 'hero-btn2-enter' : 'opacity-0'}`}>
              Browse Collection
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
