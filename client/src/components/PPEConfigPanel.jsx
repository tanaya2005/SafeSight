import { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, Upload, Check, X } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

const PPEConfigPanel = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    displayName: '',
    category: 'custom',
    icon: '🦺',
    enabled: true,
    required: true,
  });

  const categories = {
    head: { label: 'Head Protection', color: 'bg-blue-500/20 text-blue-400' },
    eye: { label: 'Eye Protection', color: 'bg-cyan-500/20 text-cyan-400' },
    hand: { label: 'Hand Protection', color: 'bg-green-500/20 text-green-400' },
    body: { label: 'Body Protection', color: 'bg-yellow-500/20 text-yellow-400' },
    foot: { label: 'Foot Protection', color: 'bg-orange-500/20 text-orange-400' },
    custom: { label: 'Custom', color: 'bg-purple-500/20 text-purple-400' },
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const res = await api.get('/ppe-config');
      setConfigs(res.data.data);
    } catch (err) {
      toast.error('Failed to load PPE configurations');
    } finally {
      setLoading(false);
    }
  };

  const toggleEnabled = async (id) => {
    try {
      const res = await api.patch(`/ppe-config/${id}/toggle`);
      setConfigs(configs.map(c => c._id === id ? res.data.data : c));
      toast.success('PPE configuration updated');
    } catch (err) {
      toast.error('Failed to update configuration');
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/ppe-config', newItem);
      setConfigs([...configs, res.data.data]);
      setShowAddForm(false);
      setNewItem({ displayName: '', category: 'custom', icon: '🦺', enabled: true, required: true });
      toast.success('New PPE item added');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add PPE item');
    }
  };

  const deleteItem = async (id) => {
    if (!confirm('Are you sure you want to delete this PPE item?')) return;
    try {
      await api.delete(`/ppe-config/${id}`);
      setConfigs(configs.filter(c => c._id !== id));
      toast.success('PPE item deleted');
    } catch (err) {
      toast.error('Failed to delete PPE item');
    }
  };

  if (loading) {
    return <div className="card p-6 text-center text-slate-400">Loading PPE configurations...</div>;
  }

  return (
    <div className="card p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-primary-400" />
          <div>
            <h2 className="text-xl font-bold text-white">PPE Detection Settings</h2>
            <p className="text-slate-400 text-sm mt-0.5">
              Configure which safety equipment to monitor
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary px-4 py-2 flex items-center gap-2"
        >
          {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAddForm ? 'Cancel' : 'Add Equipment'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddItem} className="mb-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Equipment Name</label>
              <input
                type="text"
                value={newItem.displayName}
                onChange={(e) => setNewItem({ ...newItem, displayName: e.target.value })}
                placeholder="e.g., Welding Mask"
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Category</label>
              <select
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                className="input-field"
              >
                {Object.entries(categories).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Icon (Emoji)</label>
              <input
                type="text"
                value={newItem.icon}
                onChange={(e) => setNewItem({ ...newItem, icon: e.target.value })}
                placeholder="🦺"
                className="input-field"
                maxLength={2}
              />
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={newItem.enabled}
                  onChange={(e) => setNewItem({ ...newItem, enabled: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-primary-600"
                />
                Enable Detection
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={newItem.required}
                  onChange={(e) => setNewItem({ ...newItem, required: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-primary-600"
                />
                Required
              </label>
            </div>
          </div>
          <button type="submit" className="btn-primary mt-4 px-6 py-2">
            Add Equipment
          </button>
        </form>
      )}

      <div className="space-y-3">
        {configs.map((config) => (
          <div
            key={config._id}
            className={`p-4 rounded-lg border transition-all ${
              config.enabled
                ? 'bg-slate-800/50 border-slate-700'
                : 'bg-slate-900/30 border-slate-800 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <span className="text-3xl">{config.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold">{config.displayName}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${categories[config.category]?.color || categories.custom.color}`}>
                      {categories[config.category]?.label || 'Custom'}
                    </span>
                    {config.required && (
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-danger-500/20 text-danger-400">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-xs mt-1">
                    Model Class ID: {config.modelClassId !== undefined ? config.modelClassId : 'Not assigned'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleEnabled(config._id)}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${
                    config.enabled
                      ? 'bg-success-500/20 text-success-400 hover:bg-success-500/30'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                >
                  {config.enabled ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  {config.enabled ? 'Enabled' : 'Disabled'}
                </button>
                <button
                  onClick={() => deleteItem(config._id)}
                  className="p-2 rounded-lg bg-danger-500/20 text-danger-400 hover:bg-danger-500/30 transition-all"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {configs.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <Settings className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No PPE configurations found. Add your first equipment above.</p>
        </div>
      )}
    </div>
  );
};

export default PPEConfigPanel;
