import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Thermometer,
  CloudRain,
  Droplets,
  Wind,
  Gauge,
  ShieldCheck,
  Calendar,
  ChevronRight,
  Sparkles,
  Waves,
  Bell,
  BarChart2,
  Database,
  Map as MapIcon,
  LineChart as LineChartIcon,
  Settings,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Terminal
} from 'lucide-react';
import {
  ComposedChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Legend,
  CartesianGrid,
  LineChart
} from 'recharts';
import InteractiveMap from '../components/InteractiveMap';
import SystemLogsModal from '../components/SystemLogsModal';

export default function OverviewPage({
  currentWeather,
  forecastSeries,
  riskAssessment,
  alerts = [],
  metricsSummary,
  selectedLocation,
  locations = [],
  districtRisks = {},
  onSelectDistrict
}) {
  const navigate = useNavigate();
  const [forecastTab, setForecastTab] = useState('24h');
  const [actualTab, setActualTab] = useState('temperature');
  const [isLogsOpen, setIsLogsOpen] = useState(false);

  // Hourly series for Forecast Overview ComposedChart
  const forecastData24h = [
    { time: 'Now', temp: 32.4, rain: 0.0 },
    { time: '3AM', temp: 28.5, rain: 0.2 },
    { time: '6AM', temp: 27.2, rain: 0.8 },
    { time: '9AM', temp: 29.8, rain: 1.4 },
    { time: '12PM', temp: 34.2, rain: 2.8 },
    { time: '3PM', temp: 35.6, rain: 2.1 },
    { time: '6PM', temp: 32.8, rain: 1.6 },
    { time: '9PM', temp: 30.1, rain: 0.5 },
    { time: '12AM', temp: 28.9, rain: 0.1 },
  ];

  const forecastData3d = [
    { time: 'Day 1', temp: 33.2, rain: 2.8 },
    { time: 'Day 2', temp: 34.5, rain: 8.4 },
    { time: 'Day 3', temp: 31.0, rain: 14.2 },
  ];

  const forecastData7d = [
    { time: '14 Apr', temp: 32.4, rain: 2.8 },
    { time: '15 Apr', temp: 33.5, rain: 6.2 },
    { time: '16 Apr', temp: 31.8, rain: 12.6 },
    { time: '17 Apr', temp: 29.5, rain: 24.8 },
    { time: '18 Apr', temp: 30.2, rain: 18.0 },
    { time: '19 Apr', temp: 32.0, rain: 5.5 },
    { time: '20 Apr', temp: 33.1, rain: 1.2 },
  ];

  const activeForecastData = useMemo(() => {
    if (forecastSeries?.points?.length > 0) {
      if (forecastTab === '24h') {
        return forecastSeries.points.slice(0, 9).map((pt) => {
          const dt = new Date(pt.valid_at);
          const timeStr = pt.forecast_lead_hours === 0 ? 'Now' : dt.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
          const t = Number(pt.temperature.toFixed(1));
          return {
            time: timeStr,
            temp: t,
            rain: Number((pt.rainfall || 0).toFixed(1)),
            tempRange: [Math.round((t - 1.5) * 10) / 10, Math.round((t + 1.5) * 10) / 10],
          };
        });
      } else if (forecastTab === '3d') {
        const d1Rain = forecastSeries.points.slice(0, 24).reduce((s, p) => s + (p.rainfall || 0), 0);
        const d2Rain = forecastSeries.points.slice(24, 48).reduce((s, p) => s + (p.rainfall || 0), 0);
        const d3Rain = forecastSeries.points.slice(48, 72).reduce((s, p) => s + (p.rainfall || 0), 0);
        return [
          { time: 'Day 1', temp: Number((forecastSeries.points[0]?.temperature || 32).toFixed(1)), rain: Number(d1Rain.toFixed(1)), tempRange: [29, 34] },
          { time: 'Day 2', temp: Number((forecastSeries.points[24]?.temperature || 31).toFixed(1)), rain: Number(d2Rain.toFixed(1)), tempRange: [28, 33] },
          { time: 'Day 3', temp: Number((forecastSeries.points[48]?.temperature || 30).toFixed(1)), rain: Number(d3Rain.toFixed(1)), tempRange: [27, 32] },
        ];
      }
    }
    return forecastTab === '24h' ? forecastData24h : (forecastTab === '3d' ? forecastData3d : forecastData7d);
  }, [forecastSeries, forecastTab]);

  const projected24hRain = useMemo(() => {
    if (forecastSeries?.points?.length >= 24) {
      return forecastSeries.points.slice(0, 24).reduce((s, p) => s + (p.rainfall || 0), 0).toFixed(1);
    }
    return '12.6';
  }, [forecastSeries]);

  const rainCI = `[${Math.max(0, (Number(projected24hRain) * 0.85)).toFixed(1)} - ${(Number(projected24hRain) * 1.15).toFixed(1)} mm]`;

  // Model Accuracy Comparison Data (Lower is Better)
  const accuracyChartData = [
    { name: 'GFS', mae: 4.12, rmse: 5.84 },
    { name: 'ECMWF', mae: 2.85, rmse: 4.10 },
    { name: 'IMD', mae: 3.20, rmse: 4.65 },
    { name: 'Equal Weight', mae: 2.45, rmse: 3.60 },
    { name: 'AI Blend', mae: 1.82, rmse: 2.94 },
  ];

  // Forecast vs Actual 7-day Historical Validation (Chennai)
  const actualValidationData = [
    { date: '8 Apr', actual: 30.2, forecast: 31.0, actualRain: 0, forecastRain: 0.2, actualHum: 62, forecastHum: 65 },
    { date: '9 Apr', actual: 31.5, forecast: 31.8, actualRain: 0.5, forecastRain: 0.4, actualHum: 64, forecastHum: 66 },
    { date: '10 Apr', actual: 32.8, forecast: 32.2, actualRain: 1.2, forecastRain: 1.8, actualHum: 70, forecastHum: 68 },
    { date: '11 Apr', actual: 34.0, forecast: 34.6, actualRain: 0, forecastRain: 0, actualHum: 60, forecastHum: 58 },
    { date: '12 Apr', actual: 35.2, forecast: 34.8, actualRain: 0, forecastRain: 0.5, actualHum: 58, forecastHum: 61 },
    { date: '13 Apr', actual: 33.6, forecast: 33.9, actualRain: 4.8, forecastRain: 5.2, actualHum: 75, forecastHum: 72 },
    { date: '14 Apr', actual: 32.4, forecast: 32.8, actualRain: 2.8, forecastRain: 3.1, actualHum: 68, forecastHum: 70 },
  ];

  // Recent Alerts list matching visual reference
  const recentAlertsList = [
    { severity: 'High', location: 'Chennai', hazard: 'Heavy Rainfall', time: '14 Apr 14:12', color: 'bg-[#EF4444]' },
    { severity: 'Medium', location: 'Cuddalore', hazard: 'High Wind', time: '14 Apr 12:45', color: 'bg-[#F97316]' },
    { severity: 'Medium', location: 'Tiruvallur', hazard: 'Heavy Rainfall', time: '14 Apr 11:20', color: 'bg-[#F97316]' },
    { severity: 'Low', location: 'Madurai', hazard: 'Extreme Heat', time: '14 Apr 10:15', color: 'bg-[#20C997]' },
    { severity: 'Low', location: 'Kanyakumari', hazard: 'High Wind', time: '14 Apr 09:40', color: 'bg-[#20C997]' },
  ];

  return (
    <div className="p-8 space-y-6 max-w-[1700px] mx-auto select-none">
      {/* ========================================================================= */}
      {/* ROW 1: 5 WEATHER CARDS + OVERALL RISK LEVEL CARD                          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left 5 Compact Weather Cards */}
        <div className="xl:col-span-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
          {/* 1. Temperature */}
          <div className="bg-[#0A2041] border border-[#164A7D] p-4 rounded-xl shadow-lg flex flex-col justify-between">
            <div className="flex items-center space-x-2 text-[#A9BEDA]">
              <div className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <Thermometer className="w-4 h-4 text-orange-400" />
              </div>
              <span className="text-xs font-medium">Temperature</span>
            </div>
            <div className="my-2">
              <span className="text-2xl font-bold text-white tracking-tight">
                {currentWeather?.temperature !== undefined ? `${currentWeather.temperature} °C` : '32.4 °C'}
              </span>
            </div>
            <div className="flex items-center space-x-1.5 text-[11px] font-medium text-slate-300">
              <span className="text-rose-400 flex items-center">↑ 33.2°</span>
              <span className="text-blue-400 flex items-center">↓ 25.6°</span>
            </div>
          </div>

          {/* 2. Rainfall */}
          <div className="bg-[#0A2041] border border-[#164A7D] p-4 rounded-xl shadow-lg flex flex-col justify-between">
            <div className="flex items-center space-x-2 text-[#A9BEDA]">
              <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <CloudRain className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-xs font-medium">Rainfall</span>
            </div>
            <div className="my-2">
              <span className="text-2xl font-bold text-white tracking-tight">
                {currentWeather?.rainfall !== undefined ? `${currentWeather.rainfall} mm` : '2.8 mm'}
              </span>
              <span className="text-[10px] text-[#A9BEDA] ml-1.5 block font-normal">
                (next 24h)
              </span>
            </div>
            <div className="flex items-center text-[11px] font-medium text-[#20C997]">
              <span>↓ 65%</span>
            </div>
          </div>

          {/* 3. Humidity */}
          <div className="bg-[#0A2041] border border-[#164A7D] p-4 rounded-xl shadow-lg flex flex-col justify-between">
            <div className="flex items-center space-x-2 text-[#A9BEDA]">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                <Droplets className="w-4 h-4 text-[#27C7E8]" />
              </div>
              <span className="text-xs font-medium">Humidity</span>
            </div>
            <div className="my-2">
              <span className="text-2xl font-bold text-white tracking-tight">
                {currentWeather?.humidity !== undefined ? `${currentWeather.humidity}%` : '68%'}
              </span>
            </div>
            <div className="flex items-center text-[11px] font-medium text-rose-400">
              <span>↑ 12%</span>
            </div>
          </div>

          {/* 4. Wind Speed */}
          <div className="bg-[#0A2041] border border-[#164A7D] p-4 rounded-xl shadow-lg flex flex-col justify-between">
            <div className="flex items-center space-x-2 text-[#A9BEDA]">
              <div className="p-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20">
                <Wind className="w-4 h-4 text-teal-400" />
              </div>
              <span className="text-xs font-medium">Wind Speed</span>
            </div>
            <div className="my-2">
              <span className="text-2xl font-bold text-white tracking-tight">
                {currentWeather?.wind_speed !== undefined ? `${currentWeather.wind_speed} km/h` : '14.2 km/h'}
              </span>
            </div>
            <div className="flex items-center text-[11px] font-medium text-[#27C7E8]">
              <span>↑ 3.6 km/h</span>
            </div>
          </div>

          {/* 5. Pressure */}
          <div className="bg-[#0A2041] border border-[#164A7D] p-4 rounded-xl shadow-lg flex flex-col justify-between">
            <div className="flex items-center space-x-2 text-[#A9BEDA]">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                <Gauge className="w-4 h-4 text-cyan-300" />
              </div>
              <span className="text-xs font-medium">Pressure</span>
            </div>
            <div className="my-2">
              <span className="text-2xl font-bold text-white tracking-tight">
                {currentWeather?.pressure !== undefined ? `${currentWeather.pressure} hPa` : '1012 hPa'}
              </span>
            </div>
            <div className="flex items-center text-[11px] font-medium text-slate-400">
              <span>→ Stable</span>
            </div>
          </div>
        </div>

        {/* Right Wide Overall Risk Level Card */}
        <div className="xl:col-span-4 bg-[#0A2041] border border-[#164A7D] p-5 rounded-xl shadow-lg flex flex-col justify-between">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-7 h-7 text-[#20C997]" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#A9BEDA]">Overall Risk Level</div>
              <div className="text-2xl font-bold text-[#FACC15] tracking-tight mt-0.5">
                {riskAssessment?.overall_risk_level ? riskAssessment.overall_risk_level.toUpperCase() : 'Moderate'}
              </div>
              <p className="text-xs text-[#A9BEDA] mt-1 leading-snug">
                Monitored for potential heavy rainfall and high wind in coastal areas.
              </p>
            </div>
          </div>

          {/* Segmented Risk Bar */}
          <div className="mt-4 pt-2">
            <div className="h-2.5 w-full rounded-full flex overflow-hidden gap-1 p-0.5 bg-[#071A35] border border-[#164A7D]/60">
              <div className="h-full flex-1 rounded-full bg-[#20C997]" title="Low" />
              <div className="h-full flex-1 rounded-full bg-[#FACC15] ring-2 ring-white/50" title="Moderate (Current)" />
              <div className="h-full flex-1 rounded-full bg-[#F97316] opacity-50" title="High" />
              <div className="h-full flex-1 rounded-full bg-[#EF4444] opacity-40" title="Extreme" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ROW 2: FORECAST OVERVIEW | AI BLENDED FORECAST | DISASTER RISK OVERVIEW   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Forecast Overview Chart */}
        <div className="lg:col-span-5 bg-[#0A2041] border border-[#164A7D] p-5 rounded-xl shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2 text-white font-semibold text-sm">
                <Calendar className="w-4 h-4 text-[#1687F8]" />
                <span>Forecast Overview</span>
              </div>
              <button
                onClick={() => navigate('/forecast')}
                className="text-xs text-[#27C7E8] hover:text-white flex items-center space-x-1"
              >
                <span>View Details</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Time Tabs */}
            <div className="flex items-center space-x-2 mb-3">
              {[
                { id: '24h', label: 'Next 24 Hours' },
                { id: '3d', label: 'Next 3 Days' },
                { id: '7d', label: 'Next 7 Days' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setForecastTab(tab.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    forecastTab === tab.id
                      ? 'bg-[#1687F8] text-white shadow-sm'
                      : 'bg-[#071A35] text-[#A9BEDA] hover:text-white border border-[#164A7D]/50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Chart Legend */}
            <div className="flex items-center space-x-4 text-[11px] text-[#A9BEDA] mb-1">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F97316]" />
                <span>Temperature (°C)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#1687F8]" />
                <span>Rainfall (mm)</span>
              </div>
            </div>
          </div>

          {/* Recharts Dual Axis Chart */}
          <div className="h-44 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={activeForecastData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#164A7D" opacity={0.3} />
                <XAxis dataKey="time" stroke="#A9BEDA" fontSize={10} tickLine={false} />
                <YAxis yAxisId="left" stroke="#F97316" fontSize={10} domain={[20, 40]} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#1687F8" fontSize={10} domain={[0, 10]} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#071A35', borderColor: '#164A7D', borderRadius: '8px', color: '#F4F8FF', fontSize: '11px' }}
                />
                <Area yAxisId="left" type="monotone" dataKey="tempRange" stroke="transparent" fill="#F97316" fillOpacity={0.15} name="80% Temp Spread" />
                <Bar yAxisId="right" dataKey="rain" fill="#1687F8" radius={[3, 3, 0, 0]} barSize={12} />
                <Line yAxisId="left" type="monotone" dataKey="temp" stroke="#F97316" strokeWidth={2} dot={{ r: 3, fill: '#F97316' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Middle: AI Blended Forecast */}
        <div className="lg:col-span-3 bg-[#0A2041] border border-[#164A7D] p-5 rounded-xl shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2 text-white font-semibold text-sm">
                <div className="w-6 h-6 rounded-full bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-[10px] font-bold text-purple-300">
                  AI
                </div>
                <span>AI Blended Forecast</span>
              </div>
              <button
                onClick={() => navigate('/blending')}
                className="text-xs text-[#27C7E8] hover:text-white flex items-center space-x-1"
              >
                <span>View Details</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 items-center py-2">
              {/* Rain Icon & Big Metric */}
              <div className="flex flex-col items-center justify-center border-r border-[#164A7D]/60 pr-2">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mb-2">
                  <CloudRain className="w-8 h-8 text-[#27C7E8]" />
                </div>
                <span className="text-xs text-[#A9BEDA]">Rainfall</span>
                <span className="text-2xl font-bold text-white tracking-tight mt-0.5">
                  {projected24hRain} mm
                </span>
                <span className="text-[10px] text-[#27C7E8] font-mono">
                  80% CI: {rainCI}
                </span>
                <span className="text-[10px] text-[#A9BEDA]">(next 24 hours)</span>
              </div>

              {/* Forecast Details */}
              <div className="space-y-2 text-[11px] pl-1">
                <div>
                  <div className="text-[#A9BEDA]">Location</div>
                  <div className="font-semibold text-white truncate">
                    {selectedLocation?.name || 'Chennai'}, {selectedLocation?.state || 'Tamil Nadu'}
                  </div>
                </div>
                <div>
                  <div className="text-[#A9BEDA]">Valid Time</div>
                  <div className="font-medium text-white leading-tight">
                    14 Apr 2025, 14:00 - 15 Apr 2025, 14:00
                  </div>
                </div>
                <div>
                  <div className="text-[#A9BEDA]">Model Version</div>
                  <div className="font-mono text-cyan-300 font-semibold">v1.2.3</div>
                </div>
                <div>
                  <div className="text-[#A9BEDA]">Data Source</div>
                  <div className="flex items-center space-x-1.5 text-[#20C997] font-medium">
                    <span className="w-2 h-2 rounded-full bg-[#20C997]" />
                    <span>4/4 sources available</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Disaster Risk Overview */}
        <div className="lg:col-span-4 bg-[#0A2041] border border-[#164A7D] p-5 rounded-xl shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2 text-white font-semibold text-sm">
                <ShieldCheck className="w-4 h-4 text-[#20C997]" />
                <span>Disaster Risk Overview</span>
              </div>
              <button
                onClick={() => navigate('/map')}
                className="text-xs text-[#27C7E8] hover:text-white flex items-center space-x-1"
              >
                <span>View Map</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 4 Mini Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2">
              {/* Heavy Rainfall */}
              <div className="bg-[#071A35] border border-orange-500/50 p-2.5 rounded-xl flex flex-col items-center text-center">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center mb-1">
                  <CloudRain className="w-4 h-4 text-[#F97316]" />
                </div>
                <span className="text-[10px] text-[#A9BEDA]">Heavy Rainfall</span>
                <span className="text-sm font-bold text-[#F97316] my-0.5">High</span>
                <span className="text-[10px] text-white">12.6 mm</span>
                <span className="text-[9px] text-[#A9BEDA]">(next 24h)</span>
              </div>

              {/* Flood Risk */}
              <div className="bg-[#071A35] border border-amber-500/50 p-2.5 rounded-xl flex flex-col items-center text-center">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center mb-1">
                  <Waves className="w-4 h-4 text-[#FACC15]" />
                </div>
                <span className="text-[10px] text-[#A9BEDA]">Flood Risk</span>
                <span className="text-sm font-bold text-[#FACC15] my-0.5">Moderate</span>
                <span className="text-[10px] text-white">Rivers normal</span>
              </div>

              {/* High Wind */}
              <div className="bg-[#071A35] border border-emerald-500/50 p-2.5 rounded-xl flex flex-col items-center text-center">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-1">
                  <Wind className="w-4 h-4 text-[#20C997]" />
                </div>
                <span className="text-[10px] text-[#A9BEDA]">High Wind</span>
                <span className="text-sm font-bold text-[#20C997] my-0.5">Low</span>
                <span className="text-[10px] text-white">14.2 km/h</span>
              </div>

              {/* Extreme Temp */}
              <div className="bg-[#071A35] border border-emerald-500/50 p-2.5 rounded-xl flex flex-col items-center text-center">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-1">
                  <Thermometer className="w-4 h-4 text-[#20C997]" />
                </div>
                <span className="text-[10px] text-[#A9BEDA]">Extreme Temp</span>
                <span className="text-sm font-bold text-[#20C997] my-0.5">Low</span>
                <span className="text-[10px] text-white">Max 33°C</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ROW 3: RECENT ALERTS | MODEL ACCURACY SUMMARY | DATA STATUS               */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Recent Alerts Table */}
        <div className="lg:col-span-4 bg-[#0A2041] border border-[#164A7D] p-5 rounded-xl shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2 text-white font-semibold text-sm">
                <div className="p-1 rounded bg-rose-500/20 text-rose-400">
                  <Bell className="w-4 h-4" />
                </div>
                <span>Recent Alerts</span>
              </div>
              <button
                onClick={() => navigate('/alerts')}
                className="text-xs text-[#27C7E8] hover:text-white flex items-center space-x-1"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Alerts Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[#A9BEDA] border-b border-[#164A7D]/40 text-[11px]">
                    <th className="pb-2 font-medium">Severity</th>
                    <th className="pb-2 font-medium">Location</th>
                    <th className="pb-2 font-medium">Hazard Type</th>
                    <th className="pb-2 font-medium text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#164A7D]/30">
                  {recentAlertsList.map((alert, idx) => (
                    <tr key={idx} className="hover:bg-[#071A35]/50 transition-colors">
                      <td className="py-2.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${alert.color}`}
                        >
                          {alert.severity}
                        </span>
                      </td>
                      <td className="py-2.5 text-white font-medium">{alert.location}</td>
                      <td className="py-2.5 text-slate-300">{alert.hazard}</td>
                      <td className="py-2.5 text-right text-[#A9BEDA] font-mono text-[11px]">{alert.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Middle: Model Accuracy Summary Chart */}
        <div className="lg:col-span-5 bg-[#0A2041] border border-[#164A7D] p-5 rounded-xl shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 text-white font-semibold text-sm">
                <BarChart2 className="w-4 h-4 text-[#1687F8]" />
                <span>Model Accuracy Summary</span>
              </div>
              <button
                onClick={() => navigate('/metrics')}
                className="text-xs text-[#27C7E8] hover:text-white flex items-center space-x-1"
              >
                <span>View Details</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 4 Metric KPI Cards */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              <div className="bg-[#071A35] p-2 rounded-lg border border-[#164A7D]/40 text-center">
                <div className="text-[10px] text-[#A9BEDA]">MAE</div>
                <div className="text-base font-bold text-white font-mono">1.82</div>
                <div className="text-[9px] text-[#20C997] font-semibold">↓ 18%</div>
              </div>
              <div className="bg-[#071A35] p-2 rounded-lg border border-[#164A7D]/40 text-center">
                <div className="text-[10px] text-[#A9BEDA]">RMSE</div>
                <div className="text-base font-bold text-white font-mono">2.94</div>
                <div className="text-[9px] text-[#20C997] font-semibold">↓ 21%</div>
              </div>
              <div className="bg-[#071A35] p-2 rounded-lg border border-[#164A7D]/40 text-center">
                <div className="text-[10px] text-[#A9BEDA]">Bias</div>
                <div className="text-base font-bold text-white font-mono">-0.36</div>
                <div className="text-[9px] text-[#20C997] font-semibold">↑ 12%</div>
              </div>
              <div className="bg-[#071A35] p-2 rounded-lg border border-[#164A7D]/40 text-center">
                <div className="text-[10px] text-[#A9BEDA]">Samples</div>
                <div className="text-base font-bold text-white font-mono">1,248</div>
                <div className="text-[9px] text-[#20C997] font-semibold">↑ 100%</div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#A9BEDA] mb-1">
              <span>Model Comparison (Lower is Better)</span>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#1687F8]" />
                  <span>MAE</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#8B5CF6]" />
                  <span>RMSE</span>
                </div>
              </div>
            </div>
          </div>

          {/* Grouped Bar Chart */}
          <div className="h-36 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={accuracyChartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#164A7D" opacity={0.3} />
                <XAxis dataKey="name" stroke="#A9BEDA" fontSize={10} tickLine={false} />
                <YAxis stroke="#A9BEDA" fontSize={10} domain={[0, 8]} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#071A35', borderColor: '#164A7D', borderRadius: '8px', color: '#F4F8FF', fontSize: '11px' }}
                />
                <Bar dataKey="mae" fill="#1687F8" radius={[2, 2, 0, 0]} barSize={10} />
                <Bar dataKey="rmse" fill="#8B5CF6" radius={[2, 2, 0, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Data Status Panel */}
        <div className="lg:col-span-3 bg-[#0A2041] border border-[#164A7D] p-5 rounded-xl shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2 text-white font-semibold text-sm">
                <Database className="w-4 h-4 text-[#27C7E8]" />
                <span>Data Status</span>
              </div>
              <button
                onClick={() => navigate('/about')}
                className="text-xs text-[#27C7E8] hover:text-white flex items-center space-x-1"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Live Data */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#20C997] shadow-sm shadow-[#20C997]" />
                  <div>
                    <div className="font-semibold text-white">Live Data</div>
                    <div className="text-[10px] text-[#20C997]">Available</div>
                  </div>
                </div>
                <div className="text-[10px] text-[#A9BEDA] text-right">
                  Last Update: 14 Apr 2025, 14:28
                </div>
              </div>

              {/* Historical Data */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                  <div>
                    <div className="font-semibold text-white">Historical Data</div>
                    <div className="text-[10px] text-blue-400">Available</div>
                  </div>
                </div>
                <div className="text-[10px] text-[#A9BEDA] text-right">
                  Last Update: 10 Apr 2025, 18:00
                </div>
              </div>

              {/* Simulated Demo Data */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div>
                    <div className="font-semibold text-white">Simulated Demo Data</div>
                    <div className="flex items-center space-x-1 text-[10px] text-amber-400">
                      <span>● Active</span>
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-[#A9BEDA] text-right">
                  Last Update: 14 Apr 2025, 00:00
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ROW 4: DISASTER RISK MAP | FORECAST VS ACTUAL | SYSTEM INFO               */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Disaster Risk Map */}
        <div className="lg:col-span-5 bg-[#0A2041] border border-[#164A7D] p-5 rounded-xl shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2 text-white font-semibold text-sm">
                <MapIcon className="w-4 h-4 text-[#1687F8]" />
                <span>Disaster Risk Map</span>
              </div>
              <button
                onClick={() => navigate('/map')}
                className="text-xs text-[#27C7E8] hover:text-white flex items-center space-x-1"
              >
                <span>View Full Map</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="h-64 w-full rounded-xl overflow-hidden mt-1">
            <InteractiveMap
              locations={locations}
              districtRisks={districtRisks}
              selectedLocationId={selectedLocation?.id || 1}
              onSelectDistrict={onSelectDistrict}
              minHeight="256px"
            />
          </div>
        </div>

        {/* Middle: Forecast vs Actual Chart */}
        <div className="lg:col-span-4 bg-[#0A2041] border border-[#164A7D] p-5 rounded-xl shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 text-white font-semibold text-sm">
                <LineChartIcon className="w-4 h-4 text-[#20C997]" />
                <span>Forecast vs Actual ({selectedLocation?.name || 'Chennai'})</span>
              </div>
              <button
                onClick={() => navigate('/comparison')}
                className="text-xs text-[#27C7E8] hover:text-white flex items-center space-x-1"
              >
                <span>View Details</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Variable Tabs */}
            <div className="flex items-center space-x-2 mb-2">
              {[
                { id: 'temperature', label: 'Temperature (°C)' },
                { id: 'rainfall', label: 'Rainfall (mm)' },
                { id: 'humidity', label: 'Humidity (%)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActualTab(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    actualTab === tab.id
                      ? 'bg-[#1687F8] text-white'
                      : 'bg-[#071A35] text-[#A9BEDA] hover:text-white border border-[#164A7D]/40'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center space-x-4 text-[11px] text-[#A9BEDA] mb-1">
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-0.5 bg-[#20C997]" />
                <span>Actual</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-0.5 border-t border-dashed border-[#1687F8]" />
                <span>Forecast</span>
              </div>
            </div>
          </div>

          <div className="h-44 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={actualValidationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#164A7D" opacity={0.3} />
                <XAxis dataKey="date" stroke="#A9BEDA" fontSize={10} tickLine={false} />
                <YAxis
                  stroke="#A9BEDA"
                  fontSize={10}
                  domain={actualTab === 'temperature' ? [20, 40] : actualTab === 'rainfall' ? [0, 10] : [40, 90]}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#071A35', borderColor: '#164A7D', borderRadius: '8px', color: '#F4F8FF', fontSize: '11px' }}
                />
                <Line
                  type="monotone"
                  dataKey={actualTab === 'temperature' ? 'actual' : actualTab === 'rainfall' ? 'actualRain' : 'actualHum'}
                  stroke="#20C997"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#20C997' }}
                  name="Actual"
                />
                <Line
                  type="monotone"
                  dataKey={actualTab === 'temperature' ? 'forecast' : actualTab === 'rainfall' ? 'forecastRain' : 'forecastHum'}
                  stroke="#1687F8"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#1687F8' }}
                  name="Forecast"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: System Info */}
        <div className="lg:col-span-3 bg-[#0A2041] border border-[#164A7D] p-5 rounded-xl shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-white font-semibold text-sm mb-4">
              <Settings className="w-4 h-4 text-[#A9BEDA]" />
              <span>System Info</span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-[#164A7D]/40">
                <span className="text-[#A9BEDA]">Application Version</span>
                <span className="font-mono text-white font-semibold">v1.0.0</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#164A7D]/40">
                <span className="text-[#A9BEDA]">Backend Status</span>
                <span className="flex items-center space-x-1.5 text-[#20C997] font-semibold">
                  <span className="w-2 h-2 rounded-full bg-[#20C997]" />
                  <span>Online</span>
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#164A7D]/40">
                <span className="text-[#A9BEDA]">Database Status</span>
                <span className="flex items-center space-x-1.5 text-[#20C997] font-semibold">
                  <span className="w-2 h-2 rounded-full bg-[#20C997]" />
                  <span>Online</span>
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#164A7D]/40">
                <span className="text-[#A9BEDA]">ML Model Status</span>
                <span className="flex items-center space-x-1.5 text-[#20C997] font-semibold">
                  <span className="w-2 h-2 rounded-full bg-[#20C997]" />
                  <span>Trained</span>
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[#A9BEDA]">Uptime</span>
                <span className="font-mono text-white font-semibold">99.8%</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-2">
            <button
              onClick={() => setIsLogsOpen(true)}
              className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-[#071A35] hover:bg-[#0E2C58] border border-[#164A7D] text-xs font-semibold text-slate-200 transition-all shadow-sm"
            >
              <Terminal className="w-3.5 h-3.5 text-[#27C7E8]" />
              <span>View System Logs</span>
            </button>
          </div>
        </div>
      </div>

      {/* System Logs Modal */}
      <SystemLogsModal isOpen={isLogsOpen} onClose={() => setIsLogsOpen(false)} />
    </div>
  );
}
