'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Camera, Upload, X } from 'lucide-react';
import {
  fetchImageAsDataUrl,
  generateTryOn,
  getFitRecommendation,
  getProduct,
  parseSizes,
  type BodyMetrics,
  type Product,
} from '../../lib/styleon';
import { estimateBody } from '../../lib/bodyEstimation';
import TryOnModal from '../../components/TryOnModal';

interface Props {
  itemId: string;
  initialProduct?: Product;
}

type Unit = 'imperial' | 'metric';
type ProgStatus = 'active' | 'done' | '';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
}

const heightInputStyle: React.CSSProperties = {
  width: '70px',
  padding: '10px 12px',
  fontSize: '1rem',
  fontFamily: 'inherit',
  background: 'rgba(255,232,214,0.55)',
  border: '1px solid rgba(107,112,92,0.25)',
  borderRadius: '2px',
  color: '#6b705c',
  outline: 'none',
  transition: 'border-color 0.15s',
};

function ProgStep({ num, label, status }: { num: number; label: string; status: ProgStatus }) {
  const isActive = status === 'active';
  const isDone = status === 'done';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase',
      color: isDone ? '#cb997e' : isActive ? '#6b705c' : '#b7b7a4',
      cursor: 'default', flexShrink: 0,
    }}>
      <div style={{
        width: '22px', height: '22px', borderRadius: '50%',
        border: `1px solid ${isDone ? '#cb997e' : isActive ? '#6b705c' : '#b7b7a4'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '9px', flexShrink: 0, transition: 'all 0.3s',
        background: isDone ? '#cb997e' : isActive ? '#6b705c' : 'transparent',
        color: isDone || isActive ? '#ffe8d6' : 'inherit',
      }}>
        {isDone ? (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : num}
      </div>
      <span>{label}</span>
    </div>
  );
}

export default function TryOnExperience({ itemId, initialProduct }: Props) {
  const [product, setProduct] = useState<Product | null>(initialProduct ?? null);
  const [productError, setProductError] = useState('');

  const [personImage, setPersonImage] = useState<string | null>(null);
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetrics | null>(null);

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [unit, setUnit] = useState<Unit>('imperial');
  const [feet, setFeet] = useState('');
  const [inches, setInches] = useState('');
  const [cm, setCm] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [fitText, setFitText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [photoMode, setPhotoMode] = useState<'upload' | 'camera'>('upload');
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (initialProduct) {
      setProduct(initialProduct);
      return;
    }
    let alive = true;
    setProductError('');
    getProduct(itemId)
      .then((p) => { if (alive) setProduct(p); })
      .catch((e: unknown) => { if (alive) setProductError(e instanceof Error ? e.message : 'Failed to load item.'); });
    return () => { alive = false; };
  }, [itemId, initialProduct]);

  useEffect(() => {
    setBodyMetrics(null);
    if (!personImage) return;
    let alive = true;
    estimateBody(personImage)
      .then((m) => { if (alive) setBodyMetrics(m); })
      .catch(() => { if (alive) setBodyMetrics(null); });
    return () => { alive = false; };
  }, [personImage]);

  useEffect(() => {
    if (photoMode !== 'camera') {
      cameraStreamRef.current?.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
      return;
    }
    let alive = true;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } })
      .then((stream) => {
        if (!alive) { stream.getTracks().forEach(t => t.stop()); return; }
        cameraStreamRef.current = stream;
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          cameraVideoRef.current.play().catch(() => {});
        }
      })
      .catch(() => { if (alive) setPhotoMode('upload'); });
    return () => {
      alive = false;
      cameraStreamRef.current?.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    };
  }, [photoMode]);

  function capturePhoto() {
    const video = cameraVideoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    setPersonImage(canvas.toDataURL('image/jpeg', 0.92));
    setPhotoMode('upload');
    setCountdown(null);
  }

  function startCountdown() {
    setCountdown(3);
    let n = 3;
    const tick = setInterval(() => {
      n -= 1;
      if (n === 0) { clearInterval(tick); capturePhoto(); }
      else setCountdown(n);
    }, 1000);
  }

  const sizes = useMemo(() => parseSizes(product?.available_sizes), [product]);
  const isOneSize = sizes.length === 1 && sizes[0]?.toLowerCase() === 'one size';
  const itemHasSizes = sizes.length > 0 && !isOneSize;

  useEffect(() => {
    if (isOneSize && !selectedSize) setSelectedSize('One size');
  }, [isOneSize, selectedSize]);

  const heightString = useMemo(() => {
    if (unit === 'imperial') {
      const f = parseInt(feet, 10);
      const i = parseInt(inches, 10);
      if (Number.isNaN(f) && Number.isNaN(i)) return '';
      return `${Number.isNaN(f) ? 0 : f}'${Number.isNaN(i) ? 0 : i}"`;
    }
    const c = parseInt(cm, 10);
    return Number.isNaN(c) ? '' : `${c} cm`;
  }, [unit, feet, inches, cm]);

  const garmentUrl = product?.image_url ?? product?.try_on_ready_image_url ?? null;

  const canSubmit =
    !!personImage &&
    !!product &&
    !!garmentUrl &&
    (!!selectedSize || !itemHasSizes) &&
    !!heightString &&
    !loading;

  async function handlePersonFile(file: File | null | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return; }
    try {
      const dataUrl = await fileToBase64(file);
      setPersonImage(dataUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to read photo.');
    }
  }

  async function handleSubmit() {
    if (!canSubmit || !garmentUrl || !personImage) return;
    setError('');
    setGeneratedImage(null);
    setFitText('');
    setLoading(true);
    setModalOpen(true);
    try {
      const garmentImage = await fetchImageAsDataUrl(garmentUrl);
      const [tryOnUrl, fit] = await Promise.all([
        generateTryOn({ personImage, garmentImage, size: selectedSize, height: heightString, bodyMetrics }),
        getFitRecommendation(personImage, heightString).catch(() => ''),
      ]);
      setGeneratedImage(tryOnUrl);
      setFitText(fit);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  const garmentSrc = garmentUrl ?? '';

  const step1Done = !!personImage;
  const step2Done = (!!selectedSize || !itemHasSizes) && !!heightString;

  const step1Status: ProgStatus = step1Done ? 'done' : 'active';
  const step2Status: ProgStatus = !step1Done ? '' : step2Done ? 'done' : 'active';
  const step3Status: ProgStatus = step1Done && step2Done ? 'active' : '';

  return (
    <>
      <style>{`
        .try-on-workspace {
          display: grid;
          grid-template-columns: 1fr;
          align-items: start;
          background: #ffe8d6;
        }
        .try-on-garment-panel {
          position: relative;
          height: 55vw;
          min-height: 280px;
          overflow: hidden;
        }
        .try-on-steps-panel {
          padding: 40px 24px 72px;
          display: flex;
          flex-direction: column;
        }
        @media (min-width: 960px) {
          .try-on-workspace { grid-template-columns: 42% 1fr; }
          .try-on-garment-panel { position: sticky; top: 68px; height: calc(100vh - 68px); }
          .try-on-steps-panel { padding: 52px 68px 96px; }
        }
        .upload-zone:hover {
          border-color: rgba(203,153,126,0.55) !important;
          background: rgba(221,190,169,0.26) !important;
        }
        .size-chip:hover { border-color: #6b705c !important; }
        .btn-try-on:hover:not(:disabled) {
          background: #cb997e !important;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(107,112,92,0.22);
        }
        .btn-try-on:active:not(:disabled) { transform: translateY(0); }
        .mode-btn:hover { opacity: 0.85; }
        .back-link:hover { opacity: 1 !important; }
      `}</style>

      {/* Product Intro */}
      <section style={{
        padding: 'clamp(100px, 10vw, 116px) clamp(24px, 4vw, 64px) 52px',
        backgroundColor: '#ddbea9',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <Link
          href="/"
          className="back-link"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            fontSize: '10px', letterSpacing: '0.25em', textTransform: 'uppercase',
            color: '#6b705c', textDecoration: 'none',
            marginBottom: '28px', opacity: 0.65, transition: 'opacity 0.2s',
          }}
        >
          <ArrowLeft size={13} />
          Back to Collections
        </Link>

        <span style={{
          display: 'block', fontSize: '10px',
          letterSpacing: '0.38em', textTransform: 'uppercase',
          color: '#cb997e', marginBottom: '14px',
        }}>
          Virtual Try-On
        </span>

        <h1 style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontWeight: 300,
          fontSize: 'clamp(2.4rem, 4.5vw, 4.2rem)',
          color: '#6b705c', lineHeight: 1.0, marginBottom: '8px',
        }}>
          {product?.name ?? 'Loading…'}
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '6px' }}>
          {product?.brand && (
            <span style={{
              fontSize: '10px', letterSpacing: '0.25em', textTransform: 'uppercase',
              color: '#6b705c', opacity: 0.55,
            }}>
              {product.brand}
            </span>
          )}
          {product?.price != null && (
            <>
              <span style={{ color: '#cb997e', opacity: 0.5, fontSize: '11px' }}>·</span>
              <span style={{ fontSize: '10px', letterSpacing: '0.2em', color: '#6b705c', opacity: 0.75 }}>
                ${Number(product.price).toFixed(0)} {product.currency ?? ''}
              </span>
            </>
          )}
        </div>

        <div style={{ width: '56px', height: '1px', backgroundColor: '#cb997e', marginTop: '20px' }} />
      </section>

      {/* Workspace */}
      <main className="try-on-workspace">

        {/* Garment Panel */}
        <div className="try-on-garment-panel">
          {garmentSrc ? (
            <img
              src={garmentSrc}
              alt={product?.name ?? 'Garment'}
              style={{
                width: '100%', height: '100%',
                objectFit: 'cover', objectPosition: 'center top',
                filter: 'brightness(0.85) saturate(0.75)',
                display: 'block',
              }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%', backgroundColor: '#ddbea9',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', color: '#6b705c' }}>
                Image unavailable.
              </span>
            </div>
          )}

          {/* Gradient overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(67,72,54,0.92) 0%, rgba(67,72,54,0.45) 30%, transparent 60%)',
          }} />

          {/* Badge */}
          <div style={{
            position: 'absolute', top: '28px', left: '28px',
            padding: '5px 14px',
            fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase',
            background: 'rgba(67,72,54,0.72)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,232,214,0.18)',
            color: '#ffe8d6', borderRadius: '2px',
          }}>
            The Piece
          </div>

          {/* Garment info at bottom */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '40px 40px 44px' }}>
            <div style={{ width: '40px', height: '1px', backgroundColor: 'rgba(203,153,126,0.7)', marginBottom: '16px' }} />
            <p style={{
              fontSize: '9px', letterSpacing: '0.32em', textTransform: 'uppercase',
              color: '#ddbea9', marginBottom: '10px',
            }}>
              {product?.subcategory ?? product?.category ?? 'Clothing'}
            </p>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 300,
              fontSize: 'clamp(1.6rem, 2.2vw, 2.4rem)',
              color: '#ffe8d6', lineHeight: 1.1, marginBottom: '8px',
            }}>
              {product?.name ?? ''}
            </h2>
            {product?.price != null && (
              <p style={{ fontSize: '11px', letterSpacing: '0.2em', color: 'rgba(255,232,214,0.6)' }}>
                ${Number(product.price).toFixed(0)} · {product.brand ?? ''}
              </p>
            )}
          </div>
        </div>

        {/* Steps Panel */}
        <div className="try-on-steps-panel">

          {productError && (
            <div style={{
              marginBottom: '24px', padding: '14px 16px', fontSize: '0.85rem',
              color: '#6b705c', backgroundColor: 'rgba(203,153,126,0.18)',
              border: '1px solid rgba(203,153,126,0.35)', borderRadius: '3px',
            }}>
              {productError}
            </div>
          )}

          {/* Progress Row */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '52px' }}>
            <ProgStep num={1} label="Your Photo" status={step1Status} />
            <div style={{ flex: 1, height: '1px', background: 'rgba(107,112,92,0.18)', margin: '0 14px' }} />
            <ProgStep num={2} label="Measurements" status={step2Status} />
            <div style={{ flex: 1, height: '1px', background: 'rgba(107,112,92,0.18)', margin: '0 14px' }} />
            <ProgStep num={3} label="Generate" status={step3Status} />
          </div>

          {/* Step 01: Your Photo */}
          <div style={{ padding: '36px 0', borderBottom: '1px solid rgba(107,112,92,0.1)' }}>
            <span style={{
              fontSize: '9px', letterSpacing: '0.38em', textTransform: 'uppercase',
              color: '#cb997e', marginBottom: '8px', display: 'block',
            }}>
              Step 01
            </span>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 300, fontSize: '1.6rem',
              color: '#6b705c', lineHeight: 1.15, marginBottom: '24px',
            }}>
              Your Photo
            </h2>

            {/* Mode toggle */}
            {!personImage && (
              <div style={{
                display: 'inline-flex',
                border: '1px solid rgba(107,112,92,0.28)',
                borderRadius: '2px', overflow: 'hidden', marginBottom: '20px',
              }}>
                {([
                  { mode: 'upload' as const, icon: <Upload size={11} />, label: 'Upload' },
                  { mode: 'camera' as const, icon: <Camera size={11} />, label: 'Take Photo' },
                ]).map(({ mode, icon, label }) => (
                  <button
                    key={mode}
                    type="button"
                    className="mode-btn"
                    onClick={() => setPhotoMode(mode)}
                    style={{
                      padding: '9px 20px',
                      fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase',
                      border: 'none',
                      background: photoMode === mode ? '#6b705c' : 'transparent',
                      color: photoMode === mode ? '#ffe8d6' : '#6b705c',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '7px',
                      transition: 'background 0.15s, color 0.15s',
                    }}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>
            )}

            {/* Upload zone */}
            {!personImage && photoMode === 'upload' && (
              <>
                <div
                  className="upload-zone"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); handlePersonFile(e.dataTransfer.files?.[0]); }}
                  style={{
                    width: '100%', aspectRatio: '3 / 4', maxHeight: '420px',
                    border: '1px solid rgba(107,112,92,0.22)',
                    borderRadius: '3px',
                    background: 'rgba(221,190,169,0.16)',
                    cursor: 'pointer', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', transition: 'border-color 0.2s, background 0.2s',
                  }}
                >
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: '14px', padding: '32px', textAlign: 'center',
                    position: 'relative', zIndex: 1,
                  }}>
                    <svg width="56" height="80" viewBox="0 0 56 80" fill="none" style={{ opacity: 0.35 }}>
                      <ellipse cx="28" cy="16" rx="10" ry="11" stroke="#6b705c" strokeWidth="1.5" />
                      <path d="M8 72 C8 48 14 36 28 36 C42 36 48 48 48 72" stroke="#6b705c" strokeWidth="1.5" fill="none" />
                      <path d="M14 42 L4 64 M42 42 L52 64" stroke="#6b705c" strokeWidth="1.5" />
                    </svg>
                    <span style={{ fontSize: '9px', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#6b705c' }}>
                      Upload a full-body photo
                    </span>
                    <p style={{
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      fontStyle: 'italic', fontSize: '0.9rem',
                      color: '#a5a58d', lineHeight: 1.55,
                    }}>
                      Front-facing, soft natural<br />light works best.
                    </p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => handlePersonFile(e.target.files?.[0])}
                />
              </>
            )}

            {/* Camera view */}
            {!personImage && photoMode === 'camera' && (
              <div style={{
                position: 'relative', width: '100%',
                aspectRatio: '3 / 4', maxHeight: '420px',
                borderRadius: '3px', background: '#111', overflow: 'hidden',
              }}>
                <video
                  ref={cameraVideoRef}
                  playsInline
                  muted
                  style={{
                    width: '100%', height: '100%',
                    objectFit: 'cover', display: 'block',
                    transform: 'scaleX(-1)',
                  }}
                />
                {countdown !== null && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(0,0,0,0.28)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      fontWeight: 300, fontSize: '6rem',
                      color: '#ffe8d6', lineHeight: 1,
                      textShadow: '0 2px 24px rgba(0,0,0,0.4)',
                    }}>
                      {countdown}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={startCountdown}
                  disabled={countdown !== null}
                  aria-label="Take photo"
                  style={{
                    position: 'absolute', bottom: '20px', left: '50%',
                    transform: 'translateX(-50%)',
                    width: '58px', height: '58px', borderRadius: '50%',
                    background: 'rgba(255,232,214,0.9)',
                    border: '3px solid #6b705c',
                    cursor: countdown !== null ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: countdown !== null ? 0.5 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#6b705c' }} />
                </button>
              </div>
            )}

            {/* Photo preview */}
            {personImage && (
              <>
                <div style={{
                  position: 'relative', width: '100%',
                  aspectRatio: '3 / 4', maxHeight: '420px',
                  borderRadius: '3px', overflow: 'hidden',
                }}>
                  <img
                    src={personImage}
                    alt="Your photo"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => setPersonImage(null)}
                    style={{
                      position: 'absolute', top: '12px', right: '12px',
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: 'rgba(255,232,214,0.9)',
                      border: 'none', color: '#6b705c',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.15s',
                    }}
                  >
                    <X size={13} />
                  </button>
                </div>
                <p style={{ marginTop: '10px', fontSize: '10px', color: '#6b705c', opacity: 0.5, letterSpacing: '0.04em' }}>
                  {bodyMetrics ? `Pose detected · ${bodyMetrics.build} build` : 'Reading your proportions…'}
                </p>
              </>
            )}
          </div>

          {/* Step 02: Measurements */}
          <div style={{ padding: '36px 0', borderBottom: '1px solid rgba(107,112,92,0.1)' }}>
            <span style={{
              fontSize: '9px', letterSpacing: '0.38em', textTransform: 'uppercase',
              color: '#cb997e', marginBottom: '8px', display: 'block',
            }}>
              Step 02
            </span>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 300, fontSize: '1.6rem',
              color: '#6b705c', lineHeight: 1.15, marginBottom: '24px',
            }}>
              Your Measurements
            </h2>

            {/* Size */}
            <span style={{
              fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase',
              color: '#cb997e', marginBottom: '12px', display: 'block',
            }}>
              Size
            </span>
            {sizes.length === 0 ? (
              <p style={{ color: '#6b705c', opacity: 0.7, fontSize: '0.85rem', marginBottom: '30px' }}>
                No sizes available.
              </p>
            ) : isOneSize ? (
              <div style={{
                display: 'inline-block', padding: '10px 16px',
                fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase',
                background: '#6b705c', color: '#ffe8d6',
                borderRadius: '2px', marginBottom: '30px',
              }}>
                One size
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '30px' }}>
                {sizes.map((s) => {
                  const active = selectedSize === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      className="size-chip"
                      onClick={() => setSelectedSize(s)}
                      style={{
                        minWidth: '52px', padding: '10px 16px',
                        fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase',
                        border: active ? '1px solid #6b705c' : '1px solid rgba(107,112,92,0.28)',
                        borderRadius: '2px',
                        background: active ? '#6b705c' : 'transparent',
                        color: active ? '#ffe8d6' : '#6b705c',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Height */}
            <span style={{
              fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase',
              color: '#cb997e', marginBottom: '12px', display: 'block',
            }}>
              Height
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {unit === 'imperial' ? (
                <>
                  <input
                    type="number"
                    value={feet}
                    placeholder="5"
                    min={3} max={8}
                    onChange={(e) => setFeet(e.target.value)}
                    aria-label="Feet"
                    style={heightInputStyle}
                  />
                  <span style={{ fontSize: '11px', color: '#6b705c', opacity: 0.6 }}>ft</span>
                  <input
                    type="number"
                    value={inches}
                    placeholder="10"
                    min={0} max={11}
                    onChange={(e) => setInches(e.target.value)}
                    aria-label="Inches"
                    style={heightInputStyle}
                  />
                  <span style={{ fontSize: '11px', color: '#6b705c', opacity: 0.6 }}>in</span>
                </>
              ) : (
                <>
                  <input
                    type="number"
                    value={cm}
                    placeholder="178"
                    min={100} max={250}
                    onChange={(e) => setCm(e.target.value)}
                    aria-label="Centimeters"
                    style={heightInputStyle}
                  />
                  <span style={{ fontSize: '11px', color: '#6b705c', opacity: 0.6 }}>cm</span>
                </>
              )}
              <div style={{
                display: 'inline-flex', marginLeft: 'auto',
                border: '1px solid rgba(107,112,92,0.28)',
                borderRadius: '2px', overflow: 'hidden',
              }}>
                {(['imperial', 'metric'] as Unit[]).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnit(u)}
                    style={{
                      padding: '8px 14px',
                      fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase',
                      border: 'none',
                      background: unit === u ? '#6b705c' : 'transparent',
                      color: unit === u ? '#ffe8d6' : '#6b705c',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {u === 'imperial' ? 'ft/in' : 'cm'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* CTA */}
          <div style={{ paddingTop: '44px' }}>
            <button
              type="button"
              className="btn-try-on"
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{
                width: '100%', padding: '20px 28px',
                fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase',
                fontFamily: 'inherit',
                background: canSubmit ? '#6b705c' : 'rgba(107,112,92,0.25)',
                color: '#ffe8d6',
                border: 'none', borderRadius: '2px',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                transition: 'background 0.25s, transform 0.15s, box-shadow 0.25s',
              }}
            >
              Try It On
              <ArrowUpRight size={14} />
            </button>
            <p style={{
              marginTop: '14px', fontSize: '10px',
              color: '#6b705c', opacity: 0.4,
              lineHeight: 1.65, letterSpacing: '0.02em', textAlign: 'center',
            }}>
              We generate one image for your session only.<br />Your photo never leaves this page.
            </p>
          </div>

        </div>
      </main>

      <TryOnModal
        open={modalOpen}
        loading={loading}
        error={error}
        generatedImage={generatedImage}
        fitText={fitText}
        garmentName={product?.name}
        onClose={() => setModalOpen(false)}
        onRetry={handleSubmit}
      />
    </>
  );
}
