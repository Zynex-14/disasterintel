import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  BellRing,
  AlertTriangle,
  CheckCircle,
  Filter,
  Search,
  Check,
  Radio,
  Clock,
  MapPin,
  RefreshCw,
  FileCode,
  ClipboardList,
  Send,
  X,
  Copy
} from 'lucide-react';

export default function AlertsCenterPage({ locations = [], onRefreshAlerts }) {
  const [alertsSummary, setAlertsSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedHazard, setSelectedHazard] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Enterprise Modals
  const [showCapModal, setShowCapModal] = useState(false);
  const [capXmlContent, setCapXmlContent] = useState('');
  const [copiedCap, setCopiedCap] = useState(false);

  const [showIapModal, setShowIapModal] = useState(false);
  const [iapData, setIapData] = useState(null);

  const [broadcastBanner, setBroadcastBanner] = useState(null);

  const loadAlerts = () => {
    setLoading(true);
    const params = {};
    if (selectedSeverity !== 'all') params.severity = selectedSeverity;
    if (selectedHazard !== 'all') params.hazardType = selectedHazard;

    api.getAlerts(params)
      .then((data) => setAlertsSummary(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAlerts();
  }, [selectedSeverity, selectedHazard]);

  const handleOpenCap = async () => {
    try {
      const res = await fetch(api.getCapXmlUrl());
      const xml = await res.text();
      setCapXmlContent(xml);
      setShowCapModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenIap = async () => {
    try {
      const data = await api.getIncidentActionPlan();
      setIapData(data);
      setShowIapModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBroadcast = async () => {
    try {
      const res = await api.triggerEmergencyBroadcast();
      setBroadcastBanner(`Broadcast Dispatched: ${res.active_alerts_pushed} alerts sent via ${res.channels.join(', ')} to ${res.target_districts.length} districts.`);
      setTimeout(() => setBroadcastBanner(null), 6000);
    } catch (err) {
      console.error(err);
    }
  };

  const copyCapToClipboard = () => {
    navigator.clipboard.writeText(capXmlContent);
    setCopiedCap(true);
    setTimeout(() => setCopiedCap(false), 2500);
  };

  const handleResolve = async (alertId) => {
    try {
      await api.resolveAlert(alertId);
      loadAlerts();
      if (onRefreshAlerts) onRefreshAlerts();
    } catch (err) {
      alert(`Error resolving alert: ${err.message}`);
    }
  };

  const filteredAlerts = alertsSummary?.alerts?.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.location_name?.toLowerCase().includes(q) ||
      a.hazard_type?.toLowerCase().includes(q) ||
      a.description?.toLowerCase().includes(q)
    );
  }) || [];

  return (
    <div className="p-8 space-y-6 max-w-[1700px] mx-auto select-none">
      {/* Broadcast Banner Notification */}
      {broadcastBanner && (
        <div className="bg-emerald-500/15 border border-[#20C997] p-3.5 rounded-xl text-xs text-[#20C997] flex items-center justify-between animate-fade-in shadow-lg">
          <div className="flex items-center space-x-2 font-semibold">
            <Radio className="w-4 h-4 animate-pulse" />
            <span>{broadcastBanner}</span>
          </div>
          <button onClick={() => setBroadcastBanner(null)} className="text-[#A9BEDA] hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Disaster Alerts & Incident Command Center
          </h1>
          <p className="text-sm text-[#A9BEDA]">
            Statutory OASIS CAP v1.2 early warning dispatch, deduplicated incident ledger, and State Action Plans.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Emergency Broadcast Trigger */}
          <button
            onClick={handleBroadcast}
            className="flex items-center space-x-1.5 bg-[#EF4444]/20 hover:bg-[#EF4444]/30 text-rose-300 border border-rose-500/40 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Emergency Broadcast (WEA)</span>
          </button>

          {/* Incident Action Plan */}
          <button
            onClick={handleOpenIap}
            className="flex items-center space-x-1.5 bg-[#0A2041] hover:bg-[#0E2C58] text-[#27C7E8] border border-[#164A7D] px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Incident Action Plan (IAP)</span>
          </button>

          {/* OASIS CAP XML Feed */}
          <button
            onClick={handleOpenCap}
            className="flex items-center space-x-1.5 bg-[#0A2041] hover:bg-[#0E2C58] text-[#20C997] border border-[#164A7D] px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>OASIS CAP v1.2 XML</span>
          </button>

          <button
            onClick={loadAlerts}
            className="flex items-center space-x-1.5 bg-[#0A2041] hover:bg-[#0E2C58] text-[#A9BEDA] hover:text-white border border-[#164A7D] px-3 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#0A2041] border border-[#164A7D] p-4 rounded-xl shadow-lg">
          <div className="text-xs text-[#A9BEDA] font-medium">Active Incidents</div>
          <div className="text-2xl font-bold font-mono text-[#27C7E8] mt-1">
            {alertsSummary?.total_active ?? 4}
          </div>
          <div className="text-[11px] text-[#A9BEDA] mt-0.5">Requiring observation</div>
        </div>

        <div className="bg-[#0A2041] border border-[#164A7D] p-4 rounded-xl shadow-lg">
          <div className="text-xs text-[#A9BEDA] font-medium">High & Critical</div>
          <div className="text-2xl font-bold font-mono text-[#EF4444] mt-1">
            {alertsSummary?.high_or_critical ?? 2}
          </div>
          <div className="text-[11px] text-[#A9BEDA] mt-0.5">Level 3 & 4 Severity</div>
        </div>

        <div className="bg-[#0A2041] border border-[#164A7D] p-4 rounded-xl shadow-lg">
          <div className="text-xs text-[#A9BEDA] font-medium">Live Threshold Triggers</div>
          <div className="text-2xl font-bold font-mono text-[#20C997] mt-1">
            {alertsSummary?.live_count ?? 1}
          </div>
          <div className="text-[11px] text-[#A9BEDA] mt-0.5">Real-time NWP exceedance</div>
        </div>

        <div className="bg-[#0A2041] border border-[#164A7D] p-4 rounded-xl shadow-lg">
          <div className="text-xs text-[#A9BEDA] font-medium">Simulated Scenarios</div>
          <div className="text-2xl font-bold font-mono text-[#FACC15] mt-1">
            {alertsSummary?.simulated_count ?? 3}
          </div>
          <div className="text-[11px] text-[#A9BEDA] mt-0.5">Test drill & fallback mode</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0A2041] border border-[#164A7D] p-4 rounded-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="flex items-center space-x-2 bg-[#071A35] border border-[#164A7D] rounded-xl px-3.5 py-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#A9BEDA]" />
          <input
            type="text"
            placeholder="Search district, hazard, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none w-full"
          />
        </div>

        {/* Severity Filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto">
          {['all', 'high', 'moderate', 'low'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSelectedSeverity(sev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                selectedSeverity === sev
                  ? 'bg-[#1687F8] text-white'
                  : 'bg-[#071A35] text-[#A9BEDA] hover:text-white border border-[#164A7D]/40'
              }`}
            >
              {sev} Severity
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-[#0A2041] border border-[#164A7D] rounded-xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-[#164A7D] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Live Alert Dispatch Log</h3>
          <span className="text-xs text-[#A9BEDA] font-mono">Deduplication Keys Active</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#071A35] text-[#A9BEDA] border-b border-[#164A7D]">
              <tr>
                <th className="py-3 px-4 font-semibold">Severity</th>
                <th className="py-3 px-4 font-semibold">Location</th>
                <th className="py-3 px-4 font-semibold">Hazard</th>
                <th className="py-3 px-4 font-semibold">Triggered Value</th>
                <th className="py-3 px-4 font-semibold">Threshold</th>
                <th className="py-3 px-4 font-semibold">Description</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#164A7D]/30">
              {filteredAlerts.length > 0 ? (
                filteredAlerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-[#0E2C58] transition-colors">
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${
                          alert.severity.toLowerCase() === 'high' || alert.severity.toLowerCase() === 'very_high'
                            ? 'bg-[#EF4444]'
                            : alert.severity.toLowerCase() === 'moderate'
                            ? 'bg-[#F97316]'
                            : 'bg-[#20C997]'
                        }`}
                      >
                        {alert.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-white">{alert.location_name}</td>
                    <td className="py-3 px-4 text-cyan-300 capitalize">{alert.hazard_type.replace('_', ' ')}</td>
                    <td className="py-3 px-4 text-white font-bold">{alert.triggering_value}</td>
                    <td className="py-3 px-4 text-[#A9BEDA]">&gt; {alert.threshold}</td>
                    <td className="py-3 px-4 text-slate-300 font-sans text-xs">{alert.description}</td>
                    <td className="py-3 px-4 text-right">
                      {alert.status === 'active' ? (
                        <button
                          onClick={() => handleResolve(alert.id)}
                          className="px-2.5 py-1 rounded bg-[#071A35] hover:bg-[#164A7D] text-[#20C997] border border-[#20C997]/40 text-[10px] font-semibold transition-colors"
                        >
                          Resolve
                        </button>
                      ) : (
                        <span className="text-[#A9BEDA] text-[10px]">Resolved</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-[#A9BEDA]">
                    No incident alerts match your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. OASIS CAP v1.2 XML Feed Modal */}
      {showCapModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A2041] border border-[#164A7D] rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#164A7D]/60 pb-3">
              <div className="flex items-center space-x-2">
                <FileCode className="w-5 h-5 text-[#20C997]" />
                <h3 className="text-base font-bold text-white">OASIS CAP v1.2 Statutory XML Feed</h3>
              </div>
              <button onClick={() => setShowCapModal(false)} className="text-[#A9BEDA] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-[#A9BEDA]">
              Conforming to <strong>ITU-T X.1303 / OASIS Standard</strong> utilized by NDMA SACHET, WMO Alert Hub, and cell-broadcast towers across Tamil Nadu.
            </div>

            <div className="flex-1 overflow-y-auto bg-[#06162F] p-4 rounded-xl border border-[#164A7D]/60 font-mono text-[11px] text-cyan-300 select-text">
              <pre className="whitespace-pre-wrap">{capXmlContent}</pre>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] text-[#A9BEDA]">MIME: application/xml</span>
              <div className="flex space-x-2">
                <button
                  onClick={copyCapToClipboard}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#1687F8] hover:bg-[#126ecb] text-white text-xs font-semibold shadow-md transition-all"
                >
                  {copiedCap ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedCap ? 'XML Copied' : 'Copy CAP XML'}</span>
                </button>
                <button
                  onClick={() => setShowCapModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#071A35] hover:bg-[#0E2C58] text-[#A9BEDA] text-xs font-semibold border border-[#164A7D]/50 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. SEOC Incident Action Plan (IAP) Modal */}
      {showIapModal && iapData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A2041] border border-[#164A7D] rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#164A7D]/60 pb-3">
              <div className="flex items-center space-x-2">
                <ClipboardList className="w-5 h-5 text-[#27C7E8]" />
                <div>
                  <h3 className="text-base font-bold text-white">State Incident Action Plan (IAP)</h3>
                  <p className="text-[11px] text-[#A9BEDA]">{iapData.incident_name} — {iapData.iap_id}</p>
                </div>
              </div>
              <button onClick={() => setShowIapModal(false)} className="text-[#A9BEDA] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[#071A35] p-3 rounded-xl border border-[#164A7D]/50 text-xs">
              <div>
                <span className="text-[#A9BEDA] block text-[10px]">Operational Period</span>
                <span className="font-semibold text-white">{iapData.operational_period}</span>
              </div>
              <div>
                <span className="text-[#A9BEDA] block text-[10px]">Incident Commander</span>
                <span className="font-semibold text-white">{iapData.incident_commander}</span>
              </div>
              <div>
                <span className="text-[#A9BEDA] block text-[10px]">Total Active Incidents</span>
                <span className="font-bold text-rose-400">{iapData.total_active_alerts}</span>
              </div>
              <div>
                <span className="text-[#A9BEDA] block text-[10px]">Statutory Authority</span>
                <span className="font-semibold text-cyan-300">NDMA Act 2005</span>
              </div>
            </div>

            {/* Priority Districts */}
            <div>
              <div className="text-xs font-bold text-white mb-1.5">Priority Response Districts:</div>
              <div className="flex flex-wrap gap-1.5">
                {iapData.priority_districts.map((d, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-semibold">
                    {d} (High/Critical)
                  </span>
                ))}
              </div>
            </div>

            {/* Tactical Directives */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <div className="text-xs font-bold text-white">Departmental Response Directives:</div>
              {iapData.tactical_action_directives.map((item, idx) => (
                <div key={idx} className="bg-[#071A35] border border-[#164A7D]/40 p-3 rounded-xl flex items-start space-x-3 text-xs">
                  <span className="font-bold text-[#27C7E8] shrink-0 font-mono w-6">0{idx + 1}.</span>
                  <div>
                    <span className="font-bold text-white block">{item.dept}</span>
                    <span className="text-slate-300 mt-0.5 block">{item.action}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#164A7D]/40">
              <button
                onClick={() => setShowIapModal(false)}
                className="px-4 py-2 rounded-xl bg-[#1687F8] hover:bg-[#126ecb] text-white text-xs font-semibold shadow-md transition-all"
              >
                Acknowledge Directive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
