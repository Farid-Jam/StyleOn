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
        .hero-img-enter { animation: scaleIn 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .hero-eyebrow-enter { opacity: 0; animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards; }
        .hero-line1-enter { opacity: 0; animation: fadeUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.5s forwards; }
        .hero-line2-enter { opacity: 0; animation: fadeUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.65s forwards; }
        .hero-line3-enter { opacity: 0; animation: fadeUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.8s forwards; }
        .hero-divider-enter { transform-origin: left; animation: lineGrow 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.9s forwards; }
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
        className="relative w-full overflow-hidden"
        style={{ minHeight: '100vh', backgroundColor: '#ddbea9' }}
      >
        <div className="absolute inset-0 hero-img-wrap" style={{ zIndex: 0 }}>
          <img
            ref={imgRef}
            src="/ConHacksLandingPage.jpeg"
            alt="Model"
            className={loaded ? 'hero-img-enter' : ''}
            style={{
              height: '110%',
              width: '65%',
              objectFit: 'cover',
              objectPosition: '35% center',
              filter: 'brightness(0.88) saturate(0.85)',
              willChange: 'transform',
              transformOrigin: 'center center',
            }}
          />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to right, transparent 35%, #ddbea9 62%)' }}
          />
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

        <div
          className="relative z-10 flex flex-col justify-center h-screen ml-auto px-12 md:px-16 mr-[-200px]"
          style={{ width: '52%', paddingTop: '100px' }}
        >
          <h1
            className="font-light leading-none mb-6"
            style={{
              fontSize: 'clamp(3rem, 7vw, 7rem)',
              color: '#6b705c',
              fontFamily: "'Georgia', serif",
              lineHeight: '1.05',
            }}
          >
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

          <div className="flex items-center gap-4">
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
