import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Preferences } from '@capacitor/preferences';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

const AttendanceContext = createContext(null);

export function AttendanceProvider({ children }) {
  const { user } = useAuth();
  const [todayData, setTodayData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [liveFloorSeconds, setLiveFloorSeconds] = useState(0);
  const [liveBreakSeconds, setLiveBreakSeconds] = useState(0);

  const fetchToday = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await api.request('/api/attendance/today');
      setTodayData(res);
      if (res?.stats) {
        setLiveFloorSeconds(res.stats.floorSeconds || 0);
        setLiveBreakSeconds(res.stats.breakSeconds || 0);

        // Sync to Preferences for Android Widget
        const floorH = ((res.stats.floorSeconds || 0) / 3600).toFixed(2);
        const wMode = res.workMode || 'office';
        const st = res.isLeave ? 'leave' : (wMode === 'wfh' ? 'wfh' : (res.session?.status || 'not_checked_in'));
        Preferences.set({ key: 'today_status', value: st }).catch(() => {});
        Preferences.set({ key: 'today_floor_hours', value: floorH }).catch(() => {});
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchToday();
  }, [fetchToday]);

  // Live timer tick when active or on_break and NOT on leave or WFH
  useEffect(() => {
    if (!todayData?.session) return;
    const session = todayData.session;

    if (todayData.isLeave || session.status === 'leave' || session.status === 'completed' || session.work_mode === 'wfh') {
      if (todayData.stats) {
        setLiveFloorSeconds(session.work_mode === 'wfh' || todayData.isLeave ? 0 : todayData.stats.floorSeconds);
        setLiveBreakSeconds(todayData.stats.breakSeconds);
      }
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const inMs = new Date(session.check_in_time).getTime();
      const grossSec = Math.max(0, Math.floor((now - inMs) / 1000));

      let breakMs = 0;
      for (const b of (todayData.breaks || [])) {
        const bStart = new Date(b.break_start).getTime();
        const bEnd = b.break_end ? new Date(b.break_end).getTime() : now;
        breakMs += Math.max(0, bEnd - bStart);
      }

      const totalBreakSec = Math.floor(breakMs / 1000);
      const netFloorSec = Math.max(0, grossSec - totalBreakSec);

      setLiveFloorSeconds(netFloorSec);
      setLiveBreakSeconds(totalBreakSec);
    }, 1000);

    return () => clearInterval(interval);
  }, [todayData]);

  const checkIn = async (mode = 'office') => {
    setActionLoading(true);
    setError(null);
    try {
      await api.request('/api/attendance/check-in', {
        method: 'POST',
        body: JSON.stringify({ work_mode: mode }),
      });
      await fetchToday();
    } catch (err) {
      setError(err.message || 'Check-in failed');
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const checkOut = async () => {
    setActionLoading(true);
    setError(null);
    try {
      await api.request('/api/attendance/check-out', { method: 'POST' });
      await fetchToday();
    } catch (err) {
      setError(err.message || 'Check-out failed');
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const startBreak = async () => {
    setActionLoading(true);
    setError(null);
    try {
      await api.request('/api/attendance/break/start', { method: 'POST' });
      await fetchToday();
    } catch (err) {
      setError(err.message || 'Start break failed');
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const resumeBreak = async () => {
    setActionLoading(true);
    setError(null);
    try {
      await api.request('/api/attendance/break/resume', { method: 'POST' });
      await fetchToday();
    } catch (err) {
      setError(err.message || 'Resume break failed');
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const markLeave = async (reason = 'Personal Leave', date = null) => {
    setActionLoading(true);
    setError(null);
    try {
      await api.request('/api/attendance/mark-leave', {
        method: 'POST',
        body: JSON.stringify({ reason, date }),
      });
      await fetchToday();
    } catch (err) {
      setError(err.message || 'Failed to mark leave');
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const unmarkLeave = async (date = null) => {
    setActionLoading(true);
    setError(null);
    try {
      await api.request('/api/attendance/mark-leave', {
        method: 'POST',
        body: JSON.stringify({ action: 'unmark', date }),
      });
      await fetchToday();
    } catch (err) {
      setError(err.message || 'Failed to remove leave');
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const markWFH = async (date = null) => {
    setActionLoading(true);
    setError(null);
    try {
      await api.request('/api/attendance/mark-wfh', {
        method: 'POST',
        body: JSON.stringify({ date }),
      });
      await fetchToday();
    } catch (err) {
      setError(err.message || 'Failed to mark WFH');
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const unmarkWFH = async (date = null) => {
    setActionLoading(true);
    setError(null);
    try {
      await api.request('/api/attendance/mark-wfh', {
        method: 'POST',
        body: JSON.stringify({ action: 'unmark', date }),
      });
      await fetchToday();
    } catch (err) {
      setError(err.message || 'Failed to remove WFH');
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const directEdit = async (fieldChanged, breakId, newValue, reason) => {
    if (!todayData?.session?.id) throw new Error('No session to edit');
    setActionLoading(true);
    setError(null);
    try {
      await api.request('/api/attendance/direct-edit', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: todayData.session.id,
          fieldChanged,
          breakId,
          newValue,
          reason,
        }),
      });
      await fetchToday();
    } catch (err) {
      setError(err.message || 'Edit failed');
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AttendanceContext.Provider
      value={{
        todayData,
        loading,
        actionLoading,
        error,
        liveFloorSeconds,
        liveBreakSeconds,
        isLeave: todayData?.isLeave || false,
        isWFH: todayData?.workMode === 'wfh',
        workMode: todayData?.workMode || 'office',
        leaveReason: todayData?.leaveReason || null,
        refreshToday: fetchToday,
        checkIn,
        checkOut,
        startBreak,
        resumeBreak,
        markLeave,
        unmarkLeave,
        markWFH,
        unmarkWFH,
        directEdit,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
}

export function useAttendance() {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
}
