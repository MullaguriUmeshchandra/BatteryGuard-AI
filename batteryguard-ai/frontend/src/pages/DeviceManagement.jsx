import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Cpu,
  Wifi,
  Radio,
  Activity,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Code2,
  Terminal,
  Copy,
  Check
} from 'lucide-react';

export default function DeviceManagement() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pinging, setPinging] = useState({});
  const [copied, setCopied] = useState(false);
  const { addToast } = useAuth();

  const loadDevices = async () => {
    try {
      const data = await api.getDevices();
      setDevices(data);
    } catch (err) {
      addToast(err.message || 'Failed to load device registry', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
    const interval = setInterval(loadDevices, 15000);
    return () => clearInterval(interval);
  }, []);

  const handlePing = async (deviceId) => {
    setPinging(prev => ({ ...prev, [deviceId]: true }));
    try {
      const res = await api.pingDevice(deviceId);
      addToast(`Ping successful for ${deviceId}: ${res.latency_ms}ms round-trip`, 'success');
      loadDevices();
    } catch (err) {
      addToast(err.message || `Failed to ping ${deviceId}`, 'error');
    } finally {
      setPinging(prev => ({ ...prev, [deviceId]: false }));
    }
  };

  const esp32CodeSnippet = `// BatteryGuard AI — ESP32 Telemetry Firmware Client
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "LAB_WIFI";
const char* password = "lab_password";
const char* serverUrl = "http://192.168.1.100:8000/api/hardware/telemetry";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); }
}

void loop() {
  float packVoltage = readVoltageDivider(); // e.g. 48.2V
  float currentAmps = readCurrentShunt();    // e.g. 20.0A
  float tempCelsius = readDallasTemp();      // e.g. 26.5C

  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<200> doc;
  doc["device_id"] = "ESP32-STATION-01";
  doc["pack_voltage"] = packVoltage;
  doc["current_amps"] = currentAmps;
  doc["temperature_c"] = tempCelsius;

  String requestBody;
  serializeJson(doc, requestBody);
  int httpResponseCode = http.POST(requestBody);
  http.end();

  delay(500); // 2Hz Telemetry Rate
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(esp32CodeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Device Management & ESP32 Integration
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Hardware telemetry endpoints, connected microcontroller status, and firmware interfaces
        </p>
      </div>

      {/* Device Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {devices.map((device) => {
          const isConnected = device.status === 'connected' || device.status === 'simulation';
          return (
            <div
              key={device.id}
              className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isConnected 
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}>
                    {device.communication_type.includes('wifi') ? (
                      <Wifi className="w-5 h-5" />
                    ) : device.communication_type.includes('ble') ? (
                      <Radio className="w-5 h-5" />
                    ) : (
                      <Cpu className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {device.name}
                    </h4>
                    <p className="text-[11px] font-mono text-slate-400">
                      {device.device_id}
                    </p>
                  </div>
                </div>

                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                  isConnected 
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' 
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  {device.status}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Comm Interface:</span>
                  <span className="font-semibold">{device.communication_type.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">IP Address:</span>
                  <span className="font-mono">{device.ip_address || 'Unassigned'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Firmware:</span>
                  <span className="font-mono">{device.firmware_version}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">
                  Last heartbeat: {new Date(device.last_seen).toLocaleTimeString()}
                </span>
                <button
                  onClick={() => handlePing(device.device_id)}
                  disabled={pinging[device.device_id]}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
                >
                  <RefreshCw className={`w-3 h-3 ${pinging[device.device_id] ? 'animate-spin' : ''}`} />
                  Ping
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ESP32 Integration Guide & Firmware Code */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Code2 className="w-5 h-5 text-sky-500" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                ESP32 Microcontroller Integration Guide
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Firmware snippet for transmitting real hardware voltage, current, and temperature telemetry
              </p>
            </div>
          </div>

          <button
            onClick={handleCopyCode}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy Code'}
          </button>
        </div>

        <div className="relative rounded-xl overflow-hidden bg-slate-950 p-4 border border-slate-800 text-slate-200 font-mono text-xs leading-relaxed overflow-x-auto">
          <pre>{esp32CodeSnippet}</pre>
        </div>
      </div>
    </div>
  );
}
