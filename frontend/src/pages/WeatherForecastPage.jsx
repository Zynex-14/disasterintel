import React, { useState } from 'react';
import {
  CloudRain,
  Thermometer,
  Wind,
  Droplets,
  Gauge,
  Calendar,
  Clock,
  Download,
  Check
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export default function WeatherForecastPage({ forecastSeries, selectedLocation }) {
  const [horizon, setHorizon] = useState('72h');
  const [selectedVar, setSelectedVar] = useState('rainfall');
  const [copied, setCopied] = useState(false);

  const maxPoints = horizon === '24h' ? 24 : horizon === '48h' ? 48 : 72;
  const rawPoints = forecastSeries?.points?.slice(0, maxPoints) || [];

  const chartData = rawPoints.map((pt) => {
    const dt = new Date(pt.valid_at);
    return {
      time: dt.toLocaleTimeString('en-US', { hour: '2-digit', hour12: false }),
      fullTime: dt.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      rainfall: pt.rainfall,
      temperature: pt.temperature,
      wind_speed: pt.wind_speed,
      humidity: pt.humidity,
      pressure: pt.pressure,
      prob: pt.precipitation_prob || 0
    };
  });

  const varConfig = {
    rainfall: { label: 'Precipitation', unit: 'mm', color: '#1687F8', icon: CloudRain },
    temperature: { label: 'Temperature', unit: '°C', color: '#F97316', icon: Thermometer },
    wind_speed: { label: 'Wind Speed', unit: 'km/h', color: '#20C997', icon: Wind },
    humidity: { label: 'Humidity', unit: '%', color: '#27C7E8', icon: Droplets },
    pressure: { label: 'Atmospheric Pressure', unit: 'hPa', color: '#A855F7', icon: Gauge },
  };

  const activeVar = varConfig[selectedVar];

  // CSV Export
  const handleExportCSV = () => {
    if (!rawPoints.length) return;
    const headers = ['Timestamp', 'Lead_Hours', 'Rainfall_mm', 'Temperature_C', 'Humidity_pct', 'Wind_Speed_kmh', 'Pressure_hPa'];
    const rows = rawPoints.map((pt) => [
      pt.valid_at,
      pt.forecast_lead_hours,
      pt.rainfall.toFixed(2),
      pt.temperature.toFixed(2),
      pt.humidity.toFixed(1),
      pt.wind_speed.toFixed(2),
      pt.pressure.toFixed(1)
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `disasterintel_forecast_${selectedLocation?.name || 'district'}_${horizon}.csv`);
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
            Weather Forecast Trajectory
          </h1>
          <p className="text-sm text-[#A9BEDA]">
            High-resolution multi-variable meteorological projections for {selectedLocation?.name}, {selectedLocation?.state}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#0A2041] hover:bg-[#0E2C58] border border-[#164A7D] text-xs font-semibold text-white transition-all shadow-sm"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#20C997]" /> : <Download className="w-3.5 h-3.5 text-[#27C7E8]" />}
            <span>{copied ? 'CSV Downloaded' : 'Export to CSV'}</span>
          </button>

          {/* Forecast Horizon Buttons */}
          <div className="flex items-center space-x-1 bg-[#0A2041] border border-[#164A7D] p-1 rounded-xl">
            {['24h', '48h', '72h', '7d'].map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  horizon === h
                    ? 'bg-[#1687F8] text-white shadow-md'
                    : 'text-[#A9BEDA] hover:text-white'
                }`}
              >
                {h.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Variable Selectors */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        {Object.entries(varConfig).map(([key, config]) => {
          const Icon = config.icon;
          const isSelected = selectedVar === key;
          return (
            <button
              key={key}
              onClick={() => setSelectedVar(key)}
              className={`p-4 rounded-xl border flex items-center space-x-3 transition-all text-left ${
                isSelected
                  ? 'bg-[#0A2041] border-[#1687F8] shadow-lg shadow-blue-500/10 ring-1 ring-[#1687F8]'
                  : 'bg-[#0A2041]/80 border-[#164A7D] hover:bg-[#0E2C58]'
              }`}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${config.color}20` }}
              >
                <Icon className="w-5 h-5" style={{ color: config.color }} />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">{config.label}</div>
                <div className="text-[10px] text-[#A9BEDA] font-mono">Unit: {config.unit}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Interactive Main Chart */}
      <div className="bg-[#0A2041] border border-[#164A7D] p-6 rounded-xl shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center space-x-2">
              <span>{activeVar.label} Forecast Curve ({horizon})</span>
            </h3>
            <p className="text-xs text-[#A9BEDA]">Values synthesized from ECMWF IFS, GFS, and IMD NWP assimilation</p>
          </div>
          <span className="font-mono text-xs px-2.5 py-1 rounded bg-[#071A35] text-[#27C7E8] border border-[#164A7D]">
            {chartData.length} Timesteps Active
          </span>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {selectedVar === 'rainfall' ? (
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#164A7D" opacity={0.3} />
                <XAxis dataKey="time" stroke="#A9BEDA" fontSize={11} tickLine={false} />
                <YAxis stroke="#A9BEDA" fontSize={11} tickLine={false} unit={` ${activeVar.unit}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#071A35', borderColor: '#164A7D', borderRadius: '8px', color: '#F4F8FF' }}
                  labelFormatter={(_, arr) => arr[0]?.payload?.fullTime}
                />
                <Bar dataKey="rainfall" fill="#1687F8" name="Precipitation (mm)" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="varGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={activeVar.color} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={activeVar.color} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#164A7D" opacity={0.3} />
                <XAxis dataKey="time" stroke="#A9BEDA" fontSize={11} tickLine={false} />
                <YAxis stroke="#A9BEDA" fontSize={11} tickLine={false} unit={` ${activeVar.unit}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#071A35', borderColor: '#164A7D', borderRadius: '8px', color: '#F4F8FF' }}
                  labelFormatter={(_, arr) => arr[0]?.payload?.fullTime}
                />
                <Area
                  type="monotone"
                  dataKey={selectedVar}
                  stroke={activeVar.color}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#varGradient)"
                  name={`${activeVar.label} (${activeVar.unit})`}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Hourly Table View */}
      <div className="bg-[#0A2041] border border-[#164A7D] rounded-xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-[#164A7D] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Granular Hourly Breakdown Table</h3>
          <span className="text-xs text-[#A9BEDA] font-mono">Source: Harmonized NWP Matrix</span>
        </div>

        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#071A35] text-[#A9BEDA] border-b border-[#164A7D] sticky top-0">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Valid Timestamp</th>
                <th className="py-2.5 px-4 font-semibold">Lead Hours</th>
                <th className="py-2.5 px-4 font-semibold text-right">Rainfall (mm)</th>
                <th className="py-2.5 px-4 font-semibold text-right">Temp (°C)</th>
                <th className="py-2.5 px-4 font-semibold text-right">Humidity (%)</th>
                <th className="py-2.5 px-4 font-semibold text-right">Wind (km/h)</th>
                <th className="py-2.5 px-4 font-semibold text-right">Pressure (hPa)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#164A7D]/30">
              {rawPoints.map((pt, idx) => (
                <tr key={idx} className="hover:bg-[#0E2C58] transition-colors">
                  <td className="py-2 px-4 text-slate-200">
                    {new Date(pt.valid_at).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-2 px-4 text-[#A9BEDA]">+{pt.forecast_lead_hours}h</td>
                  <td className={`py-2 px-4 text-right font-bold ${pt.rainfall > 10 ? 'text-[#F97316]' : 'text-slate-100'}`}>
                    {pt.rainfall.toFixed(1)}
                  </td>
                  <td className="py-2 px-4 text-right text-slate-200">{pt.temperature.toFixed(1)}</td>
                  <td className="py-2 px-4 text-right text-slate-200">{pt.humidity.toFixed(0)}%</td>
                  <td className="py-2 px-4 text-right text-slate-200">{pt.wind_speed.toFixed(1)}</td>
                  <td className="py-2 px-4 text-right text-[#A9BEDA]">{pt.pressure.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
