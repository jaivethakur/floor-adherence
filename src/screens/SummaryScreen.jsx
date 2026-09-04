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
  Palmtree
} from 'lucide-react';
import { api } from '../services/api';

export default function SummaryScreen() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
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
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const metrics = monthData?.metrics;
  const days = monthData?.days || [];

  return (
    <div className="space-y-4 animate-fade-in pb-12 text-xs">
      <div>
        <h2 className="font-heading font-extrabold text-xl text-white">Monthly Summary</h2>
        <p className="text-slate-400">Average & Shortfall (Leaves Excluded from Quota)</p>
      </div>

      {/* Main Compliance Banner */}
      {metrics && (
        <div
          className={`p-5 rounded-3xl border shadow-xl relative overflow-hidden ${
            metrics.isOnTrack
              ? 'bg-gradient-to-br from-emerald-950/60 to-slate-900/90 border-emerald-500/30'
              : 'bg-gradient-to-br from-amber-950/60 to-slate-900/90 border-amber-500/30'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                Monthly Average
              </span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="font-heading font-black text-3xl sm:text-4xl text-white tabular-nums">
                  {metrics.monthlyAverage}h
                </span>
                <span className="text-slate-400 text-sm font-medium">/ 7.00h target</span>
              </div>
            </div>

            <div
              className={`p-3 rounded-2xl ${
                metrics.isOnTrack ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              {metrics.isOnTrack ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80">
            {metrics.isOnTrack ? (
              <div className="flex items-center space-x-2 text-emerald-300 font-medium">
                <Flame className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>
                  You're on track! You are{' '}
                  <strong className="text-white font-mono">{metrics.surplusHours} hours</strong> ahead of target.
                </span>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-amber-300 font-semibold">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>
                    Short by{' '}
                    <strong className="text-white font-mono">{metrics.shortfallHours} hours</strong> across{' '}
                    {metrics.effectiveWorkingDaysElapsed} working days.
                  </span>
                </div>
                {metrics.leaveDaysElapsed > 0 && (
                  <p className="text-slate-400 text-[11px]">
                    Note: {metrics.leaveDaysElapsed} day(s) on leave were excluded from your required target.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mode Distribution Pills */}
      {metrics && (
        <div className="grid grid-cols-3 gap-2 text-center font-mono">
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <span className="text-indigo-400 text-[10px] block font-semibold flex items-center justify-center space-x-1">
              <Building2 className="w-3 h-3" />
              <span>Office Days</span>
            </span>
            <span className="font-bold text-base text-white mt-1 block">
              {metrics.officeDaysCount || 0}
            </span>
          </div>

          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <span className="text-sky-400 text-[10px] block font-semibold flex items-center justify-center space-x-1">
              <Home className="w-3 h-3" />
              <span>WFH Days</span>
            </span>
            <span className="font-bold text-base text-white mt-1 block">
              {metrics.wfhDaysCount || 0}
            </span>
          </div>

          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <span className="text-amber-400 text-[10px] block font-semibold flex items-center justify-center space-x-1">
              <Palmtree className="w-3 h-3" />
              <span>Leaves</span>
            </span>
            <span className="font-bold text-base text-white mt-1 block">
              {metrics.totalLeaveDays || 0}
            </span>
          </div>
        </div>
      )}

      {/* Recovery Planner (if short) */}
      {metrics && !metrics.isOnTrack && metrics.effectiveRemainingWorkingDays > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center space-x-2 text-indigo-400">
            <TrendingUp className="w-4 h-4" />
            <h3 className="font-heading font-bold text-white text-sm">Target Recovery Plan</h3>
          </div>

          {metrics.isRecoverable ? (
            <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-300 space-y-1">
              <p className="font-semibold text-xs flex items-center space-x-1.5">
                <ArrowUpRight className="w-4 h-4 text-indigo-400" />
                <span>
                  Aim for <strong className="text-white">{metrics.requiredDailyRate}h / day</strong> (+{metrics.extraPerRemainingDay}h extra)
                </span>
              </p>
              <p className="text-[11px] text-slate-300">
                Over the remaining {metrics.effectiveRemainingWorkingDays} working days to reach a 7.00h monthly average.
              </p>
            </div>
          ) : (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300 space-y-1">
              <p className="font-semibold text-xs flex items-center space-x-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Target mathematically unrecoverable this month</span>
              </p>
              <p className="text-[11px] text-slate-300">
                Required rate would exceed 11h/day. You can review and edit any past days if check-ins were missed.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Daily Hours Bar Chart */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-3 shadow-xl">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <BarChart2 className="w-4 h-4 text-indigo-400" />
            <h3 className="font-heading font-bold text-slate-100 text-sm">Daily Hours Chart</h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Dashed line = 7h Target</span>
        </div>

        <div className="relative pt-6 pb-2">
          <div className="absolute top-[35%] left-0 right-0 border-b-2 border-dashed border-indigo-400/40 z-10 pointer-events-none" />

          <div className="flex items-end justify-between h-36 space-x-1 px-1 overflow-x-auto">
            {days.map((d) => {
              const heightPercent = Math.min(100, Math.round((d.floorHours / 10) * 100));
              const isLeave = d.statusType === 'leave';

              return (
                <div
                  key={d.date}
                  onMouseEnter={() => setHoveredBar(d)}
                  onMouseLeave={() => setHoveredBar(null)}
                  className="flex flex-col items-center flex-1 min-w-[10px] h-full justify-end group cursor-pointer"
                >
                  <div
                    style={{ height: `${isLeave ? 25 : (d.isWorkingDay ? Math.max(4, heightPercent) : 4)}%` }}
                    className={`w-full rounded-t-md transition-all duration-300 ${
                      isLeave
                        ? 'bg-amber-500/80 group-hover:bg-amber-400'
                        : !d.isWorkingDay
                        ? 'bg-slate-800'
                        : d.floorHours >= 7
                        ? 'bg-emerald-500 group-hover:bg-emerald-400'
                        : d.floorHours >= 6
                        ? 'bg-amber-500 group-hover:bg-amber-400'
                        : d.floorHours > 0
                        ? 'bg-rose-500 group-hover:bg-rose-400'
                        : 'bg-slate-800'
                    }`}
                  />
                  <span className={`text-[9px] mt-1 font-mono ${d.isToday ? 'text-indigo-400 font-bold' : 'text-slate-500'}`}>
                    {d.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {hoveredBar && (
          <div className="p-2.5 bg-slate-800/80 rounded-xl flex items-center justify-between text-[11px] border border-slate-700">
            <div>
              <span className="font-semibold text-white">{hoveredBar.date}</span>
              <span className="text-slate-400 ml-1.5">({hoveredBar.dayOfWeek})</span>
            </div>
            <div>
              {hoveredBar.statusType === 'leave' ? (
                <span className="text-amber-400 font-semibold">🏖️ Leave ({hoveredBar.leaveReason || 'Personal'})</span>
              ) : (
                <span className="font-mono">
                  {hoveredBar.workMode === 'wfh' ? '🏠 WFH: ' : '🏢 Office: '}
                  <strong className={hoveredBar.floorHours >= 7 ? 'text-emerald-400' : 'text-amber-400'}>
                    {hoveredBar.floorHours}h
                  </strong> / 7h
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
