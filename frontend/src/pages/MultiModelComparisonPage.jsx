import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Layers,
  Cpu,
  Eye,
  Sliders,
  AlertCircle,
  Download,
  Check
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';

export default function MultiModelComparisonPage({ selectedLocationId = 1, selectedLocation }) {
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [variable, setVariable] = useState('rainfall');
  const [leadTimeHorizon, setLeadTimeHorizon] = useState('48h');
  const [copied, setCopied] = useState(false);
  const [visibleModels, setVisibleModels] = useState({
    Uncertainty_Band: true,
    GFS: true,
    ECMWF: true,
    ICON: true,
    IMD_NWP: true,
    Equal_Weight: true,
    AI_Blended: true,
    Actual_Observation: true,
  });

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    api.getMultiModelComparison(selectedLocationId, leadTimeHorizon)
      .then((data) => {
        if (isMounted) setComparisonData(data);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, [selectedLocationId, leadTimeHorizon]);

  const toggleModel = (model) => {
    setVisibleModels((prev) => ({ ...prev, [model]: !prev[model] }));
  };

  const chartData = comparisonData?.timeline?.map((pt) => {
    const dt = new Date(pt.valid_at);
    const aiVal = pt.ai_blended?.[variable] ?? 0;
    const lower = pt.uncertainty_lower?.[variable] ?? Math.max(0, aiVal * 0.82);
    const upper = pt.uncertainty_upper?.[variable] ?? (aiVal * 1.18);
    return {
      time: dt.toLocaleTimeString('en-US', { hour: '2-digit', hour12: false }),
      fullTime: dt.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      lead: `+${pt.forecast_lead_hours}h`,
      GFS: pt.models?.GFS?.[variable],
      ECMWF: pt.models?.ECMWF?.[variable],
      ICON: pt.models?.ICON?.[variable],
      IMD_NWP: pt.models?.IMD_NWP?.[variable],
      Equal_Weight: pt.equal_weight?.[variable],
      AI_Blended: aiVal,
      Uncertainty_Band: [Number(lower.toFixed(1)), Number(upper.toFixed(1))],
      Actual_Observation: pt.actual_observation?.[variable] ?? null,
    };
  }) || [];

  const unitMap = { rainfall: 'mm', temperature: '°C', wind_speed: 'km/h' };
  const unit = unitMap[variable];

  const handleExport = () => {
    if (!chartData.length) return;
    const headers = ['Timestamp', 'Lead', 'GFS', 'ECMWF', 'ICON', 'IMD_NWP', 'Equal_Weight', 'AI_Blended'];
    const rows = chartData.map((r) => [
      r.fullTime,
      r.lead,
      r.GFS ?? '',
      r.ECMWF ?? '',
      r.ICON ?? '',
      r.IMD_NWP ?? '',
      r.Equal_Weight ?? '',
      r.AI_Blended ?? ''
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `model_comparison_${selectedLocation?.name || 'district'}_${variable}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="p-8 space-y-6 max-w-[1700px] mx-auto select-none">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Multi-Model NWP Comparison & Convergence
          </h1>
          <p className="text-sm text-[#A9BEDA]">
            Synchronized comparison of NOAA GFS, ECMWF IFS, DWD ICON, and IMD UM with baseline and AI blends for {selectedLocation?.name || 'Chennai'}.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExport}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#0A2041] hover:bg-[#0E2C58] border border-[#164A7D] text-xs font-semibold text-white transition-all shadow-sm"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#20C997]" /> : <Download className="w-3.5 h-3.5 text-[#27C7E8]" />}
            <span>{copied ? 'CSV Downloaded' : 'Export Matrix'}</span>
          </button>

          {/* Lead Time Switcher */}
          <div className="flex items-center space-x-1 bg-[#0A2041] border border-[#164A7D] p-1 rounded-xl">
            {['24h', '48h', '72h'].map((h) => (
              <button
                key={h}
                onClick={() => setLeadTimeHorizon(h)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  leadTimeHorizon === h ? 'bg-[#1687F8] text-white shadow-md' : 'text-[#A9BEDA] hover:text-white'
                }`}
              >
                {h.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Variable Switcher */}
          <div className="flex items-center space-x-1 bg-[#0A2041] border border-[#164A7D] p-1 rounded-xl">
            {[
              { id: 'rainfall', label: 'Rainfall' },
              { id: 'temperature', label: 'Temperature' },
              { id: 'wind_speed', label: 'Wind Speed' },
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => setVariable(v.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  variable === v.id ? 'bg-[#1687F8] text-white shadow-md' : 'text-[#A9BEDA] hover:text-white'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Model Filter Pills */}
      <div className="bg-[#0A2041] border border-[#164A7D] p-3.5 rounded-xl shadow-lg flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-[#A9BEDA] uppercase tracking-wider mr-2">Toggle Models:</span>
        {[
          { key: 'Uncertainty_Band', label: 'AI 80% CI Band', color: '#1687F8' },
          { key: 'GFS', label: 'NOAA GFS', color: '#3B82F6' },
          { key: 'ECMWF', label: 'ECMWF IFS', color: '#10B981' },
          { key: 'ICON', label: 'DWD ICON', color: '#F59E0B' },
          { key: 'IMD_NWP', label: 'IMD UM', color: '#EC4899' },
          { key: 'Equal_Weight', label: 'Baseline Mean', color: '#94A3B8', dashed: true },
          { key: 'AI_Blended', label: 'AI Blended (RF)', color: '#27C7E8', bold: true },
        ].map((m) => {
          const isVisible = visibleModels[m.key];
          return (
            <button
              key={m.key}
              onClick={() => toggleModel(m.key)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                isVisible
                  ? 'bg-[#071A35] text-white border-[#164A7D] shadow-sm'
                  : 'bg-[#071A35]/40 text-slate-500 border-transparent line-through opacity-50'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: isVisible ? m.color : '#64748B' }}
              />
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Multi-Line Comparison Chart */}
      <div className="bg-[#0A2041] border border-[#164A7D] p-6 rounded-xl shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-white">
              Trajectory Spread: {variable.toUpperCase()} ({unit})
            </h3>
            <p className="text-xs text-[#A9BEDA]">Individual NWP model spread indicates forecast uncertainty</p>
          </div>
          <span className="font-mono text-xs px-2.5 py-1 rounded bg-[#071A35] text-[#27C7E8] border border-[#164A7D]">
            Lead Time: 0 to {leadTimeHorizon}
          </span>
        </div>

        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#164A7D" opacity={0.3} />
              <XAxis dataKey="time" stroke="#A9BEDA" fontSize={11} tickLine={false} />
              <YAxis stroke="#A9BEDA" fontSize={11} tickLine={false} unit={` ${unit}`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#071A35', borderColor: '#164A7D', borderRadius: '8px', color: '#F4F8FF' }}
                labelFormatter={(_, arr) => arr[0]?.payload?.fullTime}
              />
              <Legend wrapperStyle={{ paddingTop: '15px' }} />

              {visibleModels.Uncertainty_Band && (
                <Area
                  type="monotone"
                  dataKey="Uncertainty_Band"
                  stroke="transparent"
                  fill="#1687F8"
                  fillOpacity={0.18}
                  name="AI 80% Confidence Interval"
                />
              )}

              {visibleModels.GFS && (
                <Line type="monotone" dataKey="GFS" stroke="#3B82F6" strokeWidth={1.5} dot={false} name="NOAA GFS" />
              )}
              {visibleModels.ECMWF && (
                <Line type="monotone" dataKey="ECMWF" stroke="#10B981" strokeWidth={1.5} dot={false} name="ECMWF IFS" />
              )}
              {visibleModels.ICON && (
                <Line type="monotone" dataKey="ICON" stroke="#F59E0B" strokeWidth={1.5} dot={false} name="DWD ICON" />
              )}
              {visibleModels.IMD_NWP && (
                <Line type="monotone" dataKey="IMD_NWP" stroke="#EC4899" strokeWidth={1.5} dot={false} name="IMD UM" />
              )}
              {visibleModels.Equal_Weight && (
                <Line
                  type="monotone"
                  dataKey="Equal_Weight"
                  stroke="#94A3B8"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  name="Baseline Mean"
                />
              )}
              {visibleModels.AI_Blended && (
                <Line
                  type="monotone"
                  dataKey="AI_Blended"
                  stroke="#27C7E8"
                  strokeWidth={3}
                  dot={{ r: 3, fill: '#27C7E8' }}
                  name="AI Blended (RF)"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Difference & Convergence Matrix Table */}
      <div className="bg-[#0A2041] border border-[#164A7D] rounded-xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-[#164A7D] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">NWP Model Spread & Divergence Matrix</h3>
            <p className="text-xs text-[#A9BEDA]">Difference between individual model runs and AI blend</p>
          </div>
          <span className="text-xs text-[#A9BEDA] font-mono">Max Inter-Model Spread Evaluated</span>
        </div>

        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#071A35] text-[#A9BEDA] border-b border-[#164A7D] sticky top-0">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Valid Time</th>
                <th className="py-2.5 px-4 font-semibold">Lead</th>
                <th className="py-2.5 px-4 font-semibold text-right">GFS</th>
                <th className="py-2.5 px-4 font-semibold text-right">ECMWF</th>
                <th className="py-2.5 px-4 font-semibold text-right">ICON</th>
                <th className="py-2.5 px-4 font-semibold text-right">IMD</th>
                <th className="py-2.5 px-4 font-semibold text-right">Baseline</th>
                <th className="py-2.5 px-4 font-semibold text-right text-[#27C7E8]">AI Blend</th>
                <th className="py-2.5 px-4 font-semibold text-right text-rose-400">Spread</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#164A7D]/30">
              {chartData.map((pt, idx) => {
                const vals = [pt.GFS, pt.ECMWF, pt.ICON, pt.IMD_NWP].filter(v => v !== undefined && v !== null);
                const maxSpread = vals.length > 0 ? (Math.max(...vals) - Math.min(...vals)).toFixed(1) : '--';
                return (
                  <tr key={idx} className="hover:bg-[#0E2C58] transition-colors">
                    <td className="py-2 px-4 text-slate-200">{pt.fullTime}</td>
                    <td className="py-2 px-4 text-[#A9BEDA]">{pt.lead}</td>
                    <td className="py-2 px-4 text-right text-slate-300">{pt.GFS?.toFixed(1) ?? '--'}</td>
                    <td className="py-2 px-4 text-right text-slate-300">{pt.ECMWF?.toFixed(1) ?? '--'}</td>
                    <td className="py-2 px-4 text-right text-slate-300">{pt.ICON?.toFixed(1) ?? '--'}</td>
                    <td className="py-2 px-4 text-right text-slate-300">{pt.IMD_NWP?.toFixed(1) ?? '--'}</td>
                    <td className="py-2 px-4 text-right text-slate-400">{pt.Equal_Weight?.toFixed(1) ?? '--'}</td>
                    <td className="py-2 px-4 text-right font-bold text-[#27C7E8]">{pt.AI_Blended?.toFixed(1) ?? '--'}</td>
                    <td className="py-2 px-4 text-right font-bold text-rose-400">{maxSpread}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
