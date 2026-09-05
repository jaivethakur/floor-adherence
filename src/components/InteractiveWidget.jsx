import React from 'react';
import { Clock, Coffee, Play, LogIn, LogOut, Home, Palmtree, Smartphone, Sparkles, CheckCircle2 } from 'lucide-react';

export default function InteractiveWidget({
  floorSeconds = 0,
  targetSeconds = 25200,
  workMode = 'office',
  status = 'not_checked_in',
  actionLoading = false,
  onCheckIn,
  onCheckOut,
  onStartBreak,
  onResumeBreak,
  onSwitchOffice,
  onOpenWidgetGuide,
}) {
  const hrs = Math.floor(floorSeconds / 3600);
  const mins = Math.floor((floorSeconds % 3600) / 60);
  const progressPercent = Math.min(100, Math.round((floorSeconds / targetSeconds) * 100));

  const isWFH = workMode === 'wfh';
  const isLeave = workMode === 'leave';

  return (
    <div className="relative glass-panel rounded-3xl p-4 overflow-hidden border border-white/10 shadow-glass transition-all">
      {/* Background ambient glow according to mode */}
      <div
        className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-25 ${
          status === 'active'
            ? 'bg-emerald-500'
            : status === 'on_break'
            ? 'bg-amber-500'
            : isWFH
            ? 'bg-sky-500'
            : isLeave
            ? 'bg-amber-600'
            : 'bg-indigo-500'
        }`}
      />

      {/* Widget Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
        <div className="flex items-center space-x-2">
          <span className="flex h-2 w-2 relative">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                status === 'active'
                  ? 'bg-emerald-400'
                  : status === 'on_break'
                  ? 'bg-amber-400'
                  : 'bg-indigo-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                status === 'active'
                  ? 'bg-emerald-500'
                  : status === 'on_break'
                  ? 'bg-amber-500'
                  : isWFH
                  ? 'bg-sky-500'
                  : isLeave
                  ? 'bg-amber-500'
                  : 'bg-slate-400'
              }`}
            />
          </span>
          <span className="font-heading font-bold text-xs text-white tracking-wide">
            LIVE WIDGET
          </span>
          <span className="px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-mono text-slate-300">
            {isLeave ? '🏖️ LEAVE' : isWFH ? '🏠 WFH' : '🏢 OFFICE'}
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenWidgetGuide}
          className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 text-[10px] font-medium active-scale transition-colors"
          title="Add shortcut to phone home screen"
        >
          <Smartphone className="w-3 h-3 text-indigo-400" />
          <span>Pin to Home</span>
        </button>
      </div>

      {/* Widget Body */}
      <div className="flex items-center justify-between">
        {/* Left: Time & Progress */}
        <div className="space-y-1">
          <div className="flex items-baseline space-x-1.5">
            <span className="font-heading font-black text-2xl text-white tabular-nums tracking-tight">
              {isLeave || isWFH ? '0h 00m' : `${hrs}h ${String(mins).padStart(2, '0')}m`}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              / 7h target
            </span>
          </div>

          <p className="text-[11px] text-slate-400">
            {isLeave
              ? 'On approved leave (0h target)'
              : isWFH
              ? 'WFH mode (0 floor hours counted)'
              : status === 'active'
              ? 'Currently active on office floor'
              : status === 'on_break'
              ? 'Break in progress'
              : status === 'completed'
              ? 'Session completed for today'
              : 'Not checked in yet'}
          </p>

          {/* Micro Progress Bar */}
          {!isLeave && !isWFH && (
            <div className="w-36 h-1.5 rounded-full bg-white/10 overflow-hidden mt-1.5">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  progressPercent >= 100
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : 'bg-gradient-to-r from-indigo-500 to-sky-400'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </div>

        {/* Right: Instant 1-Tap Quick Action */}
        <div className="flex flex-col items-end space-y-1.5">
          {isLeave || isWFH ? (
            <button
              onClick={onSwitchOffice}
              disabled={actionLoading}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 border border-white/15 font-semibold text-[11px] active-scale transition-all flex items-center space-x-1.5 disabled:opacity-50"
            >
              <span>Switch to Office</span>
            </button>
          ) : status === 'not_checked_in' ? (
            <button
              onClick={onCheckIn}
              disabled={actionLoading}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs active-scale shadow-lg shadow-indigo-600/30 transition-all flex items-center space-x-1.5 disabled:opacity-50"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Check In</span>
            </button>
          ) : status === 'active' ? (
            <div className="flex items-center space-x-1.5">
              <button
                onClick={onStartBreak}
                disabled={actionLoading}
                className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 active-scale transition-colors disabled:opacity-50"
                title="Take Break"
              >
                <Coffee className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onCheckOut}
                disabled={actionLoading}
                className="px-2.5 py-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white font-semibold text-[11px] active-scale shadow-md shadow-rose-600/30 transition-all flex items-center space-x-1 disabled:opacity-50"
              >
                <LogOut className="w-3 h-3" />
                <span>Out</span>
              </button>
            </div>
          ) : status === 'on_break' ? (
            <button
              onClick={onResumeBreak}
              disabled={actionLoading}
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold text-xs active-scale shadow-lg shadow-emerald-600/30 transition-all flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Resume</span>
            </button>
          ) : (
            <span className="px-2.5 py-1 rounded-xl bg-white/5 text-slate-400 text-[10px] font-medium border border-white/10">
              Closed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
