import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { X, Camera, RefreshCw } from 'lucide-react';

/**
 * BarcodeScanner — abre la cámara y detecta códigos de barras/QR en tiempo real.
 * Props:
 *   onDetected(code: string) — se llama cuando se detecta un código
 *   onClose() — se llama al cerrar
 */
export default function BarcodeScanner({ onDetected, onClose }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [lastCode, setLastCode] = useState(null);
  const lastDetectedRef = useRef(null);
  const cooldownRef = useRef(false);

  // Inicializar lector
  useEffect(() => {
    readerRef.current = new BrowserMultiFormatReader();

    BrowserMultiFormatReader.listVideoInputDevices()
      .then(devices => {
        setCameras(devices);
        // Preferir cámara trasera
        const back = devices.find(d =>
          /back|rear|environment/i.test(d.label)
        );
        setSelectedCamera(back?.deviceId || devices[0]?.deviceId || null);
      })
      .catch(() => setError('No se pudo acceder a las cámaras'));

    return () => {
      readerRef.current?.reset();
    };
  }, []);

  // Iniciar escaneo cuando hay cámara seleccionada
  useEffect(() => {
    if (!selectedCamera || !videoRef.current) return;

    setError(null);
    setScanning(true);

    readerRef.current.reset();

    readerRef.current
      .decodeFromVideoDevice(selectedCamera, videoRef.current, (result, err) => {
        if (result) {
          const code = result.getText();
          // Anti-rebote: no repetir el mismo código en menos de 2s
          if (cooldownRef.current || lastDetectedRef.current === code) return;
          lastDetectedRef.current = code;
          cooldownRef.current = true;
          setLastCode(code);

          // Feedback visual + sonido
          if (typeof navigator.vibrate === 'function') navigator.vibrate(100);

          setTimeout(() => {
            cooldownRef.current = false;
            onDetected(code);
          }, 300);
        }
        if (err && !(err instanceof NotFoundException)) {
          // ignorar errores normales de "no hay código en el frame"
        }
      })
      .catch(e => {
        setError('No se pudo iniciar la cámara. Verifica los permisos.');
        setScanning(false);
      });

    return () => {
      readerRef.current?.reset();
      setScanning(false);
    };
  }, [selectedCamera, onDetected]);

  const switchCamera = () => {
    const idx = cameras.findIndex(c => c.deviceId === selectedCamera);
    const next = cameras[(idx + 1) % cameras.length];
    setSelectedCamera(next.deviceId);
    lastDetectedRef.current = null;
  };

  return (
    <div className="barcode-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="barcode-modal">
        {/* Header */}
        <div className="barcode-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Camera size={18} color="var(--accent)" />
            <span style={{ fontWeight: 700, fontSize: 15 }}>Escanear Código</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {cameras.length > 1 && (
              <button className="btn btn-secondary btn-sm" onClick={switchCamera} title="Cambiar cámara">
                <RefreshCw size={14} />
              </button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Visor */}
        <div className="barcode-viewfinder">
          <video ref={videoRef} className="barcode-video" autoPlay muted playsInline />

          {/* Marco de escaneo */}
          <div className="scan-frame">
            <span className="scan-corner tl" />
            <span className="scan-corner tr" />
            <span className="scan-corner bl" />
            <span className="scan-corner br" />
            <div className="scan-line" />
          </div>

          {error && (
            <div className="barcode-error">
              <Camera size={24} />
              <p>{error}</p>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="barcode-status">
          {lastCode ? (
            <div className="barcode-detected">
              ✓ Detectado: <strong>{lastCode}</strong>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
              {scanning && <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />}
              Apunta la cámara al código de barras
            </div>
          )}
        </div>

        {/* Selector de cámara */}
        {cameras.length > 1 && (
          <div style={{ padding: '0 16px 12px' }}>
            <select
              value={selectedCamera || ''}
              onChange={e => { setSelectedCamera(e.target.value); lastDetectedRef.current = null; }}
              style={{ width: '100%', fontSize: 13 }}
            >
              {cameras.map(c => (
                <option key={c.deviceId} value={c.deviceId}>{c.label || `Cámara ${c.deviceId.slice(0, 8)}`}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
