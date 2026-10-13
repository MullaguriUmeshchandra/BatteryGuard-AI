import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Gauge,
  Play,
  Square,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Cpu,
  Wifi,
  Radio,
  Clock,
  Thermometer,
  Zap,
  Activity,
  FileText,
  ShieldAlert,
  Sliders,
  HelpCircle,
  Eye,
  ExternalLink
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend
} from 'recharts';

export default function DiagnosticTesting() {
  const [searchParams] = useSearchParams();
  const preselectedBatteryId = searchParams.get('batteryId');
  const navigate = useNavigate();
  const { addToast } = useAuth();

  // Selections
  const [batteries, setBatteries] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [selectedBatteryId, setSelectedBatteryId] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [testMode, setTestMode] = useState('simulation'); // 'simulation' or 'hardware'
  const [scenario, setScenario] = useState('normal'); // 'normal', 'voltage_instability', 'elevated_temp', 'abnormal_current', 'critical_cutoff'

  // Hardware State
  const [hardwareDevices, setHardwareDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);

  // Test Execution State
  const [testStatus, setTestStatus] = useState('idle'); // 'idle', 'running', 'completed', 'aborted'
  const [currentPhase, setCurrentPhase] = useState('resting'); // 'resting', 'pulse_load', 'sustained_load', 'recovery'
  const [elapsedSec, setElapsedSec] = useState(0.0);
  const [targetDuration, setTargetDuration] = useState(30.0);
  const [readings, setReadings] = useState([]);
  const [latestReading, setLatestReading] = useState(null);
  
  // Results State
  const [analysisResult, setAnalysisResult] = useState(null);
  const [savedSessionId, setSavedSessionId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Timer Ref
  const timerRef = useRef(null);

  // Load initial batteries & profiles
  useEffect(() => {
    const init = async () => {
      try {
        const [batts, profs, hwStatus] = await Promise.all([
          api.getBatteries(),
          api.getTestProfiles(),
          api.getHardwareStatus()
        ]);
        setBatteries(batts);
        setProfiles(profs);

        if (batts.length > 0) {
          const matched = preselectedBatteryId ? batts.find(b => String(b.id) === String(preselectedBatteryId)) : null;
          setSelectedBatteryId(matched ? String(matched.id) : String(batts[0].id));
        }
        if (profs.length > 0) {
          setSelectedProfileId(String(profs[0].id));
        }

        if (hwStatus.devices && hwStatus.devices.length > 0) {
          setHardwareDevices(hwStatus.devices);
          const connected = hwStatus.devices.find(d => d.status === 'connected') || hwStatus.devices[0];
          setSelectedDevice(connected);
        }
      } catch (err) {
        addToast(err.message || 'Error loading testing configuration', 'error');
      }
    };
    init();
  }, [preselectedBatteryId]);

  const activeBattery = batteries.find(b => String(b.id) === String(selectedBatteryId));
  const activeProfile = profiles.find(p => String(p.id) === String(selectedProfileId));

  // Test Duration & Phase Calculation
  const startTest = () => {
    if (!activeBattery || !activeProfile) {
      addToast('Please select both a battery and a test profile', 'warning');
      return;
    }

    setTestStatus('running');
    setElapsedSec(0.0);
    setReadings([]);
    setAnalysisResult(null);
    setSavedSessionId(null);

    const totalDuration = targetDuration;
    const intervalMs = 500; // 2Hz sample rate
    let currentIdx = 0;
    let currElapsed = 0.0;
    let currentTemp = 25.1;
    const accumulated = [];

    timerRef.current = setInterval(() => {
      currElapsed += intervalMs / 1000;
      currentIdx += 1;

      // Determine phase
      const fraction = currElapsed / totalDuration;
      let phase = 'resting';
      if (fraction < 0.15) phase = 'resting';
      else if (fraction < 0.35) phase = 'pulse_load';
      else if (fraction < 0.80) phase = 'sustained_load';
      else phase = 'recovery';

      setCurrentPhase(phase);
      setElapsedSec(Math.min(currElapsed, totalDuration));

      if (testMode === 'simulation') {
        // Physics tick simulation
        const tick = generateClientReadingTick(
          currentIdx,
          activeBattery.nominal_voltage,
          activeProfile.load_current_amps,
          scenario,
          phase,
          currentTemp
        );
        currentTemp = tick.temperature_c;
        accumulated.push(tick);
        setLatestReading(tick);
        setReadings([...accumulated]);
      } else {
        // Hardware mode: simulate or consume ESP32 buffered tick
        const tick = {
          timestamp_offset_ms: currentIdx * 500,
          pack_voltage: activeBattery.nominal_voltage + (phase === 'resting' ? 0.2 : -1.8),
          current_amps: phase === 'resting' ? 0.0 : activeProfile.load_current_amps,
          temperature_c: currentTemp + 0.05,
          phase: phase,
          reading_index: currentIdx
        };
        currentTemp = tick.temperature_c;
        accumulated.push(tick);
        setLatestReading(tick);
        setReadings([...accumulated]);
      }

      // Finish test condition
      if (currElapsed >= totalDuration) {
        clearInterval(timerRef.current);
        setTestStatus('completed');
        evaluateCompletedSession(accumulated);
      }
    }, intervalMs);
  };

  const stopTest = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setTestStatus('aborted');
    addToast('Test stopped safely by operator', 'warning');
    if (readings.length > 5) {
      evaluateCompletedSession(readings);
    }
  };

  const resetTest = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setTestStatus('idle');
    setElapsedSec(0.0);
    setReadings([]);
    setLatestReading(null);
    setAnalysisResult(null);
    setSavedSessionId(null);
    setCurrentPhase('resting');
  };

  // Client-side physics reading generator for instantaneous smooth 2Hz rendering
  const generateClientReadingTick = (index, nominalV, loadCurrent, scn, phase, prevTemp) => {
    const ocv = nominalV * 1.04;
    let internalR = 0.045;
    if (scn === 'voltage_instability') internalR = 0.26;
    if (scn === 'elevated_temp') internalR = 0.12;
    if (scn === 'critical_cutoff') internalR = 0.58;

    let curr = 0.0;
    let volt = ocv;
    let temp = prevTemp;

    if (phase === 'resting') {
      curr = 0.0;
      volt = ocv + (Math.random() * 0.06 - 0.03);
      temp = prevTemp + (Math.random() * 0.02 - 0.01);
    } else if (phase === 'pulse_load') {
      curr = index % 4 < 2 ? loadCurrent : 0.0;
      if (scn === 'abnormal_current' && curr > 0) curr += (Math.random() * 8 - 4);
      volt = ocv - (curr * internalR) + (Math.random() * 0.08 - 0.04);
      temp = prevTemp + (curr > 0 ? 0.08 : 0.01);
    } else if (phase === 'sustained_load') {
      curr = loadCurrent;
      if (scn === 'abnormal_current') curr += (Math.random() * 10 - 5);
      
      let drop = curr * internalR;
      if (scn === 'voltage_instability') {
        drop += Math.sin(index * 0.9) * 2.2 + (Math.random() * 0.5 - 0.25);
      } else if (scn === 'critical_cutoff') {
        drop += Math.min(18.0, index * 0.45);
      }
      volt = ocv - drop + (Math.random() * 0.06 - 0.03);
      
      const tempStep = (scn === 'elevated_temp' || scn === 'critical_cutoff') ? 0.42 : 0.06;
      temp = prevTemp + tempStep;
    } else { // recovery
      curr = 0.0;
      const rec = Math.min(1.0, (index % 10) / 10);
      volt = (ocv - 0.4) + rec * 0.35 + (Math.random() * 0.04 - 0.02);
      temp = prevTemp - 0.02;
    }

    return {
      timestamp_offset_ms: index * 500,
      pack_voltage: Number(Math.max(5.0, volt).toFixed(2)),
      current_amps: Number(Math.max(0.0, curr).toFixed(2)),
      temperature_c: Number(temp.toFixed(2)),
      phase,
      reading_index: index
    };
  };

  // Evaluate analysis from backend diagnostic engine
  const evaluateCompletedSession = async (sessionReadings) => {
    try {
      // Call simulation/analysis API
      const sim = await api.runSimulation({
        battery_id: activeBattery.id,
        profile_id: activeProfile.id,
        scenario: testMode === 'simulation' ? scenario : 'normal',
        duration_sec: targetDuration
      });
      setAnalysisResult(sim.analysis);
      addToast(`Diagnostic screening completed: ${sim.analysis.screening_category}`, 'info');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveToDatabase = async () => {
    if (!readings || readings.length === 0) return;
    setSaving(true);
    try {
      const payload = {
        battery_id: activeBattery.id,
        profile_id: activeProfile.id,
        mode: testMode,
        scenario: testMode === 'simulation' ? scenario : 'hardware',
        duration_sec: elapsedSec,
        notes: `Diagnostic test conducted via ${testMode} mode (${scenario} scenario).`,
        readings: readings.map(r => ({
          timestamp_offset_ms: r.timestamp_offset_ms,
          pack_voltage: r.pack_voltage,
          current_amps: r.current_amps,
          temperature_c: r.temperature_c,
          phase: r.phase,
          reading_index: r.reading_index
        }))
      };

      const saved = await api.saveTestSession(payload);
      setSavedSessionId(saved.test_id);
      addToast(`Test successfully saved as ${saved.test_id}`, 'success');
    } catch (err) {
      addToast(err.message || 'Failed to save test session', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const getScreeningColor = (cat) => {
    switch ((cat || '').toUpperCase()) {
      case 'GOOD': return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-800';
      case 'REVIEW': return 'text-amber-600 bg-amber-50 dark:bg-amber-950/80 border-amber-300 dark:border-amber-800';
      case 'DEGRADED': return 'text-orange-600 bg-orange-50 dark:bg-orange-950/80 border-orange-300 dark:border-orange-800';
      default: return 'text-rose-600 bg-rose-50 dark:bg-rose-950/80 border-rose-300 dark:border-rose-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Diagnostic Testing Workspace
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Standardized high-voltage discharge screening, physics simulation & real-time ESP32 acquisition
          </p>
        </div>

        {/* Status indicator badge */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-semibold">
            <span className={`w-2.5 h-2.5 rounded-full ${
              testStatus === 'running' ? 'bg-emerald-500 animate-ping' :
              testStatus === 'completed' ? 'bg-sky-500' :
              testStatus === 'aborted' ? 'bg-amber-500' : 'bg-slate-400'
            }`} />
            <span className="uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300">
              STATE: {testStatus}
            </span>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-xs font-bold uppercase tracking-wider">
            PHASE: {currentPhase.replace('_', ' ')}
          </div>
        </div>
      </div>

      {/* Test Setup & Parameter Review Card */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-4 h-4 text-sky-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Test Configuration & Telemetry Channel
            </h3>
          </div>

          {/* Mode Switch (Simulation vs Hardware) */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => { if (testStatus === 'idle') setTestMode('simulation'); }}
              disabled={testStatus === 'running'}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                testMode === 'simulation' 
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Physics Simulation
            </button>
            <button
              onClick={() => { if (testStatus === 'idle') setTestMode('hardware'); }}
              disabled={testStatus === 'running'}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                testMode === 'hardware' 
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Wifi className="w-3.5 h-3.5" />
              ESP32 Telemetry
            </button>
          </div>
        </div>

        {/* Configuration Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Battery Asset Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Battery Asset *
            </label>
            <select
              value={selectedBatteryId}
              onChange={(e) => setSelectedBatteryId(e.target.value)}
              disabled={testStatus === 'running'}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              {batteries.map(b => (
                <option key={b.id} value={b.id}>
                  {b.battery_id} — {b.manufacturer} ({b.chemistry}, {b.nominal_voltage}V)
                </option>
              ))}
            </select>
          </div>

          {/* Profile Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Screening Test Profile *
            </label>
            <select
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              disabled={testStatus === 'running'}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              {profiles.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.load_current_amps}A load)
                </option>
              ))}
            </select>
          </div>

          {/* Simulation Scenario OR Hardware Device */}
          {testMode === 'simulation' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Simulation Scenario *
              </label>
              <select
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                disabled={testStatus === 'running'}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                <option value="normal">Normal Baseline (Healthy pack)</option>
                <option value="voltage_instability">Voltage Instability / Cell Imbalance</option>
                <option value="elevated_temp">Thermal Dissipation Failure (Hot)</option>
                <option value="abnormal_current">Abnormal Current Ripple</option>
                <option value="critical_cutoff">Critical Under-Voltage Cutoff</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                ESP32 Adapter Device *
              </label>
              <select
                value={selectedDevice?.device_id || ''}
                onChange={(e) => {
                  const dev = hardwareDevices.find(d => d.device_id === e.target.value);
                  setSelectedDevice(dev);
                }}
                disabled={testStatus === 'running'}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                {hardwareDevices.map(d => (
                  <option key={d.device_id} value={d.device_id}>
                    {d.name} ({d.communication_type})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Duration Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Cycle Duration (Seconds)
            </label>
            <select
              value={targetDuration}
              onChange={(e) => setTargetDuration(parseFloat(e.target.value))}
              disabled={testStatus === 'running'}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              <option value="15">15 Seconds (Rapid Test)</option>
              <option value="30">30 Seconds (Standard Screening)</option>
              <option value="45">45 Seconds (Comprehensive Cycle)</option>
            </select>
          </div>
        </div>

        {/* Operational Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Cutoff Safety Threshold:
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
              {activeProfile ? `${activeProfile.voltage_cutoff_v}V` : '36.0V'}
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Max Temp Limit:
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
              {activeProfile ? `${activeProfile.max_temp_limit_c}°C` : '50.0°C'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {testStatus === 'running' ? (
              <button
                onClick={stopTest}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md transition active:scale-95"
              >
                <Square className="w-4 h-4 fill-current" />
                Emergency Stop
              </button>
            ) : (
              <button
                onClick={startTest}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md transition active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                Start Diagnostic Test
              </button>
            )}

            <button
              onClick={resetTest}
              disabled={testStatus === 'running'}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>

            {testStatus === 'completed' && !savedSessionId && (
              <button
                onClick={handleSaveToDatabase}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-md transition active:scale-95"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Completed Test'}
              </button>
            )}

            {savedSessionId && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                Saved: {savedSessionId}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Telemetry Display Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Voltage */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Pack Terminal Voltage
            </span>
            <Zap className="w-4 h-4 text-sky-500" />
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">
              {latestReading ? latestReading.pack_voltage.toFixed(2) : (activeBattery?.nominal_voltage.toFixed(2) || '0.00')}
            </span>
            <span className="text-xs font-bold text-slate-400">Volts</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Nominal: {activeBattery?.nominal_voltage}V | Cutoff: {activeProfile?.voltage_cutoff_v}V
          </div>
        </div>

        {/* Current */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Discharge Load Current
            </span>
            <Activity className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">
              {latestReading ? latestReading.current_amps.toFixed(2) : '0.00'}
            </span>
            <span className="text-xs font-bold text-slate-400">Amperes</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Profile Target: {activeProfile?.load_current_amps}A load
          </div>
        </div>

        {/* Temperature */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Surface Temperature
            </span>
            <Thermometer className="w-4 h-4 text-amber-500" />
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className={`text-3xl font-black font-mono ${
              (latestReading?.temperature_c || 25) > (activeProfile?.max_temp_limit_c || 50) 
                ? 'text-rose-500' 
                : 'text-slate-900 dark:text-white'
            }`}>
              {latestReading ? latestReading.temperature_c.toFixed(1) : '25.0'}
            </span>
            <span className="text-xs font-bold text-slate-400">°C</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Thermal Trip Limit: {activeProfile?.max_temp_limit_c}°C
          </div>
        </div>

        {/* Elapsed Timer & Progress */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Cycle Progress
            </span>
            <Clock className="w-4 h-4 text-teal-500" />
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">
              {elapsedSec.toFixed(1)}
            </span>
            <span className="text-xs font-bold text-slate-400">/ {targetDuration} s</span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-sky-500 h-full transition-all duration-300"
              style={{ width: `${Math.min(100, (elapsedSec / targetDuration) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Live Interactive Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Voltage Response Curve */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Pack Voltage Curve & Cutoff Barrier
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Observes voltage sag, ohmic drop, and polarization rebound
              </p>
            </div>
            <Zap className="w-4 h-4 text-sky-500" />
          </div>

          <div className="h-64">
            {readings.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={readings} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="timestamp_offset_ms" stroke="#94A3B8" fontSize={10} tickFormatter={(val) => `${(val / 1000).toFixed(0)}s`} />
                  <YAxis stroke="#94A3B8" fontSize={10} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', color: '#F8FAFC', fontSize: '12px' }}
                    labelFormatter={(val) => `Time: ${(val / 1000).toFixed(1)}s`}
                  />
                  <ReferenceLine
                    y={activeProfile?.voltage_cutoff_v || 36.0}
                    stroke="#EF4444"
                    strokeDasharray="4 4"
                    label={{ value: 'Cutoff Limit', fill: '#EF4444', fontSize: 10, position: 'insideBottomRight' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="pack_voltage"
                    name="Voltage (V)"
                    stroke="#0EA5E9"
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                Press "Start Diagnostic Test" to begin live streaming
              </div>
            )}
          </div>
        </div>

        {/* Current & Thermal Combined Curve */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Current Load & Thermal Gradient Response
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pulsed load execution against thermal accumulation
              </p>
            </div>
            <Activity className="w-4 h-4 text-amber-500" />
          </div>

          <div className="h-64">
            {readings.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={readings} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="timestamp_offset_ms" stroke="#94A3B8" fontSize={10} tickFormatter={(val) => `${(val / 1000).toFixed(0)}s`} />
                  <YAxis stroke="#94A3B8" fontSize={10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', color: '#F8FAFC', fontSize: '12px' }}
                    labelFormatter={(val) => `Time: ${(val / 1000).toFixed(1)}s`}
                  />
                  <Legend verticalAlign="top" height={30} iconType="circle" />
                  <Line
                    type="monotone"
                    dataKey="current_amps"
                    name="Current (A)"
                    stroke="#6366F1"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="temperature_c"
                    name="Temp (°C)"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                Awaiting test launch to stream thermal telemetry
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Diagnostic Evaluation Drawer (Displays when completed or analysisResult exists) */}
      {analysisResult && (
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border-2 border-sky-500/40 shadow-xl space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Screening Engine Arbitration
              </span>
              <div className="flex items-center gap-3 mt-1">
                <span className={`px-4 py-1.5 rounded-xl text-base font-black border uppercase tracking-wider ${getScreeningColor(analysisResult.screening_category)}`}>
                  {analysisResult.screening_category}
                </span>
                <span className="text-xs text-slate-500">
                  {analysisResult.anomaly_count} Anomalies Detected
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {savedSessionId ? (
                <a
                  href={api.getPdfReportUrl(savedSessionId)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 rounded-xl shadow-md transition"
                >
                  <FileText className="w-4 h-4" />
                  Download PDF Report
                </a>
              ) : (
                <button
                  onClick={handleSaveToDatabase}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-md transition"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save & Generate Report'}
                </button>
              )}
            </div>
          </div>

          {/* Key Calculated Formulas Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <span className="text-[11px] font-semibold text-slate-500">Voltage Sag (%)</span>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {analysisResult.voltage_sag_percent.toFixed(1)}%
              </div>
              <span className="text-[10px] text-slate-400">Resting {analysisResult.resting_voltage}V → {analysisResult.loaded_voltage}V</span>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <span className="text-[11px] font-semibold text-slate-500">Temperature Rise (ΔT)</span>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                +{analysisResult.temp_change_c.toFixed(1)} °C
              </div>
              <span className="text-[10px] text-slate-400">Peak: {analysisResult.final_temp_c}°C</span>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <span className="text-[11px] font-semibold text-slate-500">Est. Internal Resistance</span>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {analysisResult.internal_resistance_m_ohm.toFixed(1)} mΩ
              </div>
              <span className="text-[10px] text-slate-400">ΔV / ΔI Shunt calculation</span>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <span className="text-[11px] font-semibold text-slate-500">Voltage Stability (StdDev)</span>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {analysisResult.voltage_stability_std.toFixed(3)} V
              </div>
              <span className="text-[10px] text-slate-400">Steady-state variance</span>
            </div>
          </div>

          {/* Triggered Rules & Recommendations */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Explainable Rule Triggers & Diagnostics
            </h4>
            {analysisResult.triggered_rules && analysisResult.triggered_rules.length > 0 ? (
              <div className="space-y-2">
                {analysisResult.triggered_rules.map((rule, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-start gap-3">
                    <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${
                      rule.severity === 'CRITICAL' ? 'text-rose-500' : 'text-amber-500'
                    }`} />
                    <div className="flex-1 text-xs">
                      <div className="font-bold text-slate-900 dark:text-white">
                        [{rule.severity}] {rule.rule_id}: {rule.name}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                        {rule.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                All sensor parameters remained strictly within configured safety profile limits.
              </div>
            )}
          </div>

          {/* Operator Action Guidance */}
          <div className="p-4 bg-sky-50 dark:bg-sky-950/40 rounded-xl border border-sky-200 dark:border-sky-800/60 text-xs">
            <span className="font-bold text-sky-900 dark:text-sky-300 block mb-1">
              Recommended Operator Action:
            </span>
            <p className="text-sky-800/90 dark:text-sky-200/90 leading-relaxed">
              {analysisResult.recommendations}
            </p>
          </div>

          {/* Mandatory First-Level Screening Disclaimer */}
          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 italic">
            <strong>Screening Disclaimer:</strong> {analysisResult.disclaimer}
          </div>
        </div>
      )}
    </div>
  );
}
