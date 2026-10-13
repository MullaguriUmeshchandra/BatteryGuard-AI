import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  History,
  Search,
  Filter,
  FileText,
  FileSpreadsheet,
  Download,
  Eye,
  X,
  Zap,
  Thermometer,
  Activity,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export default function TestHistory() {
  const [searchParams] = useSearchParams();
  const inspectIdParam = searchParams.get('inspect');

  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [modeFilter, setModeFilter] = useState('All');

  // Inspection modal
  const [inspectedSession, setInspectedSession] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  const { addToast } = useAuth();

  const loadTests = async () => {
    try {
      const data = await api.getTestSessions({
        search,
        category: categoryFilter,
        mode: modeFilter
      });
      setTests(data);
    } catch (err) {
      addToast(err.message || 'Failed to load test history', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTests();
  }, [search, categoryFilter, modeFilter]);

  // Open modal if inspect query param exists
  useEffect(() => {
    if (inspectIdParam) {
      handleInspect(Number(inspectIdParam));
    }
  }, [inspectIdParam]);

  const handleInspect = async (id) => {
    setInspectLoading(true);
    try {
      const detail = await api.getTestSessionDetail(id);
      setInspectedSession(detail);
    } catch (err) {
      addToast(err.message || 'Failed to load test session details', 'error');
    } finally {
      setInspectLoading(false);
    }
  };

  const getStatusBadge = (category) => {
    const cat = (category || 'REVIEW').toUpperCase();
    if (cat === 'GOOD') {
      return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">GOOD</span>;
    }
    if (cat === 'REVIEW') {
      return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">REVIEW</span>;
    }
    if (cat === 'DEGRADED') {
      return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300 border border-orange-300 dark:border-orange-800">DEGRADED</span>;
    }
    return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800">CRITICAL</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Diagnostic Test History
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Archived diagnostic screening records, raw sensor telemetry logs, and downloadable reports
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search test ID, battery ID, technician..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-white placeholder:text-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Category filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Outcome:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="py-1.5 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200"
            >
              <option value="All">All Categories</option>
              <option value="GOOD">GOOD</option>
              <option value="REVIEW">REVIEW</option>
              <option value="DEGRADED">DEGRADED</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>

          {/* Mode filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Mode:</span>
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              className="py-1.5 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200"
            >
              <option value="All">All Modes</option>
              <option value="simulation">Simulation</option>
              <option value="hardware">Hardware (ESP32)</option>
            </select>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Test ID</th>
                <th className="py-3 px-4">Battery Asset</th>
                <th className="py-3 px-4">Profile</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Screening Outcome</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading historical sessions...
                  </td>
                </tr>
              ) : tests.length > 0 ? (
                tests.map((test) => (
                  <tr key={test.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {test.test_id}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                      {test.battery_code}
                    </td>
                    <td className="py-3.5 px-4">
                      {test.profile_name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="capitalize">{test.mode}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      {test.duration_sec ? `${test.duration_sec.toFixed(1)} s` : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(test.screening_category)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(test.start_time).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleInspect(test.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Inspect Session & Curves"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <a
                        href={api.getPdfReportUrl(test.test_id)}
                        download
                        className="inline-block p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Download PDF Report"
                      >
                        <FileText className="w-4 h-4" />
                      </a>
                      <a
                        href={api.getReadingsCsvUrl(test.test_id)}
                        download
                        className="inline-block p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Export CSV Readings"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No diagnostic sessions match your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Session Modal Drawer */}
      {inspectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-sky-500 uppercase tracking-wider">
                  Test Session Details
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {inspectedSession.test_id} — {inspectedSession.battery_code}
                </h3>
              </div>
              <button
                onClick={() => setInspectedSession(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Screening Result & Action Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-semibold">Outcome:</span>
                    <div className="mt-0.5">{getStatusBadge(inspectedSession.screening_category)}</div>
                  </div>
                  <div className="pl-3 border-l border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] text-slate-400 uppercase font-semibold">Mode / Profile:</span>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {inspectedSession.mode.toUpperCase()} ({inspectedSession.profile_name})
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={api.getPdfReportUrl(inspectedSession.test_id)}
                    download
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 rounded-xl shadow-xs transition"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Download PDF
                  </a>
                  <a
                    href={api.getReadingsCsvUrl(inspectedSession.test_id)}
                    download
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    CSV Data
                  </a>
                </div>
              </div>

              {/* Calculated Metrics Grid */}
              {inspectedSession.result && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Voltage Sag</span>
                    <div className="text-lg font-bold font-mono text-sky-600 dark:text-sky-400">
                      {inspectedSession.result.voltage_sag_percent.toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Temp Delta</span>
                    <div className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">
                      +{inspectedSession.result.temp_change_c.toFixed(1)} °C
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Internal Resistance</span>
                    <div className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400">
                      {inspectedSession.result.internal_resistance_m_ohm.toFixed(1)} mΩ
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Loaded Voltage</span>
                    <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                      {inspectedSession.result.loaded_voltage.toFixed(2)} V
                    </div>
                  </div>
                </div>
              )}

              {/* Voltage & Thermal Chart */}
              {inspectedSession.readings && inspectedSession.readings.length > 0 && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-3">
                    Discharge Voltage Curve Over Cycle
                  </h4>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={inspectedSession.readings} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                        <XAxis dataKey="timestamp_offset_ms" stroke="#94A3B8" fontSize={10} tickFormatter={(val) => `${(val / 1000).toFixed(0)}s`} />
                        <YAxis stroke="#94A3B8" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', color: '#F8FAFC', fontSize: '12px' }} />
                        <Line type="monotone" dataKey="pack_voltage" name="Voltage (V)" stroke="#0EA5E9" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Triggered Rules List */}
              {inspectedSession.result?.triggered_rules && inspectedSession.result.triggered_rules.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Triggered Diagnostic Rules:
                  </h4>
                  {inspectedSession.result.triggered_rules.map((r, i) => (
                    <div key={i} className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs">
                      <div className="font-bold text-amber-800 dark:text-amber-300">
                        [{r.severity}] {r.rule_id}: {r.name}
                      </div>
                      <div className="text-amber-700/90 dark:text-amber-200/90 mt-0.5">
                        {r.description}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Regulatory Disclaimer */}
              <div className="text-[11px] text-slate-500 italic p-3 rounded-lg bg-slate-100 dark:bg-slate-800/80">
                {inspectedSession.result?.disclaimer}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
