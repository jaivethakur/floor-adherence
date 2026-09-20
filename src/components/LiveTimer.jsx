import React from 'react';
import { Coffee, Flame, CheckCircle2, AlertCircle, Sparkles, Palmtree, Home, Clock } from 'lucide-react';

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

  // SVG Gauge calculations (280 degree arc for speedometer/cockpit look)
  const radius = 90;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  // Use 75% sweep (270 degrees) for a modern gauge look
  const strokeDashoffset = hasZeroTarget && floorSeconds === 0
    ? circumference
    : circumference - (progressPercent / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center p-6 glass-panel-elevated rounded-3xl shadow-glass border border-white/15 overflow-hidden backdrop-blur-2xl transition-all duration-500">
      {/* Ambient Pulsing Backlight Glow */}
      <div
        className={`absolute inset-0 pointer-events-none opacity-30 blur-3xl transition-all duration-1000 ${
          status === 'active'
            ? 'bg-gradient-to-b from-emerald-500/60 via-teal-500/20 to-transparent'
            : status === 'on_break'
            ? 'bg-gradient-to-b from-amber-500/60 via-orange-500/20 to-transparent'
            : isWeekend
            ? 'bg-gradient-to-b from-emerald-500/40 via-sky-500/15 to-transparent'
            : status === 'wfh'
            ? 'bg-gradient-to-b from-sky-500/50 via-cyan-500/20 to-transparent'
            : status === 'leave'
            ? 'bg-gradient-to-b from-amber-500/50 via-yellow-500/15 to-transparent'
            : isTargetMet && floorSeconds > 0
            ? 'bg-gradient-to-b from-emerald-500/50 via-indigo-500/20 to-transparent'
            : 'bg-gradient-to-b from-indigo-600/30 via-purple-600/15 to-transparent'
        }`}
      />

      {/* Top Status Pill */}
      <div className="relative z-10 mb-2">
        {status === 'active' && (
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_16px_rgba(16,185,129,0.35)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="tracking-wide">ON OFFICE FLOOR</span>
            <span className="text-[10px] font-mono text-emerald-400/80">• {progressPercent}%</span>
          </div>
        )}
        {status === 'on_break' && (
          <div className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_16px_rgba(245,158,11,0.35)]">
            <Coffee className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
            <span className="tracking-wide">SESSION ON BREAK</span>
          </div>
        )}
        {status === 'completed' && (
          <div className={`inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-full text-xs font-bold ${
            isAutoCheckout
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              : 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/40 shadow-[0_0_14px_rgba(99,102,241,0.3)]'
          }`}>
            {isAutoCheckout ? <AlertCircle className="w-3.5 h-3.5 text-rose-400" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{isAutoCheckout ? 'AUTO-CHECKED OUT (8 PM)' : 'CHECKED OUT • QUOTA LOGGED'}</span>
          </div>
        )}
        {isWeekend && (
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <span>🌴 WEEKEND • BONUS FLOOR TIME</span>
          </div>
        )}
        {!isWeekend && status === 'wfh' && (
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
            <Home className="w-3.5 h-3.5" />
            <span>REMOTE WFH • QUOTA EXEMPTED</span>
          </div>
        )}
        {!isWeekend && status === 'leave' && (
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <Palmtree className="w-3.5 h-3.5" />
            <span>ON LEAVE • QUOTA EXEMPTED</span>
          </div>
        )}
        {!isWeekend && status === 'not_checked_in' && (
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-slate-300 border border-white/10">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>READY TO CHECK IN</span>
          </div>
        )}
      </div>

      {/* Circular Holographic Timer Ring */}
      <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center my-2">
        <svg className="w-full h-full transform -rotate-90 filter drop-shadow-[0_0_20px_rgba(99,102,241,0.3)]" viewBox="0 0 200 200">
          <defs>
            <linearGradient id="timerGradientIndigo" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c7d2fe" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#4338ca" />
            </linearGradient>
            <linearGradient id="timerGradientEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a7f3d0" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
            <linearGradient id="timerGradientAmber" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <linearGradient id="timerGradientCyan" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#bae6fd" />
              <stop offset="50%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
          </defs>

          {/* Outer Ambient Track */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            className="text-white/[0.04]"
            strokeWidth={strokeWidth + 4}
            stroke="currentColor"
            fill="transparent"
          />

          {/* Base Track */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            className="text-slate-800/90"
            strokeWidth={strokeWidth}
            stroke="currentColor"
            fill="transparent"
          />

          {/* Glowing Animated Progress Stroke */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            strokeWidth={strokeWidth}
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
          {/* Main Digital Clock */}
          <div className={`font-heading font-black text-4xl sm:text-5xl text-white tabular-nums tracking-tight filter drop-shadow-lg ${
            isTargetMet && floorSeconds > 0 ? 'text-glow-emerald text-emerald-300' : ''
          }`}>
            {hrs}:{mins}
            <span className="text-2xl sm:text-3xl text-slate-400 font-mono font-light">:{secs}</span>
          </div>

          {/* Target Progress Subtitle */}
          <div className="text-xs text-slate-300 mt-1 font-medium flex items-center space-x-1">
            {hasZeroTarget ? (
              <span className="text-emerald-400 font-semibold">
                {floorSeconds > 0 ? `+${totalHoursDecimal}h Bonus Hours` : '0.0h Required'}
              </span>
            ) : (
              <span>
                <strong className="text-white font-mono">{totalHoursDecimal}h</strong> of {(targetSeconds / 3600).toFixed(1)}h floor goal
              </span>
            )}
          </div>

          {/* Compliance Badge */}
          <div className="mt-1">
            {hasZeroTarget ? (
              <span className="text-[11px] font-bold text-emerald-400">✓ Quota Exempted</span>
            ) : isTargetMet ? (
              <span className="inline-flex items-center space-x-1 text-[11px] font-extrabold text-emerald-400 text-glow-emerald">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>7h Daily Goal Reached!</span>
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-indigo-300 font-mono">
                {progressPercent}% completed
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
