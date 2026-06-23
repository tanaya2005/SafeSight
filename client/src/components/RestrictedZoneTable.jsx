import { Shield, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const RestrictedZoneTable = ({ zoneRecords = [], onApprove, onReject }) => {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="badge-online"><CheckCircle className="w-3 h-3" />Approved</span>;
      case 'rejected':
        return <span className="badge-danger"><XCircle className="w-3 h-3" />Rejected</span>;
      case 'pending':
        return (
          <span className="badge-warning">
            <AlertCircle className="w-3 h-3 animate-pulse" />Pending
          </span>
        );
      default:
        return <span className="badge-pending">{status}</span>;
    }
  };

  const getZoneColor = (zone) => {
    const colors = {
      'Welding Zone':     'text-orange-400',
      'Electrical Zone':  'text-yellow-400',
      'Control Room':     'text-purple-400',
      'Maintenance Zone': 'text-cyan-400',
      'Assembly Zone':    'text-blue-400',
    };
    return colors[zone] || 'text-slate-400';
  };

  return (
    <div className="card overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-warning-500" />
          <h2 className="text-lg font-bold text-white">Restricted Zone Access</h2>
          {zoneRecords.filter((r) => r.status === 'pending').length > 0 && (
            <span className="badge-warning animate-pulse">
              {zoneRecords.filter((r) => r.status === 'pending').length} Pending
            </span>
          )}
        </div>
        <p className="text-slate-500 text-xs mt-1">
          Supervisor approval required for restricted zone entry
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {zoneRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <Shield className="w-12 h-12 mb-3 opacity-50" />
            <p className="font-medium">No zone access requests</p>
            <p className="text-sm mt-1 text-slate-600">Zone requests will appear here in real time</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="table-header text-left">Worker</th>
                <th className="table-header text-left">Zone</th>
                <th className="table-header text-left">Request Time</th>
                <th className="table-header text-left">PPE</th>
                <th className="table-header text-left">Status</th>
                <th className="table-header text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {zoneRecords.map((record) => (
                <tr
                  key={record._id}
                  className={`hover:bg-slate-700/20 transition-colors duration-150 ${
                    record.status === 'pending' ? 'bg-warning-500/5' : ''
                  }`}
                >
                  {/* Worker */}
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-slate-400">
                          {record.workerId?.name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">
                          {record.workerId?.name || 'Unknown'}
                        </p>
                        <p className="text-slate-500 text-xs">
                          {record.workerId?.role || '—'}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Zone */}
                  <td className="table-cell">
                    <span className={`font-semibold text-sm ${getZoneColor(record.zoneName)}`}>
                      {record.zoneName}
                    </span>
                  </td>

                  {/* Time */}
                  <td className="table-cell">
                    <div className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span className="text-xs">
                        {new Date(record.entryTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </td>

                  {/* PPE Status */}
                  <td className="table-cell">
                    {record.ppeCompliant ? (
                      <span className="badge-online"><CheckCircle className="w-3 h-3" />Compliant</span>
                    ) : (
                      <span className="badge-danger"><XCircle className="w-3 h-3" />Non-Compliant</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="table-cell">{getStatusBadge(record.status)}</td>

                  {/* Action buttons */}
                  <td className="table-cell">
                    {record.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button
                          id={`approve-${record._id}`}
                          onClick={() => onApprove(record._id)}
                          className="btn-success text-xs px-3 py-1"
                        >
                          Approve
                        </button>
                        <button
                          id={`reject-${record._id}`}
                          onClick={() => onReject(record._id)}
                          className="btn-danger text-xs px-3 py-1"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
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

export default RestrictedZoneTable;
