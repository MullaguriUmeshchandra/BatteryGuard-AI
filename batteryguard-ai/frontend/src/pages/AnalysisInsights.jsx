import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  LineChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter
} from 'recharts';
import {
  TrendingUp,
  GitCompare,
  Brain,
  Layers,
  Zap,
  Thermometer,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

export default function AnalysisInsights() {
  const [trends, setTrends] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Comparison state
  const [sessionAId, setSessionAId] = useState('');
  const [sessionBId, setSessionBId] = useState('');
  const [comparisonData, setComparisonData] = useState(null);
  const [comparing, setComparing] = useState(false);

  const { addToast } = useAuth();

  useEffect(() => {
    const load = async () => {
      try {
        const [trendRes, sessRes] = await Promise.all([
          api.getHistoricalTrends(),
          api.getTestSessions()
        ]);
        setTrends(trendRes.trends || []);
        setSessions(sessRes || []);
        if (sessRes && sessRes.length >= 2) {
          setSessionAId(String(sessRes[0].id));
          setSessionBId(String(sessRes[1].id));
        }
      } catch (err) {
        addToast(err.message || 'Error loading analysis insights', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleRunComparison = async () => {
    if (!sessionAId || !sessionBId) return;
    setComparing(true);
    try {
      const res = await api.compareSessions(sessionAId, sessionBId);
      setComparisonData(res);
    } catch (err) {
      addToast(err.message || 'Failed to compare sessions', 'error');
    } finally {
      setComparing(false);
    }
  };

  useEffect(() => {
    if (sessionAId && sessionBId) {
      handleRunComparison();
    }
  }, [sessionAId, sessionBId]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Analysis & Engineering Insights
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Multi-session trend correlation, session comparative matrix, and experimental ML anomaly screening
        </p>
      </div>

      {/* Cross-Session Comparative Matrix */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-sky-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Dual-Session Comparative Screening Matrix
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Compare degradation progression between two distinct test runs
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block mb-1">Session A:</span>
              <select
                value={sessionAId}
                onChange={(e) => setSessionAId(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              >
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.test_id} ({s.battery_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-500 block mb-1">Session B:</span>
              <select
                value={sessionBId}
                onChange={(e) => setSessionBId(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              >
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.test_id} ({s.battery_code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        {comparisonData && comparisonData.session_a && comparisonData.session_b ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Metric Parameter</th>
                  <th className="py-3 px-4 text-sky-600 dark:text-sky-400 font-bold">
                    Session A: {comparisonData.session_a.test_id} ({comparisonData.session_a.battery_code})
                  </th>
                  <th className="py-3 px-4 text-indigo-600 dark:text-indigo-400 font-bold">
                    Session B: {comparisonData.session_b.test_id} ({comparisonData.session_b.battery_code})
                  </th>
                  <th className="py-3 px-4">Relative Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Screening Result</td>
                  <td className="py-3 px-4 font-bold">{comparisonData.session_a.screening_category}</td>
                  <td className="py-3 px-4 font-bold">{comparisonData.session_b.screening_category}</td>
                  <td className="py-3 px-4 text-slate-400">Category match: {comparisonData.session_a.screening_category === comparisonData.session_b.screening_category ? 'Identical' : 'Divergent'}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Resting Pack Voltage</td>
                  <td className="py-3 px-4 font-mono">{comparisonData.session_a.resting_voltage.toFixed(2)} V</td>
                  <td className="py-3 px-4 font-mono">{comparisonData.session_b.resting_voltage.toFixed(2)} V</td>
                  <td className="py-3 px-4 font-mono">{(comparisonData.session_b.resting_voltage - comparisonData.session_a.resting_voltage).toFixed(2)} V</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Loaded Voltage Under Load</td>
                  <td className="py-3 px-4 font-mono">{comparisonData.session_a.loaded_voltage.toFixed(2)} V</td>
                  <td className="py-3 px-4 font-mono">{comparisonData.session_b.loaded_voltage.toFixed(2)} V</td>
                  <td className="py-3 px-4 font-mono">{(comparisonData.session_b.loaded_voltage - comparisonData.session_a.loaded_voltage).toFixed(2)} V</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Voltage Sag (%)</td>
                  <td className="py-3 px-4 font-mono font-bold text-sky-600">{comparisonData.session_a.voltage_sag_percent.toFixed(1)}%</td>
                  <td className="py-3 px-4 font-mono font-bold text-indigo-600">{comparisonData.session_b.voltage_sag_percent.toFixed(1)}%</td>
                  <td className="py-3 px-4 font-mono">{(comparisonData.session_b.voltage_sag_percent - comparisonData.session_a.voltage_sag_percent).toFixed(1)}%</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Temperature Change (ΔT)</td>
                  <td className="py-3 px-4 font-mono">+{comparisonData.session_a.temp_change_c.toFixed(1)} °C</td>
                  <td className="py-3 px-4 font-mono">+{comparisonData.session_b.temp_change_c.toFixed(1)} °C</td>
                  <td className="py-3 px-4 font-mono">{(comparisonData.session_b.temp_change_c - comparisonData.session_a.temp_change_c).toFixed(1)} °C</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Internal Resistance (IR)</td>
                  <td className="py-3 px-4 font-mono">{comparisonData.session_a.internal_resistance_m_ohm.toFixed(1)} mΩ</td>
                  <td className="py-3 px-4 font-mono">{comparisonData.session_b.internal_resistance_m_ohm.toFixed(1)} mΩ</td>
                  <td className="py-3 px-4 font-mono">{(comparisonData.session_b.internal_resistance_m_ohm - comparisonData.session_a.internal_resistance_m_ohm).toFixed(1)} mΩ</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs">
            Select two sessions above to generate comparative evaluation
          </div>
        )}
      </div>

      {/* Historical Correlation Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Voltage Sag Progression */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Voltage Sag Percentage by Battery Asset
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Identifies cells exhibiting disproportionate voltage depression
              </p>
            </div>
            <TrendingUp className="w-4 h-4 text-sky-500" />
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis dataKey="battery_code" stroke="#94A3B8" fontSize={10} />
                <YAxis stroke="#94A3B8" fontSize={10} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', color: '#F8FAFC', fontSize: '12px' }}
                />
                <Bar dataKey="voltage_sag_percent" name="Voltage Sag (%)" fill="#0EA5E9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Temperature Delta vs Internal Resistance */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Internal Resistance vs. Thermal Accumulation
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Correlates higher ohmic resistance with accelerated thermal rise
              </p>
            </div>
            <Thermometer className="w-4 h-4 text-amber-500" />
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis dataKey="battery_code" stroke="#94A3B8" fontSize={10} />
                <YAxis stroke="#94A3B8" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', color: '#F8FAFC', fontSize: '12px' }}
                />
                <Legend verticalAlign="top" height={30} iconType="circle" />
                <Line type="monotone" dataKey="internal_resistance_m_ohm" name="Internal R (mΩ)" stroke="#8B5CF6" strokeWidth={2} />
                <Line type="monotone" dataKey="temp_change_c" name="Temp Rise (°C)" stroke="#F59E0B" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Experimental Machine Learning Anomaly Detection Card */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Experimental Machine Learning: Isolation Forest Outlier Scoring
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Unsupervised multi-variate anomaly detection across Sag %, Thermal Delta, Internal Resistance, and Voltage Stability
            </p>
          </div>
        </div>

        <div className="p-4 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800/60 text-xs text-purple-950 dark:text-purple-200 leading-relaxed">
          <strong>Academic & Engineering Context:</strong> The platform leverages an embedded Scikit-learn <code>IsolationForest</code> ensemble trained on nominal multi-dimensional baseline distributions. While safety clearance remains strictly governed by deterministic physical threshold rules, the ML model flags subtle multi-parameter outliers that individually remain near nominal limits but collectively represent an irregular operating cluster.
        </div>
      </div>
    </div>
  );
}
