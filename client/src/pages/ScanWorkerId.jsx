import { useState } from 'react';
import Navbar from '../components/Navbar';
import QRScanner from '../components/QRScanner';
import { QrCode } from 'lucide-react';

const ScanWorkerId = () => {
  const [scannerActive, setScannerActive] = useState(false);
  const [activeScannerMode, setActiveScannerMode] = useState(null);

  const handleScannerActive = (active, mode) => {
    setScannerActive(active);
    if (active) setActiveScannerMode(mode);
    else setActiveScannerMode(null);
  };

  const onSuccess = () => {
    // Optionally reload or fetch data, but QRScanner usually shows toast
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="animate-fade-in flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
              <QrCode className="w-8 h-8 text-primary-500" />
              Scan <span className="text-gradient">Worker ID</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Scan QR codes for entry and exit tracking
            </p>
          </div>
        </div>

        {(() => {
          const role = localStorage.getItem('safesight_role') || 'supervisor';
          const showScanners = role === 'supervisor' || role === 'admin_qr' || role === 'admin_cctv';

          if (!showScanners) {
            return (
              <div className="text-slate-400 mt-10 text-center">
                You do not have permission to access QR Scanners.
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-8">
              <QRScanner mode="entry" onSuccess={onSuccess} onActiveChange={(active) => handleScannerActive(active, 'entry')} />
              <QRScanner mode="exit" onSuccess={onSuccess} onActiveChange={(active) => handleScannerActive(active, 'exit')} />
            </div>
          );
        })()}
      </main>
    </div>
  );
};

export default ScanWorkerId;
