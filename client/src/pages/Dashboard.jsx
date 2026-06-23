import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import Navbar from '../components/Navbar';
import CameraGrid from '../components/CameraGrid';
import WorkerTable from '../components/WorkerTable';
import RestrictedZoneTable from '../components/RestrictedZoneTable';
import PPEConfigPanel from '../components/PPEConfigPanel';
import { getWorkersInside, getActiveZoneAccess, approveZoneAccess } from '../services/api';
import { AlertTriangle, Activity, Users, Shield, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const getTranslatedMessage = (violationType, lang) => {
  if (!violationType) return 'Warning. PPE violation detected.';
  
  // Handle zone-specific alerts - DYNAMIC for any zone name
  if (violationType.includes('Zone Entry') || violationType.includes('Zone Intrusion')) {
    // Extract zone name
    const zoneName = violationType.replace(' Entry', '').replace(' Intrusion', '').trim();
    
    // Dynamic zone alerts based on zone name keywords
    if (zoneName.toLowerCase().includes('high')) {
      if (lang === 'hi-IN') return `चेतावनी! कर्मचारी ${zoneName} में प्रवेश कर गया है। तुरंत निकासी आवश्यक है।`;
      if (lang === 'mr-IN') return `चेतावणी! कामगार ${zoneName} मध्ये प्रवेश केला आहे। तात्काळ बाहेर पडणे आवश्यक आहे।`;
      return `Warning! Worker entered ${zoneName}. Immediate evacuation required.`;
    }
    
    if (zoneName.toLowerCase().includes('low') || zoneName.toLowerCase().includes('danger')) {
      if (lang === 'hi-IN') return `सतर्कता! ${zoneName} में कर्मचारी का पता चला। कृपया सावधान रहें।`;
      if (lang === 'mr-IN') return `सावधान! ${zoneName} मध्ये कामगार आढळला. कृपया सावध रहा।`;
      return `Alert! Worker detected in ${zoneName}. Please be cautious.`;
    }
    
    if (zoneName.toLowerCase().includes('hot') || zoneName.toLowerCase().includes('chamber')) {
      if (lang === 'hi-IN') return `चेतावनी! ${zoneName} में प्रवेश। अत्यधिक गर्मी का खतरा। तुरंत बाहर निकलें।`;
      if (lang === 'mr-IN') return `चेतावणी! ${zoneName} मध्ये प्रवेश. अत्यधिक उष्णतेचा धोका. ताबडतोब बाहेर पडा.`;
      return `Warning! Entered ${zoneName}. Extreme heat danger. Evacuate immediately.`;
    }
    
    // Generic for any other zone
    if (lang === 'hi-IN') return `चेतावनी! ${zoneName} में प्रवेश हुआ है। कृपया सावधान रहें।`;
    if (lang === 'mr-IN') return `चेतावणी! ${zoneName} मध्ये प्रवेश झाला आहे. कृपया सावध रहा.`;
    return `Warning! Worker entered ${zoneName}. Please be cautious.`;
  }

  // Handle PPE violations
  let item = violationType.toLowerCase().replace('no_', '').replace('no ', '');
  if (item === 'helmet') item = 'helmet';
  else if (item === 'vest') item = 'safety vest';
  else if (item === 'goggle' || item === 'goggles') item = 'safety goggles';
  else if (item === 'gloves') item = 'gloves';
  else if (item === 'boots') item = 'safety boots';

  if (lang === 'hi-IN') {
    const itemHi = {
      'helmet': 'हेलमेट',
      'safety vest': 'सुरक्षा जैकेट',
      'safety goggles': 'सुरक्षा चश्मा',
      'gloves': 'दस्ताने',
      'safety boots': 'सुरक्षा जूते'
    }[item] || item;
    return `चेतावनी। मजदूर ने ${itemHi} नहीं पहना है। कृपया तुरंत ${itemHi} पहनें।`;
  } else if (lang === 'mr-IN') {
    const itemMr = {
      'helmet': 'हेल्मेट',
      'safety vest': 'सुरक्षा जॅकेट',
      'safety goggles': 'सुरक्षा चष्मा',
      'gloves': 'हातमोजे',
      'safety boots': 'सुरक्षा बूट'
    }[item] || item;
    return `इशारा. कामगाराने ${itemMr} घातलेले नाही. कृपया लगेच ${itemMr} घाला.`;
  }
  
  return `Warning. Person detected without ${item}. Please wear ${item} immediately.`;
};

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="card p-4 flex items-center gap-4 animate-fade-in">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  </div>
);

const ViolationAlert = ({ violation, onDismiss, currentLang }) => {
  const msg = getTranslatedMessage(violation.violationType, currentLang);
  return (
  <div className="alert-toast flex items-start gap-3">
    <AlertTriangle className="w-5 h-5 text-danger-400 flex-shrink-0 mt-0.5 animate-pulse" />
    <div className="flex-1 min-w-0">
      <p className="font-bold text-danger-400 text-sm">PPE Violation Detected!</p>
      <p className="text-slate-300 text-xs mt-0.5 truncate">
        {violation.cameraId} • {msg}
      </p>
      <p className="text-slate-500 text-xs">
        Confidence: {Math.round((violation.confidence || 0.85) * 100)}%
      </p>
    </div>
    <button
      onClick={onDismiss}
      className="text-slate-500 hover:text-slate-300 text-xs flex-shrink-0"
    >
      ✕
    </button>
  </div>
)};

const Dashboard = () => {
  const [workersInside, setWorkersInside] = useState([]);
  const [zoneRecords, setZoneRecords] = useState([]);
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [audioLang, setAudioLang] = useState('en-US');
  const [audioEnabled, setAudioEnabled] = useState(false);
  
  const audioLangRef = useRef(audioLang);
  const audioEnabledRef = useRef(audioEnabled);
  
  const audioViolationsQueueRef = useRef([]);
  const audioTimeoutRef = useRef(null);
  const lastAudioTimeRef = useRef(0);

  useEffect(() => {
    audioLangRef.current = audioLang;
  }, [audioLang]);

  useEffect(() => {
    audioEnabledRef.current = audioEnabled;
  }, [audioEnabled]);

  const handleEnableAudio = () => {
    setAudioEnabled((prev) => !prev);
    if (!audioEnabled) {
      // Browsers require a direct interaction to unlock audio
      const audio = new window.Audio('data:audio/mp3;base64,//OExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq');
      audio.play().catch(() => {});
      toast.success('Audio Alerts Enabled', { icon: '🔊' });
      
      // Test audio immediately
      setTimeout(() => {
        const testUrl = `http://localhost:5001/api/audio?text=${encodeURIComponent('Audio alerts are now enabled')}&lang=${audioLangRef.current}`;
        const testAudio = new window.Audio(testUrl);
        testAudio.volume = 0.8;
        testAudio.play().catch(e => {
          console.error("Test audio failed:", e);
          toast.error('Audio test failed. Check browser permissions.');
        });
      }, 500);
    } else {
      toast('Audio Alerts Disabled', { icon: '🔇' });
    }
  };

  const processAudioQueue = useCallback(() => {
    console.log('🔊 Processing audio queue. Enabled:', audioEnabledRef.current, 'Queue length:', audioViolationsQueueRef.current.length);
    
    if (!audioEnabledRef.current || audioViolationsQueueRef.current.length === 0) {
      audioTimeoutRef.current = null;
      return;
    }

    const now = Date.now();
    const timeSinceLast = now - lastAudioTimeRef.current;
    
    // Enforce 15 seconds cooldown interval
    if (timeSinceLast < 15000) {
      const waitTime = 15000 - timeSinceLast;
      console.log(`⏳ Audio cooldown active. Waiting ${waitTime}ms`);
      audioTimeoutRef.current = setTimeout(processAudioQueue, waitTime);
      return;
    }

    const lang = audioLangRef.current;
    const queue = audioViolationsQueueRef.current;
    let textToPlay = '';
    
    // Check if there is any zone violation in the queue
    const zoneViolation = queue.find(v => v.violationType && (v.violationType.includes('Zone Entry') || v.violationType.includes('Zone Intrusion')));
    
    if (zoneViolation) {
      textToPlay = getTranslatedMessage(zoneViolation.violationType, lang);
    } else if (queue.length > 1) {
      if (lang === 'hi-IN') {
        textToPlay = 'चेतावनी। कई मजदूरों ने सुरक्षा उपकरण नहीं पहने हैं। कृपया तुरंत सुरक्षा उपकरण पहनें।';
      } else if (lang === 'mr-IN') {
        textToPlay = 'इशारा. अनेक कामगारांनी सुरक्षा उपकरणे घातलेली नाहीत. कृपया लगेच सुरक्षा उपकरणे घाला.';
      } else {
        textToPlay = 'Warning. Multiple workers detected without safety equipment. Please wear safety equipment immediately.';
      }
    } else {
      textToPlay = getTranslatedMessage(queue[0].violationType, lang);
    }
    
    console.log('🔊 Playing audio:', textToPlay);
    const audioUrl = `http://localhost:5001/api/audio?text=${encodeURIComponent(textToPlay)}&lang=${lang}`;
    console.log('🔊 Audio URL:', audioUrl);
    
    const audio = new window.Audio(audioUrl);
    audio.volume = 0.8; // Set volume to 80%
    
    audio.addEventListener('canplaythrough', () => {
      console.log('🔊 Audio ready to play');
      audio.play().catch(e => {
        console.error("Audio playback failed:", e);
        toast.error('Audio playback blocked. Please enable audio in browser settings.');
      });
    });
    
    audio.addEventListener('error', (e) => {
      console.error("Audio loading failed:", e);
      toast.error('Failed to load audio alert.');
    });
    
    audio.load(); // Start loading the audio

    lastAudioTimeRef.current = Date.now();
    audioViolationsQueueRef.current = [];
    audioTimeoutRef.current = null;
  }, []);

  const queueViolationForAudio = useCallback((violationData) => {
    console.log('🔊 Queueing violation for audio:', violationData);
    console.log('Audio enabled:', audioEnabledRef.current);
    audioViolationsQueueRef.current.push(violationData);
    if (!audioTimeoutRef.current) {
      // Small 800ms window to group simultaneous violations together
      audioTimeoutRef.current = setTimeout(processAudioQueue, 800);
    }
  }, [processAudioQueue]);


  const [dashboardStats, setDashboardStats] = useState(null);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      const { getDashboardStats } = await import('../services/api');
      const [workersRes, zonesRes, statsRes] = await Promise.all([
        getWorkersInside(),
        getActiveZoneAccess(),
        getDashboardStats()
      ]);
      setWorkersInside(workersRes.data.data);
      setZoneRecords(zonesRes.data.data);
      setDashboardStats(statsRes.data.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Socket.IO real-time events
  useEffect(() => {
    const sock = io(SOCKET_URL);
    setSocket(sock);

    sock.on('connect', () => console.log('🔌 Socket connected'));

    sock.on('ppe_violation', (data) => {
      setViolations((prev) => [data, ...prev.slice(0, 4)]);
      const lang = audioLangRef.current;
      const msg = getTranslatedMessage(data.violationType, lang);

      // Limit to max 3 toasts on screen
      toast.error(`⚠ ${msg} (${data.cameraId})`, {
        duration: 4000,
        icon: '🚨',
        position: 'bottom-right',
        style: {
          maxWidth: '350px',
        },
      });
      queueViolationForAudio(data);
    });

    sock.on('worker_entry', ({ worker }) => {
      setWorkersInside((prev) => {
        const exists = prev.find((w) => w._id === worker._id);
        return exists ? prev : [worker, ...prev];
      });
      toast.success(`${worker.name} has entered the facility`, { icon: '✅' });
    });

    sock.on('worker_exit', ({ worker }) => {
      setWorkersInside((prev) => prev.filter((w) => w._id !== worker._id));
      toast(`${worker.name} has left the facility`, { icon: '👋' });
    });

    sock.on('zone_access_request', (data) => {
      setZoneRecords((prev) => [
        {
          _id: data.requestId,
          workerId: data.worker,
          zoneName: data.zoneName,
          entryTime: data.timestamp,
          ppeCompliant: data.ppeCompliant,
          status: 'pending',
        },
        ...prev,
      ]);
      toast(
        `🔒 ${data.worker.name} → ${data.zoneName} — Awaiting approval`,
        { duration: 8000 }
      );
    });

    return () => sock.disconnect();
  }, []);

  const handleApprove = async (requestId) => {
    try {
      await approveZoneAccess(requestId, true);
      setZoneRecords((prev) =>
        prev.map((r) => r._id === requestId ? { ...r, status: 'approved', approvedBySupervisor: true } : r)
      );
      toast.success('Zone access approved');
    } catch {
      toast.error('Failed to approve access');
    }
  };

  const handleReject = async (requestId) => {
    try {
      await approveZoneAccess(requestId, false);
      setZoneRecords((prev) =>
        prev.map((r) => r._id === requestId ? { ...r, status: 'rejected', approvedBySupervisor: false } : r)
      );
      toast.error('Zone access rejected');
    } catch {
      toast.error('Failed to reject access');
    }
  };

  const pendingZones = zoneRecords.filter((r) => r.status === 'pending').length;

  return (
    <div className="min-h-screen">
      <Navbar violationCount={violations.length} />

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Page header */}
        <div className="animate-fade-in flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-extrabold text-white">
              Safety <span className="text-gradient">Control Room</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Real-time industrial safety monitoring dashboard
            </p>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleEnableAudio}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded border transition-colors ${audioEnabled ? 'bg-success-500/20 text-success-400 border-success-500/50' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'}`}
              >
                {audioEnabled ? '🔊 Audio ON' : '🔇 Enable Audio'}
              </button>
              
              <div className="flex items-center gap-2 border-l border-slate-700 pl-3">
                <span className="text-slate-400 text-xs uppercase tracking-wide">Language:</span>
                <select
                  value={audioLang}
                  onChange={(e) => setAudioLang(e.target.value)}
                  className="bg-slate-800 text-white text-sm rounded px-3 py-1.5 border border-slate-700 outline-none hover:border-slate-600 appearance-none min-w-[120px]"
                >
                  <option value="en-US">English</option>
                  <option value="hi-IN">Hindi</option>
                  <option value="mr-IN">Marathi</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard
            icon={Users}
            label="Workers on Site"
            value={workersInside.length}
            color="bg-primary-600/20 text-primary-400"
          />
          <StatCard
            icon={Shield}
            label="Zone Requests"
            value={pendingZones}
            color="bg-warning-500/20 text-warning-500"
          />
          <StatCard
            icon={AlertTriangle}
            label="Total Zone Violations"
            value={dashboardStats?.zoneAnalytics?.todayZoneViolations || 0}
            color="bg-danger-500/20 text-danger-500"
          />
          <StatCard
            icon={Activity}
            label="Most Frequent Violator"
            value={dashboardStats?.zoneAnalytics?.frequentWorker || 'N/A'}
            color="bg-orange-500/20 text-orange-400"
          />
          <StatCard
            icon={Zap}
            label="Cameras Active"
            value="2"
            color="bg-success-500/20 text-success-500"
          />
        </div>

        {/* Main content: Camera grid */}
        {(() => {
          const role = localStorage.getItem('safesight_role') || 'supervisor';
          const showCameras = role === 'supervisor' || role === 'admin_cctv';

          return (
            <div className="grid grid-cols-1 gap-6">
              {/* Camera feeds */}
              {showCameras && (
                <div className="w-full">
                  <CameraGrid violations={violations} scannerActive={false} activeScannerMode={null} />
                </div>
              )}
            </div>
          );
        })()}

        {/* Tables */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <WorkerTable workers={workersInside} loading={loading} />
          <RestrictedZoneTable
            zoneRecords={zoneRecords}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        </div>

        {/* PPE Configuration Panel - Only for Supervisor */}
        {(() => {
          const role = localStorage.getItem('safesight_role') || 'supervisor';
          if (role === 'supervisor') {
            return <PPEConfigPanel />;
          }
          return null;
        })()}
      </main>
    </div>
  );
};

export default Dashboard;
