'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  loading: boolean;
  error: string;
  generatedImage: string | null;
  fitText: string;
  garmentName?: string;
  onClose: () => void;
  onRetry: () => void;
}

export default function TryOnModal({
  open,
  loading,
  error,
  generatedImage,
  fitText,
  garmentName,
  onClose,
  onRetry,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <style>{`
        @keyframes tryOnBackdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes tryOnPanelIn {
          from { opacity: 0; transform: translate(-50%, calc(-50% + 24px)); }
          to   { opacity: 1; transform: translate(-50%, -50%); }
        }
        .try-on-spinner {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid rgba(107,112,92,0.2);
          border-top-color: #6b705c;
          animation: tryOnSpin 0.9s linear infinite;
        }
        @keyframes tryOnSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(46, 49, 41, 0.55)',
          backdropFilter: 'blur(6px)',
          zIndex: 80,
          animation: 'tryOnBackdropIn 0.25s ease forwards',
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Virtual try-on result"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(720px, 92vw)',
          maxHeight: '88vh',
          backgroundColor: '#ffe8d6',
          borderRadius: '4px',
          boxShadow: '0 30px 60px rgba(46,49,41,0.35)',
          border: '1px solid rgba(203,153,126,0.35)',
          overflow: 'hidden',
          zIndex: 90,
          display: 'flex',
          flexDirection: 'column',
          animation: 'tryOnPanelIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 28px',
            borderBottom: '1px solid rgba(203,153,126,0.25)',
            backgroundColor: 'rgba(221,190,169,0.4)',
          }}
        >
          <div>
            <span
              style={{
                display: 'block',
                fontSize: '0.7rem',
                color: '#cb997e',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              Virtual Try-On
            </span>
            <h2
              style={{
                fontFamily: "'Georgia', serif",
                fontSize: '1.35rem',
                color: '#6b705c',
                fontWeight: 300,
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              {garmentName ? `On you · ${garmentName}` : 'On you'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: '1px solid rgba(107,112,92,0.35)',
              color: '#6b705c',
              borderRadius: '999px',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div
          style={{
            padding: '28px',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {loading && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '14px',
                padding: '40px 0',
              }}
            >
              <div className="try-on-spinner" />
              <p
                style={{
                  fontFamily: "'Georgia', serif",
                  fontStyle: 'italic',
                  color: '#6b705c',
                  fontSize: '0.95rem',
                }}
              >
                Your tailor is working on it…
              </p>
            </div>
          )}

          {!loading && error && (
            <div
              style={{
                padding: '20px 22px',
                border: '1px solid rgba(203,153,126,0.4)',
                borderRadius: '3px',
                backgroundColor: 'rgba(221,190,169,0.35)',
              }}
            >
              <p style={{ color: '#6b705c', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                {error}
              </p>
              <button
                type="button"
                onClick={onRetry}
                style={{
                  marginTop: '14px',
                  padding: '10px 22px',
                  fontSize: '0.7rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  backgroundColor: '#6b705c',
                  color: '#ffe8d6',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                }}
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && generatedImage && (
            <>
              <div
                style={{
                  borderRadius: '3px',
                  overflow: 'hidden',
                  backgroundColor: '#ddbea9',
                  border: '1px solid rgba(203,153,126,0.35)',
                }}
              >
                <img
                  src={generatedImage}
                  alt="Try-on result"
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                    maxHeight: '60vh',
                    objectFit: 'contain',
                  }}
                />
              </div>

              {fitText && (
                <div>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '0.65rem',
                      letterSpacing: '0.3em',
                      textTransform: 'uppercase',
                      color: '#cb997e',
                      marginBottom: '8px',
                    }}
                  >
                    Fit Notes
                  </span>
                  <p
                    style={{
                      fontFamily: "'Georgia', serif",
                      color: '#6b705c',
                      lineHeight: 1.7,
                      fontSize: '0.95rem',
                      margin: 0,
                    }}
                  >
                    {fitText}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
