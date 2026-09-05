import React from 'react';
import { X, Smartphone, Share, PlusSquare, MoreVertical, Sparkles, Zap, CheckCircle2 } from 'lucide-react';

export default function WidgetGuideModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md glass-panel-elevated rounded-3xl p-6 text-slate-100 border border-white/20 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-base text-white">
                Add Home Screen Widget
              </h3>
              <p className="text-[11px] text-slate-400">
                1-tap access right from your phone launcher
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-4 text-xs">
          {/* App Icon & Feature Highlight */}
          <div className="flex items-center space-x-3.5 p-3 rounded-2xl glass-pill border border-white/10">
            <img
              src="/icons/icon-192.png"
              alt="Floor Adherence Icon"
              className="w-12 h-12 rounded-2xl shadow-lg shadow-indigo-500/30 border border-white/20 flex-shrink-0"
            />
            <div>
              <h4 className="font-heading font-bold text-white text-xs">Floor Adherence Phone Icon</h4>
              <p className="text-[11px] text-slate-300">
                PWA Launcher Icon with built-in instant quick actions.
              </p>
            </div>
          </div>

          {/* Quick Shortcuts Feature */}
          <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 space-y-1.5">
            <div className="flex items-center space-x-2 font-semibold text-white">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Phone Home Screen Widget & Shortcuts</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Once added to your phone home screen, <strong>long-press (Haptic/3D Touch) the app icon</strong> to reveal instant home screen shortcut actions for <strong>Check In</strong>, <strong>Break</strong>, <strong>WFH</strong>, and <strong>Leave</strong> without opening browser tabs!
            </p>
          </div>

          {/* Platform Specific Steps */}
          {isIOS ? (
            <div className="space-y-2.5">
              <p className="font-semibold text-white flex items-center space-x-1.5">
                <Smartphone className="w-4 h-4 text-indigo-400" />
                <span>On iPhone & iPad (Safari):</span>
              </p>
              <div className="space-y-2">
                <div className="flex items-start space-x-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <Share className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-300">
                    1. Tap the <strong>Share</strong> button in Safari's bottom toolbar.
                  </p>
                </div>
                <div className="flex items-start space-x-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <PlusSquare className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-300">
                    2. Scroll down and tap <strong>"Add to Home Screen"</strong>.
                  </p>
                </div>
                <div className="flex items-start space-x-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <CheckCircle2 className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-300">
                    3. Long-press the icon on your home screen to trigger instant quick actions, or add an iOS <strong>Shortcuts Widget</strong> pointing to <code>https://catchabit-time.pages.dev/?action=checkin</code>!
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <p className="font-semibold text-white flex items-center space-x-1.5">
                <Smartphone className="w-4 h-4 text-indigo-400" />
                <span>On Android (Chrome):</span>
              </p>
              <div className="space-y-2">
                <div className="flex items-start space-x-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <MoreVertical className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-300">
                    1. Tap the <strong>three dots (⋮)</strong> menu in Chrome.
                  </p>
                </div>
                <div className="flex items-start space-x-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <PlusSquare className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-300">
                    2. Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                  </p>
                </div>
                <div className="flex items-start space-x-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <CheckCircle2 className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-300">
                    3. Long press the home screen icon to reveal shortcuts. You can even drag any shortcut directly onto your home screen as an independent 1-tap widget!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <button
          onClick={onClose}
          className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-500 active-scale text-white font-semibold rounded-2xl transition-all shadow-lg shadow-indigo-600/30 text-xs"
        >
          Got It
        </button>
      </div>
    </div>
  );
}
