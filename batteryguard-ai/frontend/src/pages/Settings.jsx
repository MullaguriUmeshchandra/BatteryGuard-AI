import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Settings as SettingsIcon,
  Shield,
  Sliders,
  CheckCircle2,
  Server,
  User,
  Save
} from 'lucide-react';

export default function Settings() {
  const { user, addToast } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getTestProfiles();
        setProfiles(data);
      } catch (err) {
        addToast(err.message || 'Error loading profiles', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          System & Diagnostic Threshold Settings
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Operational safety limits, screening test profiles, and laboratory credentials
        </p>
      </div>

      {/* Operator Profile Card */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Authenticated Technician Profile
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Session identity and role-based permissions
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
            <span className="text-slate-400 font-semibold block">Full Name:</span>
            <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">{user?.full_name || 'Technician'}</span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
            <span className="text-slate-400 font-semibold block">Email:</span>
            <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">{user?.email || 'user@batteryguard.ai'}</span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
            <span className="text-slate-400 font-semibold block">Role:</span>
            <span className="font-bold uppercase text-sky-600 dark:text-sky-400 mt-0.5 block">{user?.role || 'Technician'}</span>
          </div>
        </div>
      </div>

      {/* Approved Diagnostic Screening Profiles */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Standard Screening Profiles & Safety Limits
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configured threshold limits governing GOOD, REVIEW, DEGRADED, and CRITICAL classifications
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {profiles.map((p) => (
            <div
              key={p.id}
              className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {p.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {p.description}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold">
                  {p.code}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-slate-200/60 dark:border-slate-700/40">
                <div>
                  <span className="text-slate-400">Discharge Load:</span>
                  <div className="font-bold text-slate-900 dark:text-white">{p.load_current_amps} A</div>
                </div>
                <div>
                  <span className="text-slate-400">Cutoff Limit:</span>
                  <div className="font-bold text-rose-600 dark:text-rose-400">{p.voltage_cutoff_v} V</div>
                </div>
                <div>
                  <span className="text-slate-400">Max Temp Trip:</span>
                  <div className="font-bold text-amber-600 dark:text-amber-400">{p.max_temp_limit_c} °C</div>
                </div>
                <div>
                  <span className="text-slate-400">Max Allowable Sag:</span>
                  <div className="font-bold text-sky-600 dark:text-sky-400">{p.max_sag_percent_limit} %</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Backend System Telemetry & Service Status */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Application Architecture Status
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Embedded Python FastAPI service with SQLite WAL relational database
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600 dark:text-slate-300">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <span className="text-slate-400 block mb-0.5">API Engine:</span>
            <span className="font-bold text-slate-900 dark:text-white">FastAPI v0.115 (Python 3.13)</span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <span className="text-slate-400 block mb-0.5">Database:</span>
            <span className="font-bold text-slate-900 dark:text-white">SQLite (WAL + Foreign Keys)</span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <span className="text-slate-400 block mb-0.5">Reporting:</span>
            <span className="font-bold text-slate-900 dark:text-white">ReportLab Platypus Engine</span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <span className="text-slate-400 block mb-0.5">ML Subsystem:</span>
            <span className="font-bold text-slate-900 dark:text-white">Scikit-learn Isolation Forest</span>
          </div>
        </div>
      </div>
    </div>
  );
}
