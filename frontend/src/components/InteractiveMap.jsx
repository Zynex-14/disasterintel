import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { CloudRain, Waves, Wind, Thermometer, Radio, Activity, Navigation } from 'lucide-react';

const RISK_COLORS = {
  low: '#20C997',
  moderate: '#FACC15',
  high: '#F97316',
  very_high: '#EF4444',
};

function getDbzColor(dbz) {
  if (dbz >= 55) return '#D946EF'; // Extreme / Hail Core (Magenta)
  if (dbz >= 48) return '#EF4444'; // Torrential / Cloudburst (Red)
  if (dbz >= 40) return '#F97316'; // Heavy Rain (Orange)
  if (dbz >= 30) return '#FACC15'; // Moderate Rain (Yellow)
  if (dbz >= 20) return '#38BDF8'; // Light Rain (Cyan)
  return '#20C997'; // Trace / Sea breeze
}

export default function InteractiveMap({
  locations = [],
  districtRisks = {},
  selectedLocationId,
  onSelectDistrict,
  minHeight = '320px',
  showRadarOverlay = true,
  showSpatialMesh = false,
  radarFrame = null,
  radarSites = [],
  spatialGridPoints = []
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const radarLayerRef = useRef(null);
  const meshLayerRef = useRef(null);
  const radarSitesLayerRef = useRef(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Centered on Tamil Nadu and Puducherry
      const map = L.map(mapContainerRef.current, {
        center: [11.1271, 78.6569],
        zoom: 7,
        zoomControl: true,
        attributionControl: false,
      });

      // CartoDB Dark Matter tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 18,
      }).addTo(map);

      mapInstanceRef.current = map;
      meshLayerRef.current = L.layerGroup().addTo(map);
      radarSitesLayerRef.current = L.layerGroup().addTo(map);
      radarLayerRef.current = L.layerGroup().addTo(map);
      markersLayerRef.current = L.layerGroup().addTo(map);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Spatial Mesh Layer
  useEffect(() => {
    if (!mapInstanceRef.current || !meshLayerRef.current) return;
    meshLayerRef.current.clearLayers();

    if (!showSpatialMesh || !spatialGridPoints || spatialGridPoints.length === 0) return;

    const tierColors = {
      extreme: '#EF4444',
      high: '#F97316',
      moderate: '#FACC15',
      low: '#20C997',
    };

    spatialGridPoints.forEach((pt) => {
      const half = 0.25;
      const bounds = [
        [pt.lat - half, pt.lon - half],
        [pt.lat + half, pt.lon + half],
      ];
      const color = tierColors[pt.risk_tier] || '#20C997';
      const fillOpacity = pt.risk_tier === 'extreme' ? 0.45 : pt.risk_tier === 'high' ? 0.35 : 0.20;

      const rect = L.rectangle(bounds, {
        color: color,
        weight: 1,
        dashArray: '2, 2',
        fillColor: color,
        fillOpacity: fillOpacity,
      });

      const popup = `
        <div style="font-family: inherit; color: #F4F8FF; background: #0A2041; border: 1px solid #164A7D; border-radius: 8px; padding: 10px; min-width: 180px;">
          <h4 style="margin: 0 0 4px 0; font-size: 12px; font-weight: 700; color: #27C7E8;">0.5° Spatial Grid Cell</h4>
          <div style="font-size: 10px; color: #A9BEDA; margin-bottom: 8px;">Coords: ${pt.lat.toFixed(2)}°N, ${pt.lon.toFixed(2)}°E</div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px;">
            <span>Flood Risk Index:</span>
            <strong style="color: ${color};">${(pt.flood_risk_index * 100).toFixed(0)}% (${pt.risk_tier.toUpperCase()})</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px;">
            <span>Precipitation:</span>
            <span><strong>${pt.rainfall_mm}</strong> mm</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px;">
            <span>Sustained Wind:</span>
            <span><strong>${pt.wind_kmh}</strong> km/h</span>
          </div>
        </div>
      `;
      rect.bindPopup(popup, { className: 'dark-leaflet-popup' });
      meshLayerRef.current.addLayer(rect);
    });
  }, [showSpatialMesh, spatialGridPoints]);

  // Update Radar Sites & Range Rings
  useEffect(() => {
    if (!mapInstanceRef.current || !radarSitesLayerRef.current) return;
    radarSitesLayerRef.current.clearLayers();

    if (!showRadarOverlay || !radarSites || radarSites.length === 0) return;

    radarSites.forEach((site) => {
      // 250km Radar Range Ring
      const rangeCircle = L.circle([site.latitude, site.longitude], {
        radius: site.max_range_km * 1000,
        color: '#27C7E8',
        weight: 1,
        dashArray: '5, 5',
        fill: false,
        opacity: 0.45,
      });

      // Doppler Radar Tower DivIcon
      const radarIconHtml = `
        <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; border: 1.5px solid #27C7E8; opacity: 0.6; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background-color: #071A35;
            border: 2px solid #27C7E8;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #27C7E8;
            font-size: 10px;
            box-shadow: 0 0 10px #27C7E8;
          ">
            📡
          </div>
        </div>
      `;

      const radarIcon = L.divIcon({
        className: 'radar-site-icon',
        html: radarIconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const siteMarker = L.marker([site.latitude, site.longitude], { icon: radarIcon });

      const sitePopup = `
        <div style="font-family: inherit; color: #F4F8FF; background: #0A2041; border: 1px solid #164A7D; border-radius: 8px; padding: 10px; min-width: 190px;">
          <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #27C7E8;">${site.name}</h4>
          <div style="font-size: 10px; color: #A9BEDA; margin-bottom: 8px;">${site.band} • Max Range: ${site.max_range_km} km</div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px;">
            <span>Peak Power:</span>
            <span><strong>${site.peak_power_kw} kW</strong></span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px;">
            <span>Operational Status:</span>
            <strong style="color: #20C997;">${site.status}</strong>
          </div>
        </div>
      `;

      siteMarker.bindPopup(sitePopup, { className: 'dark-leaflet-popup' });

      radarSitesLayerRef.current.addLayer(rangeCircle);
      radarSitesLayerRef.current.addLayer(siteMarker);
    });
  }, [showRadarOverlay, radarSites]);

  // Update Radar Reflectivity Nowcast Cells
  useEffect(() => {
    if (!mapInstanceRef.current || !radarLayerRef.current) return;
    radarLayerRef.current.clearLayers();

    if (!showRadarOverlay || !radarFrame || !radarFrame.radar_cells) return;

    radarFrame.radar_cells.forEach((cell) => {
      const color = getDbzColor(cell.max_dbz);

      // Outer convective swath
      const outerCircle = L.circle(cell.center, {
        radius: cell.radius_km * 1000,
        color: color,
        weight: 1.5,
        fillColor: color,
        fillOpacity: 0.35,
      });

      // Core intense cell (highest reflectivity dBZ)
      const coreCircle = L.circle(cell.center, {
        radius: cell.radius_km * 450,
        color: '#FFFFFF',
        weight: 1,
        fillColor: color,
        fillOpacity: 0.70,
      });

      const cellPopup = `
        <div style="font-family: inherit; color: #F4F8FF; background: #0A2041; border: 1px solid #164A7D; border-radius: 8px; padding: 10px; min-width: 190px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <h4 style="margin: 0; font-size: 12px; font-weight: 700; color: #FFFFFF;">${cell.cell_id}</h4>
            <span style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: ${color}; color: #071A35;">
              ${cell.max_dbz} dBZ
            </span>
          </div>
          <div style="font-size: 11px; font-weight: 600; color: #FACC15; margin-bottom: 6px;">${cell.hazard}</div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px;">
            <span>Echo Top:</span>
            <span><strong>${cell.cloud_top_km} km</strong> ASL</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px;">
            <span>Cell Tracking:</span>
            <span><strong>${cell.speed_kmh} km/h</strong> @ ${cell.direction_deg}°</span>
          </div>
          <div style="font-size: 9px; color: #A9BEDA; margin-top: 6px; border-top: 1px solid #164A7D/40; padding-top: 4px;">
            ${radarFrame.is_nowcast_projection ? '⚡ Extrapolated Optical Flow Nowcast' : 'Live DWR Sweep Observation'}
          </div>
        </div>
      `;

      outerCircle.bindPopup(cellPopup, { className: 'dark-leaflet-popup' });
      coreCircle.bindPopup(cellPopup, { className: 'dark-leaflet-popup' });

      radarLayerRef.current.addLayer(outerCircle);
      radarLayerRef.current.addLayer(coreCircle);
    });
  }, [showRadarOverlay, radarFrame]);

  // Update District Risk Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    // Default sample risks if not populated
    const sampleRisks = {
      1: { overall: 'very_high', rainfall: 218.4, wind: 68.2 }, // Chennai
      2: { overall: 'moderate', rainfall: 42.0, wind: 28.0 },   // Coimbatore
      3: { overall: 'very_high', rainfall: 112.5, wind: 48.0 }, // Madurai
      4: { overall: 'low', rainfall: 14.2, wind: 18.0 },        // Tiruchirappalli
      5: { overall: 'low', rainfall: 8.5, wind: 15.0 },         // Salem
      6: { overall: 'high', rainfall: 148.0, wind: 64.0 },      // Cuddalore
      7: { overall: 'high', rainfall: 135.0, wind: 58.0 },      // Nagapattinam
      8: { overall: 'moderate', rainfall: 38.0, wind: 32.0 },   // Kanyakumari
      9: { overall: 'low', rainfall: 12.0, wind: 16.0 },        // Vellore
      10: { overall: 'low', rainfall: 18.0, wind: 20.0 },       // Thanjavur
      11: { overall: 'moderate', rainfall: 55.0, wind: 24.0 },  // Nilgiris
      12: { overall: 'high', rainfall: 124.0, wind: 52.0 },     // Puducherry
    };

    locations.forEach((loc) => {
      const riskInfo = districtRisks[loc.id] || sampleRisks[loc.id] || {
        overall: 'low',
        rainfall: 12.0,
        wind: 24.0,
      };

      const color = RISK_COLORS[riskInfo.overall] || RISK_COLORS.low;
      const isSelected = selectedLocationId === loc.id;
      const isVeryHigh = riskInfo.overall === 'very_high';

      // Custom Circular Pin with "!" inside
      const iconHtml = `
        <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          ${isVeryHigh ? `<div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: ${color}; opacity: 0.35; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>` : ''}
          <div style="
            width: ${isSelected ? '26px' : '22px'};
            height: ${isSelected ? '26px' : '22px'};
            border-radius: 50%;
            background-color: ${color};
            border: 2px solid #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-weight: 900;
            font-size: 11px;
            box-shadow: 0 0 10px ${color};
            transition: all 0.2s ease;
          ">
            !
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: iconHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([loc.latitude, loc.longitude], { icon: customIcon });

      const popupContent = `
        <div style="font-family: inherit; color: #F4F8FF; background: #0A2041; border: 1px solid #164A7D; border-radius: 8px; padding: 10px; min-width: 175px;">
          <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #FFFFFF;">${loc.name}</h4>
          <div style="font-size: 10px; color: #A9BEDA; margin-bottom: 8px;">${loc.state} • Elevation: ${loc.elevation_m || 10}m</div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
            <span>Risk Level:</span>
            <strong style="color: ${color}; text-transform: capitalize;">${riskInfo.overall.replace('_', ' ')}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
            <span>24h Rainfall:</span>
            <span><strong>${riskInfo.rainfall || 0}</strong> mm</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 8px;">
            <span>Max Wind:</span>
            <span><strong>${riskInfo.wind || 0}</strong> km/h</span>
          </div>
          <button id="btn-select-${loc.id}" style="
            width: 100%;
            padding: 6px 8px;
            font-size: 11px;
            font-weight: 600;
            background: #1687F8;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
          ">Focus District</button>
        </div>
      `;

      marker.bindPopup(popupContent, {
        className: 'dark-leaflet-popup'
      });

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-select-${loc.id}`);
        if (btn) {
          btn.onclick = () => {
            if (onSelectDistrict) onSelectDistrict(loc.id);
            marker.closePopup();
          };
        }
      });

      markersLayerRef.current.addLayer(marker);
    });
  }, [locations, districtRisks, selectedLocationId, onSelectDistrict]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden" style={{ minHeight }}>
      <div ref={mapContainerRef} className="w-full h-full z-10" style={{ minHeight }} />

      {/* Floating Legend Box with Radar dBZ and Risk Levels */}
      <div className="absolute top-3 right-3 z-20 bg-[#071A35]/90 border border-[#164A7D] p-3 rounded-xl shadow-2xl backdrop-blur-md text-[11px] space-y-2 pointer-events-auto max-w-[210px]">
        {showRadarOverlay && (
          <div className="pb-2 border-b border-[#164A7D]/60">
            <div className="font-bold text-white text-[10px] uppercase tracking-wider mb-1 flex items-center justify-between">
              <span className="flex items-center space-x-1">
                <Radio className="w-3 h-3 text-[#27C7E8]" />
                <span>Radar dBZ Echo</span>
              </span>
              <span className="text-[9px] text-[#27C7E8] font-mono">DWR S-Band</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#D946EF]" />
                <span className="text-[#A9BEDA]">&gt;55 dBZ Hail</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#EF4444]" />
                <span className="text-[#A9BEDA]">48-54 Extreme</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#F97316]" />
                <span className="text-[#A9BEDA]">40-47 Heavy</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#FACC15]" />
                <span className="text-[#A9BEDA]">30-39 Moderate</span>
              </div>
            </div>
          </div>
        )}

        <div>
          <div className="font-bold text-white text-[10px] uppercase tracking-wider mb-1.5">
            Civil Risk Alert Level
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
              <span className="text-[#A9BEDA]">Very High (Red Alert)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F97316]" />
              <span className="text-[#A9BEDA]">High (Orange Alert)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FACC15]" />
              <span className="text-[#A9BEDA]">Moderate (Yellow Alert)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#20C997]" />
              <span className="text-[#A9BEDA]">Low (Green Watch)</span>
            </div>
          </div>
        </div>

        <div className="pt-1.5 border-t border-[#164A7D]/60">
          <div className="font-bold text-white text-[10px] uppercase tracking-wider mb-1.5">
            Monitored Hazards
          </div>
          <div className="grid grid-cols-2 gap-1 text-[10px] text-[#A9BEDA]">
            <div className="flex items-center space-x-1">
              <CloudRain className="w-3 h-3 text-blue-400" />
              <span>Rainfall</span>
            </div>
            <div className="flex items-center space-x-1">
              <Waves className="w-3 h-3 text-cyan-400" />
              <span>Flood</span>
            </div>
            <div className="flex items-center space-x-1">
              <Wind className="w-3 h-3 text-teal-400" />
              <span>Wind</span>
            </div>
            <div className="flex items-center space-x-1">
              <Thermometer className="w-3 h-3 text-amber-400" />
              <span>Temperature</span>
            </div>
          </div>
        </div>
      </div>

      {/* Attribution & Radar Active Indicator */}
      <div className="absolute bottom-2 left-3 z-20 flex items-center space-x-2 pointer-events-none">
        <div className="text-[10px] text-[#A9BEDA] bg-[#071A35]/90 px-2.5 py-1 rounded border border-[#164A7D]/50 flex items-center space-x-2 backdrop-blur-sm">
          <span className="w-2 h-2 rounded-full bg-[#20C997] animate-pulse" />
          <span>IMD Chennai Port & Karaikal DWR Composite • 250km Radial Scans</span>
        </div>
      </div>
    </div>
  );
}
