import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Bell, AlertTriangle, Loader2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { getViolations } from '../services/api';

const Navbar = ({ violationCount = 0 }) => {
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const notifRef = useRef(null);

  const username = localStorage.getItem('safesight_username') || 'Supervisor';

  const handleLogout = () => {
    localStorage.removeItem('safesight_token');
    localStorage.removeItem('safesight_username');
    localStorage.removeItem('safesight_role');
    toast.success('Logged out successfully');
    navigate('/login');
  };

  useEffect(() => {
    const fetchNotifs = async () => {
      if (!notifOpen) return;
      setLoadingNotifs(true);
      try {
        const res = await getViolations({ limit: 5 });
        setNotifications(res.data.data);
      } catch (err) {
        console.error('Failed to load notifications', err);
      } finally {
        setLoadingNotifs(false);
      }
    };
    fetchNotifs();
  }, [notifOpen]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="sticky top-0 z-40 bg-dark-900/90 backdrop-blur-md border-b border-slate-700/50">
      <div className="w-full px-4 sm:px-6">
        <div className="flex items-center justify-end h-16">
          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Notification bell */}
            <div className="relative" ref={notifRef}>
              <button
                id="notification-bell"
                onClick={() => setNotifOpen(!notifOpen)}
                className={`relative p-2 rounded-lg transition-all ${notifOpen ? 'bg-primary-600/20 text-primary-400' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
              >
                <Bell className="w-5 h-5" />
                {violationCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger-500 rounded-full text-xs text-white flex items-center justify-center font-bold animate-pulse">
                    {violationCount > 9 ? '9+' : violationCount}
                  </span>
                )}
              </button>

              {/* Notification Pop-up */}
              {notifOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-fade-in z-50">
                  <div className="p-4 border-b border-slate-700/50 bg-slate-800/50 flex justify-between items-center">
                    <h3 className="font-bold text-white text-sm">Recent Alerts</h3>
                   {/* <span className="text-xs font-bold bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">Last 5</span> */}
                  </div>
                  
                  <div className="max-h-[320px] overflow-y-auto">
                    {loadingNotifs ? (
                      <div className="flex flex-col items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 text-primary-500 animate-spin mb-2" />
                        <span className="text-xs text-slate-500 font-medium">Loading alerts...</span>
                      </div>
                    ) : notifications.length > 0 ? (
                      <div className="divide-y divide-slate-800/50">
                        {notifications.map((notif) => (
                          <div key={notif._id} className="p-4 hover:bg-slate-800/50 transition-colors flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-danger-500/10 border border-danger-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <AlertTriangle className="w-4 h-4 text-danger-400" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white leading-tight mb-1">
                                {notif.violationType}
                              </p>
                              <div className="flex gap-2 text-xs text-slate-400 mb-1">
                                <span className="text-primary-400 font-medium">{notif.cameraId}</span>
                                <span>•</span>
                                <span>{notif.resolved ? 'Resolved' : 'Active'}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 font-medium">
                                {new Date(notif.createdAt).toLocaleString(undefined, { 
                                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                                })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-slate-500 text-sm font-medium">
                        No recent alerts found.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Separator */}
            <div className="w-px h-6 bg-slate-700/50 hidden sm:block"></div>

            {/* User info */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="hidden sm:block text-sm text-slate-300 font-medium leading-tight">{username}</span>
                <span className="hidden sm:block text-[10px] text-primary-400 font-bold uppercase tracking-widest leading-none mt-1">
                  {localStorage.getItem('safesight_role')?.replace('_', ' ') || 'Supervisor'}
                </span>
              </div>
              <div className="w-9 h-9 rounded-full bg-primary-600/30 border border-primary-500/30 flex items-center justify-center">
                <span className="text-primary-400 text-sm font-bold">
                  {username.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>

            {/* Logout */}
            <button
              id="logout-btn"
              onClick={handleLogout}
              className="p-2 ml-1 rounded-lg text-slate-400 hover:text-danger-400 hover:bg-danger-500/10 transition-all"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
