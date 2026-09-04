import React, { useState, useEffect } from 'react';
import { X, Clock, Coffee, AlertCircle, CheckCircle2, History, Edit3, Building2, Home, Palmtree, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import EditModal from './EditModal';

export default function DayDetailModal({ isOpen, onClose, dayData, onRefresh }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (isOpen && dayData?.session?.id) {
      loadSessionDetail(dayData.session.id);
    } else {
      setDetail(null);
    }
  }, [isOpen, dayData]);

  const loadSessionDetail = async (sessionId) => {
    try {
      setLoading(true);
      const res = await api.request(`/api/attendance/session-detail?sessionId=${sessionId}`);
      setDetail(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLeave = async () => {
    try {
      setActionLoading(true);
      if (dayData.workMode === 'leave' || dayData.statusType === 'leave') {
        // Unmark leave
        await api.request('/api/attendance/mark-leave', {
          method: 'POST',
          body: JSON.stringify({ action: 'unmark', date: dayData.date }),
        });
      } else {
        // Mark leave
        await api.request('/api/attendance/mark-leave', {
          method: 'POST',
          body: JSON.stringify({ date: dayData.date, reason: 'Personal Leave' }),
        });
      }
      onRefresh && onRefresh();
      onClose();
    } catch (err) {
      alert(err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen || !dayData) return null;

  const session = detail?.session || dayData.session;
  const breaks = detail?.breaks || [];
  const edits = detail?.edits || [];
  const isLeave = dayData.workMode === 'leave' || dayData.statusType === 'leave';

  const formatIST = (isoString) => {
    if (!isoString) return '--:--';
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const calculateBreakDuration = (start, end) => {
    const s = new Date(start).getTime();
    const e = end ? new Date(end).getTime() : Date.now();
    const mins = Math.max(0, Math.floor((e - s) / 60000));
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-heading font-bold text-slate-100 text-base">{dayData.date}</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {dayData.dayOfWeek}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                {isLeave ? (
                  <span className="text-amber-400 font-semibold flex items-center space-x-1">
                    <Palmtree className="w-3.5 h-3.5" />
                    <span>On Leave (Target Excluded)</span>
                  </span>
                ) : dayData.workMode === 'wfh' ? (
                  <span className="text-sky-400 font-semibold flex items-center space-x-1">
                    <Home className="w-3.5 h-3.5" />
                    <span>Work from Home</span>
                  </span>
                ) : (
                  <span className="text-indigo-400 font-semibold flex items-center space-x-1">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Work from Office</span>
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="py-4 space-y-4 overflow-y-auto flex-1 text-xs">
            {isLeave ? (
              <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-center space-y-2">
                <Palmtree className="w-10 h-10 text-amber-400 mx-auto" />
                <h4 className="font-heading font-bold text-sm text-white">Marked as Leave</h4>
                <p className="text-slate-300 text-[11px]">
                  {dayData.leaveReason || 'Personal Leave'}
                </p>
                <p className="text-slate-400 text-[10px]">
                  This day is excluded from your monthly target hours quota.
                </p>
                <button
                  onClick={handleToggleLeave}
                  disabled={actionLoading}
                  className="mt-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 font-medium text-xs inline-flex items-center space-x-1.5 border border-slate-700 active-scale"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Remove Leave (Revert Day)</span>
                </button>
              </div>
            ) : (
              <>
                {/* Hours Metric Card */}
                <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/60 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block text-[11px]">
                      {dayData.workMode === 'wfh' ? 'WFH Hours' : 'Floor Hours'}
                    </span>
                    <span className="font-heading font-bold text-2xl text-white tabular-nums">
                      {dayData.floorHours}h
                    </span>
                    <span className="text-slate-500 text-[11px] block">
                      Target: {dayData.isWorkingDay ? '7.00h' : '0.00h'}
                    </span>
                  </div>

                  <div>
                    {dayData.floorHours >= 7 ? (
                      <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Target Met</span>
                      </div>
                    ) : dayData.floorHours > 0 ? (
                      <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                        <AlertCircle className="w-4 h-4" />
                        <span>Short by {(7 - dayData.floorHours).toFixed(2)}h</span>
                      </div>
                    ) : (
                      <div className="px-3 py-1.5 rounded-xl bg-slate-700/50 text-slate-400 font-medium">
                        {dayData.isWorkingDay ? 'No Hours Logged' : 'Day Off'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Session Timestamps */}
                {session ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
                        <span className="text-slate-400 text-[11px] block mb-1">Check-In</span>
                        <span className="font-mono text-sm text-slate-100 font-semibold tabular-nums">
                          {formatIST(session.check_in_time)}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
                        <span className="text-slate-400 text-[11px] block mb-1">Check-Out</span>
                        <span className="font-mono text-sm text-slate-100 font-semibold tabular-nums">
                          {formatIST(session.check_out_time)}
                        </span>
                      </div>
                    </div>

                    {/* Breaks list */}
                    <div>
                      <h4 className="font-semibold text-slate-300 text-xs mb-2 flex items-center space-x-1.5">
                        <Coffee className="w-3.5 h-3.5 text-amber-400" />
                        <span>Breaks Logged ({breaks.length})</span>
                      </h4>
                      {breaks.length === 0 ? (
                        <p className="text-slate-500 text-[11px] italic bg-slate-800/20 p-2.5 rounded-xl">
                          No breaks recorded for this session.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {breaks.map((b, i) => (
                            <div
                              key={b.id}
                              className="flex items-center justify-between p-2.5 bg-slate-800/40 border border-slate-700/40 rounded-xl"
                            >
                              <div className="flex items-center space-x-2">
                                <span className="w-5 h-5 rounded-md bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-[10px]">
                                  {i + 1}
                                </span>
                                <span className="font-mono text-slate-200">
                                  {formatIST(b.break_start)} → {formatIST(b.break_end)}
                                </span>
                              </div>
                              <span className="text-amber-400 font-semibold font-mono">
                                {calculateBreakDuration(b.break_start, b.break_end)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Audit Edits */}
                    {edits.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-slate-300 text-xs mb-2 flex items-center space-x-1.5">
                          <History className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Audit Trail ({edits.length})</span>
                        </h4>
                        <div className="space-y-1.5">
                          {edits.map((e) => (
                            <div
                              key={e.id}
                              className="p-2 bg-slate-800/40 border border-slate-700/50 rounded-xl text-[11px]"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-slate-200 capitalize">
                                  {e.field_changed.replace(/_/g, ' ')}
                                </span>
                                <span className="text-slate-500 text-[10px]">
                                  {new Date(e.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-slate-400 text-[10px]">
                                Note: <span className="text-slate-300">{e.reason}</span>
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-500 space-y-2">
                    <Clock className="w-8 h-8 mx-auto opacity-30" />
                    <p>No hours logged for this date.</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex space-x-2">
            {!isLeave && session && (
              <button
                onClick={() => setShowEditModal(true)}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-semibold border border-indigo-500/30 active-scale transition-all flex items-center justify-center space-x-2 text-xs"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Logged Times</span>
              </button>
            )}

            {!isLeave && (
              <button
                onClick={handleToggleLeave}
                disabled={actionLoading}
                className="py-2.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30 active-scale transition-all flex items-center justify-center space-x-1.5 text-xs"
              >
                <Palmtree className="w-4 h-4" />
                <span>Mark Leave</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && session && (
        <EditModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          session={session}
          breaks={breaks}
          onSuccess={() => {
            loadSessionDetail(session.id);
            onRefresh && onRefresh();
          }}
        />
      )}
    </>
  );
}
