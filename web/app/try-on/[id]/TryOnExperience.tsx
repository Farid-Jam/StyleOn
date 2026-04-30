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
}

type Unit = 'imperial' | 'metric';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
}

export default function TryOnExperience({ itemId }: Props) {
  const [product, setProduct] = useState<Product | null>(null);
  const [productError, setProductError] = useState('');

  const [garmentImage, setGarmentImage] = useState<string | null>(null);
  const [garmentLoading, setGarmentLoading] = useState(false);

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

  // Load product from Snowflake.
  useEffect(() => {
    let alive = true;
    setProductError('');
    getProduct(itemId)
      .then((p) => {
        if (!alive) return;
        setProduct(p);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setProductError(e instanceof Error ? e.message : 'Failed to load item.');
      });
    return () => {
      alive = false;
    };
  }, [itemId]);

  // Convert garment image URL to a data URL so the AI call can use it.
  useEffect(() => {
    if (!product) return;
    const url = product.image_url ?? product.try_on_ready_image_url;
    if (!url) return;
    let alive = true;
    setGarmentLoading(true);
    fetchImageAsDataUrl(url)
      .then((d) => {
        if (alive) setGarmentImage(d);
      })
      .catch(() => {
        // Fall back to using the original URL — backend can refetch if needed.
      })
      .finally(() => {
        if (alive) setGarmentLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [product]);

  // Run pose estimation once a person photo is uploaded.
  useEffect(() => {
    setBodyMetrics(null);
    if (!personImage) return;
    let alive = true;
    estimateBody(personImage)
      .then((m) => {
        if (alive) setBodyMetrics(m);
      })
      .catch(() => {
        if (alive) setBodyMetrics(null);
      });
    return () => {
      alive = false;
    };
  }, [personImage]);

  // Start/stop camera stream based on photoMode
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
      .catch(() => {
        if (alive) setPhotoMode('upload');
      });
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
    // Mirror to match what the user sees in the preview
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
      if (n === 0) {
        clearInterval(tick);
        capturePhoto();
      } else {
        setCountdown(n);
      }
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
      const safeF = Number.isNaN(f) ? 0 : f;
      const safeI = Number.isNaN(i) ? 0 : i;
      return `${safeF}'${safeI}"`;
    }
    const c = parseInt(cm, 10);
    if (Number.isNaN(c)) return '';
    return `${c} cm`;
  }, [unit, feet, inches, cm]);

  const canSubmit =
    !!personImage &&
    !!product &&
    !!garmentImage &&
    (!!selectedSize || !itemHasSizes) &&
    !!heightString &&
    !loading;

  async function handlePersonFile(file: File | null | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    try {
      const dataUrl = await fileToBase64(file);
      setPersonImage(dataUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to read photo.');
    }
  }

  async function handleSubmit() {
    if (!canSubmit || !garmentImage || !personImage) return;
    setError('');
    setGeneratedImage(null);
    setFitText('');
    setLoading(true);
    setModalOpen(true);
    try {
      const [tryOnUrl, fit] = await Promise.all([
        generateTryOn({
          personImage,
          garmentImage,
          size: selectedSize,
          height: heightString,
          bodyMetrics,
        }),
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

  const garmentSrc = garmentImage ?? product?.image_url ?? product?.try_on_ready_image_url ?? '';

  return (
    <>
      <section
        className="relative overflow-hidden"
        style={{ paddingTop: '140px', paddingBottom: '32px', backgroundColor: '#ffe8d6' }}
      >
        <div
          className="absolute top-0 left-0 right-0 pointer-events-none"
          style={{
            height: '320px',
            background: 'linear-gradient(180deg, #ddbea9 0%, #ffe8d6 100%)',
            zIndex: 0,
          }}
        />

        <div className="relative z-10 px-8 md:px-16 max-w-7xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 mb-8 text-xs uppercase"
            style={{
              color: '#6b705c',
              letterSpacing: '0.25em',
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={14} />
            Back to Collections
          </Link>

          <span
            className="block text-xs uppercase mb-5"
            style={{ color: '#cb997e', letterSpacing: '0.35em' }}
          >
            Virtual Try-On
          </span>
          <h1
            className="font-light leading-none mb-4"
            style={{
              fontSize: 'clamp(2rem, 5vw, 4rem)',
              color: '#6b705c',
              fontFamily: "'Georgia', serif",
              lineHeight: '1.05',
            }}
          >
            {product?.name ?? 'Loading…'}
          </h1>
          {product?.brand && (
            <p
              className="text-xs uppercase mb-2"
              style={{ color: '#6b705c', opacity: 0.7, letterSpacing: '0.25em' }}
            >
              {product.brand}
            </p>
          )}
          <div
            style={{
              height: '1px',
              width: '60px',
              backgroundColor: '#cb997e',
              marginTop: '18px',
              marginBottom: '24px',
            }}
          />
        </div>
      </section>

      <section className="relative px-8 md:px-16 pb-24" style={{ backgroundColor: '#ffe8d6' }}>
        <div className="max-w-7xl mx-auto">
          {productError && (
            <div
              className="mb-8 p-4 text-sm"
              style={{
                color: '#6b705c',
                backgroundColor: 'rgba(203,153,126,0.18)',
                border: '1px solid rgba(203,153,126,0.35)',
                borderRadius: '3px',
              }}
            >
              {productError}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1: person photo */}
            <Panel title="Your Photo" eyebrow="Step 1">
              {/* Mode tabs — only visible when no photo is selected */}
              {!personImage && (
                <div
                  style={{
                    display: 'flex',
                    marginBottom: '14px',
                    border: '1px solid rgba(107,112,92,0.3)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                  }}
                >
                  {([
                    { mode: 'upload', icon: <Upload size={12} />, label: 'Upload' },
                    { mode: 'camera', icon: <Camera size={12} />, label: 'Take Photo' },
                  ] as const).map(({ mode, icon, label }) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPhotoMode(mode)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '10px',
                        fontSize: '0.65rem',
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                        border: 'none',
                        backgroundColor: photoMode === mode ? '#6b705c' : 'transparent',
                        color: photoMode === mode ? '#ffe8d6' : '#6b705c',
                        cursor: 'pointer',
                        transition: 'background-color 0.18s ease, color 0.18s ease',
                      }}
                    >
                      {icon}
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {/* Upload zone */}
              {!personImage && photoMode === 'upload' && (
                <>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handlePersonFile(e.dataTransfer.files?.[0]);
                    }}
                    style={{
                      width: '100%',
                      aspectRatio: '3 / 4',
                      borderRadius: '3px',
                      border: '1px dashed rgba(107,112,92,0.4)',
                      backgroundColor: 'rgba(221,190,169,0.25)',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div style={{ textAlign: 'center', padding: '32px', color: '#6b705c' }}>
                      <Upload size={28} style={{ margin: '0 auto 14px', opacity: 0.7 }} />
                      <p style={{ fontSize: '0.7rem', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '8px' }}>
                        Upload a photo
                      </p>
                      <p style={{ fontFamily: "'Georgia', serif", fontStyle: 'italic', fontSize: '0.85rem', opacity: 0.75, lineHeight: 1.6 }}>
                        Full-body, soft natural light works best.
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
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '3 / 4',
                    borderRadius: '3px',
                    backgroundColor: '#000',
                    overflow: 'hidden',
                  }}
                >
                  <video
                    ref={cameraVideoRef}
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                      transform: 'scaleX(-1)',
                    }}
                  />
                  {/* Countdown overlay */}
                  {countdown !== null && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(0,0,0,0.25)',
                    }}>
                      <span style={{
                        fontSize: '7rem',
                        fontFamily: "'Georgia', serif",
                        color: '#ffe8d6',
                        fontWeight: 300,
                        lineHeight: 1,
                        textShadow: '0 2px 24px rgba(0,0,0,0.5)',
                      }}>
                        {countdown}
                      </span>
                    </div>
                  )}

                  {/* Shutter button */}
                  <button
                    type="button"
                    onClick={startCountdown}
                    disabled={countdown !== null}
                    aria-label="Take photo"
                    style={{
                      position: 'absolute',
                      bottom: '20px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '60px',
                      height: '60px',
                      borderRadius: '999px',
                      backgroundColor: 'rgba(255,232,214,0.9)',
                      border: '3px solid #6b705c',
                      cursor: countdown !== null ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: countdown !== null ? 0.5 : 1,
                      transition: 'opacity 0.2s ease, background-color 0.15s ease',
                    }}
                    onMouseEnter={e => { if (countdown === null) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#ffe8d6'; }}
                    onMouseLeave={e => { if (countdown === null) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,232,214,0.9)'; }}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '999px', backgroundColor: '#6b705c' }} />
                  </button>
                </div>
              )}

              {/* Captured / uploaded photo */}
              {personImage && (
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '3 / 4',
                    borderRadius: '3px',
                    backgroundColor: '#000',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={personImage}
                    alt="You"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => setPersonImage(null)}
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      width: '32px',
                      height: '32px',
                      borderRadius: '999px',
                      backgroundColor: 'rgba(255,232,214,0.9)',
                      color: '#6b705c',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {personImage && (
                <p className="mt-3 text-xs" style={{ color: '#6b705c', opacity: 0.65, letterSpacing: '0.05em' }}>
                  {bodyMetrics ? `Pose detected · ${bodyMetrics.build} build` : 'Reading your proportions…'}
                </p>
              )}
            </Panel>

            {/* Column 2: garment */}
            <Panel title="The Piece" eyebrow="Step 2">
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '3 / 4',
                  borderRadius: '3px',
                  backgroundColor: '#ddbea9',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {garmentSrc ? (
                  <img
                    src={garmentSrc}
                    alt={product?.name ?? 'Garment'}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      fontFamily: "'Georgia', serif",
                      color: '#6b705c',
                      fontStyle: 'italic',
                    }}
                  >
                    {garmentLoading ? 'Loading…' : 'Image unavailable.'}
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-baseline justify-between gap-3">
                <div>
                  <p
                    className="text-xs uppercase"
                    style={{ color: '#cb997e', letterSpacing: '0.25em', marginBottom: '4px' }}
                  >
                    {product?.subcategory ?? product?.category ?? '—'}
                  </p>
                  <h3
                    className="font-light"
                    style={{
                      fontFamily: "'Georgia', serif",
                      fontSize: '1.05rem',
                      color: '#6b705c',
                      lineHeight: 1.3,
                    }}
                  >
                    {product?.name ?? 'Loading…'}
                  </h3>
                </div>
                {product?.price != null && (
                  <p
                    className="text-xs"
                    style={{
                      color: '#6b705c',
                      letterSpacing: '0.15em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ${Number(product.price).toFixed(0)} {product.currency ?? ''}
                  </p>
                )}
              </div>
              {product?.description && (
                <p
                  className="mt-3"
                  style={{
                    color: '#6b705c',
                    opacity: 0.75,
                    fontSize: '0.85rem',
                    lineHeight: 1.7,
                  }}
                >
                  {product.description}
                </p>
              )}
            </Panel>

            {/* Column 3: sizing + height + try-on */}
            <Panel title="Your Fit" eyebrow="Step 3">
              <div className="flex flex-col gap-6">
                <div>
                  <p
                    className="text-xs uppercase mb-3"
                    style={{ color: '#cb997e', letterSpacing: '0.25em' }}
                  >
                    Size
                  </p>
                  {sizes.length === 0 ? (
                    <p style={{ color: '#6b705c', opacity: 0.7, fontSize: '0.85rem' }}>
                      No sizes available.
                    </p>
                  ) : isOneSize ? (
                    <div
                      style={{
                        padding: '12px 16px',
                        backgroundColor: '#6b705c',
                        color: '#ffe8d6',
                        fontSize: '0.8rem',
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                        borderRadius: '2px',
                        display: 'inline-block',
                      }}
                    >
                      One size
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {sizes.map((s) => {
                        const active = selectedSize === s;
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setSelectedSize(s)}
                            style={{
                              minWidth: '52px',
                              padding: '10px 14px',
                              fontSize: '0.78rem',
                              letterSpacing: '0.15em',
                              textTransform: 'uppercase',
                              backgroundColor: active ? '#6b705c' : 'transparent',
                              color: active ? '#ffe8d6' : '#6b705c',
                              border: active
                                ? '1px solid #6b705c'
                                : '1px solid rgba(107,112,92,0.35)',
                              borderRadius: '2px',
                              cursor: 'pointer',
                              transition: 'all 0.18s ease',
                            }}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <p
                    className="text-xs uppercase mb-3"
                    style={{ color: '#cb997e', letterSpacing: '0.25em' }}
                  >
                    Height
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {unit === 'imperial' ? (
                      <>
                        <NumberField
                          value={feet}
                          onChange={setFeet}
                          placeholder="ft"
                          aria-label="Feet"
                        />
                        <span style={{ color: '#6b705c', fontSize: '0.8rem' }}>ft</span>
                        <NumberField
                          value={inches}
                          onChange={setInches}
                          placeholder="in"
                          aria-label="Inches"
                        />
                        <span style={{ color: '#6b705c', fontSize: '0.8rem' }}>in</span>
                      </>
                    ) : (
                      <>
                        <NumberField
                          value={cm}
                          onChange={setCm}
                          placeholder="cm"
                          aria-label="Centimeters"
                        />
                        <span style={{ color: '#6b705c', fontSize: '0.8rem' }}>cm</span>
                      </>
                    )}
                    <div
                      style={{
                        display: 'flex',
                        marginLeft: 'auto',
                        border: '1px solid rgba(107,112,92,0.35)',
                        borderRadius: '2px',
                        overflow: 'hidden',
                      }}
                    >
                      {(['imperial', 'metric'] as Unit[]).map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setUnit(u)}
                          style={{
                            padding: '8px 12px',
                            fontSize: '0.65rem',
                            letterSpacing: '0.2em',
                            textTransform: 'uppercase',
                            border: 'none',
                            backgroundColor: unit === u ? '#6b705c' : 'transparent',
                            color: unit === u ? '#ffe8d6' : '#6b705c',
                            cursor: 'pointer',
                          }}
                        >
                          {u === 'imperial' ? 'ft/in' : 'cm'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  style={{
                    marginTop: '8px',
                    padding: '18px 28px',
                    fontSize: '0.75rem',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    backgroundColor: canSubmit ? '#6b705c' : 'rgba(107,112,92,0.35)',
                    color: '#ffe8d6',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: canSubmit ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    transition: 'background-color 0.25s ease, transform 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (canSubmit)
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#cb997e';
                  }}
                  onMouseLeave={(e) => {
                    if (canSubmit)
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#6b705c';
                  }}
                >
                  Try It On <ArrowUpRight size={14} />
                </button>

                <p
                  className="text-xs"
                  style={{
                    color: '#6b705c',
                    opacity: 0.65,
                    lineHeight: 1.6,
                    letterSpacing: '0.02em',
                  }}
                >
                  We&apos;ll generate a single image of you wearing this piece. Your photo never
                  leaves the session.
                </p>
              </div>
            </Panel>
          </div>
        </div>
      </section>

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

function Panel({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: '28px',
        borderRadius: '3px',
        backgroundColor: 'rgba(221,190,169,0.22)',
        border: '1px solid rgba(203,153,126,0.25)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <span
        className="block text-xs uppercase mb-2"
        style={{ color: '#cb997e', letterSpacing: '0.3em' }}
      >
        {eyebrow}
      </span>
      <h2
        className="font-light mb-5"
        style={{
          fontFamily: "'Georgia', serif",
          fontSize: '1.4rem',
          color: '#6b705c',
          lineHeight: 1.2,
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

function NumberField({
  value,
  onChange,
  placeholder,
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <input
      type="number"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '70px',
        padding: '10px 12px',
        fontSize: '0.9rem',
        backgroundColor: 'rgba(255,232,214,0.6)',
        border: '1px solid rgba(107,112,92,0.3)',
        borderRadius: '2px',
        color: '#6b705c',
        outline: 'none',
      }}
      {...rest}
    />
  );
}
