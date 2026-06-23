import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCode, Camera, CameraOff, CheckCircle, XCircle, Loader, ScanLine } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

const QRScanner = ({ mode = 'entry', onSuccess, onActiveChange }) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const scannerRef = useRef(null);
  const scannerIdRef = useRef(`qr-scanner-${mode}-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (onActiveChange) onActiveChange(cameraActive);
  }, [cameraActive, onActiveChange]);

  // Stop camera when navigating away or on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop();
        } catch (e) {}
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup: Stop camera when component unmounts
      if (scannerRef.current) {
        const scanner = scannerRef.current;
        try {
          if (scanner.getState() !== 1) { // 1 = NOT_STARTED
            scanner.stop().then(() => {
              scanner.clear();
            }).catch(() => {});
          }
        } catch (e) {
          console.warn('Scanner cleanup error:', e);
        }
        scannerRef.current = null;
      }
      // Also stop all media tracks
      navigator.mediaDevices?.getUserMedia({ video: true })
        .then(stream => {
          stream.getTracks().forEach(track => track.stop());
        })
        .catch(() => {});
    };
  }, []);

  const processQRData = (rawData) => {
    try {
      const parsed = JSON.parse(rawData);
      return parsed.workerId || rawData;
    } catch { return rawData; }
  };

  const submitScan = async (rawCode) => {
    const workerId = processQRData(rawCode.trim());
    if (!workerId) return;
    setLoading(true); setLastResult(null);
    try {
      const res = await api.post('/attendance/scan', { workerId });
      const { message, action } = res.data;
      setLastResult({ success: true, message, action });
      toast.success(message, { icon: action === 'entry' ? '✅' : '👋' });
      setManualCode('');
      if (onSuccess) onSuccess(res.data.data);
    } catch (err) {
      const respData = err.response?.data;
      const msg = respData?.message || 'Scan failed';
      const isCooldown = respData?.action === 'cooldown';
      setLastResult({ success: false, message: msg, isCooldown });
      if (isCooldown) {
          toast('Please wait 60s between scans', { icon: '⏳' });
      } else toast.error(msg);
    } finally { setLoading(false); }
  };

  const startCamera = async () => {
    setCameraError(''); setCameraActive(true);
    try {
      await new Promise(r => setTimeout(r, 200));
      const scanner = new Html5Qrcode(scannerIdRef.current);
      scannerRef.current = scanner;
      const config = { fps: 15, qrbox: { width: 250, height: 250 } };
      
      try {
        await scanner.start({ facingMode: "environment" }, config, (text) => {
            scanner.pause();
            submitScan(text).then(() => {
              setTimeout(() => {
                if (scannerRef.current && scannerRef.current.getState() === 3) { // 3 = PAUSED
                  scannerRef.current.resume();
                }
              }, 3000);
            });
        }, () => {});
      } catch (e) {
        const devs = await Html5Qrcode.getCameras();
        if (devs?.length) {
            await scanner.start(devs[0].id, config, (text) => {
                scanner.pause();
                submitScan(text).then(() => {
                  setTimeout(() => {
                    if (scannerRef.current && scannerRef.current.getState() === 3) {
                      scannerRef.current.resume();
                    }
                  }, 3000);
                });
            }, () => {});
        } else throw new Error("No camera device detected.");
      }
    } catch (err) {
      setCameraError(err.message); setCameraActive(false);
      scannerRef.current = null;
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.getState() !== 1) {
          await scannerRef.current.stop();
          await scannerRef.current.clear();
        }
      } catch (e) { 
        console.warn("Scanner stop error:", e); 
      }
      scannerRef.current = null;
    }
    
    // Force stop all video tracks
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('Camera track stopped:', track.label);
      });
    } catch (e) {
      console.log('No active camera stream to stop');
    }
    
    setCameraActive(false);
    setCameraError('');
  };

  return (
    <div className="card p-5 animate-fade-in border border-slate-700/50">
      <div className="flex items-center gap-2 mb-4">
        <QrCode className="w-5 h-5 text-primary-400" />
        <h3 className="text-base font-bold text-white flex-1 capitalize">{mode} Scanner</h3>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-primary-500/10 text-primary-400 border border-primary-500/20">AUTO</span>
      </div>

      <div className="relative mb-4 bg-black/40 rounded-xl overflow-hidden min-h-[220px] border border-slate-800">
        <div id={scannerIdRef.current} className={`w-full ${cameraActive ? 'block' : 'hidden'}`} />
        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            {cameraError ? (
              <><CameraOff className="w-8 h-8 text-danger-500 mb-2" /><p className="text-danger-400 text-xs">{cameraError}</p></>
            ) : (
              <><ScanLine className="w-10 h-10 text-primary-500/20 mb-3" /><p className="text-slate-400 text-sm font-medium">Camera Offline</p><p className="text-slate-600 text-[10px] mt-1">Click below to start scanning</p></>
            )}
          </div>
        )}
      </div>

      <button onClick={cameraActive ? stopCamera : startCamera} className={`w-full py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${cameraActive ? 'bg-slate-800 text-slate-400' : 'bg-primary-600 text-white hover:bg-primary-500 shadow-lg shadow-primary-900/20'}`}>
        {cameraActive ? <><CameraOff className="w-4 h-4" /> Stop Scanner</> : <><Camera className="w-4 h-4" /> Start Scanning</>}
      </button>

      <div className="flex items-center gap-2 my-4 px-2">
        <div className="flex-1 h-px bg-slate-800" /><span className="text-slate-600 text-[10px] uppercase font-bold tracking-widest">or</span><div className="flex-1 h-px bg-slate-800" />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); submitScan(manualCode); }} className="flex gap-2">
        <input type="text" placeholder="Worker ID..." value={manualCode} onChange={(e) => setManualCode(e.target.value)} className="input-field text-sm py-2 flex-1" disabled={loading} />
        <button type="submit" disabled={loading || !manualCode.trim()} className="px-4 py-2 bg-slate-800 text-white rounded-lg font-bold text-sm hover:bg-slate-700 transition-all disabled:opacity-30">
          {loading ? <Loader className="w-4 h-4 animate-spin" /> : 'Go'}
        </button>
      </form>
    </div>
  );
};

export default QRScanner;
