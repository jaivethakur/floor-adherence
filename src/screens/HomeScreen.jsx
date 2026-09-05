import React, { useState, useEffect } from 'react';
import {
  LogIn,
  LogOut,
  Coffee,
  Play,
  RotateCw,
  AlertTriangle,
  Building2,
  Home,
  Palmtree,
  Edit3,
  CalendarDays,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useAttendance } from '../context/AttendanceContext';
import { useAuth } from '../context/AuthContext';
import LiveTimer from '../components/LiveTimer';
import EditModal from '../components/EditModal';

export default function HomeScreen({ onNavigateHistory, onOpenWidgetGuide }) {
  const { user } = useAuth();
  const {
    todayData,
    loading,
    actionLoading,
    error,
    liveFloorSeconds,
    liveBreakSeconds,
    refreshToday,
    checkIn,
    checkOut,
    startBreak,
    resumeBreak,
    markLeave,
    unmarkLeave,
    markWFH,
    unmarkWFH,
  } = useAttendance();

  const [selectedMode, setSelectedMode] = useState('office'); // 'office' | 'wfh' | 'leave'
  const [showEditModal, setShowEditModal] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveNote, setLeaveNote] = useState('Personal / Sick Leave');
  const [shortcutFeedback, setShortcutFeedback] = useState(null);

  const session = todayData?.session;
  const breaks = todayData?.breaks || [];
  const isLeave = todayData?.isLeave || false;
  const workMode = todayData?.workMode || 'office';
  const status = isLeave ? 'leave' : (workMode === 'wfh' ? 'wfh' : (session ? session.status : 'not_checked_in'));
  const isAutoCheckout = Boolean(session?.is_auto_checkout);

  // Handle Home Screen shortcut deep links (?action=checkin|break|wfh|leave)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    if (!action) return;

    // Remove query param to prevent re-execution on hot reload
    window.history.replaceState({}, document.title, window.location.pathname);

    const executeShortcut = async () => {
      try {
        if (action === 'checkin') {
          if (status === 'not_checked_in') {
            await checkIn('office');
            setShortcutFeedback('⚡ Checked in via Home Screen Shortcut!');
          }
        } else if (action === 'break') {
          if (status === 'active') {
            await startBreak();
            setShortcutFeedback('☕ Break started via Shortcut!');
          } else if (status === 'on_break') {
            await resumeBreak();
            setShortcutFeedback('▶️ Resumed work via Shortcut!');
          }
        } else if (action === 'wfh') {
          await markWFH();
          setShortcutFeedback('🏠 Marked WFH via Shortcut!');
        } else if (action === 'leave') {
          setLeaveModalOpen(true);
        }
      } catch (e) {
        console.error('Shortcut action failed:', e);
      }
    };

    executeShortcut();
  }, [status]);

  // Dismiss shortcut toast after 4s
  useEffect(() => {
    if (shortcutFeedback) {
      const timer = setTimeout(() => setShortcutFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [shortcutFeedback]);

  const formatISTTime = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleModeSwitch = async (mode) => {
    if (mode === 'leave') {
      setLeaveModalOpen(true);
    } else if (mode === 'wfh') {
      try {
        await markWFH();
      } catch (e) {}
    } else if (mode === 'office') {
      try {
        if (workMode === 'wfh') await unmarkWFH();
        if (isLeave) await unmarkLeave();
        setSelectedMode('office');
      } catch (e) {}
    }
  };

  const handleConfirmLeave = async () => {
    try {
      await markLeave(leaveNote);
      setLeaveModalOpen(false);
    } catch (e) {}
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12 text-xs">
      {/* Greeting & Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-extrabold text-xl text-white flex items-center space-x-2">
            <span>Hi, {user?.name?.split(' ')[0]}</span>
            <span className="inline-block animate-wave">👋</span>
          </h2>
          <p className="text-slate-400 text-[11px] font-medium">
            {todayData?.workDate} • Daily Floor Adherence
          </p>
        </div>
        <button
          onClick={refreshToday}
          disabled={loading}
          className="p-2.5 rounded-xl glass-pill text-slate-400 hover:text-white active-scale transition-all"
          title="Refresh Today's Data"
        >
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
        </button>
      </div>

      {/* Shortcut Execution Feedback Toast */}
      {shortcutFeedback && (
        <div className="p-3.5 glass-panel border border-indigo-500/40 rounded-2xl text-indigo-200 text-xs flex items-center space-x-2.5 shadow-glass-glow animate-fade-in">
          <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0 animate-spin" />
          <span className="font-semibold tracking-wide">{shortcutFeedback}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-center space-x-2 backdrop-blur-md">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* 3-Way Work Mode Selector */}
      <div className="glass-dock rounded-2xl p-1.5 grid grid-cols-3 gap-1.5 shadow-glass border border-white/10">
        <button
          type="button"
          onClick={() => handleModeSwitch('office')}
          className={`py-2 px-2 rounded-xl font-semibold flex items-center justify-center space-x-1.5 transition-all active-scale ${
            !isLeave && workMode === 'office'
              ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/40 ring-1 ring-white/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span className="text-[11px]">Office Floor</span>
        </button>

        <button
          type="button"
          onClick={() => handleModeSwitch('wfh')}
          className={`py-2 px-2 rounded-xl font-semibold flex items-center justify-center space-x-1.5 transition-all active-scale ${
            !isLeave && workMode === 'wfh'
              ? 'bg-gradient-to-r from-sky-600 to-cyan-600 text-white shadow-lg shadow-sky-600/40 ring-1 ring-white/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Home className="w-3.5 h-3.5" />
          <span className="text-[11px]">WFH</span>
        </button>

        <button
          type="button"
          onClick={() => handleModeSwitch('leave')}
          className={`py-2 px-2 rounded-xl font-semibold flex items-center justify-center space-x-1.5 transition-all active-scale ${
            isLeave
              ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-600/40 ring-1 ring-white/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Palmtree className="w-3.5 h-3.5" />
          <span className="text-[11px]">Leave</span>
        </button>
      </div>

      {/* LEAVE VIEW */}
      {isLeave ? (
        <div className="p-6 glass-panel rounded-3xl text-center space-y-3.5 shadow-glass border border-amber-500/30">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Palmtree className="w-8 h-8 animate-pulse" />
          </div>
          <h3 className="font-heading font-black text-xl text-white">
            On Approved Leave Today
          </h3>
          <p className="text-slate-300 text-xs">
            Reason: <strong className="text-white">"{todayData?.leaveReason || 'Personal Leave'}"</strong>
          </p>
          <div className="p-3.5 glass-pill rounded-2xl text-[11px] text-slate-300 border border-white/10 space-y-1">
            <p className="font-semibold text-emerald-400 flex items-center justify-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Monthly Average Protected</span>
            </p>
            <p className="text-slate-400">
              Leave days are completely subtracted from the required working days denominator. Zero penalty!
            </p>
          </div>

          <button
            onClick={() => unmarkLeave()}
            disabled={actionLoading}
            className="w-full py-3 rounded-2xl glass-pill hover:bg-white/10 text-slate-200 font-semibold text-xs border border-white/15 active-scale transition-all"
          >
            Cancel Leave (Switch Back to Office Floor)
          </button>
        </div>
      ) : workMode === 'wfh' ? (
        <div className="p-6 glass-panel rounded-3xl text-center space-y-3.5 shadow-glass border border-sky-500/30">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/20 border border-sky-500/40 text-sky-400 mx-auto flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Home className="w-8 h-8 animate-pulse" />
          </div>
          <h3 className="font-heading font-black text-xl text-white">
            Working From Home Today
          </h3>
          <p className="text-slate-300 text-xs">
            Work Mode: <strong className="text-white">Remote (WFH)</strong>
          </p>
          <div className="p-3.5 glass-pill rounded-2xl text-[11px] text-slate-300 border border-white/10 space-y-1">
            <p className="font-semibold text-sky-400 flex items-center justify-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Zero-Impact on Monthly Average</span>
            </p>
            <p className="text-slate-400">
              0 floor hours counted. WFH days are excluded from your required office floor quota, preserving your average.
            </p>
          </div>

          <button
            onClick={() => handleModeSwitch('office')}
            disabled={actionLoading}
            className="w-full py-3 rounded-2xl glass-pill hover:bg-white/10 text-slate-200 font-semibold text-xs border border-white/15 active-scale transition-all"
          >
            Switch to Office Floor
          </button>
        </div>
      ) : (
        <>
          {/* Holographic Live Timer Ring */}
          <LiveTimer
            floorSeconds={liveFloorSeconds}
            breakSeconds={liveBreakSeconds}
            targetSeconds={(todayData?.settings?.dailyTargetHours || 7) * 3600}
            status={status}
            isAutoCheckout={isAutoCheckout}
          />

          {/* Auto-Checkout Warning */}
          {isAutoCheckout && (
            <div className="p-4 glass-panel border border-rose-500/40 rounded-3xl text-rose-300 text-xs space-y-2.5 shadow-glass">
              <div className="flex items-center space-x-2 font-semibold text-rose-200">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>Auto-Checked Out at 8:00 PM IST</span>
              </div>
              <p className="text-slate-300 text-[11px]">
                Closed by 8 PM system rule. If you left earlier or later, you can adjust your time directly.
              </p>
              <button
                onClick={() => setShowEditModal(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-semibold text-[11px] active-scale transition-all border border-rose-500/30"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Adjust Hours</span>
              </button>
            </div>
          )}

          {/* Core Action Card */}
          <div className="glass-panel rounded-3xl p-5 space-y-3.5 shadow-glass border border-white/10 backdrop-blur-2xl">
            <div className="flex items-center justify-between text-xs pb-1 border-b border-white/10">
              <span className="text-slate-400 font-medium">
                🏢 Office Floor Status
              </span>
              <span className="font-semibold text-slate-200">
                {status === 'active' && `Working since ${formatISTTime(session?.check_in_time)}`}
                {status === 'on_break' && `On Break since ${formatISTTime(breaks[breaks.length - 1]?.break_start)}`}
                {status === 'completed' && `Checked Out at ${formatISTTime(session?.check_out_time)}`}
                {status === 'not_checked_in' && 'Ready to Check In'}
              </span>
            </div>

            <div>
              {status === 'not_checked_in' && (
                <button
                  onClick={() => checkIn(selectedMode)}
                  disabled={actionLoading}
                  className="w-full py-4 px-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-heading font-bold text-base rounded-2xl active-scale shadow-xl shadow-indigo-600/40 ring-1 ring-white/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <LogIn className="w-5 h-5" />
                  <span>
                    {actionLoading ? 'Checking In...' : 'Check In to Office Floor'}
                  </span>
                </button>
              )}

              {status === 'active' && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={startBreak}
                    disabled={actionLoading}
                    className="py-3.5 px-3 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-heading font-bold text-xs rounded-2xl active-scale border border-amber-500/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 shadow-sm"
                  >
                    <Coffee className="w-4 h-4 text-amber-400" />
                    <span>Take Break</span>
                  </button>

                  <button
                    onClick={checkOut}
                    disabled={actionLoading}
                    className="py-3.5 px-3 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-heading font-bold text-xs rounded-2xl active-scale shadow-lg shadow-rose-600/40 ring-1 ring-white/10 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Check Out</span>
                  </button>
                </div>
              )}

              {status === 'on_break' && (
                <button
                  onClick={resumeBreak}
                  disabled={actionLoading}
                  className="w-full py-4 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 text-white font-heading font-bold text-base rounded-2xl active-scale shadow-xl shadow-emerald-600/40 ring-1 ring-white/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>Resume Work (End Break)</span>
                </button>
              )}

              {status === 'completed' && (
                <div className="space-y-2.5">
                  <div className="p-3.5 glass-pill rounded-2xl text-center text-xs text-slate-200 font-medium border border-white/10">
                    Checked out for today. Great work completing your floor hours!
                  </div>
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="w-full py-3 rounded-2xl glass-pill hover:bg-white/10 text-slate-200 font-semibold text-xs transition-all flex items-center justify-center space-x-2 border border-white/15"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Edit Logged Times</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Today's Breaks Breakdown */}
          {breaks.length > 0 && (
            <div className="glass-panel rounded-3xl p-4 space-y-2.5 text-xs shadow-glass border border-white/10">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="font-bold text-slate-200 flex items-center space-x-1.5">
                  <Coffee className="w-4 h-4 text-amber-400" />
                  <span>Today's Breaks ({breaks.length})</span>
                </span>
                <span className="text-slate-400 font-mono text-[11px]">
                  Total: {Math.floor(liveBreakSeconds / 60)}m
                </span>
              </div>

              <div className="space-y-2">
                {breaks.map((b, idx) => {
                  const start = formatISTTime(b.break_start);
                  const end = b.break_end ? formatISTTime(b.break_end) : 'In progress';
                  const durationMins = b.break_end
                    ? Math.round((new Date(b.break_end) - new Date(b.break_start)) / 60000)
                    : Math.round((Date.now() - new Date(b.break_start)) / 60000);

                  return (
                    <div
                      key={b.id}
                      className="flex items-center justify-between p-2.5 rounded-2xl glass-pill border border-white/10"
                    >
                      <div className="flex items-center space-x-2.5">
                        <span className="w-5 h-5 rounded-full bg-white/10 text-slate-300 text-[10px] flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <span className="font-mono text-slate-200 text-xs">
                          {start} → {end}
                        </span>
                      </div>
                      <span className={`font-mono font-bold ${!b.break_end ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`}>
                        {durationMins}m
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Quick History Link */}
      <button
        onClick={onNavigateHistory}
        className="w-full p-4 glass-panel hover:bg-white/10 border border-white/10 hover:border-indigo-500/30 rounded-3xl flex items-center justify-between text-xs active-scale transition-all shadow-glass"
      >
        <div className="flex items-center space-x-3 text-left">
          <div className="p-2.5 rounded-2xl bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-white">Monthly Calendar & Average</h4>
            <p className="text-slate-400 text-[11px]">View breakdown, leaves, and daily hours</p>
          </div>
        </div>
        <span className="text-indigo-400 text-xs font-bold">View →</span>
      </button>

      {/* Leave Confirmation Modal */}
      {leaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm glass-panel-elevated rounded-3xl p-6 shadow-2xl space-y-4 text-xs border border-white/20">
            <div className="flex items-center space-x-2.5 text-amber-400">
              <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30">
                <Palmtree className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-white">Mark Today as Leave</h3>
                <p className="text-[10px] text-slate-400">Protects your monthly average</p>
              </div>
            </div>
            <p className="text-slate-300 text-[11px]">
              This will exclude today from your 7-hour daily target so your monthly adherence average remains protected.
            </p>

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">Reason / Note</label>
              <input
                type="text"
                value={leaveNote}
                onChange={(e) => setLeaveNote(e.target.value)}
                placeholder="e.g. Sick Leave, Vacation, Personal"
                className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setLeaveModalOpen(false)}
                className="flex-1 py-3 rounded-2xl glass-pill text-slate-300 font-semibold hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLeave}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 text-white font-semibold active-scale shadow-lg shadow-amber-600/30 transition-colors"
              >
                Confirm Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Edit Modal */}
      {showEditModal && session && (
        <EditModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          session={session}
          breaks={breaks}
          onSuccess={refreshToday}
        />
      )}
    </div>
  );
}
