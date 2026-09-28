import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MapPin, ChevronDown, Bell, User, Clock, Zap } from 'lucide-react';

const SCENARIOS = [
  { id: 'cyclone_michaung', label: 'Cyclone Michaung', tag: 'Severe Storm', color: 'bg-red-500', desc: 'Coastal extreme rainfall (>145 mm) & gale winds' },
  { id: 'heatwave', label: 'Extreme Heatwave', tag: 'Pre-Monsoon', color: 'bg-orange-500', desc: 'Interior plains ambient peak >44°C-47°C' },
  { id: 'monsoon_depression', label: 'Monsoon Low', tag: 'Depression', color: 'bg-blue-500', desc: 'Sustained moderate to heavy coastal rain' },
  { id: 'normal', label: 'Fair Weather', tag: 'Clear Skies', color: 'bg-emerald-500', desc: 'Seasonal calm weather with zero hazard alerts' },
  { id: 'live', label: 'Live NWP Stream', tag: 'Open-Meteo', color: 'bg-cyan-500', desc: 'Real-time live multi-model streaming API' },
];

const PAGE_TITLES = {
  '/': {
    title: 'Dashboard Overview',
    subtitle: 'Real-time weather, forecast and disaster risk insights for Tamil Nadu & Puducherry'
  },
  '/forecast': {
    title: 'Weather Forecast',
    subtitle: 'High-resolution multi-variable meteorological projections across horizons'
  },
  '/comparison': {
    title: 'Multi-Model Comparison',
    subtitle: 'Synchronized NWP ensemble spread and divergence analysis (GFS, ECMWF, ICON, IMD)'
  },
  '/blending': {
    title: 'AI Forecast Blending',
    subtitle: 'Machine learning bias correction, performance weighting and physics validation'
  },
  '/map': {
    title: 'Disaster Risk Map',
    subtitle: 'Interactive GIS geospatial hazard matrix and district vulnerability indicators'
  },
  '/alerts': {
    title: 'Alerts Center',
    subtitle: 'Automated early warning incident dispatch with deduplication'
  },
  '/metrics': {
    title: 'Model Performance',
    subtitle: 'WMO meteorological verification scorecard (MAE, RMSE, Bias, Skill Score)'
  },
  '/about': {
    title: 'About DisasterIntel',
    subtitle: 'System architecture, scientific methodology, data sources & statutory disclaimers'
  }
};

export default function Navbar({
  locations = [],
  selectedLocationId = 1,
  onSelectLocation,
  dataMode = 'live',
  onSelectDataMode,
  activeScenario = 'cyclone_michaung',
  onSelectScenario,
  alertCount = 3,
  onOpenAlerts
}) {
  const location = useLocation();
  const pageInfo = PAGE_TITLES[location.pathname] || PAGE_TITLES['/'];

  const [currentTime, setCurrentTime] = useState('14 Apr 2025  14:32 IST');
  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [showScenarioMenu, setShowScenarioMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format as "14 Apr 2025  14:32 IST"
      const datePart = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const timePart = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
      setCurrentTime(`${datePart}  ${timePart} IST`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const selectedLocation = locations.find((l) => l.id === selectedLocationId) || {
    name: 'Chennai',
    state: 'Tamil Nadu'
  };

  const currentScenObj = SCENARIOS.find((s) => s.id === activeScenario) || SCENARIOS[0];

  return (
    <header className="h-20 bg-[#06162F] border-b border-[#164A7D]/40 px-8 flex items-center justify-between sticky top-0 z-20 select-none">
      {/* Page Title & Subtitle */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight leading-tight">
          {pageInfo.title}
        </h2>
        <p className="text-xs text-[#A9BEDA] mt-0.5">
          {pageInfo.subtitle}
        </p>
      </div>

      {/* Top Right Controls */}
      <div className="flex items-center space-x-3.5">
        {/* 1. Location Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowLocationMenu(!showLocationMenu);
              setShowModeMenu(false);
              setShowScenarioMenu(false);
              setShowUserMenu(false);
            }}
            className="flex items-center space-x-2 bg-[#0A2041] hover:bg-[#0E2C58] border border-[#164A7D] px-3.5 py-2 rounded-xl text-xs font-medium text-white transition-all shadow-sm"
          >
            <MapPin className="w-3.5 h-3.5 text-[#27C7E8] shrink-0" />
            <span className="font-semibold">{selectedLocation.name}, {selectedLocation.state}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#A9BEDA]" />
          </button>

          {showLocationMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-[#0A2041] border border-[#164A7D] rounded-xl shadow-2xl py-2 z-50 max-h-72 overflow-y-auto">
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-[#A9BEDA] font-bold border-b border-[#164A7D]/40">
                Supported Weather Stations
              </div>
              {locations.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => {
                    onSelectLocation(loc.id);
                    setShowLocationMenu(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-[#1687F8]/20 transition-colors ${
                    loc.id === selectedLocationId ? 'text-[#27C7E8] font-bold bg-[#1687F8]/10' : 'text-slate-200'
                  }`}
                >
                  <span>{loc.name}</span>
                  <span className="text-[10px] text-[#A9BEDA]">{loc.state}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2. Disaster Scenario Simulator Pill */}
        <div className="relative">
          <button
            onClick={() => {
              setShowScenarioMenu(!showScenarioMenu);
              setShowLocationMenu(false);
              setShowModeMenu(false);
              setShowUserMenu(false);
            }}
            className="flex items-center space-x-2 bg-[#0A2041] hover:bg-[#0E2C58] border border-[#1687F8]/60 px-3 py-2 rounded-xl text-xs font-medium text-white transition-all shadow-sm"
          >
            <Zap className="w-3.5 h-3.5 text-[#27C7E8] shrink-0" />
            <span className="font-semibold text-white">{currentScenObj.label}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#A9BEDA]" />
          </button>

          {showScenarioMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-[#0A2041] border border-[#164A7D] rounded-xl shadow-2xl py-2 z-50">
              <div className="px-3.5 py-1 text-[10px] uppercase tracking-wider text-[#A9BEDA] font-bold border-b border-[#164A7D]/40 mb-1 flex items-center justify-between">
                <span>Simulate Disaster Scenario</span>
                <span className="text-[#27C7E8]">AI-NWP</span>
              </div>
              {SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    if (onSelectScenario) onSelectScenario(s.id);
                    setShowScenarioMenu(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs hover:bg-[#1687F8]/20 transition-colors ${
                    activeScenario === s.id ? 'bg-[#1687F8]/15 text-[#27C7E8] font-bold' : 'text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${s.color}`} />
                      <span className="font-semibold">{s.label}</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#071A35] border border-[#164A7D]/60 text-[#A9BEDA]">
                      {s.tag}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#A9BEDA] mt-0.5 pl-4">{s.desc}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2. Data Mode Selector Pill */}
        <div className="relative">
          <button
            onClick={() => {
              setShowModeMenu(!showModeMenu);
              setShowLocationMenu(false);
              setShowUserMenu(false);
            }}
            className="flex items-center space-x-2 bg-[#0A2041] hover:bg-[#0E2C58] border border-[#164A7D] px-3.5 py-2 rounded-xl text-xs font-medium transition-all shadow-sm"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                dataMode === 'live'
                  ? 'bg-[#20C997] shadow-sm shadow-[#20C997]'
                  : dataMode === 'historical'
                  ? 'bg-blue-400'
                  : 'bg-amber-400'
              }`}
            />
            <span className="text-white capitalize font-semibold">
              {dataMode === 'live' ? 'Live Data' : dataMode === 'historical' ? 'Historical' : 'Demo Data'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#A9BEDA]" />
          </button>

          {showModeMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-[#0A2041] border border-[#164A7D] rounded-xl shadow-2xl py-1.5 z-50">
              {[
                { id: 'live', label: 'Live Data', color: 'bg-[#20C997]', desc: 'Direct NWP API Feeds' },
                { id: 'historical', label: 'Historical Data', color: 'bg-blue-400', desc: 'Matched Archives' },
                { id: 'demo', label: 'Demo Mode', color: 'bg-amber-400', desc: 'Simulated Cyclone Event' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    onSelectDataMode(m.id);
                    setShowModeMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-[#1687F8]/20 transition-colors ${
                    dataMode === m.id ? 'text-[#27C7E8] font-bold' : 'text-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full ${m.color}`} />
                    <span>{m.label}</span>
                  </div>
                  <div className="text-[10px] text-[#A9BEDA] pl-4">{m.desc}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 3. Timestamp */}
        <div className="hidden xl:flex items-center space-x-1.5 text-xs text-[#A9BEDA] font-mono px-2">
          <span>{currentTime}</span>
        </div>

        {/* 4. Notification Bell */}
        <button
          onClick={onOpenAlerts}
          className="relative w-9 h-9 rounded-xl bg-[#0A2041] hover:bg-[#0E2C58] border border-[#164A7D] flex items-center justify-center text-[#A9BEDA] hover:text-white transition-all"
        >
          <Bell className="w-4 h-4" />
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#EF4444] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md">
              {alertCount}
            </span>
          )}
        </button>

        {/* 5. User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowLocationMenu(false);
              setShowModeMenu(false);
            }}
            className="flex items-center space-x-2 bg-[#0A2041] hover:bg-[#0E2C58] border border-[#164A7D] pl-2 pr-3 py-1.5 rounded-xl transition-all"
          >
            <div className="w-6 h-6 rounded-full bg-[#1687F8] text-white text-xs font-bold flex items-center justify-center">
              A
            </div>
            <span className="text-xs font-semibold text-white">Admin</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#A9BEDA]" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-44 bg-[#0A2041] border border-[#164A7D] rounded-xl shadow-2xl py-2 z-50 text-xs">
              <div className="px-3 py-1.5 border-b border-[#164A7D]/40">
                <p className="font-semibold text-white">State Ops Center</p>
                <p className="text-[10px] text-[#A9BEDA]">admin@disasterintel.gov</p>
              </div>
              <div className="px-3 py-1.5 text-[11px] text-[#A9BEDA]">Role: Incident Commander</div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
