import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import RestrictedZoneTable from '../components/RestrictedZoneTable';
import { getZoneAccess, approveZoneAccess } from '../services/api';
import { Shield, ShieldAlert, ShieldCheck, ShieldX, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const ZONE_STATS = [
  { name: 'Welding Zone', risk: 'High', workers: 0, color: 'text-orange-400 bg-orange-400/10 border-orange-400/30' },
  { name: 'Electrical Zone', risk: 'High', workers: 0, color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' },
  { name: 'Control Room', risk: 'Medium', workers: 0, color: 'text-purple-400 bg-purple-400/10 border-purple-400/30' },
  { name: 'Maintenance Zone', risk: 'Medium', workers: 0, color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30' },
  { name: 'Assembly Zone', risk: 'Low', workers: 0, color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
];

const getRiskIcon = (risk) => {
  if (risk === 'High') return <ShieldAlert className="w-5 h-5" />;
  if (risk === 'Medium') return <Shield className="w-5 h-5" />;
  return <ShieldCheck className="w-5 h-5" />;
};

const RestrictedZones = () => {
  const [zoneRecords, setZoneRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchZones = async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const res = await getZoneAccess();
      setZoneRecords(res.data.data);
    } catch {
      toast.error('Failed to load zone records');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchZones(); }, []);

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

  // Compute worker counts per zone from approved records
  const zonesWithCounts = ZONE_STATS.map((zone) => ({
    ...zone,
    workers: zoneRecords.filter(
      (r) => r.zoneName === zone.name && r.status === 'approved'
    ).length,
  }));

  const pendingCount = zoneRecords.filter((r) => r.status === 'pending').length;
  const rejectedCount = zoneRecords.filter((r) => r.status === 'rejected').length;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
              <Shield className="w-7 h-7 text-warning-500" />
              Restricted <span className="text-gradient">Zone Control</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Manage and monitor restricted zone access with real-time supervisor approval
            </p>
          </div>
          <button
            id="refresh-zones-btn"
            onClick={() => fetchZones(true)}
            className={`p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all ${refreshing ? 'animate-spin' : ''}`}
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Zone Legend */}
        <div className="card p-4 animate-fade-in">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-warning-500" />
            Zone Color Legend
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-red-500/20">
              <div className="w-8 h-8 rounded bg-red-500/20 border-2 border-red-500 flex items-center justify-center">
                <div className="w-4 h-4 rounded bg-red-500"></div>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">High Danger Zone</p>
                <p className="text-red-400 text-xs">Critical Severity - Immediate Alert</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-orange-500/20">
              <div className="w-8 h-8 rounded bg-orange-500/20 border-2 border-orange-500 flex items-center justify-center">
                <div className="w-4 h-4 rounded bg-orange-500"></div>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Low Danger / Hot Chamber Zone</p>
                <p className="text-orange-400 text-xs">Warning Severity - Caution Required</p>
              </div>
            </div>
          </div>
          <p className="text-slate-400 text-xs mt-3">
            Zones are monitored in real-time. Workers entering restricted zones trigger automatic alerts to supervisors.
          </p>
        </div>

        {/* Zone cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 animate-fade-in">
          {zonesWithCounts.map((zone) => (
            <div
              key={zone.name}
              className={`card p-4 border ${zone.color.includes('orange') ? 'border-orange-500/20' : zone.color.includes('yellow') ? 'border-yellow-500/20' : zone.color.includes('purple') ? 'border-purple-500/20' : zone.color.includes('cyan') ? 'border-cyan-500/20' : 'border-blue-500/20'}`}
            >
              <div className={`flex items-center gap-1 mb-2 ${zone.color.split(' ')[0]}`}>
                {getRiskIcon(zone.risk)}
              </div>
              <p className="text-white text-sm font-bold leading-tight">{zone.name}</p>
              <p className={`text-xs mt-1 ${zone.color.split(' ')[0]} opacity-70`}>
                Risk: {zone.risk}
              </p>
              <p className="text-slate-400 text-xs mt-2">
                <span className="font-bold text-white">{zone.workers}</span> workers active
              </p>
            </div>
          ))}
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Pending Approvals', value: pendingCount, icon: Shield, color: 'text-warning-500 bg-warning-500/10' },
            { label: 'Approved Today', value: zoneRecords.filter((r) => r.status === 'approved').length, icon: ShieldCheck, color: 'text-success-500 bg-success-500/10' },
            { label: 'Rejected', value: rejectedCount, icon: ShieldX, color: 'text-danger-500 bg-danger-500/10' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-slate-400 text-xs">{label}</p>
                <p className="text-2xl font-bold text-white">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Full zone access table */}
        <RestrictedZoneTable
          zoneRecords={zoneRecords}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </main>
    </div>
  );
};

export default RestrictedZones;
