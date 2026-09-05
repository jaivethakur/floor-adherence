import React from 'react';
import { Coffee, Flame, CheckCircle2, AlertCircle, Sparkles, Palmtree, Home } from 'lucide-react';

export default function LiveTimer({
  floorSeconds = 0,
  breakSeconds = 0,
  targetSeconds = 25200, // 7 hours (0 for weekend/exempted)
  status = 'not_checked_in', // 'active' | 'on_break' | 'completed' | 'not_checked_in' | 'weekend' | 'wfh' | 'leave'
  isWeekend = false,
  isExempted = false,
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

  // Exemption calculation
  const hasZeroTarget = targetSeconds === 0 || isWeekend || isExempted || status === 'wfh' || status === 'leave';
  const effectiveTarget = hasZeroTarget ? 0 : targetSeconds;

  // Progress percentage
  let progressPercent = 0;
  if (hasZeroTarget) {
    progressPercent = floorSeconds > 0 ? 100 : 0;
  } else {
    progressPercent = Math.min(100, Math.round((floorSeconds / effectiveTarget) * 100));
  }

  const isTargetMet = hasZeroTarget ? true : floorSeconds >= effectiveTarget;

  // SVG Ring Calculations
  const radius = 86;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = hasZeroTarget && floorSeconds === 0
    ? circumference
    : circumference - (progressPercent / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center p-6 glass-panel rounded-3xl shadow-glass border border-white/10 overflow-hidden backdrop-blur-2xl">
      {/* Dynamic Background Radial Glow */}
      <div
        className={`absolute inset-0 pointer-events-none opacity-25 blur-3xl transition-all duration-1000 ${
          status === 'active'
            ? 'bg-gradient-to-b from-emerald-500/50 via-teal-500/10 to-transparent'
            : status === 'on_break'
            ? 'bg-gradient-to-b from-amber-500/50 via-orange-500/10 to-transparent'
            : isWeekend
            ? 'bg-gradient-to-b from-emerald-500/30 via-sky-500/10 to-transparent'
            : status === 'wfh'
            ? 'bg-gradient-to-b from-sky-500/40 via-cyan-500/10 to-transparent'
            : status === 'leave'
            ? 'bg-gradient-to-b from-amber-500/40 via-yellow-500/10 to-transparent'
            : isTargetMet && floorSeconds > 0
            ? 'bg-gradient-to-b from-emerald-500/40 via-indigo-500/10 to-transparent'
            : 'bg-gradient-to-b from-indigo-600/25 via-purple-600/10 to-transparent'
        }`}
      />

      {/* Circular Holographic Timer Ring */}
      <div className="relative w-52 h-52 sm:w-56 sm:h-56 flex items-center justify-center my-1">
        <svg className="w-full h-full transform -rotate-90 filter drop-shadow-[0_0_16px_rgba(99,102,241,0.25)]" viewBox="0 0 200 200">
          <defs>
            <linearGradient id="timerGradientIndigo" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a5b4fc" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#4338ca" />
            </linearGradient>
            <linearGradient id="timerGradientEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6ee7b7" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
            <linearGradient id="timerGradientAmber" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <linearGradient id="timerGradientCyan" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7dd3fc" />
              <stop offset="50%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
          </defs>

          {/* Outer Halo Track */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            className="text-white/5"
            strokeWidth="12"
            stroke="currentColor"
            fill="transparent"
          />

          {/* Base Track */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            className="text-slate-800/80"
            strokeWidth="8"
            stroke="currentColor"
            fill="transparent"
          />

          {/* Glowing Animated Progress Stroke */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            strokeWidth="8"
            strokeLinecap="round"
            stroke={
              status === 'on_break'
                ? 'url(#timerGradientAmber)'
                : isWeekend || isTargetMet
                ? 'url(#timerGradientEmerald)'
                : status === 'wfh'
                ? 'url(#timerGradientCyan)'
                : 'url(#timerGradientIndigo)'
            }
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Inner HUD Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          {/* Status Badge */}
          <div className="mb-1.5">
            {status === 'active' && (
              <span className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>ON FLOOR</span>
              </span>
            )}
            {status === 'on_break' && (
              <span className="inline-flex items-center space-x-1 px-3 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
                <Coffee className="w-3 h-3 text-amber-400 animate-bounce" />
                <span>ON BREAK</span>
              </span>
            )}
            {status === 'completed' && (
              <span className={`inline-flex items-center space-x-1 px-3 py-0.5 rounded-full text-[10px] font-bold ${
                isAutoCheckout
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/40'
              }`}>
                {isAutoCheckout ? <AlertCircle className="w-3 h-3 text-rose-400" /> : <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                <span>{isAutoCheckout ? 'AUTO-CHECKED OUT' : 'CHECKED OUT'}</span>
              </span>
            )}
            {isWeekend && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm">
                <span>🌴 WEEKEND</span>
              </span>
            )}
            {!isWeekend && status === 'wfh' && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                <Home className="w-3 h-3" />
                <span>WFH (EXEMPTED)</span>
              </span>
            )}
            {!isWeekend && status === 'leave' && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <Palmtree className="w-3 h-3" />
                <span>LEAVE (EXEMPTED)</span>
              </span>
            )}
            {!isWeekend && status === 'not_checked_in' && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-slate-400 border border-white/10">
                <span>READY TO CHECK IN</span>
              </span>
            )}
          </div>

          {/* Primary Digital Time Display */}
          <div className="font-heading font-black text-3xl sm:text-4xl text-white tabular-nums tracking-tight filter drop-shadow-md">
            {hrs}:{mins}
            <span className="text-xl sm:text-2xl text-slate-400 font-mono font-normal">:{secs}</span>
          </div>

          {/* Subtext: Target Quota or Exemption Note */}
          <div className="text-[11px] text-slate-400 mt-1 font-medium flex items-center space-x-1">
            {hasZeroTarget ? (
              <span className="text-emerald-400/90 font-semibold">
                {floorSeconds > 0 ? `+${totalHoursDecimal}h Bonus Floor Time` : '0.0h Required Today'}
              </span>
            ) : (
              <span>{totalHoursDecimal}h of {(targetSeconds / 3600).toFixed(1)}h floor goal</span>
            )}
          </div>

          {/* Percentage / Status Note */}
          <div className={`text-[11px] font-bold mt-0.5 ${
            hasZeroTarget
              ? 'text-emerald-400'
              : isTargetMet
              ? 'text-emerald-400 text-glow-emerald'
              : 'text-indigo-300'
          }`}>
            {hasZeroTarget ? '✓ Quota Exempted' : isTargetMet ? '✓ 7h Quota Met!' : `${progressPercent}% completed`}
          </div>
        </div>
      </div>
    </div>
  );
}
