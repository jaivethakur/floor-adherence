import React from 'react';
import { Coffee, Flame, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

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
  const radius = 86;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center p-6 glass-panel rounded-3xl shadow-glass border border-white/10 overflow-hidden backdrop-blur-2xl">
      {/* Background radial glow */}
      <div
        className={`absolute inset-0 pointer-events-none opacity-20 blur-3xl transition-all duration-1000 ${
          status === 'active'
            ? 'bg-gradient-to-b from-emerald-500/40 via-transparent to-transparent'
            : status === 'on_break'
            ? 'bg-gradient-to-b from-amber-500/40 via-transparent to-transparent'
            : isTargetMet
            ? 'bg-gradient-to-b from-indigo-500/40 via-transparent to-transparent'
            : 'bg-gradient-to-b from-slate-600/20 via-transparent to-transparent'
        }`}
      />

      {/* Circular Holographic Timer Ring */}
      <div className="relative w-56 h-56 flex items-center justify-center my-1">
        <svg className="w-full h-full transform -rotate-90 filter drop-shadow-lg" viewBox="0 0 200 200">
          <defs>
            <linearGradient id="timerGradientIndigo" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>
            <linearGradient id="timerGradientEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="timerGradientAmber" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>

          {/* Secondary background halo */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            className="text-white/5"
            strokeWidth="14"
            stroke="currentColor"
            fill="transparent"
          />

          {/* Background Track with tick markings aesthetic */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            className="text-slate-800/80"
            strokeWidth="10"
            stroke="currentColor"
            fill="transparent"
          />

          {/* Progress Glowing Stroke */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            strokeWidth="10"
            strokeLinecap="round"
            stroke={
              isTargetMet
                ? 'url(#timerGradientEmerald)'
                : status === 'on_break'
                ? 'url(#timerGradientAmber)'
                : 'url(#timerGradientIndigo)'
            }
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Inner Glass Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          {/* Status Badge */}
          <div className="mb-1.5">
            {status === 'active' && (
              <span className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>On Floor</span>
              </span>
            )}
            {status === 'on_break' && (
              <span className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm">
                <Coffee className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                <span>On Break</span>
              </span>
            )}
            {status === 'completed' && (
              <span className={`inline-flex items-center space-x-1 px-3 py-0.5 rounded-full text-[11px] font-semibold ${
                isAutoCheckout
                  ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                  : 'bg-indigo-500/15 text-indigo-200 border border-indigo-500/30'
              }`}>
                {isAutoCheckout ? <AlertCircle className="w-3.5 h-3.5 text-rose-400" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{isAutoCheckout ? 'Auto-Checked Out' : 'Checked Out'}</span>
              </span>
            )}
            {status === 'not_checked_in' && (
              <span className="inline-flex items-center space-x-1 px-3 py-0.5 rounded-full text-[11px] font-medium bg-white/5 text-slate-400 border border-white/10">
                <span>Not Checked In</span>
              </span>
            )}
          </div>

          {/* Primary Digital Time Display */}
          <div className="font-heading font-black text-3xl sm:text-4xl text-white tabular-nums tracking-tight filter drop-shadow">
            {hrs}:{mins}
            <span className="text-xl sm:text-2xl text-slate-400 font-mono font-normal">:{secs}</span>
          </div>

          <div className="text-[11px] text-slate-400 mt-0.5 font-medium flex items-center space-x-1">
            <span>{totalHoursDecimal}h / 7.0h floor target</span>
          </div>

          {/* Percentage Progress with glow */}
          <div className={`text-xs font-bold mt-1 ${isTargetMet ? 'text-emerald-400 text-glow-emerald' : 'text-indigo-300'}`}>
            {progressPercent}% completed
          </div>
        </div>
      </div>

      {/* Frosted Bottom Shelf: Break Info & Target */}
      <div className="w-full mt-4 pt-3.5 border-t border-white/10 flex items-center justify-between text-xs px-2">
        <div className="flex items-center space-x-1.5 text-slate-400">
          <Coffee className="w-3.5 h-3.5 text-amber-400/90" />
          <span>Breaks:</span>
          <span className="font-mono text-slate-200 tabular-nums font-semibold">
            {breakFormatted.hrs}h {breakFormatted.mins}m
          </span>
        </div>

        <div>
          {isTargetMet ? (
            <span className="flex items-center text-emerald-400 font-bold space-x-1 text-glow-emerald">
              <Flame className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Target Met!</span>
            </span>
          ) : (
            <span className="text-slate-400">
              Shortfall:{' '}
              <span className="font-mono text-amber-400 tabular-nums font-bold">
                {Math.max(0, 7 - parseFloat(totalHoursDecimal)).toFixed(2)}h
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
