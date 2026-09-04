import React, { useState, useEffect } from 'react';
import { Users, RotateCw, Coffee, Building2, Home, Palmtree, Search, ChevronRight } from 'lucide-react';
import { api } from '../services/api';
import DayDetailModal from '../components/DayDetailModal';

export default function TeamScreen() {
  const [teamData, setTeamData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    loadTeam();
  }, []);

  const loadTeam = async () => {
    try {
      setLoading(true);
      const res = await api.request('/api/admin/team-today');
      setTeamData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const team = teamData?.team || [];
  const summary = teamData?.summary || {};

  const filtered = team.filter((m) => {
    const matchesSearch =
      m.user.name.toLowerCase().includes(search.toLowerCase()) ||
      m.user.email.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (filter === 'all') return true;
    if (filter === 'office') return m.status === 'active' && m.workMode === 'office';
    if (filter === 'wfh') return m.status === 'active' && m.workMode === 'wfh';
    if (filter === 'break') return m.status === 'on_break';
    if (filter === 'leave') return m.status === 'leave';
    if (filter === 'out') return m.status.includes('checked_out');
    return true;
  });

  const handleMemberClick = (m) => {
    if (m.session) {
      setSelectedDay({
        date: teamData.todayIST,
        dayOfWeek: 'Today',
        isWorkingDay: true,
        floorHours: m.stats.floorHours,
        workMode: m.workMode,
        leaveReason: m.leaveReason,
        session: m.session,
      });
    }
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12 text-xs">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-extrabold text-xl text-white">Team Presence</h2>
          <p className="text-slate-400">Who is in Office, WFH, on Break, or on Leave</p>
        </div>
        <button
          onClick={loadTeam}
          disabled={loading}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white active-scale transition-colors"
        >
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
        </button>
      </div>

      {/* Summary Chips */}
      <div className="grid grid-cols-4 gap-1.5 text-center">
        <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <span className="text-[10px] text-indigo-400 block font-semibold">🏢 Office</span>
          <span className="font-heading font-extrabold text-lg text-white tabular-nums">
            {summary.inOffice || 0}
          </span>
        </div>
        <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <span className="text-[10px] text-sky-400 block font-semibold">🏠 WFH</span>
          <span className="font-heading font-extrabold text-lg text-white tabular-nums">
            {summary.wfh || 0}
          </span>
        </div>
        <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <span className="text-[10px] text-amber-400 block font-semibold">☕ Break</span>
          <span className="font-heading font-extrabold text-lg text-white tabular-nums">
            {summary.onBreak || 0}
          </span>
        </div>
        <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <span className="text-[10px] text-amber-300 block font-semibold">🏖️ Leave</span>
          <span className="font-heading font-extrabold text-lg text-white tabular-nums">
            {summary.onLeave || 0}
          </span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search colleague by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: 'All' },
            { id: 'office', label: '🏢 In Office' },
            { id: 'wfh', label: '🏠 WFH' },
            { id: 'break', label: '☕ Break' },
            { id: 'leave', label: '🏖️ Leave' },
            { id: 'out', label: 'Checked Out' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition-all ${
                filter === tab.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Member List */}
      <div className="space-y-2">
        {filtered.map((m) => (
          <div
            key={m.user.id}
            onClick={() => handleMemberClick(m)}
            className={`p-3.5 bg-slate-900/80 border rounded-2xl flex items-center justify-between active-scale transition-all ${
              m.session ? 'cursor-pointer hover:border-indigo-500/50' : 'opacity-80'
            } ${
              m.status === 'leave'
                ? 'border-amber-500/30'
                : m.status === 'active'
                ? m.workMode === 'wfh'
                  ? 'border-sky-500/30'
                  : 'border-indigo-500/30'
                : 'border-slate-800/80'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold font-heading text-sm ${
                  m.status === 'leave'
                    ? 'bg-amber-500/20 text-amber-400'
                    : m.workMode === 'wfh'
                    ? 'bg-sky-500/20 text-sky-400'
                    : 'bg-indigo-500/20 text-indigo-400'
                }`}
              >
                {m.user.name.charAt(0)}
              </div>

              <div>
                <span className="font-semibold text-slate-100 block">{m.user.name}</span>
                <div className="flex items-center space-x-2 text-[11px] mt-0.5">
                  {m.status === 'leave' && (
                    <span className="text-amber-400 font-semibold flex items-center space-x-1">
                      <Palmtree className="w-3 h-3" />
                      <span>On Leave ({m.leaveReason || 'Personal'})</span>
                    </span>
                  )}
                  {m.status === 'active' && (
                    <span className={`font-semibold flex items-center space-x-1 ${m.workMode === 'wfh' ? 'text-sky-400' : 'text-emerald-400'}`}>
                      {m.workMode === 'wfh' ? <Home className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                      <span>{m.workMode === 'wfh' ? 'Working from Home' : 'In Office Floor'}</span>
                    </span>
                  )}
                  {m.status === 'on_break' && (
                    <span className="text-amber-400 font-semibold flex items-center space-x-1">
                      <Coffee className="w-3 h-3" />
                      <span>On Break</span>
                    </span>
                  )}
                  {m.status.includes('checked_out') && (
                    <span className="text-slate-400">Checked Out</span>
                  )}
                  {m.status === 'not_checked_in' && (
                    <span className="text-slate-500">Not Checked In</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="text-right">
                <span className="font-heading font-extrabold text-sm text-white font-mono tabular-nums block">
                  {m.status === 'leave' ? 'Leave' : `${m.stats?.floorHours || 0}h`}
                </span>
                <span className="text-[10px] text-slate-500">
                  {m.status === 'leave' ? '0h quota' : '/ 7h target'}
                </span>
              </div>
              {m.session && <ChevronRight className="w-4 h-4 text-slate-600" />}
            </div>
          </div>
        ))}
      </div>

      {selectedDay && (
        <DayDetailModal
          isOpen={Boolean(selectedDay)}
          onClose={() => setSelectedDay(null)}
          dayData={selectedDay}
          onRefresh={loadTeam}
        />
      )}
    </div>
  );
}
