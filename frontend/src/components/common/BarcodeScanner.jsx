import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { X, Camera, RefreshCw, FlipHorizontal } from 'lucide-react';

/**
 * BarcodeScanner — abre la cámara y detecta códigos de barras/QR en tiempo real.
 * Usa getUserMedia() directo + ZXing decodeContinuously para máxima compatibilidad.
 *
 * Props:
 *   onDetected(code: string) — llamado al detectar un código
 *   onClose()               — llamado al cerrar
 */
export default function BarcodeScanner({ onDetected, onClose }) {
  const videoRef    = useRef(null);
  const streamRef   = useRef(null);
  const readerRef   = useRef(null);
  const rafRef      = useRef(null);
  const mountedRef  = useRef(true);
  const cooldownRef = useRef(false);
  const lastCodeRef = useRef(null);

  const [facingBack, setFacingBack]   = useState(true);
  const [hasMultiple, setHasMultiple] = useState(false);
  const [status, setStatus]           = useState('starting');
  const [errorMsg, setErrorMsg]       = useState('');
  const [lastCode, setLastCode]       = useState(null);

  /* ── Detener todo ── */
  const stopAll = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (readerRef.current) {
      try { readerRef.current.stopContinuousDecode(); } catch (_) {}
      try { readerRef.current.reset(); } catch (_) {}
      readerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.load();
    }
  }, []);

  /* ── Iniciar cámara ── */
  const startCamera = useCallback(async (useBack) => {
    if (!mountedRef.current) return;
    stopAll();
    setStatus('starting');
    setLastCode(null);
    lastCodeRef.current = null;
    cooldownRef.current = false;

    /* 1. Pedir permiso con getUserMedia */
    const constraints = {
      audio: false,
      video: {
        facingMode: useBack ? { ideal: 'environment' } : { ideal: 'user' },
        width:  { ideal: 1280 },
        height: { ideal: 720 },
      },
    };

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err1) {
      // Reintento sin restricción de cámara
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } catch (err2) {
        if (!mountedRef.current) return;
        const msg = err2.name === 'NotAllowedError'
          ? 'Permiso de cámara denegado.\nHabilítalo en la configuración del navegador.'
          : `No se pudo acceder a la cámara.\n(${err2.name || err2.message})`;
        setErrorMsg(msg);
        setStatus('error');
        return;
      }
    }

    if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
    streamRef.current = stream;

    /* 2. Detectar si hay múltiples cámaras */
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      if (mountedRef.current) setHasMultiple(devs.filter(d => d.kind === 'videoinput').length > 1);
    } catch (_) {}

    /* 3. Conectar stream al <video> */
    const video = videoRef.current;
    if (!video) { stream.getTracks().forEach(t => t.stop()); return; }

    video.srcObject = stream;
    video.setAttribute('playsinline', 'true'); // extra para iOS
    video.muted = true;

    /* 4. Esperar a que los metadatos del video estén listos */
    await new Promise(resolve => {
      if (video.readyState >= 2) { resolve(); return; }
      const onReady = () => { video.removeEventListener('loadedmetadata', onReady); resolve(); };
      video.addEventListener('loadedmetadata', onReady);
      setTimeout(resolve, 4000); // timeout de seguridad
    });

    if (!mountedRef.current) return;

    /* 5. Reproducir el video */
    try { await video.play(); }
    catch (_) { try { await video.play(); } catch (__) {} }

    if (!mountedRef.current) return;

    /* Confirmar que realmente muestra imagen */
    if (video.videoWidth === 0) {
      // Esperar un poco más en caso de que iOS tarde
      await new Promise(r => setTimeout(r, 800));
    }

    setStatus('active');

    /* 6. Iniciar ZXing decodeContinuously sobre el <video> */
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    try {
      reader.decodeFromVideoElementContinuously(video, (result, err) => {
        if (!mountedRef.current) return;
        if (result) {
          const code = result.getText();
          if (cooldownRef.current || lastCodeRef.current === code) return;
          lastCodeRef.current = code;
          cooldownRef.current = true;
          setLastCode(code);
          try { navigator.vibrate?.(120); } catch (_) {}
          setTimeout(() => {
            cooldownRef.current = false;
            if (mountedRef.current) onDetected(code);
          }, 350);
        }
        // NotFoundException es normal en frames sin código — ignorar
      });
    } catch (decErr) {
      if (!mountedRef.current) return;
      setErrorMsg(`El escáner no pudo iniciarse.\n(${decErr?.message || ''})`);
      setStatus('error');
    }
  }, [stopAll, onDetected]);

  /* ── Montar / desmontar ── */
  useEffect(() => {
    mountedRef.current = true;
    // Pequeño delay para que el DOM esté listo antes de pedir la cámara
    const t = setTimeout(() => startCamera(true), 100);
    return () => {
      clearTimeout(t);
      mountedRef.current = false;
      stopAll();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Cambiar cámara ── */
  const flipCamera = () => {
    const newFacing = !facingBack;
    setFacingBack(newFacing);
    startCamera(newFacing);
  };

  /* ── UI ── */
  return (
    <div
      className="barcode-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="barcode-modal">

        {/* Header */}
        <div className="barcode-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Camera size={18} color="var(--accent)" />
            <span style={{ fontWeight: 700, fontSize: 15 }}>Escanear Código</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {hasMultiple && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={flipCamera}
                title="Cambiar cámara"
              >
                <FlipHorizontal size={15} />
              </button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Visor */}
        <div className="barcode-viewfinder">
          {/* Video SIEMPRE en el DOM para que el ref funcione */}
          <video
            ref={videoRef}
            className="barcode-video"
            autoPlay
            muted
            playsInline
            style={{ display: status === 'error' ? 'none' : 'block' }}
          />

          {/* Iniciando */}
          {status === 'starting' && (
            <div className="barcode-loading">
              <span className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
              <p style={{ marginTop: 14, fontSize: 13, color: 'var(--text-muted)' }}>
                Iniciando cámara…
              </p>
            </div>
          )}

          {/* Marco de escaneo animado */}
          {status === 'active' && (
            <div className="scan-frame">
              <span className="scan-corner tl" />
              <span className="scan-corner tr" />
              <span className="scan-corner bl" />
              <span className="scan-corner br" />
              <div className="scan-line" />
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="barcode-error">
              <Camera size={36} opacity={0.45} />
              <p style={{ marginTop: 12, maxWidth: 260, textAlign: 'center', fontSize: 13, whiteSpace: 'pre-line' }}>
                {errorMsg}
              </p>
              <button
                className="btn btn-primary btn-sm"
                style={{ marginTop: 16 }}
                onClick={() => { setFacingBack(true); startCamera(true); }}
              >
                <RefreshCw size={13} /> Reintentar
              </button>
            </div>
          )}
        </div>

        {/* Barra de estado */}
        <div className="barcode-status">
          {lastCode ? (
            <div className="barcode-detected">
              ✓ Detectado: <strong style={{ marginLeft: 4 }}>{lastCode}</strong>
            </div>
          ) : status === 'active' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: 'var(--success)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
              Apunta la cámara al código de barras
            </div>
          ) : status === 'starting' ? (
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Solicitando permiso de cámara…
            </span>
          ) : null}
        </div>

      </div>
    </div>
  );
}
