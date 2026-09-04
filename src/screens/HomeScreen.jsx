import React, { useState } from 'react';
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
  CheckCircle2
} from 'lucide-react';
import { useAttendance } from '../context/AttendanceContext';
import { useAuth } from '../context/AuthContext';
import LiveTimer from '../components/LiveTimer';
import EditModal from '../components/EditModal';

export default function HomeScreen({ onNavigateHistory }) {
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

  const session = todayData?.session;
  const breaks = todayData?.breaks || [];
  const isLeave = todayData?.isLeave || false;
  const workMode = todayData?.workMode || 'office';
  const status = isLeave ? 'leave' : (workMode === 'wfh' ? 'wfh' : (session ? session.status : 'not_checked_in'));
  const isAutoCheckout = Boolean(session?.is_auto_checkout);

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
          <h2 className="font-heading font-extrabold text-xl text-white">
            Hi, {user?.name?.split(' ')[0]} 👋
          </h2>
          <p className="text-slate-400">
            {todayData?.workDate} • Daily Floor Adherence
          </p>
        </div>
        <button
          onClick={refreshToday}
          disabled={loading}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white active-scale transition-colors"
          title="Refresh"
        >
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 3-Way Work Mode Selector */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-1 grid grid-cols-3 gap-1 shadow-md">
        <button
          type="button"
          onClick={() => handleModeSwitch('office')}
          className={`py-2 px-2 rounded-xl font-semibold flex items-center justify-center space-x-1.5 transition-all ${
            !isLeave && workMode === 'office'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span className="text-[11px]">Office</span>
        </button>

        <button
          type="button"
          onClick={() => handleModeSwitch('wfh')}
          className={`py-2 px-2 rounded-xl font-semibold flex items-center justify-center space-x-1.5 transition-all ${
            !isLeave && workMode === 'wfh'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className="w-3.5 h-3.5" />
          <span className="text-[11px]">WFH</span>
        </button>

        <button
          type="button"
          onClick={() => handleModeSwitch('leave')}
          className={`py-2 px-2 rounded-xl font-semibold flex items-center justify-center space-x-1.5 transition-all ${
            isLeave
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Palmtree className="w-3.5 h-3.5" />
          <span className="text-[11px]">Leave</span>
        </button>
      </div>

      {/* LEAVE VIEW */}
      {isLeave ? (
        <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-3xl text-center space-y-3 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
            <Palmtree className="w-8 h-8" />
          </div>
          <h3 className="font-heading font-extrabold text-lg text-white">
            You're on Leave Today
          </h3>
          <p className="text-slate-300 text-xs">
            Reason: <strong className="text-white">"{todayData?.leaveReason || 'Personal Leave'}"</strong>
          </p>
          <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800 text-[11px] text-slate-300">
            ✨ This day is completely <strong>excluded from your 7-hour floor quota</strong> so your monthly average won't drop!
          </div>

          <button
            onClick={() => unmarkLeave()}
            disabled={actionLoading}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 active-scale transition-colors"
          >
            Cancel Leave (Switch to Office Floor)
          </button>
        </div>
      ) : workMode === 'wfh' ? (
        <div className="p-6 bg-sky-500/10 border border-sky-500/20 rounded-3xl text-center space-y-3 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/20 text-sky-400 mx-auto flex items-center justify-center">
            <Home className="w-8 h-8" />
          </div>
          <h3 className="font-heading font-extrabold text-lg text-white">
            Working From Home Today
          </h3>
          <p className="text-slate-300 text-xs">
            Work Mode: <strong className="text-white">Remote (WFH)</strong>
          </p>
          <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800 text-[11px] text-slate-300">
            ℹ️ As per Floor Adherence policy, <strong>0 Floor Hours are counted</strong> for WFH.
          </div>

          <button
            onClick={() => handleModeSwitch('office')}
            disabled={actionLoading}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 active-scale transition-colors"
          >
            Switch to Office Floor
          </button>
        </div>
      ) : (
        <>
          {/* Live Timer Ring */}
          <LiveTimer
            floorSeconds={liveFloorSeconds}
            breakSeconds={liveBreakSeconds}
            targetSeconds={(todayData?.settings?.dailyTargetHours || 7) * 3600}
            status={status}
            isAutoCheckout={isAutoCheckout}
          />

          {/* Auto-Checkout Warning */}
          {isAutoCheckout && (
            <div className="p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-2xl text-rose-300 text-xs space-y-2">
              <div className="flex items-center space-x-2 font-semibold">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>Auto-Checked Out at 8:00 PM IST</span>
              </div>
              <p className="text-slate-300 text-[11px]">
                Closed by 8 PM system rule. If you left earlier or later, you can adjust your time directly.
              </p>
              <button
                onClick={() => setShowEditModal(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-semibold text-[11px] active-scale transition-colors border border-rose-500/30"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Adjust Hours</span>
              </button>
            </div>
          )}

          {/* Core Action Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">
                {workMode === 'wfh' ? '🏠 Remote Status' : '🏢 Floor Status'}
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
                  className="w-full py-4 px-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-heading font-bold text-base rounded-2xl active-scale shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <LogIn className="w-5 h-5" />
                  <span>
                    {actionLoading
                      ? 'Checking In...'
                      : `Check In (${selectedMode === 'wfh' ? 'Work from Home' : 'Office Floor'})`}
                  </span>
                </button>
              )}

              {status === 'active' && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={startBreak}
                    disabled={actionLoading}
                    className="py-3.5 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-heading font-bold text-xs rounded-2xl active-scale border border-amber-500/30 transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
                  >
                    <Coffee className="w-4 h-4 text-amber-400" />
                    <span>Take Break</span>
                  </button>

                  <button
                    onClick={checkOut}
                    disabled={actionLoading}
                    className="py-3.5 px-3 bg-rose-600 hover:bg-rose-500 text-white font-heading font-bold text-xs rounded-2xl active-scale shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
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
                  className="w-full py-4 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-heading font-bold text-base rounded-2xl active-scale shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>Resume Work (End Break)</span>
                </button>
              )}

              {status === 'completed' && (
                <div className="space-y-2">
                  <div className="p-3 bg-slate-800/60 rounded-xl text-center text-xs text-slate-300 font-medium">
                    Checked out for today. Great work!
                  </div>
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors flex items-center justify-center space-x-2 border border-slate-700"
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
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <span className="font-bold text-slate-200 flex items-center space-x-1.5">
                  <Coffee className="w-4 h-4 text-amber-400" />
                  <span>Today's Breaks ({breaks.length})</span>
                </span>
                <span className="text-slate-400 font-mono">
                  Total: {Math.floor(liveBreakSeconds / 60)}m
                </span>
              </div>

              <div className="space-y-1.5">
                {breaks.map((b, idx) => {
                  const start = formatISTTime(b.break_start);
                  const end = b.break_end ? formatISTTime(b.break_end) : 'In progress';
                  const durationMins = b.break_end
                    ? Math.round((new Date(b.break_end) - new Date(b.break_start)) / 60000)
                    : Math.round((Date.now() - new Date(b.break_start)) / 60000);

                  return (
                    <div
                      key={b.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-slate-800/60"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="w-4 h-4 rounded-full bg-slate-700 text-slate-300 text-[10px] flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <span className="font-mono text-slate-200">
                          {start} → {end}
                        </span>
                      </div>
                      <span className={`font-mono font-semibold ${!b.break_end ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`}>
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
        className="w-full p-4 bg-slate-900/40 hover:bg-slate-900 border border-slate-800/80 rounded-2xl flex items-center justify-between text-xs active-scale transition-all"
      >
        <div className="flex items-center space-x-3 text-left">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-200">Monthly Calendar & Average</h4>
            <p className="text-slate-400 text-[11px]">View breakdown, leaves, and daily hours</p>
          </div>
        </div>
        <span className="text-indigo-400 text-xs font-semibold">View →</span>
      </button>

      {/* Leave Confirmation Modal */}
      {leaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center space-x-2 text-amber-400">
              <Palmtree className="w-5 h-5" />
              <h3 className="font-heading font-bold text-base text-white">Mark Today as Leave</h3>
            </div>
            <p className="text-slate-300 text-[11px]">
              This will exclude today from your 7-hour daily target so your monthly average remains protected.
            </p>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Reason / Note</label>
              <input
                type="text"
                value={leaveNote}
                onChange={(e) => setLeaveNote(e.target.value)}
                placeholder="e.g. Sick Leave, Vacation, Family Event"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setLeaveModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLeave}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold active-scale shadow-lg shadow-amber-600/30 transition-colors"
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
