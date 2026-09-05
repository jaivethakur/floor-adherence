import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Flame,
  ArrowUpRight,
  ShieldAlert,
  BarChart2,
  Building2,
  Home,
  Palmtree,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Sparkles,
  Calendar
} from 'lucide-react';
import { api } from '../services/api';

export default function SummaryScreen() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [monthData, setMonthData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hoveredBar, setHoveredBar] = useState(null);

  useEffect(() => {
    loadSummary();
  }, [year, month]);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const res = await api.request(`/api/attendance/month?year=${year}&month=${month}`);
      setMonthData(res);
    } catch (e) {
      console.error('Failed to load month summary', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const handleCurrentMonth = () => {
    setYear(currentYear);
    setMonth(currentMonth);
  };

  const isCurrentMonthView = year === currentYear && month === currentMonth;

  const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const metrics = monthData?.metrics;
  const days = monthData?.days || [];

  // Calculate adherence compliance % (capped at 100 for gauge stroke)
  const adherenceRatio = metrics ? (parseFloat(metrics.monthlyAverage) / 7) : 0;
  const adherencePercent = Math.round(adherenceRatio * 100);
  const gaugePercent = Math.min(100, Math.max(0, adherencePercent));
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (gaugePercent / 100) * circumference;

  return (
    <div className="space-y-4 animate-fade-in pb-32 text-xs">
      {/* Month Navigation Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-black text-xl text-white">Monthly Summary</h2>
          <p className="text-slate-400 text-[11px] font-medium">
            Floor Adherence • WFH & Leaves Never Harm Average
          </p>
        </div>

        {/* Month Switcher Controls */}
        <div className="flex items-center space-x-1.5 glass-panel p-1 rounded-2xl border border-white/10 shadow-glass">
          <button
            onClick={handlePrevMonth}
            disabled={loading}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-colors disabled:opacity-40"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-heading font-bold text-xs text-white px-2 min-w-[100px] text-center">
            {monthName}
          </span>

          <button
            onClick={handleNextMonth}
            disabled={loading}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-colors disabled:opacity-40"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Jump to Current Month Pill (if browsing past/future) */}
      {!isCurrentMonthView && (
        <div className="flex items-center justify-between p-2.5 glass-pill rounded-2xl border border-indigo-500/30 text-indigo-300">
          <div className="flex items-center space-x-2">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[11px]">Viewing historical report for <strong>{monthName}</strong></span>
          </div>
          <button
            onClick={handleCurrentMonth}
            className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] transition-colors"
          >
            Go to This Month
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-10 h-10 rounded-2xl glass-panel border border-indigo-500/30 flex items-center justify-center mx-auto animate-spin text-indigo-400">
            <RotateCw className="w-5 h-5" />
          </div>
          <p className="text-slate-400 text-xs font-medium">Calculating floor adherence metrics...</p>
        </div>
      ) : metrics ? (
        <>
          {/* Hero Adherence Gauge Card */}
          <div
            className={`p-5 sm:p-6 rounded-3xl border shadow-glass relative overflow-hidden backdrop-blur-2xl ${
              metrics.isOnTrack
                ? 'glass-panel border-emerald-500/30'
                : 'glass-panel border-amber-500/30'
            }`}
          >
            {/* Ambient Radial Glow */}
            <div
              className={`absolute -right-16 -top-16 w-52 h-52 rounded-full blur-3xl pointer-events-none opacity-20 ${
                metrics.isOnTrack ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />

            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Monthly Floor Adherence
                </span>
                <div className="flex items-baseline space-x-2">
                  <span
                    className={`font-heading font-black text-4xl tabular-nums ${
                      metrics.isOnTrack ? 'text-white text-glow-emerald' : 'text-amber-400'
                    }`}
                  >
                    {metrics.monthlyAverage}h
                  </span>
                  <span className="text-slate-400 text-xs font-medium">/ 7.00h goal</span>
                </div>

                <div className="mt-2.5">
                  {metrics.isOnTrack ? (
                    <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[11px] border border-emerald-500/40">
                      <Flame className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                      <span>On Track (+{metrics.surplusHours}h Surplus)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[11px] border border-amber-500/40">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                      <span>Short by {metrics.shortfallHours}h</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Radial Adherence Gauge */}
              <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    className="text-slate-800"
                    strokeWidth="8"
                    stroke="currentColor"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    strokeWidth="8"
                    strokeLinecap="round"
                    stroke={metrics.isOnTrack ? '#10b981' : '#f59e0b'}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-heading font-black text-base text-white tabular-nums">
                    {adherencePercent}%
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium">Adherence</span>
                </div>
              </div>
            </div>

            {/* Sub-Metrics Footer */}
            <div className="mt-4 pt-3.5 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-xl bg-white/[0.03]">
                <span className="text-[9px] text-slate-400 uppercase font-semibold block">Total Floor</span>
                <span className="font-heading font-bold text-sm text-white tabular-nums">
                  {metrics.totalOfficeFloorHours}h
                </span>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.03]">
                <span className="text-[9px] text-slate-400 uppercase font-semibold block">Office Days</span>
                <span className="font-heading font-bold text-sm text-indigo-300 tabular-nums">
                  {metrics.officeDaysCount} days
                </span>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.03]">
                <span className="text-[9px] text-slate-400 uppercase font-semibold block">Effective Days</span>
                <span className="font-heading font-bold text-sm text-sky-300 tabular-nums">
                  {metrics.effectiveWorkingDaysElapsed} days
                </span>
              </div>
            </div>
          </div>

          {/* Mode Distribution Pills */}
          <div className="grid grid-cols-3 gap-2 text-center font-mono">
            {/* 1. Office Days */}
            <div className="p-3.5 glass-panel border border-indigo-500/20 rounded-3xl shadow-glass">
              <span className="text-indigo-400 text-[10px] block font-semibold flex items-center justify-center space-x-1">
                <Building2 className="w-3.5 h-3.5" />
                <span>Office</span>
              </span>
              <span className="font-heading font-black text-xl text-white mt-1 block">
                {metrics.officeDaysCount || 0}
              </span>
              <span className="text-[9px] text-slate-400 block font-sans mt-0.5">7h goal required</span>
            </div>

            {/* 2. WFH Days */}
            <div className="p-3.5 glass-panel border border-sky-500/20 rounded-3xl shadow-glass">
              <span className="text-sky-400 text-[10px] block font-semibold flex items-center justify-center space-x-1">
                <Home className="w-3.5 h-3.5" />
                <span>WFH</span>
              </span>
              <span className="font-heading font-black text-xl text-sky-400 mt-1 block">
                {metrics.wfhDaysCount || 0}
              </span>
              <span className="text-[9px] text-emerald-400 block font-sans mt-0.5">0h (zero penalty)</span>
            </div>

            {/* 3. Leave Days */}
            <div className="p-3.5 glass-panel border border-amber-500/20 rounded-3xl shadow-glass">
              <span className="text-amber-400 text-[10px] block font-semibold flex items-center justify-center space-x-1">
                <Palmtree className="w-3.5 h-3.5" />
                <span>Leaves</span>
              </span>
              <span className="font-heading font-black text-xl text-amber-400 mt-1 block">
                {metrics.totalLeaveDays || 0}
              </span>
              <span className="text-[9px] text-emerald-400 block font-sans mt-0.5">Excluded (no drop)</span>
            </div>
          </div>

          {/* Zero Impact Explanatory Card */}
          <div className="p-3.5 glass-panel rounded-3xl border border-sky-500/20 shadow-glass space-y-1">
            <div className="flex items-center space-x-2 text-sky-300 font-semibold text-xs">
              <CheckCircle2 className="w-4 h-4 text-sky-400 flex-shrink-0" />
              <span>Zero-Impact Attendance Policy Active</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              <strong>Work from Home (WFH)</strong> and <strong>Leaves</strong> are subtracted from your required days. You only need to fulfill 7 hours on days you physically work from the office.
            </p>
          </div>

          {/* Recovery Planner (if short and remaining days exist) */}
          {!metrics.isOnTrack && metrics.effectiveRemainingWorkingDays > 0 && (
            <div className="glass-panel border border-white/10 rounded-3xl p-5 space-y-3 shadow-glass backdrop-blur-2xl">
              <div className="flex items-center space-x-2 text-indigo-400">
                <TrendingUp className="w-4 h-4" />
                <h3 className="font-heading font-bold text-white text-sm">Target Recovery Plan</h3>
              </div>

              {metrics.isRecoverable ? (
                <div className="p-3.5 glass-pill border border-indigo-500/30 rounded-2xl text-indigo-300 space-y-1">
                  <p className="font-semibold text-xs flex items-center space-x-1.5 text-white">
                    <ArrowUpRight className="w-4 h-4 text-indigo-400" />
                    <span>
                      Aim for <strong className="text-indigo-300 font-mono">{metrics.requiredDailyRate}h / day</strong> (+{metrics.extraPerRemainingDay}h extra)
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-300">
                    Over your remaining {metrics.effectiveRemainingWorkingDays} office working days to achieve a 7.00h average.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 glass-pill border border-rose-500/30 rounded-2xl text-rose-300 space-y-1">
                  <p className="font-semibold text-xs flex items-center space-x-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>Target mathematically unrecoverable this month</span>
                  </p>
                  <p className="text-[11px] text-slate-300">
                    Required rate would exceed 11h/day. Review and adjust any missed past check-outs in the History tab.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Daily Hours Bar Chart */}
          <div className="glass-panel border border-white/10 rounded-3xl p-5 space-y-3.5 shadow-glass backdrop-blur-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <BarChart2 className="w-4 h-4 text-indigo-400" />
                <h3 className="font-heading font-bold text-slate-100 text-sm">Daily Hours Distribution</h3>
              </div>
              <span className="text-[10px] text-indigo-300 font-mono flex items-center space-x-1">
                <span className="w-2 h-0.5 bg-indigo-400 inline-block mr-1" />
                <span>7h Target line</span>
              </span>
            </div>

            <div className="relative pt-6 pb-2">
              {/* Target guideline (7h out of 10h max = top 30%) */}
              <div className="absolute top-[30%] left-0 right-0 border-b-2 border-dashed border-indigo-400/30 z-10 pointer-events-none" />

              <div className="flex items-end justify-between h-36 space-x-1 px-1 overflow-x-auto">
                {days.map((d) => {
                  const heightPercent = Math.min(100, Math.round((d.floorHours / 10) * 100));
                  const isLeave = d.statusType === 'leave';
                  const isWFH = d.workMode === 'wfh';

                  return (
                    <div
                      key={d.date}
                      onMouseEnter={() => setHoveredBar(d)}
                      onClick={() => setHoveredBar(d)}
                      className="flex flex-col items-center flex-1 min-w-[10px] h-full justify-end group cursor-pointer"
                    >
                      <div
                        style={{ height: `${isLeave ? 25 : isWFH ? 15 : (d.isWorkingDay ? Math.max(6, heightPercent) : (d.floorHours > 0 ? Math.max(6, heightPercent) : 4))}%` }}
                        className={`w-full rounded-t-md transition-all duration-300 ${
                          isLeave
                            ? 'bg-amber-500/80 group-hover:bg-amber-400'
                            : isWFH
                            ? 'bg-sky-500/80 group-hover:bg-sky-400'
                            : !d.isWorkingDay && d.floorHours === 0
                            ? 'bg-white/5'
                            : d.floorHours >= 7
                            ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 group-hover:brightness-110 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                            : d.floorHours >= 6
                            ? 'bg-amber-500 group-hover:bg-amber-400'
                            : d.floorHours > 0
                            ? 'bg-rose-500 group-hover:bg-rose-400'
                            : 'bg-white/10'
                        }`}
                      />
                      <span className={`text-[9px] mt-1.5 font-mono ${d.isToday ? 'text-indigo-400 font-bold' : 'text-slate-500'}`}>
                        {d.day}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Interactive Tooltip Card */}
            {hoveredBar && (
              <div className="p-3 glass-panel-elevated rounded-2xl flex items-center justify-between text-[11px] border border-white/20 animate-fade-in shadow-glass">
                <div>
                  <span className="font-semibold text-white">{hoveredBar.date}</span>
                  <span className="text-slate-400 ml-1.5">({hoveredBar.dayOfWeek})</span>
                </div>
                <div>
                  {hoveredBar.statusType === 'leave' ? (
                    <span className="text-amber-400 font-semibold">🏖️ Leave ({hoveredBar.leaveReason || 'Personal'})</span>
                  ) : hoveredBar.workMode === 'wfh' ? (
                    <span className="text-sky-400 font-semibold">🏠 Remote WFH (0h quota)</span>
                  ) : (
                    <span className="font-mono">
                      🏢 Office Floor:{' '}
                      <strong className={hoveredBar.floorHours >= 7 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                        {hoveredBar.floorHours}h
                      </strong> / 7h
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

