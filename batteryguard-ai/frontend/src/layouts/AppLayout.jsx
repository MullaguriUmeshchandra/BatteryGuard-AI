import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  LayoutDashboard,
  PlusCircle,
  History,
  BarChart2,
  SlidersHorizontal,
  ShieldCheck,
  BatteryCharging,
  FileText,
  RotateCw,
  WifiOff,
  Wifi,
  Sliders,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Zap,
  HelpCircle,
  Plus
} from 'lucide-react';
import ToastContainer from '../components/ToastContainer';
import OnboardingModal from '../components/OnboardingModal';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'New Battery Test', path: '/testing', icon: PlusCircle },
  { name: 'Battery Inventory', path: '/inventory', icon: BatteryCharging },
  { name: 'Test History', path: '/history', icon: History },
  { name: 'Charts & Trends', path: '/analytics', icon: BarChart2 },
  { name: 'Screening Configuration', path: '/settings', icon: SlidersHorizontal },
  { name: 'Safety & About', path: '/alerts', icon: ShieldCheck },
  { name: 'Reports & Exports', path: '/reports', icon: FileText },
];

export default function AppLayout() {
  const { user, logout, isDark, toggleTheme, setShowOnboarding } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [apiConnected, setApiConnected] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hwConnected, setHwConnected] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Check API health & hardware status
  const checkHealth = async () => {
    try {
      const [health, hw] = await Promise.all([
        api.getDashboardStats().catch(() => null),
        api.getHardwareStatus().catch(() => null)
      ]);
      setApiConnected(!!health);
      if (hw && hw.devices) {
        setHwConnected(hw.devices.some(d => d.status === 'connected'));
      }
    } catch {
      setApiConnected(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleGlobalRefresh = async () => {
    setRefreshing(true);
    await checkHealth();
    // Dispatch a custom event so child page can reload data
    window.dispatchEvent(new Event('dashboard-refresh'));
    setTimeout(() => setRefreshing(false), 600);
  };

  const getPageTitle = () => {
    const item = NAV_ITEMS.find(n => n.path === location.pathname);
    return item ? item.name : 'Dashboard';
  };

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-200">
      <ToastContainer />
      <OnboardingModal />

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          onClick={() => setMobileOpen(false)} 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Navigation matching Image 2 */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 flex flex-col
        w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800
        transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo / Brand Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 dark:bg-sky-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <span className="text-sm font-mono tracking-tighter">(&#9889;)</span>
            </div>
            <div>
              <div className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white leading-none">
                CELLCHECK
              </div>
              <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase mt-1 leading-none">
                EV SCREENING SYSTEM
              </div>
            </div>
          </div>

          <div className="mt-3.5 pl-2 border-l-2 border-amber-400 text-[11px] text-slate-400 font-medium">
            Software-only prototype
          </div>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
            Workspace
          </div>

          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150
                    ${isActive 
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-bold' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }
                  `}
                >
                  <Icon className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Widget matching Image 2 */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-900">
          <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-[11px] space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
              <Sliders className="w-3.5 h-3.5 text-slate-400" />
              <span>Operating mode</span>
            </div>

            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
              {hwConnected ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">ESP32 connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                  <span>No hardware connection</span>
                </>
              )}
            </div>

            <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
              Measurements are entered manually or generated as labelled demonstrations.
            </p>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 px-1 font-mono">
            <span>FastAPI / SQLite</span>
            <span>v1.0</span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setShowOnboarding(true)}
              className="text-[11px] text-slate-500 hover:text-sky-600 flex items-center gap-1 font-medium"
            >
              <HelpCircle className="w-3.5 h-3.5" /> Guide
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleTheme}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Toggle Theme"
              >
                {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={logout}
                className="p-1 rounded text-slate-400 hover:text-rose-500"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-h-screen lg:pl-64">
        {/* Top Header Bar matching Image 2 */}
        <header className="sticky top-0 z-30 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase leading-none">
                CELLCHECK / WORKSPACE
              </div>
              <div className="flex items-center gap-3 mt-1">
                <h1 className="text-xl font-extrabold text-slate-900 dark:text-white leading-none">
                  {getPageTitle()}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  <ShieldCheck className="w-3 h-3 text-sky-600" />
                  First-Level Screening
                </span>
              </div>
            </div>
          </div>

          {/* Right Header Controls matching Image 2 */}
          <div className="flex items-center gap-3">
            {/* Refresh Button */}
            <button
              onClick={handleGlobalRefresh}
              disabled={refreshing}
              className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition shadow-2xs"
              title="Refresh Telemetry"
            >
              <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* API Status Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs">
              <span className={`w-2 h-2 rounded-full ${apiConnected ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} />
              <span>{apiConnected ? 'API connected' : 'API offline'}</span>
            </div>

            {/* New Test Button */}
            <button
              onClick={() => navigate('/testing')}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white text-xs font-bold transition shadow-xs active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              New Test
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
