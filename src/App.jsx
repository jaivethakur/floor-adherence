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

function MainLayout() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('today');
  const [showInstallModal, setShowInstallModal] = useState(false);

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400 space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center animate-pulse">
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
      <div className="min-h-full flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white pb-20">
        {/* App Header */}
        <Header onOpenInstallModal={() => setShowInstallModal(true)} />

        {/* Main Content View */}
        <main className="flex-1 w-full max-w-md mx-auto px-4 pt-4">
          {activeTab === 'today' && (
            <HomeScreen onNavigateHistory={() => setActiveTab('history')} />
          )}
          {activeTab === 'history' && <HistoryScreen />}
          {activeTab === 'summary' && <SummaryScreen />}
          {activeTab === 'settings' && <SettingsScreen />}
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav
          activeTab={activeTab}
          onChangeTab={setActiveTab}
        />

        {/* PWA Install Sheet */}
        <InstallPromptModal
          isOpen={showInstallModal}
          onClose={() => setShowInstallModal(false)}
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
