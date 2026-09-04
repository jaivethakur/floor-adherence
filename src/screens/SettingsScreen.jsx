import React, { useState, useEffect } from 'react';
import { Sliders, Save, AlertCircle, Play, Sparkles, Building2 } from 'lucide-react';
import { api } from '../services/api';

export default function SettingsScreen() {
  const [settings, setSettings] = useState({
    daily_target_hours: 7,
    auto_checkout_time: '20:00',
    work_days: 'Mon,Tue,Wed,Thu,Fri,Sat',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [triggering, setTriggering] = useState(false);
  const [cronResult, setCronResult] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
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
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMsg(null);
      await api.request('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      setMsg({ type: 'success', text: 'Settings updated successfully!' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerAutoCheckout = async () => {
    try {
      setTriggering(true);
      setCronResult(null);
      const res = await api.request('/api/admin/trigger-auto-checkout', { method: 'POST' });
      setCronResult(res);
    } catch (err) {
      setCronResult({ error: err.message });
    } finally {
      setTriggering(false);
    }
  };

  const daysList = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const toggleDay = (day) => {
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
        <h2 className="font-heading font-extrabold text-xl text-white">App Settings</h2>
        <p className="text-slate-400">Target hours, working schedule & auto-checkout</p>
      </div>

      <form onSubmit={handleSave} className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
        <h3 className="font-heading font-bold text-white text-sm pb-2 border-b border-slate-800">
          Work Hours & Rules
        </h3>

        {msg && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
              msg.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            <span>{msg.text}</span>
          </div>
        )}

        <div>
          <label className="block text-slate-300 font-semibold mb-1">
            Daily Target Hours
          </label>
          <input
            type="number"
            step="0.5"
            min="1"
            max="12"
            value={settings.daily_target_hours}
            onChange={(e) => setSettings({ ...settings, daily_target_hours: parseFloat(e.target.value) || 7 })}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono"
          />
          <p className="text-[10px] text-slate-400 mt-1">Standard: 7 hours per working day</p>
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
          <p className="text-[10px] text-slate-400 mt-1">Daily system cron closes unclosed sessions at this time</p>
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-2">
            Weekly Working Days
          </label>
          <div className="grid grid-cols-4 gap-2">
            {daysList.map((day) => {
              const active = settings.work_days.includes(day);
              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => toggleDay(day)}
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
          disabled={saving}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl active-scale shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </form>

      {/* Auto Checkout Manual Test */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-3 shadow-xl">
        <h3 className="font-heading font-bold text-white text-sm">
          Run 8 PM Auto-Checkout Now
        </h3>
        <p className="text-slate-400 text-[11px]">
          Test the auto-checkout engine anytime to auto-close today's unclosed active/break sessions with an 8:00 PM IST timestamp.
        </p>

        <button
          type="button"
          onClick={handleTriggerAutoCheckout}
          disabled={triggering}
          className="w-full py-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 font-semibold rounded-xl active-scale transition-all flex items-center justify-center space-x-2"
        >
          <Play className="w-4 h-4" />
          <span>{triggering ? 'Running...' : 'Run Auto-Checkout'}</span>
        </button>

        {cronResult && (
          <div className="p-3 bg-slate-800/80 rounded-xl font-mono text-[11px] text-slate-300 border border-slate-700">
            <pre className="whitespace-pre-wrap">{JSON.stringify(cronResult, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
