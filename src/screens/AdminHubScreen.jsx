import React, { useState, useEffect } from 'react';
import {
  Shield,
  FileCheck,
  FileText,
  Sliders,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  RotateCw,
  Play,
  Save,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';

export default function AdminHubScreen({ onRequestsCountChange }) {
  const [activeSubTab, setActiveSubTab] = useState('requests'); // 'requests' | 'report' | 'settings'

  // Edit requests state
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [reviewingId, setReviewingId] = useState(null);

  // Compliance report state
  const now = new Date();
  const [reportYear, setReportYear] = useState(now.getFullYear());
  const [reportMonth, setReportMonth] = useState(now.getMonth() + 1);
  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Settings state
  const [settings, setSettings] = useState({
    daily_target_hours: 7,
    auto_checkout_time: '20:00',
    work_days: 'Mon,Tue,Wed,Thu,Fri,Sat',
  });
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState(null);

  // Auto-checkout trigger state
  const [triggeringCron, setTriggeringCron] = useState(false);
  const [cronResult, setCronResult] = useState(null);

  useEffect(() => {
    if (activeSubTab === 'requests') loadRequests();
    if (activeSubTab === 'report') loadReport();
    if (activeSubTab === 'settings') loadSettings();
  }, [activeSubTab, reportYear, reportMonth]);

  const loadRequests = async () => {
    try {
      setLoadingRequests(true);
      const res = await api.request('/api/admin/edit-requests');
      const list = res?.requests || [];
      setRequests(list);
      const pendingCount = list.filter(r => r.status === 'pending').length;
      onRequestsCountChange && onRequestsCountChange(pendingCount);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleReview = async (requestId, action) => {
    try {
      setReviewingId(requestId);
      await api.request('/api/admin/edit-requests/review', {
        method: 'POST',
        body: JSON.stringify({ requestId, action }),
      });
      await loadRequests();
    } catch (err) {
      alert(err.message || 'Action failed');
    } finally {
      setReviewingId(null);
    }
  };

  const loadReport = async () => {
    try {
      setLoadingReport(true);
      const res = await api.request(`/api/admin/compliance-report?year=${reportYear}&month=${reportMonth}`);
      setReportData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingReport(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const csvText = await api.request(`/api/admin/compliance-report?year=${reportYear}&month=${reportMonth}&format=csv`);
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `floor_hours_compliance_${reportYear}_${reportMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      alert('CSV Export failed');
    }
  };

  const loadSettings = async () => {
    try {
      setLoadingSettings(true);
      const res = await api.request('/api/admin/settings');
      if (res) {
        setSettings({
          daily_target_hours: res.daily_target_hours || 7,
          auto_checkout_time: res.auto_checkout_time || '20:00',
          work_days: res.work_days || 'Mon,Tue,Wed,Thu,Fri,Sat',
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      setSettingsMsg(null);
      await api.request('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      setSettingsMsg({ type: 'success', text: 'Settings updated successfully!' });
    } catch (err) {
      setSettingsMsg({ type: 'error', text: err.message || 'Failed to save settings' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTriggerAutoCheckout = async () => {
    try {
      setTriggeringCron(true);
      setCronResult(null);
      const res = await api.request('/api/admin/trigger-auto-checkout', { method: 'POST' });
      setCronResult(res);
    } catch (err) {
      setCronResult({ error: err.message });
    } finally {
      setTriggeringCron(false);
    }
  };

  const formatIST = (isoString) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const daysList = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const toggleWorkDay = (day) => {
    const current = settings.work_days.split(',').map(d => d.trim()).filter(Boolean);
    let updated;
    if (current.includes(day)) {
      updated = current.filter(d => d !== day);
    } else {
      updated = [...current, day];
    }
    setSettings({ ...settings, work_days: updated.join(',') });
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12 text-xs">
      <div>
        <h2 className="font-heading font-extrabold text-xl text-white">Admin Hub</h2>
        <p className="text-slate-400">Compliance, Approvals & System Rules</p>
      </div>

      {/* Subtabs Selector */}
      <div className="flex bg-slate-900 border border-slate-800 rounded-2xl p-1 space-x-1">
        {[
          { id: 'requests', label: 'Requests Queue', icon: FileCheck },
          { id: 'report', label: 'Org Report', icon: FileText },
          { id: 'settings', label: 'Rules & Settings', icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex-1 py-2 rounded-xl flex items-center justify-center space-x-1.5 font-semibold active-scale transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="text-[11px]">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUBTAB 1: REQUESTS QUEUE */}
      {activeSubTab === 'requests' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-300">
              Pending & Past Edit Requests ({requests.length})
            </span>
            <button
              onClick={loadRequests}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loadingRequests ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>

          {requests.length === 0 ? (
            <div className="p-8 bg-slate-900/60 border border-slate-800 rounded-3xl text-center text-slate-500">
              <FileCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No edit requests in queue.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-3 shadow-lg"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-sm">{req.employee_name}</span>
                        <span className="text-[10px] text-slate-400">{req.work_date}</span>
                      </div>
                      <span className="text-indigo-400 text-[11px] font-medium capitalize">
                        Change: {req.field_changed.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        req.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : req.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-400 animate-pulse'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/50 flex items-center justify-between font-mono text-[11px]">
                    <span className="text-slate-400">Old: {formatIST(req.old_value)}</span>
                    <span className="text-slate-500">→</span>
                    <span className="text-emerald-400 font-bold">New: {formatIST(req.new_value)}</span>
                  </div>

                  <p className="text-slate-300 text-[11px] bg-slate-950/50 p-2.5 rounded-xl">
                    <strong className="text-slate-400">Reason:</strong> {req.reason}
                  </p>

                  {/* Actions for Pending */}
                  {req.status === 'pending' && (
                    <div className="flex space-x-2 pt-1">
                      <button
                        onClick={() => handleReview(req.id, 'approve')}
                        disabled={reviewingId === req.id}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl active-scale transition-all flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/20"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve & Apply</span>
                      </button>
                      <button
                        onClick={() => handleReview(req.id, 'reject')}
                        disabled={reviewingId === req.id}
                        className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl active-scale transition-all flex items-center justify-center space-x-1.5 shadow-md shadow-rose-600/20"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: ORG COMPLIANCE REPORT */}
      {activeSubTab === 'report' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-3 rounded-2xl">
            <span className="font-semibold text-slate-200">
              Month: {reportYear}-{String(reportMonth).padStart(2, '0')}
            </span>
            <button
              onClick={handleExportCSV}
              className="py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center space-x-1.5 active-scale shadow-md shadow-indigo-600/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          {reportData?.report && (
            <div className="space-y-2.5">
              {reportData.report.map((row) => (
                <div
                  key={row.user.id}
                  className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white text-sm block">{row.user.name}</span>
                      <span className="text-[11px] text-slate-400">{row.user.email}</span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        row.isOnTrack
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {row.isOnTrack ? 'Compliant' : 'Shortfall'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/40 text-center font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Avg Hours</span>
                      <span className={`font-bold text-sm ${row.averageHoursPerDay >= 7 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {row.averageHoursPerDay}h
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Total Hours</span>
                      <span className="font-bold text-sm text-white">{row.totalFloorHours}h</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Shortfall</span>
                      <span className="font-bold text-sm text-rose-400">
                        {row.shortfallHours > 0 ? `-${row.shortfallHours}h` : '0h'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: SYSTEM RULES & SETTINGS */}
      {activeSubTab === 'settings' && (
        <div className="space-y-5">
          <form onSubmit={handleSaveSettings} className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
            <h3 className="font-heading font-bold text-white text-sm pb-2 border-b border-slate-800">
              Office Attendance Rules
            </h3>

            {settingsMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
                  settingsMsg.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                }`}
              >
                <AlertCircle className="w-4 h-4" />
                <span>{settingsMsg.text}</span>
              </div>
            )}

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Daily Floor Target (Hours)
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="14"
                value={settings.daily_target_hours}
                onChange={(e) => setSettings({ ...settings, daily_target_hours: parseFloat(e.target.value) || 7 })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">Default: 7 hours physically on floor</p>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Auto-Checkout Time (IST)
              </label>
              <input
                type="time"
                value={settings.auto_checkout_time}
                onChange={(e) => setSettings({ ...settings, auto_checkout_time: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">Scheduled daily at 8:00 PM IST</p>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-2">
                Office Working Days
              </label>
              <div className="grid grid-cols-4 gap-2">
                {daysList.map((day) => {
                  const active = settings.work_days.includes(day);
                  return (
                    <button
                      type="button"
                      key={day}
                      onClick={() => toggleWorkDay(day)}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                        active
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={savingSettings}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl active-scale shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingSettings ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </form>

          {/* Manual 8 PM Auto-Checkout Trigger */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-3 shadow-xl">
            <h3 className="font-heading font-bold text-white text-sm">
              Manual Auto-Checkout Cron Trigger
            </h3>
            <p className="text-slate-400 text-[11px]">
              Trigger the 8:00 PM IST auto-checkout logic on demand to immediately close all active/on-break sessions for today.
            </p>

            <button
              type="button"
              onClick={handleTriggerAutoCheckout}
              disabled={triggeringCron}
              className="w-full py-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 font-semibold rounded-xl active-scale transition-all flex items-center justify-center space-x-2"
            >
              <Play className="w-4 h-4" />
              <span>{triggeringCron ? 'Running Auto Checkout...' : 'Simulate 8 PM Auto-Checkout'}</span>
            </button>

            {cronResult && (
              <div className="p-3 bg-slate-800/80 rounded-xl font-mono text-[11px] text-slate-300 border border-slate-700">
                <pre className="whitespace-pre-wrap">{JSON.stringify(cronResult, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
