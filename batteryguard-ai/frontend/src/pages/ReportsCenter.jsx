import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

export default function ReportsCenter() {
  const [sessions, setSessions] = useState([]);
  const [selectedTestId, setSelectedTestId] = useState('');
  const [loading, setLoading] = useState(true);
  const { addToast } = useAuth();

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getTestSessions();
        setSessions(data);
        if (data.length > 0) {
          setSelectedTestId(data[0].test_id);
        }
      } catch (err) {
        addToast(err.message || 'Failed to load test sessions', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const activeSession = sessions.find(s => s.test_id === selectedTestId);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Reports & Data Export Center
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Generate publication-grade PDF diagnostic screening reports and bulk CSV telemetry exports
        </p>
      </div>

      {/* PDF Generator Card */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Official PDF Battery Screening Report
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Compliant ReportLab document featuring corporate header, calculated metrics, rule evaluations, and safety disclaimers
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Completed Test Session:
            </label>
            <select
              value={selectedTestId}
              onChange={(e) => setSelectedTestId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              {sessions.map(s => (
                <option key={s.id} value={s.test_id}>
                  {s.test_id} — {s.battery_code} ({s.screening_category || 'COMPLETED'})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-3">
            {selectedTestId && (
              <a
                href={api.getPdfReportUrl(selectedTestId)}
                download
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 rounded-xl shadow-md transition active:scale-95"
              >
                <Download className="w-4 h-4" />
                Download PDF Report ({selectedTestId})
              </a>
            )}
          </div>
        </div>

        {/* Report Preview Highlights */}
        {activeSession && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
            <span className="font-bold text-slate-900 dark:text-white block">
              Report Contents Preview for {activeSession.test_id}:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600 dark:text-slate-300">
              <div>Asset: <span className="font-semibold text-slate-900 dark:text-white">{activeSession.battery_code}</span></div>
              <div>Profile: <span className="font-semibold text-slate-900 dark:text-white">{activeSession.profile_name}</span></div>
              <div>Result: <span className="font-semibold text-slate-900 dark:text-white">{activeSession.screening_category}</span></div>
              <div>Technician: <span className="font-semibold text-slate-900 dark:text-white">{activeSession.technician_name}</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk CSV Exports Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Battery Inventory CSV */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Battery Asset Inventory (CSV)
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Full fleet registry with chemistries, nominal voltages, and test histories
              </p>
            </div>
          </div>
          <a
            href={api.getBatteriesCsvUrl()}
            download
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export Batteries CSV
          </a>
        </div>

        {/* Selected Test Readings CSV */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Raw Sensor Readings Data Log (CSV)
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Timestamped voltages, currents, temperatures, and test phases
              </p>
            </div>
          </div>
          {selectedTestId ? (
            <a
              href={api.getReadingsCsvUrl(selectedTestId)}
              download
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
            >
              <Download className="w-3.5 h-3.5" />
              Export {selectedTestId} Readings
            </a>
          ) : (
            <div className="text-xs text-slate-400 text-center py-2">Select a test above</div>
          )}
        </div>
      </div>
    </div>
  );
}
