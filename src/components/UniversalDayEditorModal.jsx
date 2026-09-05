import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Coffee,
  Plus,
  Trash2,
  Check,
  Building2,
  Home,
  Palmtree,
  AlertCircle,
  Sparkles,
  Calendar
} from 'lucide-react';
import { api } from '../services/api';

export default function UniversalDayEditorModal({
  isOpen,
  onClose,
  date,
  initialData = null,
  onSuccess
}) {
  const [workMode, setWorkMode] = useState('office');
  const [checkInTime, setCheckInTime] = useState('09:30');
  const [checkOutTime, setCheckOutTime] = useState('17:00');
  const [breaks, setBreaks] = useState([]);
  const [leaveReason, setLeaveReason] = useState('Personal Leave');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Convert ISO string to HH:MM in local IST
  const isoToHHMM = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    const hrs = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hrs}:${mins}`;
  };

  // Build ISO UTC string from date (YYYY-MM-DD) and HH:MM
  const buildIsoUtc = (dateStr, hhmm) => {
    if (!dateStr || !hhmm) return null;
    const [h, m] = hhmm.split(':').map(Number);
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day, h, m, 0);
    return dateObj.toISOString();
  };

  // Populate data when modal opens
  useEffect(() => {
    if (!isOpen || !date) return;
    setError(null);

    const session = initialData?.session;
    const isLeave = initialData?.workMode === 'leave' || initialData?.statusType === 'leave' || session?.work_mode === 'leave';
    const isWFH = initialData?.workMode === 'wfh' || initialData?.statusType === 'wfh' || session?.work_mode === 'wfh';

    if (isLeave) {
      setWorkMode('leave');
      setLeaveReason(initialData?.leaveReason || session?.leave_reason || 'Personal Leave');
    } else if (isWFH) {
      setWorkMode('wfh');
    } else {
      setWorkMode('office');
    }

    if (session) {
      setCheckInTime(isoToHHMM(session.check_in_time) || '09:30');
      setCheckOutTime(isoToHHMM(session.check_out_time) || '');
    } else {
      setCheckInTime('09:30');
      setCheckOutTime('17:00');
    }

    // Load full breaks if session exists
    if (session?.id) {
      loadBreaks(session.id);
    } else if (initialData?.breaks) {
      setBreaks(
        initialData.breaks.map((b) => ({
          id: b.id || Math.random().toString(36).substring(2, 8),
          start: isoToHHMM(b.break_start),
          end: isoToHHMM(b.break_end),
        }))
      );
    } else {
      setBreaks([]);
    }
  }, [isOpen, date, initialData]);

  const loadBreaks = async (sessionId) => {
    try {
      setLoadingDetails(true);
      const res = await api.request(`/api/attendance/session-detail?sessionId=${sessionId}`);
      if (res?.breaks) {
        setBreaks(
          res.breaks.map((b) => ({
            id: b.id,
            start: isoToHHMM(b.break_start),
            end: isoToHHMM(b.break_end),
          }))
        );
      }
      if (res?.session?.check_in_time) {
        setCheckInTime(isoToHHMM(res.session.check_in_time));
      }
      if (res?.session?.check_out_time) {
        setCheckOutTime(isoToHHMM(res.session.check_out_time));
      }
    } catch (e) {
      console.error('Failed to load session details', e);
    } finally {
      setLoadingDetails(false);
    }
  };

  if (!isOpen || !date) return null;

  // Add a new break row
  const handleAddBreak = () => {
    setBreaks((prev) => [
      ...prev,
      {
        id: 'new_' + Math.random().toString(36).substring(2, 8),
        start: '13:00',
        end: '13:45',
      },
    ]);
  };

  // Remove a break row
  const handleRemoveBreak = (idx) => {
    setBreaks((prev) => prev.filter((_, i) => i !== idx));
  };

  // Update break fields
  const handleBreakChange = (idx, field, value) => {
    setBreaks((prev) =>
      prev.map((b, i) => (i === idx ? { ...b, [field]: value } : b))
    );
  };

  // Calculate live preview metrics
  const calculatePreview = () => {
    if (workMode !== 'office') {
      return { grossMinutes: 0, breakMinutes: 0, floorMinutes: 0, floorHours: '0.00' };
    }
    if (!checkInTime) {
      return { grossMinutes: 0, breakMinutes: 0, floorMinutes: 0, floorHours: '0.00' };
    }

    const [inH, inM] = checkInTime.split(':').map(Number);
    const inTotal = inH * 60 + inM;

    let outTotal = inTotal;
    if (checkOutTime) {
      const [outH, outM] = checkOutTime.split(':').map(Number);
      outTotal = outH * 60 + outM;
    } else {
      outTotal = inTotal + 480; // default preview: 8h
    }

    const grossMinutes = Math.max(0, outTotal - inTotal);

    let breakMinutes = 0;
    for (const b of breaks) {
      if (b.start && b.end) {
        const [bsH, bsM] = b.start.split(':').map(Number);
        const [beH, beM] = b.end.split(':').map(Number);
        const bStart = bsH * 60 + bsM;
        const bEnd = beH * 60 + beM;
        if (bEnd > bStart) {
          breakMinutes += (bEnd - bStart);
        }
      }
    }

    const floorMinutes = Math.max(0, grossMinutes - breakMinutes);
    const floorHours = (floorMinutes / 60).toFixed(2);

    return { grossMinutes, breakMinutes, floorMinutes, floorHours };
  };

  const preview = calculatePreview();

  // Handle Save
  const handleSave = async (e) => {
    e?.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      let payload = {
        date,
        workMode,
        reason: note.trim() || 'Day Attendance Logged/Updated',
      };

      if (workMode === 'leave') {
        payload.leaveReason = leaveReason.trim() || 'Personal Leave';
      } else if (workMode === 'wfh') {
        payload.checkInTime = buildIsoUtc(date, '09:00');
        payload.checkOutTime = buildIsoUtc(date, '17:00');
      } else {
        // Office mode
        if (!checkInTime) {
          setError('Please provide a Check-In time.');
          setSubmitting(false);
          return;
        }

        payload.checkInTime = buildIsoUtc(date, checkInTime);
        payload.checkOutTime = checkOutTime ? buildIsoUtc(date, checkOutTime) : null;

        // Map breaks
        payload.breaks = breaks
          .filter((b) => b.start)
          .map((b) => ({
            break_start: buildIsoUtc(date, b.start),
            break_end: b.end ? buildIsoUtc(date, b.end) : null,
          }));
      }

      await api.request('/api/attendance/direct-edit', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update day attendance');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Clear / Delete day
  const handleClearDay = async () => {
    if (!confirm(`Are you sure you want to clear/reset all hours logged for ${date}?`)) {
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await api.request('/api/attendance/direct-edit', {
        method: 'POST',
        body: JSON.stringify({
          date,
          workMode: 'clear',
          reason: 'Cleared by user',
        }),
      });

      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to clear day');
    } finally {
      setSubmitting(false);
    }
  };

  const dayOfWeekName = new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', {
    weekday: 'long',
    timeZone: 'Asia/Kolkata',
  });
  const isWeekend = dayOfWeekName === 'Saturday' || dayOfWeekName === 'Sunday';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in text-xs">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl relative max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-heading font-bold text-white text-base">{date}</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isWeekend
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                }`}>
                  {dayOfWeekName} {isWeekend && '🌴'}
                </span>
              </div>
              <p className="text-slate-400 text-[11px] mt-0.5">Universal Day Attendance Editor</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Scrollable Form Content */}
        <div className="py-4 space-y-4 overflow-y-auto flex-1 pr-1">
          {/* 3-Way Mode Segmented Pill */}
          <div>
            <label className="block text-slate-300 font-semibold mb-2">Work Mode / Exemption</label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/60 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => setWorkMode('office')}
                className={`py-2 px-1 rounded-xl font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                  workMode === 'office'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Office Floor</span>
              </button>

              <button
                type="button"
                onClick={() => setWorkMode('wfh')}
                className={`py-2 px-1 rounded-xl font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                  workMode === 'wfh'
                    ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span>WFH</span>
              </button>

              <button
                type="button"
                onClick={() => setWorkMode('leave')}
                className={`py-2 px-1 rounded-xl font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                  workMode === 'leave'
                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Palmtree className="w-3.5 h-3.5" />
                <span>Leave</span>
              </button>
            </div>
          </div>

          {/* WFH VIEW */}
          {workMode === 'wfh' && (
            <div className="p-4 bg-sky-500/10 border border-sky-500/25 rounded-2xl space-y-2 text-center">
              <Home className="w-8 h-8 text-sky-400 mx-auto animate-pulse" />
              <h4 className="font-heading font-bold text-sm text-white">Work From Home (Exempted)</h4>
              <p className="text-slate-300 text-[11px]">
                0 floor hours will be counted. This day is <strong>excluded from your 7-hour daily requirement</strong>, preserving your monthly average adherence.
              </p>
            </div>
          )}

          {/* LEAVE VIEW */}
          {workMode === 'leave' && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl space-y-3">
              <div className="text-center">
                <Palmtree className="w-8 h-8 text-amber-400 mx-auto animate-pulse mb-1" />
                <h4 className="font-heading font-bold text-sm text-white">Marked as Leave (Exempted)</h4>
                <p className="text-slate-400 text-[11px]">
                  Excluded from required monthly work days. Zero impact on average!
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Leave Reason / Note</label>
                <input
                  type="text"
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="e.g. Sick Leave, Vacation, Personal"
                  className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                />
              </div>
            </div>
          )}

          {/* OFFICE FLOOR VIEW */}
          {workMode === 'office' && (
            <div className="space-y-4">
              {/* Check-In / Check-Out Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60">
                  <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1">
                    Check-In (IST)
                  </label>
                  <input
                    type="time"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60">
                  <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1">
                    Check-Out (IST)
                  </label>
                  <input
                    type="time"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                    placeholder="Leave blank if in progress"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Breaks Section */}
              <div className="p-3.5 bg-slate-800/40 rounded-2xl border border-slate-700/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
                    <Coffee className="w-3.5 h-3.5 text-amber-400" />
                    <span>Breaks Logged ({breaks.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleAddBreak}
                    className="px-2.5 py-1 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-semibold border border-indigo-500/30 flex items-center space-x-1 transition-all"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Break</span>
                  </button>
                </div>

                {breaks.length === 0 ? (
                  <p className="text-slate-500 text-[11px] italic text-center py-2">
                    No breaks added. Tap "+ Add Break" if you took breaks.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {breaks.map((b, idx) => (
                      <div
                        key={b.id || idx}
                        className="flex items-center space-x-2 p-2 bg-slate-900/80 border border-white/10 rounded-xl"
                      >
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-[10px] flex items-center justify-center font-bold flex-shrink-0">
                          {idx + 1}
                        </span>

                        <div className="flex-1 grid grid-cols-2 gap-1.5">
                          <div>
                            <span className="text-[9px] text-slate-400 block">Start</span>
                            <input
                              type="time"
                              value={b.start}
                              onChange={(e) => handleBreakChange(idx, 'start', e.target.value)}
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-100 font-mono text-xs focus:outline-none"
                            />
                          </div>

                          <div>
                            <span className="text-[9px] text-slate-400 block">End</span>
                            <input
                              type="time"
                              value={b.end}
                              onChange={(e) => handleBreakChange(idx, 'end', e.target.value)}
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-100 font-mono text-xs focus:outline-none"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveBreak(idx)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete Break"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Live Preview Card */}
              <div className="p-3.5 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900/60 rounded-2xl border border-indigo-500/30 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-[10px] block font-semibold uppercase">
                    Calculated Floor Hours
                  </span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="font-heading font-black text-2xl text-white font-mono">
                      {preview.floorHours}h
                    </span>
                    <span className="text-slate-400 text-[10px]">
                      (Breaks: {Math.floor(preview.breakMinutes / 60)}h {preview.breakMinutes % 60}m)
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  {isWeekend ? (
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      🌴 Weekend Bonus
                    </span>
                  ) : parseFloat(preview.floorHours) >= 7 ? (
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center space-x-1">
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      <span>7h Quota Met!</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                      Short {(7 - parseFloat(preview.floorHours)).toFixed(2)}h
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Audit Note */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">Audit Note / Reason (Optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Corrected forgot check-out time, doctor visit..."
              className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3.5 border-t border-white/10 flex items-center justify-between space-x-2">
          {initialData?.session && (
            <button
              type="button"
              onClick={handleClearDay}
              disabled={submitting}
              className="py-2.5 px-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30 flex items-center space-x-1 transition-all disabled:opacity-50"
              title="Wipe attendance for this date"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Reset Day</span>
            </button>
          )}

          <div className="flex-1 flex space-x-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="py-2.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={submitting}
              className="py-2.5 px-5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold flex items-center space-x-1.5 shadow-lg shadow-indigo-600/40 transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{submitting ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
