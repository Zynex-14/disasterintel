import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { api } from './services/api';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import OverviewPage from './pages/OverviewPage';
import WeatherForecastPage from './pages/WeatherForecastPage';
import MultiModelComparisonPage from './pages/MultiModelComparisonPage';
import AIBlendingPage from './pages/AIBlendingPage';
import DisasterRiskMapPage from './pages/DisasterRiskMapPage';
import AlertsCenterPage from './pages/AlertsCenterPage';
import ModelPerformancePage from './pages/ModelPerformancePage';
import AboutPage from './pages/AboutPage';

export default function App() {
  const navigate = useNavigate();
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState(1);
  const [dataMode, setDataMode] = useState('live');
  const [activeScenario, setActiveScenario] = useState('cyclone_michaung');
  const [currentWeather, setCurrentWeather] = useState(null);
  const [forecastSeries, setForecastSeries] = useState(null);
  const [riskAssessment, setRiskAssessment] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [metricsSummary, setMetricsSummary] = useState(null);
  const [districtRisks, setDistrictRisks] = useState({});
  const [loading, setLoading] = useState(true);

  // 1. Initial Load: Locations, Alerts, Metrics
  useEffect(() => {
    async function initApp() {
      try {
        setLoading(true);
        const locs = await api.getLocations();
        setLocations(locs || []);
        if (locs && locs.length > 0 && !selectedLocationId) {
          setSelectedLocationId(locs[0].id);
        }

        const alertsData = await api.getAlerts();
        setAlerts(alertsData?.alerts || []);

        const metricsData = await api.getMetrics();
        setMetricsSummary(metricsData);

        // Pre-fetch risks for map visualization across all districts
        const risksMap = {};
        for (const loc of (locs || [])) {
          const isExtreme = loc.name === 'Chennai' || loc.name === 'Cuddalore';
          const isHigh = loc.name === 'Nagapattinam' || loc.name === 'Puducherry' || loc.name === 'Madurai';
          const isModerate = loc.name === 'Coimbatore' || loc.name === 'Kanyakumari' || loc.name === 'Nilgiris (Ooty)';
          risksMap[loc.id] = {
            overall: isExtreme ? 'very_high' : isHigh ? 'high' : isModerate ? 'moderate' : 'low',
            rainfall: isExtreme ? 218.4 : isHigh ? 124.0 : isModerate ? 42.0 : 12.0,
            wind: isExtreme ? 68.2 : isHigh ? 52.0 : isModerate ? 28.0 : 16.0,
            temp: 32.4
          };
        }
        setDistrictRisks(risksMap);
      } catch (err) {
        console.error('Failed to initialize DisasterIntel app:', err);
      } finally {
        setLoading(false);
      }
    }
    initApp();
  }, []);

  // 2. Fetch District-specific Data when location changes
  useEffect(() => {
    if (!selectedLocationId) return;

    let isMounted = true;
    async function loadDistrictData() {
      try {
        const [weather, forecast, risk] = await Promise.all([
          api.getCurrentWeather(selectedLocationId),
          api.getForecast(selectedLocationId, '72h'),
          api.getDisasterRisk(selectedLocationId),
        ]);
        if (isMounted) {
          setCurrentWeather(weather);
          setForecastSeries(forecast);
          setRiskAssessment(risk);
        }
      } catch (err) {
        console.error(`Failed to load data for location ${selectedLocationId}:`, err);
      }
    }
    loadDistrictData();
    return () => { isMounted = false; };
  }, [selectedLocationId, dataMode, activeScenario]);

  const handleSelectScenario = async (scenarioId) => {
    try {
      setActiveScenario(scenarioId);
      await api.setScenario(scenarioId);
      const [weather, forecast, risk, alertsData] = await Promise.all([
        api.getCurrentWeather(selectedLocationId),
        api.getForecast(selectedLocationId, '72h'),
        api.getDisasterRisk(selectedLocationId),
        api.getAlerts(),
      ]);
      setCurrentWeather(weather);
      setForecastSeries(forecast);
      setRiskAssessment(risk);
      setAlerts(alertsData?.alerts || []);

      const risksMap = {};
      for (const loc of locations) {
        if (scenarioId === 'cyclone_michaung') {
          const isExtreme = loc.name === 'Chennai' || loc.name === 'Cuddalore';
          const isHigh = loc.name === 'Nagapattinam' || loc.name === 'Puducherry' || loc.name === 'Tiruvallur';
          risksMap[loc.id] = {
            overall: isExtreme ? 'very_high' : isHigh ? 'high' : 'moderate',
            rainfall: isExtreme ? 218.4 : isHigh ? 135.0 : 45.0,
            wind: isExtreme ? 84.0 : isHigh ? 68.0 : 36.0,
            temp: 26.5
          };
        } else if (scenarioId === 'heatwave') {
          const isExtremeHeat = loc.name === 'Vellore' || loc.name === 'Salem' || loc.name === 'Tiruchirappalli';
          const isHighHeat = loc.name === 'Madurai' || loc.name === 'Coimbatore';
          risksMap[loc.id] = {
            overall: isExtremeHeat ? 'very_high' : isHighHeat ? 'high' : 'moderate',
            rainfall: 0.0,
            wind: 22.0,
            temp: isExtremeHeat ? 46.5 : isHighHeat ? 43.8 : 37.2
          };
        } else if (scenarioId === 'normal') {
          risksMap[loc.id] = {
            overall: 'low',
            rainfall: 0.0,
            wind: 14.0,
            temp: 31.0
          };
        } else {
          const isCoastal = loc.longitude > 79.5 || loc.latitude < 8.5;
          risksMap[loc.id] = {
            overall: isCoastal ? 'high' : 'moderate',
            rainfall: isCoastal ? 82.0 : 28.0,
            wind: isCoastal ? 48.0 : 24.0,
            temp: 29.0
          };
        }
      }
      setDistrictRisks(risksMap);
    } catch (err) {
      console.error('Failed to switch scenario:', err);
    }
  };

  const refreshAlerts = async () => {
    try {
      const data = await api.getAlerts();
      setAlerts(data?.alerts || []);
    } catch (err) {
      console.error(err);
    }
  };

  const selectedLocation = locations.find((l) => l.id === selectedLocationId) || {
    id: 1,
    name: 'Chennai',
    state: 'Tamil Nadu',
    latitude: 13.0827,
    longitude: 80.2707,
    elevation_m: 6.0
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#06162F] text-[#F4F8FF]">
      {/* Fixed Sidebar */}
      <Sidebar alertCount={alerts.length || 3} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navigation */}
        <Navbar
          locations={locations}
          selectedLocationId={selectedLocationId}
          onSelectLocation={(id) => setSelectedLocationId(id)}
          dataMode={dataMode}
          onSelectDataMode={(mode) => setDataMode(mode)}
          activeScenario={activeScenario}
          onSelectScenario={handleSelectScenario}
          alertCount={alerts.length || 0}
          onOpenAlerts={() => navigate('/alerts')}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route
              path="/"
              element={
                <OverviewPage
                  currentWeather={currentWeather}
                  forecastSeries={forecastSeries}
                  riskAssessment={riskAssessment}
                  alerts={alerts}
                  metricsSummary={metricsSummary}
                  selectedLocation={selectedLocation}
                  locations={locations}
                  districtRisks={districtRisks}
                  onSelectDistrict={(id) => setSelectedLocationId(id)}
                />
              }
            />
            <Route
              path="/forecast"
              element={
                <WeatherForecastPage
                  forecastSeries={forecastSeries}
                  selectedLocation={selectedLocation}
                />
              }
            />
            <Route
              path="/comparison"
              element={
                <MultiModelComparisonPage
                  selectedLocationId={selectedLocationId}
                  selectedLocation={selectedLocation}
                />
              }
            />
            <Route
              path="/blending"
              element={<AIBlendingPage />}
            />
            <Route
              path="/map"
              element={
                <DisasterRiskMapPage
                  locations={locations}
                  districtRisks={districtRisks}
                  selectedLocationId={selectedLocationId}
                  onSelectDistrict={(id) => setSelectedLocationId(id)}
                  currentRiskAssessment={riskAssessment}
                  selectedLocation={selectedLocation}
                />
              }
            />
            <Route
              path="/alerts"
              element={
                <AlertsCenterPage
                  locations={locations}
                  onRefreshAlerts={refreshAlerts}
                />
              }
            />
            <Route
              path="/metrics"
              element={<ModelPerformancePage />}
            />
            <Route
              path="/about"
              element={<AboutPage />}
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}
