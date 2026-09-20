import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Preferences } from '@capacitor/preferences';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

const AttendanceContext = createContext(null);

export function AttendanceProvider({ children }) {
  const { user } = useAuth();
  const [todayData, setTodayData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [liveFloorSeconds, setLiveFloorSeconds] = useState(0);
  const [liveBreakSeconds, setLiveBreakSeconds] = useState(0);

  // Guard against concurrent fetches and fetches during actions
  const isFetchingRef = useRef(false);
  const actionInFlightRef = useRef(false);

  const syncToPreferences = useCallback(async (res) => {
    if (!res?.stats) return;
    const floorSec = res.stats.floorSeconds || 0;
    const breakSec = res.stats.breakSeconds || 0;
    const targetSec = res.stats.targetSeconds ?? (res.isExempted ? 0 : 7 * 3600);
    const floorH = (floorSec / 3600).toFixed(2);
    const breakH = (breakSec / 3600).toFixed(2);
    const targetH = (targetSec / 3600).toFixed(1);
    const shortfallH = Math.max(0, (targetSec - floorSec) / 3600).toFixed(2);
    const wMode = res.workMode || 'office';
    const st = res.isLeave ? 'leave' : (wMode === 'wfh' ? 'wfh' : (res.isWeekend && !res.session ? 'weekend' : (res.session?.status || 'not_checked_in')));

    Preferences.set({ key: 'today_status', value: st }).catch(() => {});
    Preferences.set({ key: 'today_floor_hours', value: floorH }).catch(() => {});
    Preferences.set({ key: 'today_floor_seconds', value: String(floorSec) }).catch(() => {});
    Preferences.set({ key: 'today_break_hours', value: breakH }).catch(() => {});
    Preferences.set({ key: 'today_target_hours', value: targetH }).catch(() => {});
    Preferences.set({ key: 'today_shortfall_hours', value: shortfallH }).catch(() => {});
    if (user?.name) {
      Preferences.set({ key: 'user_name', value: user.name }).catch(() => {});
    }
  }, [user]);

  const fetchToday = useCallback(async (isBackground = false) => {
    if (!user) return;
    // Skip background polls when an action is in-flight to avoid race conditions
    if (isBackground && actionInFlightRef.current) return;
    // Skip if already fetching
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    try {
      if (isBackground) {
        setBackgroundRefreshing(true);
      } else {
        setLoading(true);
      }
      const res = await api.request('/api/attendance/today');
      setTodayData(res);
      if (res?.stats) {
        setLiveFloorSeconds(res.stats.floorSeconds || 0);
        setLiveBreakSeconds(res.stats.breakSeconds || 0);
        await syncToPreferences(res);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      isFetchingRef.current = false;
      if (isBackground) {
        setBackgroundRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [user, syncToPreferences]);

  // Public refresh (always shows loading spinner)
  const refreshToday = useCallback(() => fetchToday(false), [fetchToday]);

  // Initial fetch
  useEffect(() => {
    fetchToday(false);
  }, [fetchToday]);

  // Auto-sync: listen to window focus, document visibility, and periodic 60s polling
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchToday(true);
      }
    };
    const handleFocus = () => {
      fetchToday(true);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    // 60-second background poll (reduced from 20s to prevent flicker)
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchToday(true);
      }
    }, 60000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
      clearInterval(pollInterval);
    };
  }, [fetchToday]);

  // Live timer tick when active or on_break and NOT on leave or WFH
  useEffect(() => {
    if (!todayData?.session) {
      if (todayData?.stats) {
        setLiveFloorSeconds(todayData.stats.floorSeconds || 0);
        setLiveBreakSeconds(todayData.stats.breakSeconds || 0);
      }
      return;
    }

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

  // Helper to wrap action calls — guards against concurrent background polls
  const withActionGuard = useCallback((actionFn) => {
    return async (...args) => {
      actionInFlightRef.current = true;
      setActionLoading(true);
      setError(null);
      try {
        await actionFn(...args);
        await fetchToday(false);
      } catch (err) {
        setError(err.message || 'Action failed');
        await fetchToday(false);
        throw err;
      } finally {
        actionInFlightRef.current = false;
        setActionLoading(false);
      }
    };
  }, [fetchToday]);

  // Optimistic Check-In
  const checkIn = useCallback(withActionGuard(async (mode = 'office') => {
    const nowIso = new Date().toISOString();
    setTodayData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        workMode: mode,
        isLeave: false,
        isWFH: mode === 'wfh',
        session: {
          id: prev.session?.id || ('optimistic_' + Date.now()),
          work_date: prev.workDate,
          work_mode: mode,
          check_in_time: nowIso,
          check_out_time: null,
          status: 'active',
        },
      };
    });
    await api.request('/api/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify({ work_mode: mode }),
    });
  }), [withActionGuard]);

  // Optimistic Check-Out
  const checkOut = useCallback(withActionGuard(async () => {
    const nowIso = new Date().toISOString();
    setTodayData(prev => {
      if (!prev?.session) return prev;
      return {
        ...prev,
        session: { ...prev.session, status: 'completed', check_out_time: nowIso },
      };
    });
    await api.request('/api/attendance/check-out', { method: 'POST' });
  }), [withActionGuard]);

  // Optimistic Start Break
  const startBreak = useCallback(withActionGuard(async () => {
    const nowIso = new Date().toISOString();
    setTodayData(prev => {
      if (!prev?.session) return prev;
      const newBreaks = [...(prev.breaks || []), { id: 'temp_' + Date.now(), break_start: nowIso, break_end: null }];
      return {
        ...prev,
        breaks: newBreaks,
        session: { ...prev.session, status: 'on_break' },
      };
    });
    await api.request('/api/attendance/break/start', { method: 'POST' });
  }), [withActionGuard]);

  // Optimistic Resume Break
  const resumeBreak = useCallback(withActionGuard(async () => {
    const nowIso = new Date().toISOString();
    setTodayData(prev => {
      if (!prev?.session) return prev;
      const newBreaks = (prev.breaks || []).map(b => (!b.break_end ? { ...b, break_end: nowIso } : b));
      return {
        ...prev,
        breaks: newBreaks,
        session: { ...prev.session, status: 'active' },
      };
    });
    await api.request('/api/attendance/break/resume', { method: 'POST' });
  }), [withActionGuard]);

  const markLeave = useCallback(withActionGuard(async (reason = 'Personal Leave', date = null) => {
    await api.request('/api/attendance/mark-leave', {
      method: 'POST',
      body: JSON.stringify({ reason, date }),
    });
  }), [withActionGuard]);

  const unmarkLeave = useCallback(withActionGuard(async (date = null) => {
    await api.request('/api/attendance/mark-leave', {
      method: 'POST',
      body: JSON.stringify({ action: 'unmark', date }),
    });
  }), [withActionGuard]);

  const markWFH = useCallback(withActionGuard(async (date = null) => {
    await api.request('/api/attendance/mark-wfh', {
      method: 'POST',
      body: JSON.stringify({ date }),
    });
  }), [withActionGuard]);

  const unmarkWFH = useCallback(withActionGuard(async (date = null) => {
    await api.request('/api/attendance/mark-wfh', {
      method: 'POST',
      body: JSON.stringify({ action: 'unmark', date }),
    });
  }), [withActionGuard]);

  const universalEditDay = useCallback(async (editPayload) => {
    actionInFlightRef.current = true;
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.request('/api/attendance/direct-edit', {
        method: 'POST',
        body: JSON.stringify(editPayload),
      });
      await fetchToday(false);
      return res;
    } catch (err) {
      setError(err.message || 'Edit failed');
      throw err;
    } finally {
      actionInFlightRef.current = false;
      setActionLoading(false);
    }
  }, [fetchToday]);

  const directEdit = useCallback(async (fieldChanged, breakId, newValue, reason) => {
    if (!todayData?.session?.id) throw new Error('No session to edit');
    actionInFlightRef.current = true;
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
      await fetchToday(false);
    } catch (err) {
      setError(err.message || 'Edit failed');
      throw err;
    } finally {
      actionInFlightRef.current = false;
      setActionLoading(false);
    }
  }, [fetchToday, todayData?.session?.id]);

  return (
    <AttendanceContext.Provider
      value={{
        todayData,
        loading,
        backgroundRefreshing,
        actionLoading,
        error,
        liveFloorSeconds,
        liveBreakSeconds,
        isLeave: todayData?.isLeave || false,
        isWFH: todayData?.workMode === 'wfh',
        isWeekend: todayData?.isWeekend || false,
        isExempted: todayData?.isExempted || false,
        workMode: todayData?.workMode || 'office',
        leaveReason: todayData?.leaveReason || null,
        refreshToday,
        checkIn,
        checkOut,
        startBreak,
        resumeBreak,
        markLeave,
        unmarkLeave,
        markWFH,
        unmarkWFH,
        universalEditDay,
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
