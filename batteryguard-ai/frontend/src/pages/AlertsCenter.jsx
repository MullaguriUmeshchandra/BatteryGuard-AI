import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCircle2,
  Filter,
  Check,
  Clock,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export default function AlertsCenter() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('All');
  const [ackFilter, setAckFilter] = useState('all');

  const { addToast, user } = useAuth();

  const loadAlerts = async () => {
    try {
      const params = {};
      if (severityFilter !== 'All') params.severity = severityFilter;
      if (ackFilter === 'unacknowledged') params.acknowledged = false;
      if (ackFilter === 'acknowledged') params.acknowledged = true;

      const data = await api.getAlerts(params);
      setAlerts(data);
    } catch (err) {
      addToast(err.message || 'Failed to load safety alerts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [severityFilter, ackFilter]);

  const handleAcknowledge = async (id) => {
    try {
      await api.acknowledgeAlert(id, { acknowledged_by: user?.full_name || 'Technician' });
      addToast('Alert acknowledged and audit trail logged', 'success');
      loadAlerts();
    } catch (err) {
      addToast(err.message || 'Failed to acknowledge alert', 'error');
    }
  };

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <AlertOctagon className="w-3.5 h-3.5" /> CRITICAL
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <AlertTriangle className="w-3.5 h-3.5" /> WARNING
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
            <Info className="w-3.5 h-3.5" /> INFO
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Alerts & Safety Audit Center
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Real-time safety violations, thermal warnings, and compliance acknowledgment audit logs
        </p>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            >
              <option value="All">All Severities</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="WARNING">WARNING</option>
              <option value="INFO">INFO</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Status:</span>
            <select
              value={ackFilter}
              onChange={(e) => setAckFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            >
              <option value="all">All Alerts</option>
              <option value="unacknowledged">Unacknowledged Only</option>
              <option value="acknowledged">Acknowledged Only</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500">
          Total Recorded: <span className="font-bold text-slate-900 dark:text-white">{alerts.length}</span>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Loading safety alerts...
          </div>
        ) : alerts.length > 0 ? (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-5 rounded-2xl border transition shadow-sm ${
                alert.severity === 'CRITICAL' && !alert.acknowledged
                  ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-3">
                    {getSeverityBadge(alert.severity)}
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {alert.category}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Asset: {alert.battery_code}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                    {alert.message}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(alert.created_at).toLocaleString()}
                    </span>
                    {alert.acknowledged && (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                        <UserCheck className="w-3 h-3" />
                        Acknowledged by {alert.acknowledged_by || 'Technician'} at{' '}
                        {alert.acknowledged_at ? new Date(alert.acknowledged_at).toLocaleTimeString() : 'N/A'}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  {!alert.acknowledged ? (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 rounded-xl shadow-xs transition active:scale-95"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Acknowledge Alert
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-xl">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      Acknowledged
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            No safety alerts matching the specified criteria.
          </div>
        )}
      </div>
    </div>
  );
}
