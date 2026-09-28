import React from 'react';
import {
  ShieldAlert,
  Cpu,
  Layers,
  Award,
  Database,
  GitBranch,
  Terminal,
  ExternalLink,
  Info,
  CheckCircle2
} from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="p-8 space-y-6 pb-16 max-w-5xl mx-auto select-none">
      {/* Title Banner */}
      <div className="bg-[#0A2041] p-8 rounded-xl border border-[#164A7D] shadow-2xl">
        <div className="flex items-center space-x-2 text-xs font-bold text-[#27C7E8] uppercase tracking-widest mb-2">
          <span>Disaster Management & Meteorological AI</span>
          <span>•</span>
          <span>Tamil Nadu & Puducherry</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          DisasterIntel — Hybrid AI-NWP Multi-Model Forecast Blending System
        </h1>
        <p className="text-slate-300 mt-2 text-sm leading-relaxed max-w-3xl">
          An operational decision-support and early warning platform combining multi-source Numerical Weather Prediction (NWP) models using machine learning to correct systematic regional biases, evaluate forecast skill, and generate explainable disaster risk indicators.
        </p>
      </div>

      {/* The Core Innovation */}
      <div className="bg-[#0A2041] border border-[#164A7D] p-6 rounded-xl shadow-xl">
        <div className="flex items-center space-x-2 text-[#27C7E8] mb-3">
          <Cpu className="w-5 h-5" />
          <h2 className="text-lg font-bold text-white">The Core Problem & Innovation</h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          Standard consumer weather apps merely regurgitate predictions from a single provider or perform crude unweighted averages. However, during acute cyclonic depressions and intense monsoon cloudbursts in peninsular India, individual NWP models exhibit well-documented systematic shortcomings:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs">
          <div className="p-3.5 bg-[#071A35] rounded-xl border border-[#164A7D]/40">
            <span className="font-bold text-blue-400">NOAA GFS:</span>
            <span className="text-slate-300 ml-1">
              Coarse spatial resolution leads to systematic underestimation (~18-22%) of localized convective cloudbursts in coastal belts.
            </span>
          </div>
          <div className="p-3.5 bg-[#071A35] rounded-xl border border-[#164A7D]/40">
            <span className="font-bold text-emerald-400">ECMWF IFS:</span>
            <span className="text-slate-300 ml-1">
              Superior cyclonic track and moisture flux prediction, but exhibits slight dry biases in deep inland peninsular plains.
            </span>
          </div>
          <div className="p-3.5 bg-[#071A35] rounded-xl border border-[#164A7D]/40">
            <span className="font-bold text-amber-400">DWD ICON:</span>
            <span className="text-slate-300 ml-1">
              Non-hydrostatic grid performs well in orography but overpredicts precipitation in the Nilgiris and Western Ghats.
            </span>
          </div>
          <div className="p-3.5 bg-[#071A35] rounded-xl border border-[#164A7D]/40">
            <span className="font-bold text-pink-400">IMD UM:</span>
            <span className="text-slate-300 ml-1">
              Regional high-resolution Indian subcontinent tuning with high surface temperature accuracy but localized squall variance.
            </span>
          </div>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed mt-4">
          <strong>DisasterIntel</strong> trains supervised <strong>Random Forest Regressors</strong> and <strong>Ridge Regression Blenders</strong> on historical matched forecasts and ground truth observations. The pipeline dynamically weights source confidence based on lead time, terrain elevation, coastal proximity, and inter-model spread while strictly enforcing non-negative precipitation physics bounds.
        </p>
      </div>

      {/* System Architecture */}
      <div className="bg-[#0A2041] border border-[#164A7D] p-6 rounded-xl shadow-xl">
        <div className="flex items-center space-x-2 text-[#27C7E8] mb-4">
          <Layers className="w-5 h-5" />
          <h2 className="text-lg font-bold text-white">System Architecture & Data Flow</h2>
        </div>

        <div className="space-y-3 font-mono text-xs text-slate-300">
          <div className="p-3 bg-[#071A35] rounded-xl border border-[#164A7D]/40 flex items-center justify-between">
            <div>
              <strong className="text-[#27C7E8]">[Data Layer]</strong> Open-Meteo REST API + NCMRWF / IMD NWP feeds + Historical archives
            </div>
            <span className="text-[11px] text-[#A9BEDA]">JSON / CSV</span>
          </div>

          <div className="text-center text-[#A9BEDA]">↓ (HTTP client with timeout, retry, & demo fallback)</div>

          <div className="p-3 bg-[#071A35] rounded-xl border border-[#164A7D]/40 flex items-center justify-between">
            <div>
              <strong className="text-[#1687F8]">[Feature Pipeline]</strong> Unit normalization, timestamp synchronization, cyclical time sin/cos, inter-model spreads
            </div>
            <span className="text-[11px] text-[#A9BEDA]">Pandas / NumPy</span>
          </div>

          <div className="text-center text-[#A9BEDA]">↓ (Chronological Train / Test Split)</div>

          <div className="p-3 bg-[#071A35] rounded-xl border border-[#164A7D]/40 flex items-center justify-between">
            <div>
              <strong className="text-amber-400">[ML Blending Engine]</strong> Random Forest Regressor (100 estimators) + Ridge + Joblib persistence
            </div>
            <span className="text-[11px] text-[#A9BEDA]">Scikit-Learn</span>
          </div>

          <div className="text-center text-[#A9BEDA]">↓ (Physics Constraint Validator: min 0.0 mm rain)</div>

          <div className="p-3 bg-[#071A35] rounded-xl border border-[#164A7D]/40 flex items-center justify-between">
            <div>
              <strong className="text-[#20C997]">[Disaster Risk Engine]</strong> IMD threshold classification + Deduplicated alert engine
            </div>
            <span className="text-[11px] text-[#A9BEDA]">FastAPI / SQLite</span>
          </div>

          <div className="text-center text-[#A9BEDA]">↓ (REST API Endpoints)</div>

          <div className="p-3 bg-[#071A35] rounded-xl border border-[#164A7D]/40 flex items-center justify-between">
            <div>
              <strong className="text-cyan-300">[Control Room Dashboard]</strong> React 19 + Tailwind CSS + Leaflet GIS + Recharts
            </div>
            <span className="text-[11px] text-[#A9BEDA]">Web UI</span>
          </div>
        </div>
      </div>

      {/* Statutory Disclaimers */}
      <div className="bg-[#0A2041] border border-amber-500/40 p-6 rounded-xl shadow-xl">
        <div className="flex items-center space-x-2 text-amber-400 mb-2">
          <ShieldAlert className="w-5 h-5" />
          <h2 className="text-lg font-bold text-white">Statutory Warning & Transparency Notice</h2>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          DisasterIntel is an experimental decision-support research prototype. All hazard classifications, risk indices, and blended outputs are generated algorithmically for evaluation purposes. This platform does <strong>not</strong> replace official warnings, bulletins, or emergency directives issued by the <strong>India Meteorological Department (IMD)</strong>, the <strong>National Disaster Management Authority (NDMA)</strong>, or state disaster management agencies.
        </p>
      </div>
    </div>
  );
}
