import React from 'react';
import { Terminal, X, RefreshCw, Download, CheckCircle, AlertTriangle, Info } from 'lucide-react';

export default function SystemLogsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const mockLogs = [
    { time: '14 Apr 2025 14:32:05', level: 'INFO', msg: 'System telemetry heartbeat dispatched: 12 stations healthy.' },
    { time: '14 Apr 2025 14:30:00', level: 'INFO', msg: 'Cron ingestion triggered: ECMWF IFS and GFS 00Z runs ingested successfully.' },
    { time: '14 Apr 2025 14:28:45', level: 'SUCCESS', msg: 'AI Forecast Blender (Random Forest v1.2.3) executed inference for Chennai.' },
    { time: '14 Apr 2025 14:28:42', level: 'INFO', msg: 'Physics bounds constraint enforced: precipitation clamped to >= 0.0 mm.' },
    { time: '14 Apr 2025 14:12:10', level: 'ALERT', msg: 'Threshold breached: Cuddalore coastal squall wind speed 68.2 km/h > 45.0 km/h.' },
    { time: '14 Apr 2025 14:12:09', level: 'INFO', msg: 'Alert deduplication key evaluated: [Cuddalore_high_wind_20250414] active.' },
    { time: '14 Apr 2025 14:00:00', level: 'INFO', msg: 'NWP multi-model interpolation aligned to EPSG:4326 coordinate grid.' },
    { time: '14 Apr 2025 13:45:12', level: 'INFO', msg: 'Database connection verified: SQLite backend WAL mode active.' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#071A35] border border-[#164A7D] rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#0A2041] border-b border-[#164A7D] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-[#27C7E8]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">System Runtime & Audit Logs</h3>
              <p className="text-xs text-[#A9BEDA]">Live trace logs from FastAPI ASGI and ML Ingestion Service</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#06162F] hover:bg-[#164A7D] flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Log Viewer Content */}
        <div className="p-4 bg-[#06162F] flex-1 overflow-y-auto font-mono text-xs space-y-2">
          {mockLogs.map((log, i) => (
            <div key={i} className="flex items-start space-x-3 p-2 rounded hover:bg-[#0A2041]/50 transition-colors">
              <span className="text-[#A9BEDA] shrink-0">{log.time}</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                  log.level === 'ALERT'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : log.level === 'SUCCESS'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                }`}
              >
                {log.level}
              </span>
              <span className="text-slate-200 flex-1">{log.msg}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#0A2041] border-t border-[#164A7D] flex items-center justify-between text-xs text-[#A9BEDA]">
          <span>Service: <strong className="text-white">FastAPI 0.110</strong> | Engine: <strong className="text-white">Uvicorn</strong></span>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => alert('Logs downloaded')}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-[#071A35] hover:bg-[#164A7D] text-white border border-[#164A7D] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-[#1687F8] hover:bg-blue-500 text-white font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
