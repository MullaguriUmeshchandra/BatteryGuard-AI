import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  BatteryCharging,
  Plus,
  Search,
  Filter,
  SlidersHorizontal,
  Trash2,
  Edit2,
  Gauge,
  History,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  X,
  FileSpreadsheet
} from 'lucide-react';

export default function Inventory() {
  const [batteries, setBatteries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [chemistryFilter, setChemistryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBattery, setEditingBattery] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [inspectBattery, setInspectBattery] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    battery_id: '',
    manufacturer: '',
    model: '',
    chemistry: 'LFP',
    nominal_voltage: 48.0,
    capacity_ah: 60.0,
    mfg_date: '',
    commissioning_date: '',
    condition_notes: '',
    assigned_technician: '',
    status: 'Active'
  });

  const { addToast, isAdmin, user } = useAuth();
  const navigate = useNavigate();

  const loadBatteries = async () => {
    try {
      const data = await api.getBatteries({
        search,
        chemistry: chemistryFilter,
        status: statusFilter
      });
      setBatteries(data);
    } catch (err) {
      addToast(err.message || 'Failed to fetch batteries', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatteries();
  }, [search, chemistryFilter, statusFilter]);

  const handleOpenAdd = () => {
    setFormData({
      battery_id: `BAT-2024-${String(batteries.length + 1).padStart(3, '0')}`,
      manufacturer: '',
      model: '',
      chemistry: 'LFP',
      nominal_voltage: 48.0,
      capacity_ah: 60.0,
      mfg_date: new Date().toISOString().split('T')[0],
      commissioning_date: new Date().toISOString().split('T')[0],
      condition_notes: '',
      assigned_technician: user?.full_name || 'Sarah Chen',
      status: 'Active'
    });
    setEditingBattery(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (b) => {
    setEditingBattery(b);
    setFormData({
      battery_id: b.battery_id,
      manufacturer: b.manufacturer,
      model: b.model,
      chemistry: b.chemistry,
      nominal_voltage: b.nominal_voltage,
      capacity_ah: b.capacity_ah || 0,
      mfg_date: b.mfg_date || '',
      commissioning_date: b.commissioning_date || '',
      condition_notes: b.condition_notes || '',
      assigned_technician: b.assigned_technician || '',
      status: b.status || 'Active'
    });
    setShowAddModal(true);
  };

  const handleSaveBattery = async (e) => {
    e.preventDefault();
    try {
      if (editingBattery) {
        await api.updateBattery(editingBattery.id, formData);
        addToast(`Battery ${formData.battery_id} updated successfully`, 'success');
      } else {
        await api.createBattery(formData);
        addToast(`Battery ${formData.battery_id} registered successfully`, 'success');
      }
      setShowAddModal(false);
      loadBatteries();
    } catch (err) {
      addToast(err.message || 'Error saving battery asset', 'error');
    }
  };

  const handleDeleteBattery = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteBattery(deleteTarget.id);
      addToast(`Battery ${deleteTarget.battery_id} deleted`, 'success');
      setDeleteTarget(null);
      loadBatteries();
    } catch (err) {
      addToast(err.message || 'Failed to delete battery', 'error');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Active':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">Active</span>;
      case 'Needs Review':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">Needs Review</span>;
      case 'Quarantined':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800">Quarantined</span>;
      case 'Under Test':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-300 dark:border-sky-800 animate-pulse">Under Test</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Battery Asset Inventory
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Registered EV high-voltage modules, cell packs, and testing lifecycle status
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={api.getBatteriesCsvUrl()}
            download
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            Export CSV
          </a>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-md transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Register Battery
          </button>
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
            placeholder="Search by ID, model, manufacturer..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-white placeholder:text-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Chemistry filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Chemistry:</span>
            <select
              value={chemistryFilter}
              onChange={(e) => setChemistryFilter(e.target.value)}
              className="py-1.5 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="All">All Chemistries</option>
              <option value="LFP">LFP (Lithium Iron Phosphate)</option>
              <option value="NMC">NMC (Nickel Manganese Cobalt)</option>
              <option value="NCA">NCA (Nickel Cobalt Aluminum)</option>
              <option value="LTO">LTO (Lithium Titanate)</option>
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Needs Review">Needs Review</option>
              <option value="Quarantined">Quarantined</option>
            </select>
          </div>
        </div>
      </div>

      {/* Battery Inventory Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Battery ID</th>
                <th className="py-3 px-4">Manufacturer & Model</th>
                <th className="py-3 px-4">Chemistry</th>
                <th className="py-3 px-4">Nominal Specs</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Tests Performed</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading battery assets...
                  </td>
                </tr>
              ) : batteries.length > 0 ? (
                batteries.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-sky-600 dark:text-sky-400">
                      {b.battery_id}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                      <div>{b.manufacturer}</div>
                      <div className="text-[11px] text-slate-400 font-normal">{b.model}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                        {b.chemistry}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div>{b.nominal_voltage} V</div>
                      <div className="text-[11px] text-slate-400">{b.capacity_ah ? `${b.capacity_ah} Ah` : 'Capacity N/A'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(b.status)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold">{b.test_count ?? 0}</span> sessions
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => navigate(`/testing?batteryId=${b.id}`)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Run Diagnostic Test"
                      >
                        <Gauge className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(b)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Edit Battery"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(b)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Delete Battery"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No battery assets match the specified filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingBattery ? `Edit Asset: ${editingBattery.battery_id}` : 'Register New Battery Pack'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBattery} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Battery Serial ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.battery_id}
                    onChange={(e) => setFormData({ ...formData, battery_id: e.target.value })}
                    disabled={!!editingBattery}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cell Chemistry *
                  </label>
                  <select
                    value={formData.chemistry}
                    onChange={(e) => setFormData({ ...formData, chemistry: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="LFP">LFP (Lithium Iron Phosphate)</option>
                    <option value="NMC">NMC (Nickel Manganese Cobalt)</option>
                    <option value="NCA">NCA (Nickel Cobalt Aluminum)</option>
                    <option value="LTO">LTO (Lithium Titanate)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Manufacturer *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CATL, BYD, Tesla"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Model / Pack Spec *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Model 3 Module 48V"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nominal Voltage (V) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.nominal_voltage}
                    onChange={(e) => setFormData({ ...formData, nominal_voltage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Pack Capacity (Ah)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.capacity_ah}
                    onChange={(e) => setFormData({ ...formData, capacity_ah: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Lifecycle Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Needs Review">Needs Review</option>
                    <option value="Quarantined">Quarantined</option>
                    <option value="Decommissioned">Decommissioned</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assigned Technician
                  </label>
                  <input
                    type="text"
                    value={formData.assigned_technician}
                    onChange={(e) => setFormData({ ...formData, assigned_technician: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Physical Condition & Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.condition_notes}
                  onChange={(e) => setFormData({ ...formData, condition_notes: e.target.value })}
                  placeholder="e.g. Visual inspection normal, terminal contact resistance checked"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-md transition"
                >
                  {editingBattery ? 'Save Changes' : 'Confirm Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Delete Battery Asset
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Are you sure you want to delete <span className="font-semibold text-slate-900 dark:text-white">{deleteTarget.battery_id}</span> ({deleteTarget.manufacturer} {deleteTarget.model})? All associated test sessions and readings will also be permanently deleted.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteBattery}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md transition"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
