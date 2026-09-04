import React from 'react';
import { Coffee, Flame, CheckCircle2, AlertCircle } from 'lucide-react';

export default function LiveTimer({
  floorSeconds = 0,
  breakSeconds = 0,
  targetSeconds = 25200, // 7 hours
  status = 'not_checked_in', // 'active' | 'on_break' | 'completed' | 'not_checked_in'
  isAutoCheckout = false,
}) {
  const formatTimeParts = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return {
      hrs: String(hrs).padStart(2, '0'),
      mins: String(mins).padStart(2, '0'),
      secs: String(secs).padStart(2, '0'),
      totalHoursDecimal: (totalSec / 3600).toFixed(2),
    };
  };

  const { hrs, mins, secs, totalHoursDecimal } = formatTimeParts(floorSeconds);
  const breakFormatted = formatTimeParts(breakSeconds);

  // Progress percentage towards 7 hours
  const progressPercent = Math.min(100, Math.round((floorSeconds / targetSeconds) * 100));
  const isTargetMet = floorSeconds >= targetSeconds;

  // SVG Ring Calculations
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center p-6 bg-slate-900/90 border border-slate-800/90 rounded-3xl shadow-xl backdrop-blur-sm overflow-hidden">
      {/* Subtle background glow depending on status */}
      <div
        className={`absolute -top-16 -right-16 w-44 h-44 rounded-full blur-3xl pointer-events-none opacity-20 ${
          status === 'active'
            ? 'bg-emerald-500'
            : status === 'on_break'
            ? 'bg-amber-500'
            : isTargetMet
            ? 'bg-indigo-500'
            : 'bg-slate-500'
        }`}
      />

      {/* Circular Timer Ring */}
      <div className="relative w-52 h-52 flex items-center justify-center my-2">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
          {/* Background Track */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            className="text-slate-800"
            strokeWidth="12"
            stroke="currentColor"
            fill="transparent"
          />
          {/* Progress Ring */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            strokeWidth="12"
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={`transition-all duration-1000 ease-out ${
              isTargetMet
                ? 'text-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                : status === 'on_break'
                ? 'text-amber-500'
                : 'text-indigo-500'
            }`}
          />
        </svg>

        {/* Inner Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {/* Status Badge */}
          <div className="mb-1">
            {status === 'active' && (
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>On Floor</span>
              </span>
            )}
            {status === 'on_break' && (
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Coffee className="w-3 h-3 text-amber-400 animate-bounce" />
                <span>On Break</span>
              </span>
            )}
            {status === 'completed' && (
              <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                isAutoCheckout
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
              }`}>
                {isAutoCheckout ? <AlertCircle className="w-3 h-3 text-rose-400" /> : <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                <span>{isAutoCheckout ? 'Auto-Checked Out' : 'Checked Out'}</span>
              </span>
            )}
            {status === 'not_checked_in' && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400">
                <span>Not Checked In</span>
              </span>
            )}
          </div>

          {/* Primary Timer Digits */}
          <div className="font-heading font-extrabold text-3xl sm:text-4xl text-white tabular-nums tracking-tight">
            {hrs}:{mins}
            <span className="text-xl sm:text-2xl text-slate-400 font-mono">:{secs}</span>
          </div>

          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
            {totalHoursDecimal}h / 7.0h floor target
          </div>

          {/* Percentage */}
          <div className={`text-xs font-bold mt-1 ${isTargetMet ? 'text-emerald-400' : 'text-indigo-400'}`}>
            {progressPercent}% completed
          </div>
        </div>
      </div>

      {/* Break info pill & target feedback */}
      <div className="w-full mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs px-2">
        <div className="flex items-center space-x-1.5 text-slate-400">
          <Coffee className="w-3.5 h-3.5 text-amber-400/80" />
          <span>Break logged:</span>
          <span className="font-mono text-slate-200 tabular-nums">
            {breakFormatted.hrs}h {breakFormatted.mins}m
          </span>
        </div>

        <div>
          {isTargetMet ? (
            <span className="flex items-center text-emerald-400 font-semibold space-x-1">
              <Flame className="w-3.5 h-3.5" />
              <span>Target Met!</span>
            </span>
          ) : (
            <span className="text-slate-400">
              Shortfall:{' '}
              <span className="font-mono text-amber-400 tabular-nums font-semibold">
                {Math.max(0, 7 - parseFloat(totalHoursDecimal)).toFixed(2)}h
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
