import React, { useState } from 'react';
import { X, Clock, AlertCircle, CheckCircle2, Shield } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function EditRequestModal({ isOpen, onClose, session, breaks = [], onSuccess }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [fieldChanged, setFieldChanged] = useState('check_in_time');
  const [breakId, setBreakId] = useState('');
  const [timeValue, setTimeValue] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !session) return null;

  // Convert IST HH:MM input into ISO UTC string for the session's work_date
  const buildIsoUtcString = (hhmm) => {
    if (!hhmm) return null;
    const [hours, minutes] = hhmm.split(':').map(Number);
    const [year, month, day] = session.work_date.split('-').map(Number);
    // Convert IST (UTC+5:30) to UTC
    const dateObj = new Date(Date.UTC(year, month - 1, day, hours - 5, minutes - 30, 0));
    return dateObj.toISOString();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!timeValue) {
      setError('Please select a valid time.');
      return;
    }
    if (!reason.trim()) {
      setError('A valid reason is required.');
      return;
    }

    const isoUtc = buildIsoUtcString(timeValue);
    setSubmitting(true);
    setError(null);

    try {
      if (isAdmin) {
        // Admin direct edit
        await api.request('/api/admin/sessions/direct-edit', {
          method: 'POST',
          body: JSON.stringify({
            sessionId: session.id,
            fieldChanged,
            breakId: breakId || null,
            newValue: isoUtc,
            reason: reason.trim(),
          }),
        });
      } else {
        // Employee edit request
        await api.request('/api/attendance/edit-request', {
          method: 'POST',
          body: JSON.stringify({
            sessionId: session.id,
            fieldChanged,
            breakId: breakId || null,
            newValue: isoUtc,
            reason: reason.trim(),
          }),
        });
      }

      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit edit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className={`p-2 rounded-xl ${isAdmin ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
              {isAdmin ? <Shield className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-heading font-bold text-slate-100 text-base">
                {isAdmin ? 'Direct Session Correction' : 'Request Time Correction'}
              </h3>
              <p className="text-xs text-slate-400">Date: {session.work_date}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="py-4 space-y-4 text-xs">
          {/* Field Selection */}
          <div>
            <label className="block text-slate-300 font-medium mb-1.5">Field to Modify</label>
            <select
              value={fieldChanged}
              onChange={(e) => {
                setFieldChanged(e.target.value);
                setBreakId('');
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="check_in_time">Check-In Time</option>
              <option value="check_out_time">Check-Out Time</option>
              {breaks.length > 0 && (
                <>
                  <option value="break_start">Break Start Time</option>
                  <option value="break_end">Break End Time</option>
                </>
              )}
            </select>
          </div>

          {/* Break Selection (if break field selected) */}
          {(fieldChanged === 'break_start' || fieldChanged === 'break_end') && (
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">Select Break</label>
              <select
                value={breakId}
                onChange={(e) => setBreakId(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Choose Break --</option>
                {breaks.map((b, idx) => (
                  <option key={b.id} value={b.id}>
                    Break #{idx + 1} ({new Date(b.break_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* New Time Input */}
          <div>
            <label className="block text-slate-300 font-medium mb-1.5">New Time (IST)</label>
            <input
              type="time"
              value={timeValue}
              onChange={(e) => setTimeValue(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
            />
          </div>

          {/* Mandatory Reason */}
          <div>
            <label className="block text-slate-300 font-medium mb-1.5">
              Reason for Modification <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Forgot to tap check-in, app wasn't opened, biometric sync delay..."
              rows={3}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-xs"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`flex-1 py-2.5 rounded-xl font-semibold text-white active-scale transition-all flex items-center justify-center space-x-2 ${
                isAdmin
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-600/30'
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30'
              } disabled:opacity-50`}
            >
              <span>{submitting ? 'Submitting...' : isAdmin ? 'Apply Edit Now' : 'Submit Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
