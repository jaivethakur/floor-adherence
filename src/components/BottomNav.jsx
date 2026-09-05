import React from 'react';
import { Clock, Calendar, BarChart3, Sliders } from 'lucide-react';

export default function BottomNav({ activeTab, onChangeTab }) {
  const tabs = [
    { id: 'today', label: 'Today', icon: Clock },
    { id: 'history', label: 'History', icon: Calendar },
    { id: 'summary', label: 'Summary', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Sliders },
  ];

  return (
    <nav className="fixed bottom-3 left-4 right-4 max-w-md mx-auto z-40 glass-dock rounded-3xl p-1.5 border border-white/15 shadow-glass backdrop-blur-2xl">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex flex-col items-center justify-center flex-1 h-full py-1 rounded-2xl active-scale transition-all ${
                isActive
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-4 h-4 transition-all duration-300 ${
                    isActive
                      ? 'scale-110 text-indigo-400 stroke-[2.5]'
                      : 'stroke-2 text-slate-400'
                  }`}
                />
              </div>
              <span
                className={`text-[10px] mt-0.5 font-heading tracking-tight transition-all duration-200 ${
                  isActive ? 'text-white font-bold' : 'text-slate-400 font-medium'
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-3 h-0.5 bg-indigo-400 rounded-full shadow-[0_0_8px_rgba(129,140,248,1)]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
