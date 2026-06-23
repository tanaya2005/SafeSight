import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import { getWorkers, deleteWorker } from '../services/api';
import { api } from '../services/api';
import { Plus, Trash2, UserPlus, Users, QrCode, Download, Printer, X, Camera } from 'lucide-react';
import toast from 'react-hot-toast';

const ROLES = ['Welder', 'Electrician', 'Operator', 'Supervisor', 'Technician', 'General'];
const ZONES = ['Welding Zone', 'Electrical Zone', 'Control Room', 'Maintenance Zone', 'Assembly Zone'];
const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

const QRCard = ({ worker, onClose }) => {
  const qrUrl = `${BASE_URL}${worker.qrImage}`;
  const handlePrint = () => {
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>QR Card - ${worker.name}</title>
      <style>
        body { font-family: sans-serif; text-align: center; padding: 40px; background:#fff; color:#111; }
        img  { width: 240px; height: 240px; display:block; margin:0 auto 16px; }
        h2   { margin:0 0 4px; font-size:22px; }
        p    { margin:4px 0; color:#555; }
        code { background:#f4f4f4; padding:4px 10px; border-radius:6px; font-size:14px; }
      </style></head><body>
        <img src="${qrUrl}" />
        <h2>${worker.name}</h2>
        <p>${worker.role}</p>
        <code>${worker.workerId}</code>
      </body></html>
    `);
    win.document.close(); win.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-4">
      <div className="card max-w-sm w-full p-8 text-center relative shadow-2xl border border-white/10">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        <div className="flex items-center justify-center gap-2 mb-6">
          <QrCode className="w-6 h-6 text-primary-400" />
          <h3 className="text-xl font-black text-white">QR Registered</h3>
        </div>
        <div className="bg-white rounded-2xl p-4 inline-block mb-6 shadow-glow transition-transform hover:scale-105">
          <img src={qrUrl} alt="QR" className="w-48 h-48 object-contain" />
        </div>
        <div className="space-y-1 mb-8">
          <p className="text-white font-black text-2xl">{worker.name}</p>
          <p className="text-primary-400 font-bold uppercase tracking-widest text-xs">{worker.role}</p>
          <code className="mt-4 block text-slate-400 text-xs bg-slate-900 px-4 py-2 rounded-lg border border-white/5">{worker.workerId}</code>
        </div>
        <div className="flex gap-3">
          <button onClick={handlePrint} className="flex-1 btn-primary flex items-center justify-center gap-2 py-3"><Printer className="w-4 h-4" /> Print</button>
          <a href={qrUrl} download={`${worker.workerId}.png`} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-800 text-white font-bold text-sm hover:bg-slate-700 transition-all border border-white/5"><Download className="w-4 h-4" /> Save</a>
        </div>
      </div>
    </div>
  );
};

const Workers = () => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', role: 'General', authorizedZones: [], photo: '' });
  const [submitting, setSubmitting] = useState(false);
  const [newWorker, setNewWorker] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const fetchWorkers = async () => {
    try {
      const res = await getWorkers();
      setWorkers(res.data.data);
    } catch { toast.error('Worker load failed'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchWorkers(); }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
      setShowCamera(true);
    } catch (err) {
      toast.error('Camera access denied');
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(async (blob) => {
      setCapturedPhoto(URL.createObjectURL(blob));
      stopCamera();
      await uploadPhotoToCloudinary(blob);
    }, 'image/jpeg', 0.9);
  };

  const uploadPhotoToCloudinary = async (blob) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', blob, 'worker-photo.jpg');
      const res = await api.post('/workers/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setForm({ ...form, photo: res.data.url });
      toast.success('Photo uploaded!');
    } catch (err) {
      toast.error('Photo upload failed');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    setForm({ ...form, photo: '' });
    startCamera();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name required');
    if (!form.photo) return toast.error('Photo required - please capture worker photo');
    setSubmitting(true);
    try {
      const res = await api.post('/workers/create', { ...form, name: form.name.trim() });
      toast.success('Worker Created!');
      setForm({ name: '', role: 'General', authorizedZones: [], photo: '' });
      setCapturedPhoto(null);
      setShowForm(false); setNewWorker(res.data.data);
      fetchWorkers();
    } catch (err) { toast.error(err.response?.data?.message || 'Error creating worker'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete ${name}?`)) return;
    try {
      await deleteWorker(id);
      setWorkers(w => w.filter(x => x._id !== id));
      toast.success('Deleted');
    } catch { toast.error('Delete failed'); }
  };

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      {newWorker && <QRCard worker={newWorker} onClose={() => setNewWorker(null)} />}
      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <Users className="w-10 h-10 text-primary-500" />
              Worker <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-600">Registry</span>
            </h1>
            <p className="text-slate-500 font-medium mt-2">{workers.length} active monitors</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary px-8 py-4 text-base flex items-center gap-2 shadow-2xl shadow-primary-900/40">
            <UserPlus className="w-5 h-5" /> Add Worker
          </button>
        </div>

        {showForm && (
          <div className="card p-8 mb-12 border-primary-500/20 shadow-2xl animate-slide-up">
            <h3 className="text-xl font-black text-white mb-6">Register New Personnel</h3>
            <form onSubmit={handleCreate} className="space-y-6">
              {/* Photo Capture Section */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Worker Photo</label>
                {!showCamera && !capturedPhoto && (
                  <button type="button" onClick={startCamera} className="w-full py-8 border-2 border-dashed border-slate-800 rounded-xl hover:border-primary-500 transition-all flex flex-col items-center justify-center gap-3 group">
                    <Camera className="w-12 h-12 text-slate-700 group-hover:text-primary-500 transition-colors" />
                    <span className="text-slate-500 font-bold">Click to Capture Photo</span>
                  </button>
                )}
                {showCamera && (
                  <div className="relative">
                    <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl border-2 border-primary-500" />
                    <div className="flex gap-3 mt-4">
                      <button type="button" onClick={capturePhoto} className="flex-1 btn-primary py-3">
                        <Camera className="w-5 h-5 inline mr-2" /> Capture
                      </button>
                      <button type="button" onClick={stopCamera} className="px-6 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                {capturedPhoto && (
                  <div className="relative">
                    <img src={capturedPhoto} alt="Captured" className="w-full rounded-xl border-2 border-emerald-500" />
                    {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl"><span className="text-white font-bold">Uploading...</span></div>}
                    <button type="button" onClick={retakePhoto} className="mt-4 px-6 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all">
                      <Camera className="w-4 h-4 inline mr-2" /> Retake Photo
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Full Name</label>
                  <input type="text" placeholder="John Doe" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-field py-4" required />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Role</label>
                  <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="input-field py-4">
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Access Zones</label>
                <div className="flex flex-wrap gap-2">
                  {ZONES.map(z => (
                    <button key={z} type="button" onClick={() => setForm(f => ({...f, authorizedZones: f.authorizedZones.includes(z) ? f.authorizedZones.filter(x => x!==z) : [...f.authorizedZones, z]}))} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${form.authorizedZones.includes(z) ? 'bg-primary-500 border-primary-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'}`}>
                      {z}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="submit" disabled={submitting || !form.photo} className="btn-primary px-10 py-4 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {submitting ? 'Creating...' : <><QrCode className="w-5 h-5" /> Generate Identity</>}
                </button>
                <button type="button" onClick={() => { setShowForm(false); stopCamera(); setCapturedPhoto(null); setForm({ name: '', role: 'General', authorizedZones: [], photo: '' }); }} className="px-8 py-4 text-slate-500 hover:text-white font-bold transition-all">Cancel</button>
              </div>
            </form>
          </div>
        )}



        <div className="card overflow-hidden shadow-2xl border-white/5">
          <div className="p-6 border-b border-white/5 bg-slate-900/20">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">Registered Staff</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="bg-slate-900/40 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-white/5"><th className="p-6">Worker</th><th className="p-6">Role</th><th className="p-6 text-center">Photo</th><th className="p-6 text-center">QR Card</th><th className="p-6 text-center">Status</th><th className="p-6">Zones</th><th className="p-6 text-center">Action</th></tr></thead>
              <tbody className="divide-y divide-white/5">
                {workers.map(w => (
                  <tr key={w._id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-6"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-950 flex items-center justify-center font-black text-white">{w.name.charAt(0)}</div><span className="font-bold text-white">{w.name}</span></div></td>
                    <td className="p-6 text-slate-400 font-medium text-sm">{w.role}</td>
                    <td className="p-6 text-center">{w.photo ? <img src={w.photo} alt={w.name} className="w-12 h-12 rounded-lg object-cover mx-auto border-2 border-primary-500/20" /> : <span className="text-slate-600 text-xs">No photo</span>}</td>
                    <td className="p-6 text-center">{w.qrImage ? <a href={`${BASE_URL}${w.qrImage}`} target='_blank' rel='noreferrer' className="inline-block p-1 bg-white rounded-lg hover:scale-110 transition-transform"><img src={`${BASE_URL}${w.qrImage}`} className="w-8 h-8 object-contain" alt='QR'/></a> : '-'}</td>
                    <td className="p-6 text-center">{w.isInside ? <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black px-3 py-1 rounded-full border border-emerald-500/20">SITE-IN</span> : <span className="bg-slate-800 text-slate-500 text-[10px] font-black px-3 py-1 rounded-full border border-slate-700">OFF-SITE</span>}</td>
                    <td className="p-6"><div className="flex flex-wrap gap-1">{w.authorizedZones.slice(0,2).map(z => <span key={z} className="text-[9px] bg-slate-900 text-slate-500 px-2 py-0.5 rounded border border-white/5">{z}</span>)}{w.authorizedZones.length > 2 && <span className="text-[9px] text-slate-700">+{w.authorizedZones.length-2}</span>}</div></td>
                    <td className="p-6 text-center"><button onClick={() => handleDelete(w._id, w.name)} className="text-slate-600 hover:text-danger-500 transition-colors p-2"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Workers;
