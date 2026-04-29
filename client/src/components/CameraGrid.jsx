import { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff, AlertTriangle, Maximize2, Camera, X, Maximize } from 'lucide-react';

const CAMERA_LABELS = [
  { id: 'CAM-1', label: 'Main Entrance - PPE Detection', zone: 'PPE Detection', type: 'ppe', port: 5001 },
  { id: 'CAM-2', label: 'Restricted Area - Zone Monitoring', zone: 'Zone Monitoring', type: 'zone', port: 5002 },
];

const AI_ENGINE_URL = 'http://localhost:5001';

const CameraFeed = ({ camera, violation, scannerActive, activeScannerMode, onMaximize }) => {
  const [alive, setAlive] = useState(true);
  const streamUrl = `http://localhost:${camera.port}/video_feed/${camera.id}`;

  const isScanningSlot = camera.id === 'CAM-1' && scannerActive;

  return (
    <div 
      onClick={() => !isScanningSlot && onMaximize(camera)}
      className={`camera-feed group cursor-pointer transition-all duration-300 ${violation ? 'glow-red ring-2 ring-danger-500 ring-opacity-70' : 'hover:glow-blue'} ${isScanningSlot ? 'ring-2 ring-primary-500 shadow-glow-primary' : ''}`}
    >
      {/* Camera header bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isScanningSlot ? 'bg-primary-500 animate-ping' : alive ? 'bg-success-500 animate-pulse' : 'bg-danger-500 animate-pulse'}`} />
          <span className="text-xs font-bold text-white">{camera.id}</span>
          <span className="text-xs text-slate-400">• {isScanningSlot ? `QR ${activeScannerMode.toUpperCase()}` : camera.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {camera.zone === 'Restricted' && (
            <span className="text-xs text-warning-500 font-semibold">⚠ RESTRICTED</span>
          )}
          <Maximize2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {isScanningSlot ? (
        <div className="absolute inset-0 z-20 bg-slate-900 flex flex-col items-center justify-center gap-4 animate-pulse">
          <div className="relative">
             <Camera className="w-12 h-12 text-primary-500" />
             <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
          </div>
          <div className="text-center">
            <p className="text-primary-400 text-sm font-black tracking-tighter uppercase">Scanner Active</p>
            <p className="text-slate-500 text-[10px] font-bold tracking-widest uppercase">Check dashboard sidebar</p>
          </div>
        </div>
      ) : (
        <img
          src={streamUrl}
          alt={`${camera.id} Live Feed`}
          className="w-full h-full object-cover"
          style={{ display: alive ? 'block' : 'none' }}
          onError={() => setAlive(false)}
          onLoad={() => setAlive(true)}
        />
      )}

      {/* Fallback placeholder if stream is offline */}
      {!alive && !isScanningSlot && (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-dark-950 min-h-[180px]">
          <Camera className="w-10 h-10 text-danger-600 mb-3" />
          <p className="text-slate-500 text-sm font-medium">{camera.id} – Connecting…</p>
          <p className="text-slate-600 text-xs mt-1">{camera.zone}</p>
        </div>
      )}

      {/* Violation overlay */}
      {violation && !isScanningSlot && (
        <div className="absolute inset-0 bg-danger-500/10 border-2 border-danger-500 rounded-lg flex items-end">
          <div className="w-full p-3 bg-gradient-to-t from-black/90 to-transparent">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-danger-400 animate-pulse" />
              <span className="text-danger-400 text-xs font-bold">PPE VIOLATION DETECTED</span>
            </div>
            <p className="text-slate-300 text-xs mt-1 truncate">{violation.violationType}</p>
          </div>
        </div>
      )}

      {/* Bottom status bar */}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {isScanningSlot ? (
               <span className="text-primary-500 font-bold">MODE: IDENTITY SCAN</span>
            ) : alive ? (
              <span className="flex items-center gap-1">
                <Wifi className="w-3 h-3 text-success-500" /> LIVE
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <WifiOff className="w-3 h-3 text-slate-600" /> OFFLINE
              </span>
            )}
          </span>
          <span className="text-xs text-slate-500">{new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};

const CameraGrid = ({ violations = [], scannerActive, activeScannerMode }) => {
  const [maximizedCamera, setMaximizedCamera] = useState(null);
  const videoRef = useRef(null);

  const getViolationForCamera = (cameraId) =>
    violations.find((v) => v.cameraId === cameraId) || null;

  const handleMaximize = (camera) => {
    setMaximizedCamera(camera);
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if (videoRef.current.webkitRequestFullscreen) {
        videoRef.current.webkitRequestFullscreen();
      } else if (videoRef.current.msRequestFullscreen) {
        videoRef.current.msRequestFullscreen();
      }
    }
  };

  return (
    <>
      {/* Maximized Camera Modal */}
      {maximizedCamera && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="relative w-full max-w-6xl">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/80 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-white font-bold text-lg">{maximizedCamera.id}</span>
                <span className="text-slate-400">• {maximizedCamera.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleFullscreen}
                  className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700 text-white transition-colors"
                  title="Fullscreen"
                >
                  <Maximize className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setMaximizedCamera(null)}
                  className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700 text-white transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Video */}
            <div ref={videoRef} className="relative bg-slate-900 rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
              <img
                src={`http://localhost:${maximizedCamera.port}/video_feed/${maximizedCamera.id}`}
                alt={`${maximizedCamera.id} Live Feed`}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 px-6 py-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-between text-white">
                <span className="text-sm">{maximizedCamera.zone}</span>
                <span className="text-sm">{new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="live-indicator">Live Camera Feeds</span>
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">
            {CAMERA_LABELS.length} cameras active • AI-powered PPE detection
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge-danger">
            ⚠ {violations.length} Violation{violations.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* 1×2 Grid - Two cameras side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CAMERA_LABELS.map((camera) => (
          <CameraFeed
            key={camera.id}
            camera={camera}
            violation={getViolationForCamera(camera.id)}
            scannerActive={scannerActive}
            activeScannerMode={activeScannerMode}
            onMaximize={handleMaximize}
          />
        ))}
      </div>
    </div>
    </>
  );
};

export default CameraGrid;
