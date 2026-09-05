import React, { useState, useEffect } from 'react';
import { Clock, Smartphone, Download, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Header({ onOpenInstallModal, onOpenWidgetModal }) {
  const { user, logout } = useAuth();
  const [istTimeStr, setIstTimeStr] = useState('');
  const [istDateStr, setIstDateStr] = useState('');

  const isNative = typeof window !== 'undefined' && (
    window.Capacitor?.isNativePlatform?.() ||
    window.location.origin.includes('localhost') ||
    window.matchMedia('(display-mode: standalone)').matches
  );

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
    <header
      className="sticky top-0 z-30 bg-slate-950/85 backdrop-blur-2xl border-b border-white/10 px-4 pb-3 shadow-glass"
      style={{
        paddingTop: isNative
          ? 'max(env(safe-area-inset-top, 0px), 42px)'
          : 'max(env(safe-area-inset-top, 0px), 12px)'
      }}
    >
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Brand & IST Clock */}
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20 shrink-0">
            <Clock className="w-4.5 h-4.5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-heading font-bold text-sm tracking-tight text-white">Floor Adherence</span>
              <span className="text-[9px] uppercase font-extrabold tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                IST
              </span>
            </div>
            <div className="flex items-center space-x-1 text-[11px] text-slate-400 font-mono tabular-nums">
              <span className="text-slate-200 font-semibold">{istTimeStr}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">{istDateStr}</span>
            </div>
          </div>
        </div>

        {/* Actions & Profile */}
        <div className="flex items-center space-x-1.5 shrink-0">
          {/* Only show install / shortcut guide in web browser, not inside the native APK */}
          {!isNative && (
            <>
              <button
                onClick={onOpenWidgetModal}
                className="p-2 rounded-xl glass-pill text-indigo-300 hover:text-white hover:bg-white/10 active-scale transition-colors"
                title="Add Home Screen Widget / Shortcut"
              >
                <Smartphone className="w-4 h-4" />
              </button>

              <button
                onClick={onOpenInstallModal}
                className="p-2 rounded-xl glass-pill text-slate-300 hover:text-white hover:bg-white/10 active-scale transition-colors"
                title="Install App"
              >
                <Download className="w-4 h-4" />
              </button>
            </>
          )}

          {/* User Badge */}
          <div className="flex items-center space-x-1.5 glass-pill rounded-full pl-1 pr-2.5 py-1 text-slate-200 border border-white/10">
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="text-xs font-semibold max-w-[85px] truncate">
              {user?.name?.split(' ')[0] || 'User'}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 active-scale transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
