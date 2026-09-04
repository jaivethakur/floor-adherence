import React, { useState, useEffect } from 'react';
import { FileEdit, Clock, CheckCircle2, XCircle, AlertCircle, RotateCw } from 'lucide-react';
import { api } from '../services/api';

export default function RequestsScreen() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await api.request('/api/attendance/my-edit-requests');
      setRequests(res?.requests || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatIST = (isoString) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12 text-xs">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-extrabold text-xl text-white">Time Corrections</h2>
          <p className="text-slate-400">Your submitted edit requests & audit status</p>
        </div>
        <button
          onClick={loadRequests}
          disabled={loading}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white active-scale transition-colors"
        >
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="p-8 bg-slate-900/60 border border-slate-800/80 rounded-3xl text-center text-slate-500 space-y-3">
          <FileEdit className="w-10 h-10 mx-auto opacity-30" />
          <p className="text-slate-400 font-medium">No edit requests submitted yet.</p>
          <p className="text-[11px] text-slate-500">
            If you ever miss a check-in or checkout, tap into any day in the History tab and request a correction.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req.id}
              className="p-4 bg-slate-900/80 border border-slate-800/80 rounded-2xl space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-white font-mono text-sm">{req.work_date}</span>
                  <span className="text-slate-400 capitalize">• {req.field_changed.replace(/_/g, ' ')}</span>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1 ${
                    req.status === 'approved'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : req.status === 'pending'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {req.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                  {req.status === 'pending' && <AlertCircle className="w-3 h-3" />}
                  {req.status === 'rejected' && <XCircle className="w-3 h-3" />}
                  <span>{req.status}</span>
                </span>
              </div>

              <div className="p-2.5 bg-slate-800/50 rounded-xl border border-slate-700/40 flex items-center justify-between font-mono">
                <span className="text-slate-400">Old: {formatIST(req.old_value)}</span>
                <span className="text-slate-500">→</span>
                <span className="text-indigo-300 font-bold">New: {formatIST(req.new_value)}</span>
              </div>

              <div className="text-[11px] text-slate-300">
                Reason: <span className="text-slate-200 italic font-normal">"{req.reason}"</span>
              </div>

              {req.approved_by && (
                <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800 flex items-center justify-between">
                  <span>Reviewed by: {req.approver_name || 'Admin'}</span>
                  <span>{new Date(req.created_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
