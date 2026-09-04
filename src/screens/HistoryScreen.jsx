import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Building2,
  Home,
  Palmtree
} from 'lucide-react';
import { api } from '../services/api';
import DayDetailModal from '../components/DayDetailModal';

export default function HistoryScreen() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [monthData, setMonthData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    loadMonth();
  }, [year, month]);

  const loadMonth = async () => {
    try {
      setLoading(true);
      const url = `/api/attendance/month?year=${year}&month=${month}`;
      const res = await api.request(url);
      setMonthData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    if (month === 1) {
      setYear(y => y - 1);
      setMonth(12);
    } else {
      setMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setYear(y => y + 1);
      setMonth(1);
    } else {
      setMonth(m => m + 1);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDayStatusStyle = (day) => {
    if (day.statusType === 'leave') {
      return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
    }
    if (day.statusType === 'wfh' || day.workMode === 'wfh') {
      return 'bg-sky-500/10 text-sky-300 border-sky-500/30';
    }
    if (!day.isWorkingDay) {
      return 'bg-slate-900/40 text-slate-600 border-slate-800/40';
    }
    if (day.statusType === 'met') {
      return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
    }
    if (day.statusType === 'warning') {
      return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
    }
    if (day.statusType === 'short' || day.statusType === 'absent') {
      return 'bg-rose-500/10 text-rose-300 border-rose-500/30';
    }
    if (day.statusType === 'in_progress') {
      return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30 ring-1 ring-indigo-500/50';
    }
    return 'bg-slate-800/30 text-slate-400 border-slate-800';
  };

  const firstDayOfMonth = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const emptyDaysLeading = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  return (
    <div className="space-y-4 animate-fade-in pb-12 text-xs">
      {/* Month Picker Header */}
      <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3">
        <button
          onClick={handlePrevMonth}
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 active-scale transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="text-center">
          <h2 className="font-heading font-bold text-base text-white">
            {monthNames[month - 1]} {year}
          </h2>
          <p className="text-[11px] text-slate-400">Monthly Calendar & History</p>
        </div>

        <button
          onClick={handleNextMonth}
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 active-scale transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Month Overview Stats */}
      {monthData?.metrics && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-3 bg-slate-900/60 border border-slate-800/60 rounded-2xl">
            <span className="text-slate-400 text-[10px] block">Monthly Avg</span>
            <span className={`font-heading font-extrabold text-lg tabular-nums ${
              monthData.metrics.monthlyAverage >= 7 ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {monthData.metrics.monthlyAverage}h
            </span>
            <span className="text-[10px] text-slate-500 block">per work day</span>
          </div>

          <div className="p-3 bg-slate-900/60 border border-slate-800/60 rounded-2xl">
            <span className="text-slate-400 text-[10px] block">Total Worked</span>
            <span className="font-heading font-extrabold text-lg text-white tabular-nums">
              {monthData.metrics.totalFloorHours}h
            </span>
            <span className="text-[10px] text-slate-500 block">
              {monthData.metrics.effectiveWorkingDaysElapsed} working days
            </span>
          </div>

          <div className="p-3 bg-slate-900/60 border border-slate-800/60 rounded-2xl">
            <span className="text-slate-400 text-[10px] block">Leaves Taken</span>
            <span className="font-heading font-extrabold text-lg text-amber-400 tabular-nums">
              {monthData.metrics.totalLeaveDays || 0}
            </span>
            <span className="text-[10px] text-slate-500 block">excluded from quota</span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-between px-2 text-[10px] text-slate-400">
        <div className="flex items-center space-x-1">
          <span className="w-2.5 h-2.5 rounded bg-emerald-500/20 border border-emerald-500/50" />
          <span>7h+ Met</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-2.5 h-2.5 rounded bg-amber-500/20 border border-amber-500/50" />
          <span>Close</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-2.5 h-2.5 rounded bg-rose-500/20 border border-rose-500/50" />
          <span>Short</span>
        </div>
        <div className="flex items-center space-x-1 text-amber-400">
          <Palmtree className="w-3 h-3" />
          <span>Leave</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-4">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400 pb-2 mb-2 border-b border-slate-800/60">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Days cells */}
        <div className="grid grid-cols-7 gap-1.5">
          {emptyDaysLeading.map(idx => (
            <div key={`lead-${idx}`} className="h-14 rounded-xl opacity-0" />
          ))}

          {monthData?.days?.map((day) => (
            <button
              key={day.date}
              onClick={() => setSelectedDay(day)}
              className={`h-14 p-1 rounded-xl border flex flex-col items-center justify-between text-left active-scale transition-all ${getDayStatusStyle(
                day
              )} ${day.isToday ? 'ring-2 ring-indigo-500' : ''}`}
            >
              <div className="w-full flex items-center justify-between text-[11px]">
                <span className={`font-semibold ${day.isToday ? 'text-indigo-400 font-bold' : ''}`}>
                  {day.day}
                </span>
                {day.statusType === 'leave' ? (
                  <Palmtree className="w-3 h-3 text-amber-400" />
                ) : day.workMode === 'wfh' ? (
                  <Home className="w-3 h-3 text-sky-400" />
                ) : day.session ? (
                  <Building2 className="w-3 h-3 text-current opacity-70" />
                ) : null}
              </div>

              <div className="w-full text-center">
                {day.statusType === 'leave' ? (
                  <span className="text-[9px] text-amber-400 font-bold block">Leave</span>
                ) : day.statusType === 'wfh' || day.workMode === 'wfh' ? (
                  <span className="text-[9px] text-sky-400 font-bold block">WFH</span>
                ) : day.isWorkingDay ? (
                  <span className="text-[10px] font-mono font-bold block tabular-nums">
                    {day.floorHours > 0 ? `${day.floorHours}h` : day.isFuture ? '-' : '0h'}
                  </span>
                ) : (
                  <span className="text-[9px] text-slate-500 block">Off</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Day Inspector */}
      {selectedDay && (
        <DayDetailModal
          isOpen={Boolean(selectedDay)}
          onClose={() => setSelectedDay(null)}
          dayData={selectedDay}
          onRefresh={loadMonth}
        />
      )}
    </div>
  );
}
