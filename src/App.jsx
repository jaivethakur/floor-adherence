import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AttendanceProvider } from './context/AttendanceContext';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import InstallPromptModal from './components/InstallPromptModal';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import HistoryScreen from './screens/HistoryScreen';
import SummaryScreen from './screens/SummaryScreen';
import SettingsScreen from './screens/SettingsScreen';

import WidgetGuideModal from './components/WidgetGuideModal';

function MainLayout() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('today');
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showWidgetModal, setShowWidgetModal] = useState(false);

  if (loading) {
    return (
      <div className="h-full min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-400 space-y-3">
        <div className="w-12 h-12 rounded-2xl glass-panel border border-indigo-500/30 flex items-center justify-center animate-pulse">
          <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        </div>
        <p className="text-xs font-heading font-medium tracking-wide">Loading Floor Adherence...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <AttendanceProvider>
      <div className="min-h-screen relative flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white pb-24 overflow-x-hidden">
        {/* Ambient Glowing Mesh Background Orbs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute w-96 h-96 -top-20 -left-20 rounded-full bg-indigo-600/20 blur-[100px] animate-float-slow" />
          <div className="absolute w-[28rem] h-[28rem] top-1/3 -right-28 rounded-full bg-violet-600/15 blur-[120px] animate-float-delayed" />
          <div className="absolute w-80 h-80 bottom-10 left-10 rounded-full bg-sky-600/15 blur-[90px] animate-pulse-glow" />
        </div>

        {/* App Header */}
        <div className="relative z-30">
          <Header
            onOpenInstallModal={() => setShowInstallModal(true)}
            onOpenWidgetModal={() => setShowWidgetModal(true)}
          />
        </div>

        {/* Main Content View */}
        <main className="relative flex-1 w-full max-w-md mx-auto px-4 pt-4">
          {activeTab === 'today' && (
            <HomeScreen
              onNavigateHistory={() => setActiveTab('history')}
              onOpenWidgetGuide={() => setShowWidgetModal(true)}
            />
          )}
          {activeTab === 'history' && <HistoryScreen />}
          {activeTab === 'summary' && <SummaryScreen />}
          {activeTab === 'settings' && <SettingsScreen />}
        </main>

        {/* Mobile Floating Glass Dock Bottom Navigation */}
        <div className="relative z-40">
          <BottomNav
            activeTab={activeTab}
            onChangeTab={setActiveTab}
          />
        </div>

        {/* PWA Install Sheet */}
        <InstallPromptModal
          isOpen={showInstallModal}
          onClose={() => setShowInstallModal(false)}
        />

        {/* Home Screen Widget / Shortcut Guide */}
        <WidgetGuideModal
          isOpen={showWidgetModal}
          onClose={() => setShowWidgetModal(false)}
        />
      </div>
    </AttendanceProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
