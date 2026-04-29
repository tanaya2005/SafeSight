import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff, Loader, Lock, User } from 'lucide-react';
import { login } from '../services/api';
import toast from 'react-hot-toast';

const Login = () => {
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      toast.error('Please enter username and password');
      return;
    }

    setLoading(true);
    try {
      const res = await login(form);
      localStorage.setItem('safesight_token', res.data.token);
      localStorage.setItem('safesight_username', res.data.username);
      localStorage.setItem('safesight_role', res.data.role); // Save role for dashboard UI
      toast.success(`Welcome back, ${res.data.username}!`);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-primary-600/20 border border-primary-500/30 items-center justify-center mb-4">
            <ShieldCheck className="w-9 h-9 text-primary-400" />
          </div>
          <h1 className="text-3xl font-extrabold text-white">
            Safe<span className="text-gradient">Sight</span>
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            AI Industrial Safety Monitoring System
          </p>
        </div>

        {/* Card */}
        <div className="card p-8 animate-fade-in">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">System Login</h2>
            <p className="text-slate-400 text-sm mt-1">
              Enter your credentials to access the safety dashboard
            </p>
          </div>

          <form id="login-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  placeholder="supervisor / admin1 / admin2"
                  value={form.username}
                  onChange={handleChange}
                  className="input-field pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  id="password"
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  className="input-field pl-10 pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Hint */}
            <div className="bg-slate-800/50 rounded-lg p-3 text-xs text-slate-500 border border-slate-700/50">
              <p className="font-semibold text-slate-400 mb-1">🔐 Demo Credentials</p>
              <p>Supervisor (Full): <code>supervisor</code> / <code>safesight123</code></p>
              <p>Admin 1 (CCTV): <code>admin1</code> / <code>safesight123</code></p>
              <p>Admin 2 (QR): <code>admin2</code> / <code>safesight123</code></p>
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Authenticating…</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Login to Dashboard</span>
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          SafeSight v1.0 • WIET Hackverse 2.0 • Team Stranger Strings
        </p>
      </div>
    </div>
  );
};

export default Login;
