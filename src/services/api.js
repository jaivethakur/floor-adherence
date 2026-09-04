// API Client for CatchAbit Floor Hours Tracker with local offline/mock fallback

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function getISTNow() {
  return new Date(Date.now() + IST_OFFSET_MS);
}

export function getISTDateStr(date = new Date()) {
  const istDate = new Date(date.getTime() + IST_OFFSET_MS);
  return istDate.toISOString().split('T')[0];
}

function getInitialMockDB() {
  const today = getISTDateStr();
  
  return {
    users: [
      { id: 'usr_emp_01', name: 'Rahul Sharma', email: 'rahul@catchabit.in' },
      { id: 'usr_emp_02', name: 'Priya Patel', email: 'priya@catchabit.in' },
      { id: 'usr_emp_03', name: 'Amit Verma', email: 'amit@catchabit.in' },
      { id: 'usr_admin_01', name: 'Jaivendra Singh', email: 'admin@catchabit.in' },
    ],
    settings: {
      daily_target_hours: 7,
      auto_checkout_time: '20:00',
      work_days: 'Mon,Tue,Wed,Thu,Fri,Sat',
    },
    sessions: [
      {
        id: 'sess_rahul_today',
        user_id: 'usr_emp_01',
        work_date: today,
        work_mode: 'office',
        check_in_time: new Date(Date.now() - 4.5 * 3600 * 1000).toISOString(),
        check_out_time: null,
        status: 'active',
        is_auto_checkout: 0,
      },
      {
        id: 'sess_priya_today',
        user_id: 'usr_emp_02',
        work_date: today,
        work_mode: 'wfh',
        check_in_time: new Date(Date.now() - 3.5 * 3600 * 1000).toISOString(),
        check_out_time: null,
        status: 'active',
        is_auto_checkout: 0,
      },
      {
        id: 'sess_amit_today',
        user_id: 'usr_emp_03',
        work_date: today,
        work_mode: 'leave',
        leave_reason: 'Family event',
        check_in_time: null,
        check_out_time: null,
        status: 'leave',
        is_auto_checkout: 0,
      }
    ],
    breaks: [
      {
        id: 'brk_rahul_1',
        session_id: 'sess_rahul_today',
        break_start: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString(),
        break_end: new Date(Date.now() - 2.0 * 3600 * 1000).toISOString(),
      }
    ],
    editLogs: []
  };
}

function getMockDB() {
  try {
    const raw = localStorage.getItem('ca_mock_db_v2');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  const init = getInitialMockDB();
  saveMockDB(init);
  return init;
}

function saveMockDB(db) {
  try {
    localStorage.setItem('ca_mock_db_v2', JSON.stringify(db));
  } catch (e) {}
}

class ApiService {
  constructor() {
    this.token = localStorage.getItem('ca_time_token') || null;
  }

  setToken(t) {
    this.token = t;
    if (t) {
      localStorage.setItem('ca_time_token', t);
    } else {
      localStorage.removeItem('ca_time_token');
    }
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {}),
      ...(options.headers || {}),
    };

    try {
      const response = await fetch(endpoint, {
        ...options,
        headers,
      });

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || `HTTP error ${response.status}`);
        }
        return data;
      }

      if (response.ok && contentType.includes('text/csv')) {
        return await response.text();
      }

      throw new Error(`Endpoint not served natively (${response.status})`);
    } catch (err) {
      console.warn(`[API] Remote call to ${endpoint} failed (${err.message}). Using client engine.`);
      return this.handleMock(endpoint, options);
    }
  }

  async handleMock(endpoint, options = {}) {
    const url = new URL(endpoint, 'http://localhost');
    const path = url.pathname;
    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body) : {};
    const db = getMockDB();

    // 1. Auth: Login
    if (path.endsWith('/api/auth/login') && method === 'POST') {
      const { email } = body;
      const cleanEmail = (email || '').toLowerCase().trim();
      let user = db.users.find(u => u.email.toLowerCase() === cleanEmail);
      if (!user) {
        user = { id: 'usr_' + Date.now().toString(36), name: cleanEmail.split('@')[0], email: cleanEmail };
        db.users.push(user);
      }

      const mockToken = 'mock_jwt_' + user.id;
      this.setToken(mockToken);
      localStorage.setItem('ca_current_user', JSON.stringify(user));
      return { message: 'Login successful', token: mockToken, user };
    }

    // 2. Auth: Me
    if (path.endsWith('/api/auth/me')) {
      const rawUser = localStorage.getItem('ca_current_user');
      if (rawUser) return { user: JSON.parse(rawUser) };
      throw new Error('Not authenticated');
    }

    // 3. Auth: Logout
    if (path.endsWith('/api/auth/logout')) {
      this.setToken(null);
      localStorage.removeItem('ca_current_user');
      return { message: 'Logged out successfully' };
    }

    const currentUser = JSON.parse(localStorage.getItem('ca_current_user') || 'null');
    if (!currentUser) throw new Error('Unauthorized');

    const todayIST = getISTDateStr();

    // 4. Attendance: Today
    if (path.endsWith('/api/attendance/today')) {
      let session = db.sessions.find(s => s.user_id === currentUser.id && s.work_date === todayIST);
      const breaks = session ? db.breaks.filter(b => b.session_id === session.id) : [];
      const isLeave = session?.work_mode === 'leave' || session?.status === 'leave';

      let floorSeconds = 0;
      let breakSeconds = 0;
      let grossSeconds = 0;

      if (session && !isLeave) {
        const inMs = new Date(session.check_in_time).getTime();
        const outMs = session.check_out_time ? new Date(session.check_out_time).getTime() : Date.now();
        grossSeconds = Math.max(0, Math.floor((outMs - inMs) / 1000));

        let bMs = 0;
        for (const b of breaks) {
          const bStart = new Date(b.break_start).getTime();
          const bEnd = b.break_end ? new Date(b.break_end).getTime() : Date.now();
          bMs += Math.max(0, bEnd - bStart);
        }
        breakSeconds = Math.floor(bMs / 1000);
        floorSeconds = Math.max(0, grossSeconds - breakSeconds);
      }

      return {
        workDate: todayIST,
        session,
        workMode: session?.work_mode || 'office',
        isLeave,
        leaveReason: session?.leave_reason || null,
        breaks,
        hasEdits: false,
        settings: {
          dailyTargetHours: db.settings.daily_target_hours || 7,
          autoCheckoutTime: db.settings.auto_checkout_time || '20:00',
          workDays: db.settings.work_days || 'Mon,Tue,Wed,Thu,Fri,Sat',
        },
        stats: {
          floorSeconds,
          breakSeconds,
          grossSeconds,
          targetSeconds: isLeave ? 0 : (db.settings.daily_target_hours || 7) * 3600,
        },
      };
    }

    // 5. Attendance: Check-in
    if (path.endsWith('/api/attendance/check-in') && method === 'POST') {
      const { work_mode } = body;
      const mode = work_mode === 'wfh' ? 'wfh' : 'office';

      let session = db.sessions.find(s => s.user_id === currentUser.id && s.work_date === todayIST);
      if (session && session.status === 'completed') {
        throw new Error('Already completed session for today.');
      }

      if (session && session.status === 'leave') {
        session.work_mode = mode;
        session.status = 'active';
        session.check_in_time = new Date().toISOString();
        session.check_out_time = null;
      } else if (!session) {
        session = {
          id: 'sess_' + Date.now().toString(36),
          user_id: currentUser.id,
          work_date: todayIST,
          work_mode: mode,
          check_in_time: new Date().toISOString(),
          check_out_time: null,
          status: 'active',
          is_auto_checkout: 0,
        };
        db.sessions.push(session);
      }

      saveMockDB(db);
      return { message: 'Checked in successfully', session };
    }

    // 6. Attendance: Mark Leave
    if (path.endsWith('/api/attendance/mark-leave') && method === 'POST') {
      const { date, reason, action } = body;
      const targetDate = date || todayIST;
      let session = db.sessions.find(s => s.user_id === currentUser.id && s.work_date === targetDate);

      if (action === 'unmark') {
        if (session) {
          db.sessions = db.sessions.filter(s => s.id !== session.id);
          saveMockDB(db);
        }
        return { message: 'Leave removed' };
      }

      if (session) {
        session.work_mode = 'leave';
        session.status = 'leave';
        session.leave_reason = reason || 'Personal Leave';
        session.check_in_time = null;
        session.check_out_time = null;
      } else {
        session = {
          id: 'sess_leave_' + Date.now().toString(36),
          user_id: currentUser.id,
          work_date: targetDate,
          work_mode: 'leave',
          leave_reason: reason || 'Personal Leave',
          status: 'leave',
          check_in_time: null,
          check_out_time: null,
          is_auto_checkout: 0,
        };
        db.sessions.push(session);
      }

      saveMockDB(db);
      return { message: 'Marked as leave', session };
    }

    // 7. Attendance: Direct Edit
    if (path.endsWith('/api/attendance/direct-edit') && method === 'POST') {
      const { sessionId, fieldChanged, breakId, newValue, reason } = body;
      const session = db.sessions.find(s => s.id === sessionId);
      if (!session) throw new Error('Session not found');

      if (fieldChanged === 'check_in_time') session.check_in_time = newValue;
      if (fieldChanged === 'check_out_time') {
        session.check_out_time = newValue;
        session.status = 'completed';
      }
      if (fieldChanged === 'work_mode') session.work_mode = newValue;

      if (breakId) {
        const brk = db.breaks.find(b => b.id === breakId);
        if (brk) {
          if (fieldChanged === 'break_start') brk.break_start = newValue;
          if (fieldChanged === 'break_end') brk.break_end = newValue;
        }
      }

      saveMockDB(db);
      return { message: 'Updated successfully', session };
    }

    // 8. Attendance: Check-out
    if (path.endsWith('/api/attendance/check-out') && method === 'POST') {
      const session = db.sessions.find(s => s.user_id === currentUser.id && s.work_date === todayIST && (s.status === 'active' || s.status === 'on_break'));
      if (!session) throw new Error('No active check-in found.');

      const nowIso = new Date().toISOString();
      for (const b of db.breaks) {
        if (b.session_id === session.id && !b.break_end) b.break_end = nowIso;
      }
      session.check_out_time = nowIso;
      session.status = 'completed';
      saveMockDB(db);
      return { message: 'Checked out successfully', session };
    }

    // 9. Breaks start / resume
    if (path.endsWith('/api/attendance/break/start') && method === 'POST') {
      const session = db.sessions.find(s => s.user_id === currentUser.id && s.work_date === todayIST && s.status === 'active');
      if (!session) throw new Error('Must be checked in to take a break.');
      const nowIso = new Date().toISOString();
      const newBreak = { id: 'brk_' + Date.now().toString(36), session_id: session.id, break_start: nowIso, break_end: null };
      db.breaks.push(newBreak);
      session.status = 'on_break';
      saveMockDB(db);
      return { message: 'Break started', break: newBreak };
    }

    if (path.endsWith('/api/attendance/break/resume') && method === 'POST') {
      const session = db.sessions.find(s => s.user_id === currentUser.id && s.work_date === todayIST && s.status === 'on_break');
      if (!session) throw new Error('Not currently on a break.');
      const nowIso = new Date().toISOString();
      const openBreak = db.breaks.find(b => b.session_id === session.id && !b.break_end);
      if (openBreak) openBreak.break_end = nowIso;
      session.status = 'active';
      saveMockDB(db);
      return { message: 'Resumed', status: 'active' };
    }

    // 10. Month History
    if (path.endsWith('/api/attendance/month')) {
      const targetUserId = url.searchParams.get('userId') || currentUser.id;
      const year = parseInt(url.searchParams.get('year')) || 2026;
      const month = parseInt(url.searchParams.get('month')) || 9;
      const targetHours = db.settings.daily_target_hours || 7;
      const daysInMonth = new Date(year, month, 0).getDate();

      const days = [];
      let totalFloorSec = 0;
      let calendarWorkingDays = 0;
      let elapsedCalendarWorkingDays = 0;
      let leaveDaysElapsed = 0;
      let leaveDaysFuture = 0;
      let remainingCalendarWorkingDays = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dObj = new Date(Date.UTC(year, month - 1, d));
        const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dObj.getUTCDay()];
        const isWorking = db.settings.work_days.includes(dayName);

        if (isWorking) calendarWorkingDays++;

        const isToday = (dateStr === todayIST);
        const isPast = (dateStr < todayIST);
        const isFuture = (dateStr > todayIST);

        if (isWorking) {
          if (isPast || isToday) elapsedCalendarWorkingDays++;
          if (isFuture) remainingCalendarWorkingDays++;
        }

        const session = db.sessions.find(s => s.user_id === targetUserId && s.work_date === dateStr);
        const isLeave = session?.work_mode === 'leave' || session?.status === 'leave';

        if (isLeave) {
          if ((isPast || isToday) && isWorking) leaveDaysElapsed++;
          if (isFuture && isWorking) leaveDaysFuture++;
        }

        let floorSec = 0;
        let breakSec = 0;
        let statusType = isLeave ? 'leave' : (isWorking ? (isPast ? 'absent' : (isToday ? 'today_pending' : 'scheduled')) : 'off');

        if (session && !isLeave) {
          const brks = db.breaks.filter(b => b.session_id === session.id);
          const inMs = new Date(session.check_in_time).getTime();
          const outMs = session.check_out_time ? new Date(session.check_out_time).getTime() : Date.now();
          const gross = Math.max(0, Math.floor((outMs - inMs) / 1000));
          let bMs = 0;
          for (const b of brks) {
            const bs = new Date(b.break_start).getTime();
            const be = b.break_end ? new Date(b.break_end).getTime() : Date.now();
            bMs += Math.max(0, be - bs);
          }
          breakSec = Math.floor(bMs / 1000);
          floorSec = Math.max(0, gross - breakSec);
          totalFloorSec += floorSec;

          const fHours = floorSec / 3600;
          if (session.status === 'completed') {
            statusType = fHours >= targetHours ? 'met' : (fHours >= targetHours - 1 ? 'warning' : 'short');
          } else {
            statusType = 'in_progress';
          }
        }

        days.push({
          day: d,
          date: dateStr,
          dayOfWeek: dayName,
          isWorkingDay: isWorking,
          isToday,
          isFuture,
          isElapsed: isPast || isToday,
          statusType,
          workMode: session?.work_mode || (isLeave ? 'leave' : 'office'),
          leaveReason: session?.leave_reason || null,
          session,
          floorHours: Math.round((floorSec / 3600) * 100) / 100,
          floorSeconds: floorSec,
          breakSeconds: breakSec,
          targetHours: isWorking && !isLeave ? targetHours : 0,
        });
      }

      const effectiveWorkingDaysElapsed = Math.max(0, elapsedCalendarWorkingDays - leaveDaysElapsed);
      const effectiveRemainingWorkingDays = Math.max(0, remainingCalendarWorkingDays - leaveDaysFuture);
      const totalWorkingDaysInMonth = Math.max(0, calendarWorkingDays - (leaveDaysElapsed + leaveDaysFuture));

      const totalFloorHours = Math.round((totalFloorSec / 3600) * 100) / 100;
      const monthlyAverage = effectiveWorkingDaysElapsed > 0 ? Math.round((totalFloorHours / effectiveWorkingDaysElapsed) * 100) / 100 : 0;
      const targetHoursSoFar = Math.round((effectiveWorkingDaysElapsed * targetHours) * 100) / 100;
      const shortfallHours = Math.max(0, Math.round((targetHoursSoFar - totalFloorHours) * 100) / 100);
      const surplusHours = Math.max(0, Math.round((totalFloorHours - targetHoursSoFar) * 100) / 100);

      const totalMonthTargetHours = totalWorkingDaysInMonth * targetHours;
      const hoursStillNeededTotal = Math.max(0, Math.round((totalMonthTargetHours - totalFloorHours) * 100) / 100);

      let requiredDailyRate = 0;
      let extraPerRemainingDay = 0;
      if (effectiveRemainingWorkingDays > 0) {
        requiredDailyRate = Math.round((hoursStillNeededTotal / effectiveRemainingWorkingDays) * 100) / 100;
        extraPerRemainingDay = Math.max(0, Math.round((requiredDailyRate - targetHours) * 100) / 100);
      }

      return {
        year,
        month,
        targetUserId,
        days,
        metrics: {
          dailyTargetHours: targetHours,
          totalWorkingDaysInMonth,
          calendarWorkingDays,
          elapsedCalendarWorkingDays,
          effectiveWorkingDaysElapsed,
          effectiveRemainingWorkingDays,
          leaveDaysElapsed,
          totalLeaveDays: leaveDaysElapsed + leaveDaysFuture,
          totalFloorHours,
          monthlyAverage,
          targetHoursSoFar,
          shortfallHours,
          surplusHours,
          hoursStillNeededTotal,
          requiredDailyRate,
          extraPerRemainingDay,
          isRecoverable: requiredDailyRate <= 11,
          isOnTrack: monthlyAverage >= targetHours,
        },
      };
    }

    // 11. Team Today
    if (path.endsWith('/api/admin/team-today')) {
      const team = db.users.map(u => {
        const session = db.sessions.find(s => s.user_id === u.id && s.work_date === todayIST);
        let status = 'not_checked_in';
        let floorSeconds = 0;
        const isLeave = session?.work_mode === 'leave' || session?.status === 'leave';

        if (session) {
          if (isLeave) {
            status = 'leave';
          } else if (session.status === 'completed') {
            status = session.is_auto_checkout ? 'auto_checked_out' : 'checked_out';
          } else if (session.status === 'on_break') {
            status = 'on_break';
          } else {
            status = 'active';
          }

          if (!isLeave) {
            const inMs = new Date(session.check_in_time).getTime();
            const outMs = session.check_out_time ? new Date(session.check_out_time).getTime() : Date.now();
            floorSeconds = Math.max(0, Math.floor((outMs - inMs) / 1000));
          }
        }

        return {
          user: u,
          session,
          workMode: session?.work_mode || (isLeave ? 'leave' : 'office'),
          leaveReason: session?.leave_reason || null,
          status,
          stats: {
            floorSeconds,
            floorHours: Math.round((floorSeconds / 3600) * 100) / 100,
          },
        };
      });

      return {
        todayIST,
        summary: {
          totalEmployees: team.length,
          inOffice: team.filter(t => t.status === 'active' && t.workMode === 'office').length,
          wfh: team.filter(t => t.status === 'active' && t.workMode === 'wfh').length,
          onBreak: team.filter(t => t.status === 'on_break').length,
          onLeave: team.filter(t => t.status === 'leave').length,
          checkedOut: team.filter(t => t.status.includes('checked_out')).length,
          notInYet: team.filter(t => t.status === 'not_checked_in').length,
        },
        team,
      };
    }

    // 12. Settings
    if (path.endsWith('/api/admin/settings')) {
      if (method === 'PUT') {
        db.settings = { ...db.settings, ...body };
        saveMockDB(db);
        return { message: 'Settings saved' };
      }
      return db.settings;
    }

    // 13. Auto-checkout trigger
    if (path.endsWith('/api/admin/trigger-auto-checkout')) {
      return { message: 'Auto checkout executed', count: 1 };
    }

    throw new Error(`Unhandled mock route: ${path}`);
  }
}

export const api = new ApiService();
