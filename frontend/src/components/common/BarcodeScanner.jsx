import { useEffect, useRef, useState, useCallback } from 'react';
import {
  BrowserMultiFormatReader,
  DecodeHintType,
  BarcodeFormat,
} from '@zxing/library';
import { X, Camera, RefreshCw, FlipHorizontal, Flashlight } from 'lucide-react';

/**
 * BarcodeScanner — cámara con detección rápida de códigos de barras.
 * Optimizaciones:
 *   - Solo formatos comunes de retail (EAN-13, Code128, QR, etc.)
 *   - TRY_HARDER habilitado
 *   - Autofocus continuo vía camera constraints
 *   - Torch (linterna) si el dispositivo lo soporta
 */
export default function BarcodeScanner({ onDetected, onClose }) {
  const videoRef    = useRef(null);
  const streamRef   = useRef(null);
  const readerRef   = useRef(null);
  const mountedRef  = useRef(true);
  const cooldownRef = useRef(false);
  const lastCodeRef = useRef(null);
  const nativeLoopRef = useRef(null);

  const [facingBack, setFacingBack]     = useState(true);
  const [hasMultiple, setHasMultiple]   = useState(false);
  const [torchOn, setTorchOn]           = useState(false);
  const [supportsTorch, setSupportsTorch] = useState(false);
  const [status, setStatus]             = useState('starting');
  const [errorMsg, setErrorMsg]         = useState('');
  const [lastCode, setLastCode]         = useState(null);

  /* ── ZXing hints: solo formatos de retail para máxima velocidad ── */
  const makeReader = () => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.CODE_93,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.QR_CODE,
      BarcodeFormat.DATA_MATRIX,
      BarcodeFormat.PDF_417,
      BarcodeFormat.ITF,       // interleaved 2 of 5
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    const reader = new BrowserMultiFormatReader(hints);
    // Reducir el tiempo entre intentos de decodificación a 80ms (default ~500ms)
    reader.timeBetweenScansMillis = 80;
    reader._timeBetweenDecodingAttempts = 80;
    return reader;
  };

  /* ── Detener todo ── */
  const stopAll = useCallback(() => {
    if (nativeLoopRef.current) {
      clearTimeout(nativeLoopRef.current);
      nativeLoopRef.current = null;
    }
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

  /* ── Activar / desactivar linterna ── */
  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks?.()?.[0];
    if (!track) return;
    try {
      const newVal = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: newVal }] });
      setTorchOn(newVal);
    } catch (_) {}
  };

  /* ── Iniciar cámara ── */
  const startCamera = useCallback(async (useBack) => {
    if (!mountedRef.current) return;
    stopAll();
    setStatus('starting');
    setLastCode(null);
    setTorchOn(false);
    lastCodeRef.current = null;
    cooldownRef.current = false;

    /* 1. getUserMedia con autofocus continuo */
    const videoConstraints = {
      facingMode: useBack ? { ideal: 'environment' } : { ideal: 'user' },
      width:      { ideal: 1280 },   // 720p es el balance perfecto entre nitidez y velocidad de procesamiento en JS
      height:     { ideal: 720 },
      // Autofocus continuo (compatible con la mayoría de Android/iOS)
      advanced: [
        { focusMode: 'continuous' },
        { exposureMode: 'continuous' },
        { whiteBalanceMode: 'continuous' },
      ],
    };

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
    } catch (_) {
      // Reintento sin restricciones avanzadas
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: useBack ? { ideal: 'environment' } : { ideal: 'user' } },
          audio: false,
        });
      } catch (err2) {
        // Último intento sin ninguna restricción
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } catch (err3) {
          if (!mountedRef.current) return;
          const msg = err3.name === 'NotAllowedError'
            ? 'Permiso de cámara denegado.\nHabilítalo en la configuración del navegador.'
            : `No se pudo acceder a la cámara.\n(${err3.name || err3.message})`;
          setErrorMsg(msg);
          setStatus('error');
          return;
        }
      }
    }

    if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
    streamRef.current = stream;

    /* 2. Detectar cámaras múltiples y soporte de linterna */
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      if (mountedRef.current) setHasMultiple(devs.filter(d => d.kind === 'videoinput').length > 1);
    } catch (_) {}

    const track = stream.getVideoTracks()[0];
    if (track) {
      try {
        const caps = track.getCapabilities?.() || {};
        if (mountedRef.current) setSupportsTorch(!!caps.torch);
      } catch (_) {}
    }

    /* 3. Conectar al <video> y esperar metadata */
    const video = videoRef.current;
    if (!video) { stream.getTracks().forEach(t => t.stop()); return; }

    video.srcObject = stream;
    video.setAttribute('playsinline', 'true');
    video.muted = true;

    await new Promise(resolve => {
      if (video.readyState >= 2) { resolve(); return; }
      const fn = () => { video.removeEventListener('loadedmetadata', fn); resolve(); };
      video.addEventListener('loadedmetadata', fn);
      setTimeout(resolve, 4000);
    });

    if (!mountedRef.current) return;

    try { await video.play(); }
    catch (_) { try { await video.play(); } catch (__) {} }

    if (!mountedRef.current) return;
    setStatus('active');

    /* 4. Iniciar Escaneo (BarcodeDetector nativo con aceleración por hardware o fallback con ZXing) */
    let detector = null;
    if ('BarcodeDetector' in window) {
      try {
        detector = new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'code_93', 'upc_a', 'upc_e', 'qr_code', 'itf', 'pdf417']
        });
      } catch (e) {
        console.warn('Native BarcodeDetector not supported/initialized:', e);
      }
    }

    if (detector) {
      console.log('Using native BarcodeDetector for ultra-fast scanning.');
      const scanFrame = async () => {
        if (!mountedRef.current || !streamRef.current) return;
        const vid = videoRef.current;
        if (!vid) return;

        if (vid.readyState >= 2) {
          try {
            const barcodes = await detector.detect(vid);
            if (barcodes.length > 0) {
              const code = barcodes[0].rawValue;
              if (!cooldownRef.current && lastCodeRef.current !== code) {
                lastCodeRef.current = code;
                cooldownRef.current = true;
                setLastCode(code);
                try { navigator.vibrate?.(100); } catch (_) {}
                setTimeout(() => {
                  cooldownRef.current = false;
                  if (mountedRef.current) onDetected(code);
                }, 350);
              }
            }
          } catch (_) {
            // Ignorar errores temporales de renderizado de frame
          }
        }
        
        if (mountedRef.current && streamRef.current) {
          nativeLoopRef.current = setTimeout(scanFrame, 60); // Escaneo ultrarrápido cada 60ms
        }
      };
      scanFrame();
    } else {
      console.log('Falling back to ZXing library scanner.');
      const reader = makeReader();
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
            try { navigator.vibrate?.(100); } catch (_) {}
            setTimeout(() => {
              cooldownRef.current = false;
              if (mountedRef.current) onDetected(code);
            }, 350);
          }
        });
      } catch (decErr) {
        if (!mountedRef.current) return;
        setErrorMsg(`El escáner no pudo iniciarse.\n(${decErr?.message || ''})`);
        setStatus('error');
      }
    }
  }, [stopAll, onDetected]);

  /* ── Montar / desmontar ── */
  useEffect(() => {
    mountedRef.current = true;
    const t = setTimeout(() => startCamera(true), 80);
    return () => {
      clearTimeout(t);
      mountedRef.current = false;
      stopAll();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
            {/* Linterna */}
            {supportsTorch && status === 'active' && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={toggleTorch}
                title="Linterna"
                style={torchOn ? { background: 'var(--warning-soft)', borderColor: 'var(--warning)', color: 'var(--warning)' } : {}}
              >
                {/* Ícono de linterna con emoji por compatibilidad */}
                <span style={{ fontSize: 15 }}>🔦</span>
              </button>
            )}
            {/* Cambiar cámara */}
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
          <video
            ref={videoRef}
            className="barcode-video"
            autoPlay
            muted
            playsInline
            style={{ display: status === 'error' ? 'none' : 'block' }}
          />

          {status === 'starting' && (
            <div className="barcode-loading">
              <span className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
              <p style={{ marginTop: 14, fontSize: 13, color: 'var(--text-muted)' }}>
                Iniciando cámara…
              </p>
            </div>
          )}

          {status === 'active' && (
            <div className="scan-frame">
              <span className="scan-corner tl" />
              <span className="scan-corner tr" />
              <span className="scan-corner bl" />
              <span className="scan-corner br" />
              <div className="scan-line" />
            </div>
          )}

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
              Apunta el código dentro del marco
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
