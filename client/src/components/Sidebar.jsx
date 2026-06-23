import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Shield, QrCode, ShieldCheck, BarChart3 } from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/workers', label: 'Workers', icon: Users },
    { to: '/zones', label: 'Restricted Zones', icon: Shield },
    { to: '/scan', label: 'Scan ID', icon: QrCode },
  ];

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <aside className="w-64 flex-shrink-0 h-screen bg-dark-900 border-r border-slate-700/50 flex flex-col z-50 relative">
      <div className="h-16 flex items-center px-6 border-b border-slate-700/50">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center group-hover:bg-primary-500 transition-colors">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-lg text-white tracking-tight">Safe</span>
            <span className="font-extrabold text-lg text-gradient tracking-tight">Sight</span>
          </div>
        </Link>
      </div>

      <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
        {navLinks.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            id={`sidebar-${label.toLowerCase().replace(/ /g, '-')}`}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
              isActive(to)
                ? 'bg-primary-600/20 text-primary-400 border border-primary-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50 border border-transparent'
            }`}
          >
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        ))}

        {/* Detection Legend */}
        {location.pathname === '/' && (
          <div className="mt-6 pt-6 border-t border-slate-700/50">
            <h3 className="text-xs font-bold text-white mb-3 px-2 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary-500" />
              Detection Legend
            </h3>
            
            <div className="space-y-3 px-2">
              {/* Red - Violation */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                  <span className="text-red-400 font-bold text-[10px] uppercase tracking-wide">Violation</span>
                </div>
                <p className="text-slate-400 text-[9px] leading-relaxed pl-5">
                  Person <span className="text-red-400 font-semibold">without</span> required safety equipment
                </p>
              </div>

              {/* red - Restricted Zone */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
                  <span className="text-red-400 font-bold text-[10px] uppercase tracking-wide">Zone Alert</span>
                </div>
                <p className="text-slate-400 text-[9px] leading-relaxed pl-5">
                  Unauthorized entry into <span className="text-red-400 font-semibold">restricted zone</span>
                </p>
              </div>
          
              {/* Green - Safe */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
                  <span className="text-green-400 font-bold text-[10px] uppercase tracking-wide">Safe</span>
                </div>
                <p className="text-slate-400 text-[9px] leading-relaxed pl-5">
                  Person wearing <span className="text-green-400 font-semibold">all required</span> safety equipment
                </p>
              </div>

              {/* Green - Equipment Only */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
                  <span className="text-green-400 font-bold text-[10px] uppercase tracking-wide">Equipment Only</span>
                </div>
                <p className="text-slate-400 text-[9px] leading-relaxed pl-5">
                  Equipment detected but <span className="text-green-400 font-semibold">not worn</span> by person
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4 border-t border-slate-700/50 text-center">
        <span className="text-[10px] text-slate-500 uppercase tracking-widest block">SafeSight System</span>
        <span className="text-[10px] text-slate-600 block mt-1">v2.0 Beta</span>
      </div>
    </aside>
  );
};

export default Sidebar;
