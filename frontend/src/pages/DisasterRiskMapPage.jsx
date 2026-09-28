import React, { useState, useEffect, useRef } from 'react';
import InteractiveMap from '../components/InteractiveMap';
import RiskBadge from '../components/RiskBadge';
import { api } from '../services/api';
import {
  MapPin,
  AlertTriangle,
  CloudRain,
  Wind,
  Thermometer,
  Waves,
  Info,
  ShieldAlert,
  Clock,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Radio,
  Grid,
  Layers,
  Activity
} from 'lucide-react';

export default function DisasterRiskMapPage({
  locations = [],
  districtRisks = {},
  selectedLocationId = 1,
  onSelectDistrict,
  currentRiskAssessment,
  selectedLocation
}) {
  const [filterHazard, setFilterHazard] = useState('all');

  // Doppler Radar & Spatial Grid Mesh States
  const [showRadarOverlay, setShowRadarOverlay] = useState(true);
  const [showSpatialMesh, setShowSpatialMesh] = useState(false);
  const [radarSites, setRadarSites] = useState([]);
  const [nowcastData, setNowcastData] = useState(null);
  const [spatialMeshData, setSpatialMeshData] = useState(null);
  const [currentFrameIdx, setCurrentFrameIdx] = useState(2); // Default to frame 2 (0m LIVE)
  const [isPlaying, setIsPlaying] = useState(false);

  const playTimerRef = useRef(null);

  const hazardIcons = {
    heavy_rainfall: CloudRain,
    flood_condition: Waves,
    high_wind: Wind,
    extreme_heat: Thermometer,
  };

  // Fetch Radar Sites, Nowcast Frames, and Spatial Grid Mesh
  useEffect(() => {
    api.getRadarSites()
      .then((data) => setRadarSites(data?.sites || (Array.isArray(data) ? data : [])))
      .catch((err) => console.error('Radar sites fetch error:', err));

    api.getRadarNowcast()
      .then((data) => setNowcastData(data))
      .catch((err) => console.error('Radar nowcast fetch error:', err));

    api.getSpatialMesh()
      .then((data) => setSpatialMeshData(data))
      .catch((err) => console.error('Spatial mesh fetch error:', err));
  }, []);

  // Animation loop for 15-minute Doppler Nowcast
  useEffect(() => {
    if (isPlaying && nowcastData?.frames?.length > 0) {
      playTimerRef.current = setInterval(() => {
        setCurrentFrameIdx((prev) => (prev + 1) % nowcastData.frames.length);
      }, 1500);
    } else {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    }

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, nowcastData]);

  const frames = nowcastData?.frames || [];
  const activeFrame = frames[currentFrameIdx] || null;

  return (
    <div className="p-8 space-y-6 max-w-[1700px] mx-auto select-none">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Geospatial Multi-Hazard & Doppler Nowcasting Map
            </h1>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-500/20 text-[#27C7E8] border border-[#164A7D]">
              GIS v2.0
            </span>
          </div>
          <p className="text-sm text-[#A9BEDA]">
            Dual S-Band Doppler Weather Radar (0-3h Nowcast) fused with continuous 0.5° spatial hazard meshes and telemetry.
          </p>
        </div>

        {/* Hazard Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#0A2041] border border-[#164A7D] p-1.5 rounded-xl">
          {[
            { id: 'all', label: 'All Hazards' },
            { id: 'heavy_rainfall', label: 'Heavy Rain' },
            { id: 'flood_condition', label: 'Flood Watch' },
            { id: 'high_wind', label: 'High Wind' },
            { id: 'extreme_heat', label: 'Heatwave' },
          ].map((h) => (
            <button
              key={h.id}
              onClick={() => setFilterHazard(h.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterHazard === h.id
                  ? 'bg-[#1687F8] text-white shadow-md'
                  : 'text-[#A9BEDA] hover:text-white'
              }`}
            >
              {h.label}
            </button>
          ))}
        </div>
      </div>

      {/* Layer Control & Doppler Nowcast Playback Bar */}
      <div className="bg-[#0A2041] border border-[#164A7D] p-4 rounded-xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Layer Toggles */}
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <button
            onClick={() => setShowRadarOverlay(!showRadarOverlay)}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
              showRadarOverlay
                ? 'bg-[#27C7E8]/20 border-[#27C7E8] text-[#27C7E8] shadow-md shadow-cyan-500/10'
                : 'bg-[#071A35] border-[#164A7D] text-[#A9BEDA] hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Doppler Radar Echoes (dBZ)</span>
          </button>

          <button
            onClick={() => setShowSpatialMesh(!showSpatialMesh)}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
              showSpatialMesh
                ? 'bg-[#1687F8]/20 border-[#1687F8] text-white shadow-md shadow-blue-500/10'
                : 'bg-[#071A35] border-[#164A7D] text-[#A9BEDA] hover:text-white'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>0.5° Continuous Spatial Grid</span>
          </button>
        </div>

        {/* Nowcast Time-Slider & Animation Player */}
        {showRadarOverlay && frames.length > 0 && (
          <div className="flex items-center space-x-3 w-full md:w-auto justify-end bg-[#071A35] px-4 py-2 rounded-xl border border-[#164A7D]/70">
            <button
              onClick={() => setCurrentFrameIdx((prev) => (prev > 0 ? prev - 1 : frames.length - 1))}
              className="p-1 rounded-lg text-[#A9BEDA] hover:text-white hover:bg-[#0A2041]"
              title="Previous Frame"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 rounded-lg bg-[#1687F8] text-white hover:bg-blue-500 shadow-md"
              title={isPlaying ? 'Pause Nowcast' : 'Play Nowcast'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setCurrentFrameIdx((prev) => (prev + 1) % frames.length)}
              className="p-1 rounded-lg text-[#A9BEDA] hover:text-white hover:bg-[#0A2041]"
              title="Next Frame"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-mono text-[#A9BEDA]">Nowcast:</span>
              <div className="flex space-x-1">
                {frames.map((f, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setCurrentFrameIdx(idx);
                      setIsPlaying(false);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                      currentFrameIdx === idx
                        ? f.is_nowcast_projection
                          ? 'bg-[#27C7E8] text-[#071A35]'
                          : 'bg-emerald-500 text-white'
                        : 'bg-[#0A2041] text-[#A9BEDA] hover:text-white'
                    }`}
                  >
                    {f.lead_minutes === 0 ? 'LIVE' : `${f.lead_minutes > 0 ? '+' : ''}${f.lead_minutes}m`}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-[11px] font-mono text-white pl-2 border-l border-[#164A7D]">
              {activeFrame?.is_nowcast_projection ? (
                <span className="text-[#27C7E8] font-semibold flex items-center space-x-1">
                  <Activity className="w-3 h-3 animate-pulse inline" />
                  <span>Optical Flow (+{activeFrame.lead_minutes}m)</span>
                </span>
              ) : (
                <span className="text-[#20C997] font-semibold">
                  LIVE Doppler Sweep ({activeFrame?.lead_minutes}m)
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Map + Detail Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Map (2 Columns) */}
        <div className="lg:col-span-2 h-[600px] bg-[#0A2041] border border-[#164A7D] rounded-xl overflow-hidden shadow-xl p-1">
          <InteractiveMap
            locations={locations}
            districtRisks={districtRisks}
            selectedLocationId={selectedLocationId}
            onSelectDistrict={onSelectDistrict}
            minHeight="590px"
            showRadarOverlay={showRadarOverlay}
            showSpatialMesh={showSpatialMesh}
            radarFrame={activeFrame}
            radarSites={radarSites}
            spatialGridPoints={spatialMeshData?.grid_points || []}
          />
        </div>

        {/* District Risk Inspector Drawer (1 Column) */}
        <div className="bg-[#0A2041] border border-[#164A7D] p-5 rounded-xl shadow-xl flex flex-col justify-between overflow-y-auto max-h-[600px]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#164A7D]/40">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#27C7E8] tracking-wider font-bold">
                  District Telemetry
                </span>
                <h3 className="text-lg font-bold text-white flex items-center space-x-1.5 mt-0.5">
                  <MapPin className="w-4 h-4 text-[#27C7E8]" />
                  <span>{selectedLocation?.name || 'Chennai'}</span>
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#EF4444] text-white">
                {currentRiskAssessment?.overall_risk_level?.toUpperCase() || 'VERY HIGH'}
              </span>
            </div>

            {/* Geographical Specs */}
            <div className="grid grid-cols-2 gap-2 my-3 text-[11px] font-mono text-slate-300">
              <div className="bg-[#071A35] p-2.5 rounded-lg border border-[#164A7D]/40">
                <span className="text-[#A9BEDA] block text-[10px]">Elevation</span>
                <span className="font-semibold text-white">{selectedLocation?.elevation_m || 10} m ASL</span>
              </div>
              <div className="bg-[#071A35] p-2.5 rounded-lg border border-[#164A7D]/40">
                <span className="text-[#A9BEDA] block text-[10px]">Coordinates</span>
                <span className="font-semibold text-white">
                  {selectedLocation?.latitude?.toFixed(2)}°N, {selectedLocation?.longitude?.toFixed(2)}°E
                </span>
              </div>
            </div>

            {/* Active Hazard Breakdown */}
            <div className="space-y-2 mt-4">
              <div className="text-xs font-bold text-white uppercase tracking-wider mb-2">
                Evaluated Hazard Triggers
              </div>

              {currentRiskAssessment?.hazards ? (
                currentRiskAssessment.hazards.map((hz, idx) => {
                  const Icon = hazardIcons[hz.hazard_type] || AlertTriangle;
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-[#071A35] border border-[#164A7D]/40 flex items-start justify-between"
                    >
                      <div className="flex items-start space-x-2.5">
                        <div className="p-1.5 rounded-md bg-[#0A2041] text-[#27C7E8] mt-0.5">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white capitalize">
                            {hz.hazard_type.replace('_', ' ')}
                          </div>
                          <div className="text-[11px] text-[#A9BEDA] mt-0.5">{hz.explanation}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono bg-[#1687F8]/20 text-[#27C7E8] border border-[#1687F8]/30">
                        {hz.risk_level}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-[#A9BEDA] py-4 text-center">Loading district risks...</div>
              )}
            </div>
          </div>

          {/* Statutory Disclaimer Notice */}
          <div className="mt-4 pt-3 border-t border-[#164A7D]/40 bg-[#071A35]/60 p-3 rounded-lg text-[10px] text-[#A9BEDA] flex items-start space-x-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p>
              <strong>Civil Operations Note:</strong> Dual S-Band Doppler Radar captures convective squall lines within 250km radial coverage. Nowcasting frames extrapolate cloudburst velocity via optical flow.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
