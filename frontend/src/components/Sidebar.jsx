import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Cloud,
  BarChart2,
  Cpu,
  Map,
  Bell,
  LineChart,
  Info,
  Shield,
  Zap
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Overview', icon: Home },
  { path: '/forecast', label: 'Weather Forecast', icon: Cloud },
  { path: '/comparison', label: 'Multi-Model Comparison', icon: BarChart2 },
  { path: '/blending', label: 'AI Forecast Blending', icon: Cpu },
  { path: '/map', label: 'Disaster Risk Map', icon: Map },
  { path: '/alerts', label: 'Alerts Center', icon: Bell, badge: 3 },
  { path: '/metrics', label: 'Model Performance', icon: LineChart },
  { path: '/about', label: 'About Project', icon: Info },
];

export default function Sidebar({ alertCount = 3 }) {
  return (
    <aside className="w-60 bg-[#071A35] border-r border-[#164A7D]/70 flex flex-col shrink-0 select-none min-h-screen z-30">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#164A7D]/40">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1687F8] to-[#0A4EA3] flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30 shrink-0">
            <div className="relative">
              <Cloud className="w-6 h-6 text-white fill-white/20" />
              <Zap className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 absolute -bottom-0.5 right-0 animate-pulse" />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight leading-tight">
              DisasterIntel
            </h1>
            <p className="text-[10px] text-[#A9BEDA] font-medium leading-tight mt-0.5">
              AI Powered Weather & Disaster Forecasting
            </p>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#1687F8] text-white shadow-md shadow-blue-600/30 font-semibold'
                    : 'text-[#A9BEDA] hover:text-white hover:bg-[#0A2041]/80'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#A9BEDA]'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-white text-blue-600'
                          : 'bg-[#EF4444] text-white shadow-sm'
                      }`}
                    >
                      {alertCount || item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Skyline & Safety Banner */}
      <div className="p-4 border-t border-[#164A7D]/40 bg-[#06162F]/40 relative overflow-hidden">
        <div className="flex items-center space-x-2.5 mb-2 relative z-10">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-[#20C997]" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-white leading-tight">
              Safer Communities
            </div>
            <div className="text-[10px] text-[#A9BEDA] leading-tight">
              Stronger Tomorrow
            </div>
          </div>
        </div>

        {/* Vector Skyline graphic */}
        <div className="w-full h-8 opacity-30 mt-1 pointer-events-none">
          <svg viewBox="0 0 200 40" className="w-full h-full text-cyan-400" fill="currentColor">
            <rect x="5" y="20" width="8" height="20" />
            <rect x="15" y="12" width="12" height="28" />
            <rect x="30" y="24" width="7" height="16" />
            <polygon points="40,30 45,15 50,30" />
            <rect x="52" y="8" width="14" height="32" />
            <rect x="68" y="18" width="10" height="22" />
            <rect x="80" y="22" width="8" height="18" />
            <polygon points="90,32 96,10 102,32" />
            <rect x="105" y="14" width="16" height="26" />
            <rect x="123" y="6" width="11" height="34" />
            <rect x="136" y="20" width="9" height="20" />
            <rect x="147" y="16" width="15" height="24" />
            <rect x="164" y="25" width="8" height="15" />
            <rect x="174" y="10" width="12" height="30" />
            <rect x="188" y="22" width="9" height="18" />
          </svg>
        </div>
      </div>
    </aside>
  );
}
