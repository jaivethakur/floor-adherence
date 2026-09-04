import React, { useState, useEffect } from 'react';
import { X, Smartphone, Share2, PlusSquare, ArrowDownToLine, CheckCircle2 } from 'lucide-react';

export default function InstallPromptModal({ isOpen, onClose }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    // Check if already in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsInstalled(true);
    }

    // Capture beforeinstallprompt event (Android / Chromium)
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleNativeInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl overflow-hidden relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-slate-100 text-base">Install Mobile App</h3>
              <p className="text-xs text-slate-400">Run standalone with zero browser bars</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-5 space-y-4">
          {isInstalled ? (
            <div className="flex items-center space-x-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold">App Already Installed</p>
                <p className="text-xs text-emerald-300/80">You are already running CatchAbit Floor Hours as a standalone app.</p>
              </div>
            </div>
          ) : isIOS ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-300">To install on iPhone or iPad:</p>
              <div className="space-y-2.5">
                <div className="flex items-center space-x-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-slate-200">
                    <span>Tap the</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-700 font-semibold text-white">
                      <Share2 className="w-3.5 h-3.5 mr-1" /> Share
                    </span>
                    <span>button in Safari</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-slate-200">
                    <span>Scroll down and tap</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-700 font-semibold text-white">
                      <PlusSquare className="w-3.5 h-3.5 mr-1" /> Add to Home Screen
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <p className="text-xs text-slate-200">
                    Tap <strong className="text-white">Add</strong> in the top right corner. The app will appear on your home screen!
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                Install this app on your Android phone or computer for instant access, offline support, and a full-screen experience.
              </p>
              {deferredPrompt ? (
                <button
                  onClick={handleNativeInstall}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl active-scale shadow-lg shadow-indigo-600/30 transition-all"
                >
                  <ArrowDownToLine className="w-5 h-5" />
                  <span>Install to Home Screen</span>
                </button>
              ) : (
                <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700 text-xs text-slate-300 space-y-2">
                  <p>In Chrome: Tap the three dots (<strong>⋮</strong>) menu in the top right corner, then select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
        >
          Got It
        </button>
      </div>
    </div>
  );
}
