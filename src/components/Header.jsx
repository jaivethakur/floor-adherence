import React, { useState, useEffect } from 'react';
import { Clock, Download, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Header({ onOpenInstallModal }) {
  const { user, logout } = useAuth();
  const [istTimeStr, setIstTimeStr] = useState('');
  const [istDateStr, setIstDateStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const istDate = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
      
      const minutes = String(istDate.getUTCMinutes()).padStart(2, '0');
      const seconds = String(istDate.getUTCSeconds()).padStart(2, '0');
      const ampm = istDate.getUTCHours() >= 12 ? 'PM' : 'AM';
      const formatted12h = `${istDate.getUTCHours() % 12 || 12}:${minutes}:${seconds} ${ampm}`;
      
      const options = { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' };
      setIstDateStr(istDate.toLocaleDateString('en-US', options));
      setIstTimeStr(formatted12h);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Brand & IST Clock */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-heading font-bold text-sm tracking-tight text-white">Floor Adherence</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                IST
              </span>
            </div>
            <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-mono tabular-nums">
              <span>{istTimeStr}</span>
              <span className="text-slate-600">•</span>
              <span className="text-[11px] text-slate-400">{istDateStr}</span>
            </div>
          </div>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center space-x-2">
          {/* PWA Install Trigger */}
          <button
            onClick={onOpenInstallModal}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-indigo-400 hover:text-indigo-300 hover:bg-slate-800 active-scale transition-colors"
            title="Install App to Home Screen"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* User Badge */}
          <div className="flex items-center space-x-1.5 bg-slate-900/90 border border-slate-800 rounded-full px-2.5 py-1">
            <User className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs font-medium text-slate-200 max-w-[90px] truncate">
              {user?.name?.split(' ')[0] || 'User'}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 active-scale transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
