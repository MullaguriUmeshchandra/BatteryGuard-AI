import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './layouts/AppLayout';

import Overview from './pages/Overview';
import Inventory from './pages/Inventory';
import DiagnosticTesting from './pages/DiagnosticTesting';
import AnalysisInsights from './pages/AnalysisInsights';
import TestHistory from './pages/TestHistory';
import AlertsCenter from './pages/AlertsCenter';
import ReportsCenter from './pages/ReportsCenter';
import DeviceManagement from './pages/DeviceManagement';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-medium text-sm">
        Initializing BatteryGuard AI...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Application Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Overview />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="testing" element={<DiagnosticTesting />} />
            <Route path="analytics" element={<AnalysisInsights />} />
            <Route path="history" element={<TestHistory />} />
            <Route path="alerts" element={<AlertsCenter />} />
            <Route path="reports" element={<ReportsCenter />} />
            <Route path="devices" element={<DeviceManagement />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
