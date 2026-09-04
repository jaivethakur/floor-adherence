import React, { useState, useEffect } from 'react';
import { Users, RotateCw, Coffee, Clock, AlertTriangle, CheckCircle2, ChevronRight, Search } from 'lucide-react';
import { api } from '../services/api';
import DayDetailModal from '../components/DayDetailModal';

export default function AdminTeamScreen() {
  const [teamData, setTeamData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'active' | 'on_break' | 'completed' | 'not_checked_in'
  const [search, setSearch] = useState('');
  const [selectedSessionDay, setSelectedSessionDay] = useState(null);

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

  const filteredTeam = team.filter((member) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && member.status === 'active') ||
      (filter === 'on_break' && member.status === 'on_break') ||
      (filter === 'completed' && (member.status === 'checked_out' || member.status === 'auto_checked_out')) ||
      (filter === 'not_checked_in' && member.status === 'not_checked_in');

    const matchesSearch =
      member.user.name.toLowerCase().includes(search.toLowerCase()) ||
      member.user.email.toLowerCase().includes(search.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const handleMemberClick = (member) => {
    if (member.session) {
      setSelectedSessionDay({
        date: teamData.todayIST,
        dayOfWeek: 'Today',
        isWorkingDay: true,
        floorHours: member.stats.floorHours,
        session: member.session,
      });
    }
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12 text-xs">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-extrabold text-xl text-white">Team Today</h2>
          <p className="text-slate-400">Live Office Floor Presence</p>
        </div>
        <button
          onClick={loadTeam}
          disabled={loading}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white active-scale transition-colors"
        >
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
        </button>
      </div>

      {/* Live Presence Metric Summary */}
      <div className="grid grid-cols-4 gap-1.5 text-center">
        <div className="p-2.5 bg-slate-900/80 border border-slate-800/80 rounded-2xl">
          <span className="text-[10px] text-emerald-400 block font-semibold">On Floor</span>
          <span className="font-heading font-extrabold text-lg text-white tabular-nums">
            {summary.activeOnFloor || 0}
          </span>
        </div>
        <div className="p-2.5 bg-slate-900/80 border border-slate-800/80 rounded-2xl">
          <span className="text-[10px] text-amber-400 block font-semibold">Break</span>
          <span className="font-heading font-extrabold text-lg text-white tabular-nums">
            {summary.onBreak || 0}
          </span>
        </div>
        <div className="p-2.5 bg-slate-900/80 border border-slate-800/80 rounded-2xl">
          <span className="text-[10px] text-indigo-400 block font-semibold">Completed</span>
          <span className="font-heading font-extrabold text-lg text-white tabular-nums">
            {summary.checkedOut || 0}
          </span>
        </div>
        <div className="p-2.5 bg-slate-900/80 border border-slate-800/80 rounded-2xl">
          <span className="text-[10px] text-slate-400 block font-semibold">Not In</span>
          <span className="font-heading font-extrabold text-lg text-slate-300 tabular-nums">
            {summary.notInYet || 0}
          </span>
        </div>
      </div>

      {/* Search & Filter Chips */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search employee by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: 'All' },
            { id: 'active', label: 'On Floor' },
            { id: 'on_break', label: 'On Break' },
            { id: 'completed', label: 'Checked Out' },
            { id: 'not_checked_in', label: 'Not Checked In' },
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

      {/* Employee List */}
      <div className="space-y-2">
        {filteredTeam.map((m) => (
          <div
            key={m.user.id}
            onClick={() => handleMemberClick(m)}
            className={`p-3.5 bg-slate-900/80 border rounded-2xl flex items-center justify-between active-scale transition-all ${
              m.session ? 'cursor-pointer hover:border-indigo-500/50' : ''
            } ${
              m.status === 'active'
                ? 'border-emerald-500/30'
                : m.status === 'on_break'
                ? 'border-amber-500/30'
                : m.status === 'auto_checked_out'
                ? 'border-rose-500/30'
                : 'border-slate-800/80'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold font-heading text-sm ${
                  m.status === 'active'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : m.status === 'on_break'
                    ? 'bg-amber-500/20 text-amber-400'
                    : m.status === 'auto_checked_out'
                    ? 'bg-rose-500/20 text-rose-400'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {m.user.name.charAt(0)}
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-slate-100">{m.user.name}</span>
                  {m.user.role === 'admin' && (
                    <span className="text-[9px] uppercase px-1 rounded bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">
                      Admin
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2 text-[11px] mt-0.5">
                  {m.status === 'active' && (
                    <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      <span>On Floor</span>
                    </span>
                  )}
                  {m.status === 'on_break' && (
                    <span className="text-amber-400 font-semibold flex items-center space-x-1">
                      <Coffee className="w-3 h-3" />
                      <span>On Break</span>
                    </span>
                  )}
                  {m.status === 'checked_out' && (
                    <span className="text-indigo-300 font-medium">Checked Out</span>
                  )}
                  {m.status === 'auto_checked_out' && (
                    <span className="text-rose-400 font-medium flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Auto Checked Out</span>
                    </span>
                  )}
                  {m.status === 'not_checked_in' && (
                    <span className="text-slate-500">Not Checked In</span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Floor Hours */}
            <div className="flex items-center space-x-2">
              <div className="text-right">
                <span className="font-heading font-extrabold text-sm text-white font-mono tabular-nums block">
                  {m.stats?.floorHours || 0}h
                </span>
                <span className="text-[10px] text-slate-500">/ 7h target</span>
              </div>
              {m.session && <ChevronRight className="w-4 h-4 text-slate-600" />}
            </div>
          </div>
        ))}
      </div>

      {/* Selected Day Inspector */}
      {selectedSessionDay && (
        <DayDetailModal
          isOpen={Boolean(selectedSessionDay)}
          onClose={() => setSelectedSessionDay(null)}
          dayData={selectedSessionDay}
          onRefresh={loadTeam}
        />
      )}
    </div>
  );
}
