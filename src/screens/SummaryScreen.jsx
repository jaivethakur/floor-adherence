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
        <h2 className="font-heading font-black text-xl text-white">Floor Adherence Summary</h2>
        <p className="text-slate-400 text-[11px] font-medium">
          Office Floor Adherence Only • WFH & Leaves Do Not Lower Average
        </p>
      </div>

      {/* Main Compliance Banner */}
      {metrics && (
        <div
          className={`p-6 rounded-3xl border shadow-glass relative overflow-hidden backdrop-blur-2xl ${
            metrics.isOnTrack
              ? 'glass-panel border-emerald-500/30'
              : 'glass-panel border-amber-500/30'
          }`}
        >
          {/* Ambient Glow */}
          <div
            className={`absolute -right-16 -top-16 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-25 ${
              metrics.isOnTrack ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
          />

          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                Monthly Floor Average
              </span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className={`font-heading font-black text-4xl tabular-nums ${
                  metrics.isOnTrack ? 'text-white text-glow-emerald' : 'text-amber-400'
                }`}>
                  {metrics.monthlyAverage}h
                </span>
                <span className="text-slate-400 text-xs font-medium">/ 7.00h floor target</span>
              </div>
            </div>

            <div
              className={`p-3.5 rounded-2xl ${
                metrics.isOnTrack
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/20'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-500/20'
              }`}
            >
              {metrics.isOnTrack ? (
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              ) : (
                <AlertCircle className="w-7 h-7 text-amber-400" />
              )}
            </div>
          </div>

          <div className="mt-4 pt-3.5 border-t border-white/10">
            {metrics.isOnTrack ? (
              <div className="flex items-center space-x-2 text-emerald-300 font-medium">
                <Flame className="w-4 h-4 text-emerald-400 flex-shrink-0 animate-pulse" />
                <span>
                  You're on track! You are{' '}
                  <strong className="text-white font-mono">{metrics.surplusHours} hours</strong> ahead of the floor quota.
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
                <p className="text-slate-400 text-[11px]">
                  Formula: Floor Average = Total Office Floor Hours ÷ (Working Days - Leaves - WFH).
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mode Distribution Pills */}
      {metrics && (
        <div className="grid grid-cols-3 gap-2 text-center font-mono">
          <div className="p-3.5 glass-panel border border-white/10 rounded-3xl shadow-glass">
            <span className="text-indigo-400 text-[10px] block font-semibold flex items-center justify-center space-x-1">
              <Building2 className="w-3 h-3" />
              <span>Office Days</span>
            </span>
            <span className="font-heading font-black text-xl text-white mt-1 block">
              {metrics.officeDaysCount || 0}
            </span>
            <span className="text-[10px] text-slate-500 block font-sans">7h target applied</span>
          </div>

          <div className="p-3.5 glass-panel border border-white/10 rounded-3xl shadow-glass">
            <span className="text-sky-400 text-[10px] block font-semibold flex items-center justify-center space-x-1">
              <Home className="w-3 h-3" />
              <span>WFH Days</span>
            </span>
            <span className="font-heading font-black text-xl text-sky-400 mt-1 block">
              {metrics.wfhDaysCount || 0}
            </span>
            <span className="text-[10px] text-slate-500 block font-sans">0h quota (zero penalty)</span>
          </div>

          <div className="p-3.5 glass-panel border border-white/10 rounded-3xl shadow-glass">
            <span className="text-amber-400 text-[10px] block font-semibold flex items-center justify-center space-x-1">
              <Palmtree className="w-3 h-3" />
              <span>Leaves</span>
            </span>
            <span className="font-heading font-black text-xl text-amber-400 mt-1 block">
              {metrics.totalLeaveDays || 0}
            </span>
            <span className="text-[10px] text-slate-500 block font-sans">excluded from days</span>
          </div>
        </div>
      )}

      {/* Zero Impact Explanatory Card */}
      <div className="p-4 glass-panel rounded-3xl border border-sky-500/20 shadow-glass space-y-1.5">
        <div className="flex items-center space-x-2 text-sky-300 font-semibold text-xs">
          <CheckCircle2 className="w-4 h-4 text-sky-400 flex-shrink-0" />
          <span>Zero-Impact Attendance Policy</span>
        </div>
        <p className="text-slate-300 text-[11px] leading-relaxed">
          Both <strong>Work from Home (WFH)</strong> and <strong>Leaves</strong> are fully subtracted from the working-day denominator. You are only required to maintain 7 hours on days you are physically at the office.
        </p>
      </div>

      {/* Recovery Planner (if short) */}
      {metrics && !metrics.isOnTrack && metrics.effectiveRemainingWorkingDays > 0 && (
        <div className="glass-panel border border-white/10 rounded-3xl p-5 space-y-3 shadow-glass backdrop-blur-2xl">
          <div className="flex items-center space-x-2 text-indigo-400">
            <TrendingUp className="w-4 h-4" />
            <h3 className="font-heading font-bold text-white text-sm">Target Recovery Plan</h3>
          </div>

          {metrics.isRecoverable ? (
            <div className="p-4 glass-pill border border-indigo-500/30 rounded-2xl text-indigo-300 space-y-1">
              <p className="font-semibold text-xs flex items-center space-x-1.5 text-white">
                <ArrowUpRight className="w-4 h-4 text-indigo-400" />
                <span>
                  Aim for <strong className="text-indigo-300">{metrics.requiredDailyRate}h / day</strong> (+{metrics.extraPerRemainingDay}h extra)
                </span>
              </p>
              <p className="text-[11px] text-slate-300">
                Over your remaining {metrics.effectiveRemainingWorkingDays} office working days to achieve a 7.00h average.
              </p>
            </div>
          ) : (
            <div className="p-4 glass-pill border border-rose-500/30 rounded-2xl text-rose-300 space-y-1">
              <p className="font-semibold text-xs flex items-center space-x-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Target mathematically unrecoverable this month</span>
              </p>
              <p className="text-[11px] text-slate-300">
                Required rate would exceed 11h/day. Review and adjust any past missed check-outs via the History tab.
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
            <h3 className="font-heading font-bold text-slate-100 text-sm">Daily Hours Chart</h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Dashed line = 7h Target</span>
        </div>

        <div className="relative pt-6 pb-2">
          {/* Target guideline */}
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
                  onMouseLeave={() => setHoveredBar(null)}
                  className="flex flex-col items-center flex-1 min-w-[10px] h-full justify-end group cursor-pointer"
                >
                  <div
                    style={{ height: `${isLeave ? 25 : isWFH ? 15 : (d.isWorkingDay ? Math.max(6, heightPercent) : 4)}%` }}
                    className={`w-full rounded-t-md transition-all duration-300 ${
                      isLeave
                        ? 'bg-amber-500/80 group-hover:bg-amber-400'
                        : isWFH
                        ? 'bg-sky-500/80 group-hover:bg-sky-400'
                        : !d.isWorkingDay
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
                <span className="text-sky-400 font-semibold">🏠 WFH (0h counted)</span>
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
    </div>
  );
}
