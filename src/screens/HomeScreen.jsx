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
  Sparkles,
} from 'lucide-react';
import { useAttendance } from '../context/AttendanceContext';
import { useAuth } from '../context/AuthContext';
import LiveTimer from '../components/LiveTimer';
import UniversalDayEditorModal from '../components/UniversalDayEditorModal';

export default function HomeScreen({ onNavigateHistory }) {
  const { user } = useAuth();
  const {
    todayData,
    loading,
    actionLoading,
    error,
    liveFloorSeconds,
    liveBreakSeconds,
    isLeave,
    isWFH,
    isWeekend,
    isExempted,
    workMode,
    refreshToday,
    checkIn,
    checkOut,
    startBreak,
    resumeBreak,
  } = useAttendance();

  const [showUniversalEditor, setShowUniversalEditor] = useState(false);
  const [shortcutFeedback, setShortcutFeedback] = useState(null);

  const session = todayData?.session;
  const breaks = todayData?.breaks || [];
  const status = isLeave
    ? 'leave'
    : (workMode === 'wfh'
    ? 'wfh'
    : (session
    ? session.status
    : (isWeekend ? 'weekend' : 'not_checked_in')));
  const isAutoCheckout = Boolean(session?.is_auto_checkout);

  // Deep Link Shortcut Handling (?action=checkin|break|checkout)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    if (!action) return;

    window.history.replaceState({}, document.title, window.location.pathname);

    const executeShortcut = async () => {
      try {
        if (action === 'checkin') {
          if (status === 'not_checked_in' || status === 'weekend') {
            await checkIn('office');
            setShortcutFeedback('⚡ Checked in via Shortcut!');
          }
        } else if (action === 'break') {
          if (status === 'active') {
            await startBreak();
            setShortcutFeedback('☕ Break started via Shortcut!');
          } else if (status === 'on_break') {
            await resumeBreak();
            setShortcutFeedback('▶️ Resumed work via Shortcut!');
          }
        } else if (action === 'checkout') {
          if (status === 'active' || status === 'on_break') {
            await checkOut();
            setShortcutFeedback('🚪 Checked out via Shortcut!');
          }
        }
      } catch (e) {
        console.error('Shortcut action failed:', e);
      }
    };

    executeShortcut();
  }, [status]);

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

  const targetHours = isWeekend || isExempted ? 0 : (todayData?.settings?.dailyTargetHours || 7);
  const floorHoursDecimal = (liveFloorSeconds / 3600).toFixed(2);
  const breakMinutes = Math.floor(liveBreakSeconds / 60);
  const shortfallHours = Math.max(0, targetHours - parseFloat(floorHoursDecimal)).toFixed(2);

  return (
    <div className="space-y-4 animate-fade-in pb-12 text-xs">
      {/* Top Welcome Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-extrabold text-xl text-white flex items-center space-x-2">
            <span>Hi, {user?.name?.split(' ')[0]}</span>
            <span className="inline-block animate-wave">👋</span>
          </h2>
          <div className="flex items-center space-x-2 text-slate-400 text-[11px] font-medium mt-0.5">
            <span>{todayData?.workDate || 'Today'}</span>
            <span>•</span>
            <span className={isWeekend ? 'text-amber-300 font-bold' : 'text-slate-300'}>
              {todayData?.dayOfWeek || 'Today'} {isWeekend && '🌴 Weekend'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Direct Edit Button */}
          <button
            onClick={() => setShowUniversalEditor(true)}
            className="p-2.5 rounded-2xl glass-pill text-indigo-300 hover:text-white hover:bg-white/10 active-scale transition-all flex items-center space-x-1 border border-indigo-500/30 shadow-glass"
            title="Adjust / Log Hours"
          >
            <Edit3 className="w-4 h-4 text-indigo-400" />
            <span className="text-[11px] font-semibold hidden sm:inline">Adjust</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={refreshToday}
            disabled={loading}
            className="p-2.5 rounded-2xl glass-pill text-slate-400 hover:text-white active-scale transition-all border border-white/10 shadow-glass"
            title="Refresh Data"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Shortcut Feedback Toast */}
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

      {/* Weekend Banner */}
      {isWeekend && !session && !isLeave && workMode !== 'wfh' && (
        <div className="p-3.5 glass-panel border border-emerald-500/30 rounded-2xl flex items-center justify-between shadow-glass">
          <div className="flex items-center space-x-2.5">
            <span className="text-xl">🌴</span>
            <div>
              <h4 className="font-heading font-bold text-emerald-300 text-xs">It's Weekend! Quota Exempted</h4>
              <p className="text-slate-400 text-[10px]">No 7.0h requirement today. Any hours logged count as bonus adherence.</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
            0h Quota
          </span>
        </div>
      )}

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
              Leave days are excluded from your monthly target quota.
            </p>
          </div>

          <div className="flex space-x-2 pt-1">
            <button
              onClick={() => setShowUniversalEditor(true)}
              className="flex-1 py-3 rounded-2xl glass-pill hover:bg-white/10 text-indigo-300 font-semibold text-xs border border-indigo-500/30 active-scale transition-all flex items-center justify-center space-x-1.5"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Details</span>
            </button>
            <button
              onClick={onNavigateHistory}
              className="flex-1 py-3 rounded-2xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 font-semibold text-xs border border-amber-500/30 active-scale transition-all flex items-center justify-center space-x-1.5"
            >
              <CalendarDays className="w-4 h-4" />
              <span>Calendar Controls →</span>
            </button>
          </div>
        </div>
      ) : workMode === 'wfh' ? (
        /* WFH VIEW */
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
              WFH days are exempted from your required floor quota.
            </p>
          </div>

          <div className="flex space-x-2 pt-1">
            <button
              onClick={() => setShowUniversalEditor(true)}
              className="flex-1 py-3 rounded-2xl glass-pill hover:bg-white/10 text-indigo-300 font-semibold text-xs border border-indigo-500/30 active-scale transition-all flex items-center justify-center space-x-1.5"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Details</span>
            </button>
            <button
              onClick={onNavigateHistory}
              className="flex-1 py-3 rounded-2xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 font-semibold text-xs border border-sky-500/30 active-scale transition-all flex items-center justify-center space-x-1.5"
            >
              <CalendarDays className="w-4 h-4" />
              <span>Calendar Controls →</span>
            </button>
          </div>
        </div>
      ) : (
        /* OFFICE FLOOR VIEW */
        <>
          {/* Holographic Live Chronometer Ring */}
          <LiveTimer
            floorSeconds={liveFloorSeconds}
            breakSeconds={liveBreakSeconds}
            targetSeconds={targetHours * 3600}
            status={status}
            isWeekend={isWeekend}
            isExempted={isExempted}
            isAutoCheckout={isAutoCheckout}
          />

          {/* 4-Card Frosted Glass Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            {/* 1. Floor Time */}
            <div className="p-3.5 glass-panel border border-white/10 rounded-2xl shadow-glass">
              <span className="text-slate-400 text-[10px] block font-semibold uppercase tracking-wider">
                Floor Time
              </span>
              <span className="font-heading font-black text-xl text-white font-mono tabular-nums">
                {floorHoursDecimal}h
              </span>
              <span className="text-[10px] text-indigo-300 block">
                {Math.floor(liveFloorSeconds / 60)} mins
              </span>
            </div>

            {/* 2. Breaks */}
            <div className="p-3.5 glass-panel border border-white/10 rounded-2xl shadow-glass">
              <span className="text-slate-400 text-[10px] block font-semibold uppercase tracking-wider">
                Breaks
              </span>
              <span className="font-heading font-black text-xl text-amber-400 font-mono tabular-nums">
                {breakMinutes}m
              </span>
              <span className="text-[10px] text-slate-400 block">
                {breaks.length} logged
              </span>
            </div>

            {/* 3. Target Quota */}
            <div className="p-3.5 glass-panel border border-white/10 rounded-2xl shadow-glass">
              <span className="text-slate-400 text-[10px] block font-semibold uppercase tracking-wider">
                Target Quota
              </span>
              <span className="font-heading font-black text-xl text-sky-400 font-mono tabular-nums">
                {targetHours.toFixed(1)}h
              </span>
              <span className="text-[10px] text-slate-400 block">
                {isWeekend ? 'Weekend Off' : 'Daily Goal'}
              </span>
            </div>

            {/* 4. Shortfall / Pace */}
            <div className="p-3.5 glass-panel border border-white/10 rounded-2xl shadow-glass">
              <span className="text-slate-400 text-[10px] block font-semibold uppercase tracking-wider">
                {isWeekend ? 'Bonus Hours' : 'Shortfall'}
              </span>
              {isWeekend ? (
                <>
                  <span className="font-heading font-black text-xl text-emerald-400 font-mono tabular-nums">
                    +{floorHoursDecimal}h
                  </span>
                  <span className="text-[10px] text-emerald-400/80 block">Bonus Work</span>
                </>
              ) : parseFloat(shortfallHours) <= 0 ? (
                <>
                  <span className="font-heading font-black text-xl text-emerald-400 font-mono tabular-nums">
                    0.00h
                  </span>
                  <span className="text-[10px] text-emerald-400 block font-semibold">✓ Quota Met!</span>
                </>
              ) : (
                <>
                  <span className="font-heading font-black text-xl text-amber-400 font-mono tabular-nums">
                    {shortfallHours}h
                  </span>
                  <span className="text-[10px] text-amber-400/80 block">to reach 7h</span>
                </>
              )}
            </div>
          </div>

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
                onClick={() => setShowUniversalEditor(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-semibold text-[11px] active-scale transition-all border border-rose-500/30"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Adjust Hours</span>
              </button>
            </div>
          )}

          {/* Action Control Deck */}
          <div className="glass-panel rounded-3xl p-5 space-y-3.5 shadow-glass border border-white/10 backdrop-blur-2xl">
            <div className="flex items-center justify-between text-xs pb-1 border-b border-white/10">
              <span className="text-slate-400 font-medium">
                🏢 Office Floor Status
              </span>
              <span className="font-semibold text-slate-200">
                {status === 'active' && `Working since ${formatISTTime(session?.check_in_time)}`}
                {status === 'on_break' && `On Break since ${formatISTTime(breaks[breaks.length - 1]?.break_start)}`}
                {status === 'completed' && `Checked Out at ${formatISTTime(session?.check_out_time)}`}
                {status === 'weekend' && 'Weekend Off'}
                {status === 'not_checked_in' && 'Ready to Check In'}
              </span>
            </div>

            <div>
              {/* Not Checked In / Weekend Button */}
              {(status === 'not_checked_in' || status === 'weekend') && (
                <button
                  onClick={() => checkIn('office')}
                  disabled={actionLoading}
                  className="w-full py-4 px-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-heading font-bold text-base rounded-2xl active-scale shadow-xl shadow-indigo-600/40 ring-1 ring-white/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <LogIn className="w-5 h-5" />
                  <span>
                    {actionLoading ? 'Checking In...' : (isWeekend ? 'Log Weekend Bonus Floor Hours' : 'Check In to Office Floor')}
                  </span>
                </button>
              )}

              {/* Active Session Buttons */}
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

              {/* On Break Buttons */}
              {status === 'on_break' && (
                <div className="space-y-2">
                  <button
                    onClick={resumeBreak}
                    disabled={actionLoading}
                    className="w-full py-4 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 text-white font-heading font-bold text-base rounded-2xl active-scale shadow-xl shadow-emerald-600/40 ring-1 ring-white/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>Resume Work (End Break)</span>
                  </button>

                  <button
                    onClick={checkOut}
                    disabled={actionLoading}
                    className="w-full py-2.5 px-3 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-semibold border border-rose-500/30 active-scale transition-all flex items-center justify-center space-x-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Check Out Directly</span>
                  </button>
                </div>
              )}

              {/* Checked Out View */}
              {status === 'completed' && (
                <div className="space-y-2.5">
                  <div className="p-3.5 glass-pill rounded-2xl text-center text-xs text-slate-200 font-medium border border-white/10 flex items-center justify-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Checked out for today. Floor hours logged!</span>
                  </div>
                </div>
              )}
            </div>

            {/* Direct Edit Button Available Anytime */}
            <div className="pt-2 border-t border-white/10">
              <button
                onClick={() => setShowUniversalEditor(true)}
                className="w-full py-2.5 rounded-2xl glass-pill hover:bg-white/10 text-indigo-300 font-semibold text-xs transition-all flex items-center justify-center space-x-2 border border-indigo-500/30 active-scale"
              >
                <Edit3 className="w-4 h-4 text-indigo-400" />
                <span>✏️ Adjust / Log Floor Hours</span>
              </button>
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
                  Total: {breakMinutes}m
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
                      key={b.id || idx}
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

      {/* Quick History / Calendar Link Card */}
      <button
        onClick={onNavigateHistory}
        className="w-full p-4 glass-panel hover:bg-white/10 border border-white/10 hover:border-indigo-500/30 rounded-3xl flex items-center justify-between text-xs active-scale transition-all shadow-glass"
      >
        <div className="flex items-center space-x-3 text-left">
          <div className="p-2.5 rounded-2xl bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-white">Monthly Calendar & Work Modes</h4>
            <p className="text-slate-400 text-[11px]">Select any date to apply Office Floor, WFH, or Leave</p>
          </div>
        </div>
        <span className="text-indigo-400 text-xs font-bold">Manage in Calendar →</span>
      </button>

      {/* Universal Day Editor Modal for Today */}
      {showUniversalEditor && (
        <UniversalDayEditorModal
          isOpen={showUniversalEditor}
          onClose={() => setShowUniversalEditor(false)}
          date={todayData?.workDate || new Date().toISOString().split('T')[0]}
          initialData={todayData}
          onSuccess={refreshToday}
        />
      )}
    </div>
  );
}
