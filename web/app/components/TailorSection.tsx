'use client';

import { useState } from 'react';
import { ArrowUpRight, Check } from 'lucide-react';

const bodyTypes = ['Slim', 'Athletic', 'Regular', 'Plus'];
const stylePrefs = ['Minimal', 'Classic', 'Casual', 'Editorial', 'Formal', 'Streetwear'];
const occasions = ['Everyday', 'Work', 'Evening', 'Outdoor', 'Formal Events'];

export default function TailorSection() {
  const [selectedBody, setSelectedBody] = useState('');
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedOccasion, setSelectedOccasion] = useState('');
  const [step, setStep] = useState(0);

  const toggleStyle = (s: string) => {
    setSelectedStyles((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : prev.length < 3 ? [...prev, s] : prev
    );
  };

  const canProceed = [
    selectedBody !== '',
    selectedStyles.length > 0,
    selectedOccasion !== '',
  ][step];

  return (
    <section className="relative py-24 px-8 md:px-16 overflow-hidden" style={{ backgroundColor: '#ddbea9' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <img
          src="https://www.insidehook.com/wp-content/uploads/2025/01/GettyImages-2194614108.jpg?fit=1200%2C800"
          alt=""
          className="absolute right-0 top-0 h-full object-cover object-right"
          style={{
            width: '45%',
            objectPosition: '65% center',
            filter: 'brightness(0.85) saturate(0.5)',
            opacity: 0.80,
          }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, #ddbea9 45%, transparent 75%, #ddbea9 100%)' }}
        />
      </div>

      <div className="relative z-10 max-w-2xl">
        <span className="block text-xs tracking-[0.35em] uppercase mb-4" style={{ color: '#6b705c', opacity: 0.75, letterSpacing: '0.3em' }}>
          Virtual Tailor
        </span>
        <h2 className="font-light leading-tight mb-3" style={{ fontSize: 'clamp(2rem, 5vw, 4rem)', color: '#6b705c', fontFamily: "'Georgia', serif" }}>
          Your Style,
          <br />
          <em style={{ color: '#cb997e' }}>Tailored Exactly</em>
        </h2>
        <p className="mb-10 max-w-md" style={{ color: '#6b705c', opacity: 0.7, lineHeight: '1.7', fontSize: '0.95rem' }}>
          Answer three questions. We match you with pieces that fit your body, taste, and life.
        </p>

        <div className="flex items-center gap-3 mb-10">
          {['Body Type', 'Style', 'Occasion'].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <button
                onClick={() => setStep(i)}
                className="flex items-center gap-2 text-xs tracking-widest uppercase transition-all duration-200"
                style={{
                  color: step === i ? '#6b705c' : step > i ? '#cb997e' : '#a5a58d',
                  letterSpacing: '0.15em',
                  fontWeight: step === i ? 600 : 400,
                }}
              >
                <span
                  className="w-5 h-5 flex items-center justify-center text-xs"
                  style={{
                    border: `1px solid ${step > i ? '#cb997e' : step === i ? '#6b705c' : '#a5a58d'}`,
                    borderRadius: '50%',
                    backgroundColor: step > i ? '#cb997e' : 'transparent',
                    color: step > i ? '#ffe8d6' : 'inherit',
                  }}
                >
                  {step > i ? <Check size={10} /> : i + 1}
                </span>
                {label}
              </button>
              {i < 2 && <span style={{ color: '#b7b7a4' }}>—</span>}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div>
            <p className="text-sm mb-5" style={{ color: '#6b705c', letterSpacing: '0.05em' }}>How would you describe your build?</p>
            <div className="flex flex-wrap gap-3">
              {bodyTypes.map((bt) => (
                <button
                  key={bt}
                  onClick={() => setSelectedBody(bt)}
                  className="px-6 py-3 text-sm tracking-wider transition-all duration-200"
                  style={{
                    border: `1px solid ${selectedBody === bt ? '#6b705c' : '#b7b7a4'}`,
                    borderRadius: '2px',
                    backgroundColor: selectedBody === bt ? '#6b705c' : 'transparent',
                    color: selectedBody === bt ? '#ffe8d6' : '#6b705c',
                    letterSpacing: '0.1em',
                  }}
                >
                  {bt}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <p className="text-sm mb-5" style={{ color: '#6b705c', letterSpacing: '0.05em' }}>Pick up to 3 aesthetics that speak to you.</p>
            <div className="flex flex-wrap gap-3">
              {stylePrefs.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleStyle(s)}
                  className="px-6 py-3 text-sm tracking-wider transition-all duration-200"
                  style={{
                    border: `1px solid ${selectedStyles.includes(s) ? '#cb997e' : '#b7b7a4'}`,
                    borderRadius: '2px',
                    backgroundColor: selectedStyles.includes(s) ? '#cb997e' : 'transparent',
                    color: selectedStyles.includes(s) ? '#ffe8d6' : '#6b705c',
                    letterSpacing: '0.1em',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            {selectedStyles.length === 3 && (
              <p className="mt-3 text-xs" style={{ color: '#a5a58d' }}>Maximum 3 selected.</p>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="text-sm mb-5" style={{ color: '#6b705c', letterSpacing: '0.05em' }}>What do you primarily dress for?</p>
            <div className="flex flex-wrap gap-3">
              {occasions.map((occ) => (
                <button
                  key={occ}
                  onClick={() => setSelectedOccasion(occ)}
                  className="px-6 py-3 text-sm tracking-wider transition-all duration-200"
                  style={{
                    border: `1px solid ${selectedOccasion === occ ? '#6b705c' : '#b7b7a4'}`,
                    borderRadius: '2px',
                    backgroundColor: selectedOccasion === occ ? '#6b705c' : 'transparent',
                    color: selectedOccasion === occ ? '#ffe8d6' : '#6b705c',
                    letterSpacing: '0.1em',
                  }}
                >
                  {occ}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 mt-10">
          {step < 2 ? (
            <button
              onClick={() => canProceed && setStep((s) => s + 1)}
              className="flex items-center gap-2 px-8 py-4 text-xs tracking-widest uppercase transition-all duration-300"
              style={{
                backgroundColor: canProceed ? '#6b705c' : '#b7b7a4',
                color: '#ffe8d6',
                borderRadius: '2px',
                letterSpacing: '0.15em',
                cursor: canProceed ? 'pointer' : 'not-allowed',
              }}
            >
              Next Step <ArrowUpRight size={14} />
            </button>
          ) : (
            <button
              onClick={() => {}}
              className="flex items-center gap-2 px-8 py-4 text-xs tracking-widest uppercase transition-all duration-300"
              style={{
                backgroundColor: canProceed ? '#cb997e' : '#b7b7a4',
                color: '#ffe8d6',
                borderRadius: '2px',
                letterSpacing: '0.15em',
                cursor: canProceed ? 'pointer' : 'not-allowed',
              }}
            >
              Find My Matches <ArrowUpRight size={14} />
            </button>
          )}
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="text-xs tracking-widest uppercase"
              style={{ color: '#a5a58d', letterSpacing: '0.15em' }}
            >
              Back
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
