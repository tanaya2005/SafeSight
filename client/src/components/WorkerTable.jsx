import { useState } from 'react';
import { Users, Clock, UserX, Search, Filter } from 'lucide-react';

const WorkerTable = ({ workers = [], loading = false }) => {
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('All');

  const roles = ['All', 'Welder', 'Electrician', 'Operator', 'Supervisor', 'Technician', 'General'];

  const filtered = workers.filter((w) => {
    const matchesSearch =
      w.name?.toLowerCase().includes(search.toLowerCase()) ||
      w.role?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === 'All' || w.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const getTimeSince = (dateStr) => {
    if (!dateStr) return 'ΓÇö';
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ${diff % 60}m`;
  };

  const getRoleColor = (role) => {
    const colors = {
      Welder: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
      Electrician: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
      Operator: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
      Supervisor: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
      Technician: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
      General: 'text-slate-400 bg-slate-400/10 border-slate-400/30',
    };
    return colors[role] || colors.General;
  };

  if (loading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-slate-700 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-400" />
            <h2 className="text-lg font-bold text-white">Workers on Site</h2>
            <span className="badge-online">{workers.length} Active</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              id="worker-search"
              type="text"
              placeholder="Search workers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 py-2 text-sm"
            />
          </div>
          <select
            id="worker-role-filter"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="input-field py-2 text-sm w-auto min-w-[130px]"
          >
            {roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <UserX className="w-12 h-12 mb-3 opacity-50" />
            <p className="font-medium">No workers on site</p>
            <p className="text-sm mt-1 text-slate-600">Workers will appear here after QR check-in</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="table-header text-left">Worker</th>
                <th className="table-header text-left">Role</th>
                <th className="table-header text-left">Entry Time</th>
                <th className="table-header text-left">Duration</th>
                <th className="table-header text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {filtered.map((worker) => (
                <tr
                  key={worker._id}
                  className="hover:bg-slate-700/20 transition-colors duration-150"
                >
                  {/* Worker name + photo */}
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-700 flex-shrink-0 flex items-center justify-center">
                        {worker.photo ? (
                          <img
                            src={worker.photo}
                            alt={worker.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-bold text-slate-400">
                            {worker.name?.charAt(0)?.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">{worker.name}</p>
                        <p className="text-slate-500 text-xs">ID: {worker.workerId || worker.qrCode}</p>
                      </div>
                    </div>
                  </td>

                  {/* Role badge */}
                  <td className="table-cell">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(worker.role)}`}>
                      {worker.role}
                    </span>
                  </td>

                  {/* Entry time */}
                  <td className="table-cell">
                    <div className="flex items-center gap-1 text-slate-300">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span className="text-xs">
                        {worker.entryTime
                          ? new Date(worker.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : 'ΓÇö'}
                      </span>
                    </div>
                  </td>

                  {/* Duration */}
                  <td className="table-cell text-slate-400 text-xs">
                    {getTimeSince(worker.entryTime)}
                  </td>

                  {/* Status */}
                  <td className="table-cell">
                    <span className="badge-online">
                      <span className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse" />
                      On Site
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default WorkerTable;
