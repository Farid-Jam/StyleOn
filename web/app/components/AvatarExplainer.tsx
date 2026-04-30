'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Volume2, Loader2 } from 'lucide-react';

interface AvatarExplainerProps {
  active: boolean;
  script: string | null;
  onClose: () => void;
}

export default function AvatarExplainer({ active, script, onClose }: AvatarExplainerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastScriptRef = useRef<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const [status, setStatus] = useState<'idle' | 'loading' | 'speaking' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch & play whenever script changes (and component is active).
  useEffect(() => {
    if (!active || !script || script === lastScriptRef.current) return;
    lastScriptRef.current = script;

    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      setStatus('loading');
      setErrorMsg(null);
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: script }),
          signal: controller.signal,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? 'Voice request failed');
        }
        const blob = await res.blob();
        if (cancelled) return;

        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;

        const audio = audioRef.current;
        if (!audio) return;
        audio.src = url;
        await audio.play();
      } catch (err) {
        if (cancelled || (err instanceof Error && err.name === 'AbortError')) return;
        setStatus('error');
        setErrorMsg(err instanceof Error ? err.message : 'Voice playback failed');
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [active, script]);

  // Stop everything when deactivated.
  useEffect(() => {
    if (active) return;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    lastScriptRef.current = null;
    setStatus('idle');
  }, [active]);

  // Track speaking state from the audio element (drives the status indicator).
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => setStatus('speaking');
    const onPauseOrEnd = () => setStatus((prev) => (prev === 'speaking' ? 'idle' : prev));
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPauseOrEnd);
    audio.addEventListener('ended', onPauseOrEnd);
    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPauseOrEnd);
      audio.removeEventListener('ended', onPauseOrEnd);
    };
  }, []);

  // Keep the avatar video looping the entire time the panel is active.
  // React doesn't always reflect the `muted` prop in time for autoplay,
  // so set it imperatively before calling play().
  useEffect(() => {
    if (!active) return;
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.play().catch((err) => console.warn('[avatar] video.play failed', err));
    return () => {
      video.pause();
    };
  }, [active]);

  // Cleanup blob URL on unmount.
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  if (!active) return null;

  const statusLabel =
    status === 'loading'
      ? 'Preparing your guide…'
      : status === 'speaking'
        ? 'Speaking'
        : status === 'error'
          ? errorMsg ?? 'Audio unavailable'
          : 'Ready';

  return (
    <div
      className="fixed z-50 animate-fade-up"
      style={{
        right: '24px',
        bottom: '24px',
        width: '300px',
        backgroundColor: 'rgba(255,232,214,0.97)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(107,112,92,0.25)',
        borderRadius: '6px',
        boxShadow: '0 18px 48px rgba(107,112,92,0.28)',
        overflow: 'hidden',
      }}
      role="complementary"
      aria-label="Color guide avatar"
    >
      <button
        onClick={onClose}
        aria-label="Close avatar"
        className="absolute top-2 right-2 z-10 flex items-center justify-center"
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          backgroundColor: 'rgba(107,112,92,0.85)',
          color: '#ffe8d6',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <X size={14} />
      </button>

      <div style={{ position: 'relative', backgroundColor: '#0a0a0a' }}>
        <video
          ref={videoRef}
          src="/avatar_speaking.mp4"
          muted
          loop
          playsInline
          preload="auto"
          style={{ width: '100%', display: 'block', aspectRatio: '1 / 1', objectFit: 'cover' }}
        />
      </div>

      <div className="px-4 py-3 flex items-center gap-2">
        {status === 'speaking' ? (
          <Volume2 size={14} style={{ color: '#cb997e' }} />
        ) : status === 'loading' ? (
          <Loader2 className="animate-spin" size={14} style={{ color: '#cb997e' }} />
        ) : (
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: status === 'error' ? '#cb997e' : '#a5a58d',
              display: 'inline-block',
            }}
          />
        )}
        <span
          className="text-[10px] uppercase"
          style={{ color: '#6b705c', letterSpacing: '0.22em' }}
        >
          Color Guide
        </span>
        <span
          className="text-[10px] ml-auto"
          style={{ color: status === 'error' ? '#cb997e' : '#a5a58d', letterSpacing: '0.05em' }}
        >
          {statusLabel}
        </span>
      </div>

      <audio ref={audioRef} hidden preload="auto" />
    </div>
  );
}
