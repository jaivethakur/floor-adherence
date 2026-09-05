import { jsonResponse, getISTDateString, calculateSessionSeconds, isWorkingDay } from '../_helpers.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const user = context.data?.user;

  if (!user) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const url = new URL(request.url);
  const todayIST = getISTDateString();
  const [currentYear, currentMonth, currentDay] = todayIST.split('-').map(Number);

  const year = parseInt(url.searchParams.get('year')) || currentYear;
  const month = parseInt(url.searchParams.get('month')) || currentMonth;
  // Strictly individual - each user only sees their own attendance data
  const targetUserId = user.id;

  try {
    if (!env.DB) {
      return jsonResponse({ error: 'Database not bound' }, 500);
    }

    // 1. Fetch settings
    let dailyTargetHours = 7;
    let workDaysString = 'Mon,Tue,Wed,Thu,Fri';
    const settingsRes = await env.DB.prepare('SELECT key, value FROM settings').all();
    if (settingsRes?.results) {
      for (const row of settingsRes.results) {
        if (row.key === 'daily_target_hours') dailyTargetHours = parseFloat(row.value) || 7;
        if (row.key === 'work_days') workDaysString = row.value;
      }
    }

    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const daysInMonth = new Date(year, month, 0).getDate();

    // 2. Fetch all sessions for this user in this month
    const sessionsRes = await env.DB.prepare(
      `SELECT * FROM attendance_sessions 
       WHERE user_id = ? AND work_date LIKE ? 
       ORDER BY work_date ASC`
    ).bind(targetUserId, `${monthStr}%`).all();

    const sessions = sessionsRes?.results || [];
    const sessionMap = new Map();
    const sessionIds = [];

    for (const s of sessions) {
      sessionMap.set(s.work_date, s);
      sessionIds.push(s.id);
    }

    // 3. Fetch breaks
    const breaksMap = new Map();
    if (sessionIds.length > 0) {
      const placeholders = sessionIds.map(() => '?').join(',');
      const breaksRes = await env.DB.prepare(
        `SELECT * FROM breaks WHERE session_id IN (${placeholders}) ORDER BY break_start ASC`
      ).bind(...sessionIds).all();

      for (const b of breaksRes?.results || []) {
        if (!breaksMap.has(b.session_id)) {
          breaksMap.set(b.session_id, []);
        }
        breaksMap.get(b.session_id).push(b);
      }
    }

    // 4. Compute daily records with leave exclusions
    const days = [];
    let calendarWorkingDays = 0;
    let elapsedCalendarWorkingDays = 0;
    let remainingCalendarWorkingDays = 0;
    let leaveDaysElapsed = 0;
    let leaveDaysFuture = 0;
    let wfhDaysElapsed = 0;
    let wfhDaysFuture = 0;
    let totalFloorSeconds = 0;
    let officeDaysCount = 0;
    let wfhDaysCount = 0;

    const isCurrentMonth = (year === currentYear && month === currentMonth);
    const isPastMonth = (year < currentYear || (year === currentYear && month < currentMonth));

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${monthStr}-${String(day).padStart(2, '0')}`;
      const dateObj = new Date(Date.UTC(year, month - 1, day));
      const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dateObj.getUTCDay()];
      const isWeekend = (dayOfWeek === 'Sat' || dayOfWeek === 'Sun');
      const working = isWorkingDay(dateObj, workDaysString);

      if (working) {
        calendarWorkingDays++;
      }

      let isElapsed = false;
      let isFuture = false;
      let isToday = false;

      if (isPastMonth) {
        isElapsed = true;
      } else if (isCurrentMonth) {
        if (day < currentDay) {
          isElapsed = true;
        } else if (day === currentDay) {
          isToday = true;
          isElapsed = true;
        } else {
          isFuture = true;
          if (working) remainingCalendarWorkingDays++;
        }
      } else {
        isFuture = true;
        if (working) remainingCalendarWorkingDays++;
      }

      if (isElapsed && working) {
        elapsedCalendarWorkingDays++;
      }

      const session = sessionMap.get(dateStr) || null;
      const breaks = session ? (breaksMap.get(session.id) || []) : [];
      const stats = session && session.work_mode !== 'leave'
        ? calculateSessionSeconds(session, breaks)
        : { floorSeconds: 0, breakSeconds: 0, grossSeconds: 0 };

      const isLeave = session?.work_mode === 'leave' || session?.status === 'leave';
      const isWFH = session?.work_mode === 'wfh';

      // "Do not count time for WFH & Leave" - Floor Adherence only counts Office Floor time!
      const floorSeconds = (isLeave || isWFH) ? 0 : stats.floorSeconds;
      const floorHours = (isLeave || isWFH) ? 0 : Math.round((floorSeconds / 3600) * 100) / 100;

      if (isLeave) {
        if (isElapsed && working) leaveDaysElapsed++;
        if (isFuture && working) leaveDaysFuture++;
      } else if (isWFH) {
        if (isElapsed && working) wfhDaysElapsed++;
        if (isFuture && working) wfhDaysFuture++;
        wfhDaysCount++;
      } else if (session) {
        totalFloorSeconds += floorSeconds;
        officeDaysCount++;
      }

      let statusType = isWeekend ? 'weekend' : 'off';

      if (isLeave) {
        statusType = 'leave';
      } else if (isWFH) {
        statusType = 'wfh';
      } else if (working) {
        if (session) {
          if (session.status === 'completed') {
            if (floorHours >= dailyTargetHours) {
              statusType = 'met';
            } else if (floorHours >= dailyTargetHours - 1) {
              statusType = 'warning';
            } else {
              statusType = 'short';
            }
          } else {
            statusType = 'in_progress';
          }
        } else if (isElapsed && !isToday) {
          statusType = 'absent';
        } else if (isToday) {
          statusType = 'today_pending';
        } else {
          statusType = 'scheduled';
        }
      } else if (isWeekend && session && floorHours > 0) {
        statusType = 'weekend_work';
      }

      days.push({
        day,
        date: dateStr,
        dayOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dateObj.getUTCDay()],
        isWorkingDay: working,
        isToday,
        isFuture,
        isElapsed,
        statusType,
        workMode: session?.work_mode || (working ? 'office' : 'off'),
        leaveReason: session?.leave_reason || null,
        session,
        breaksCount: breaks.length,
        floorSeconds,
        breakSeconds: stats.breakSeconds,
        floorHours,
        targetHours: working && !isLeave && !isWFH ? dailyTargetHours : 0,
      });
    }

    // 5. Fair Shortfall & Average Computations (Leaves AND WFH are excluded from denominator so WFH does not drag down average!)
    const effectiveWorkingDaysElapsed = Math.max(0, elapsedCalendarWorkingDays - (leaveDaysElapsed + wfhDaysElapsed));
    const effectiveRemainingWorkingDays = Math.max(0, remainingCalendarWorkingDays - (leaveDaysFuture + wfhDaysFuture));
    const totalWorkingDaysInMonth = Math.max(0, calendarWorkingDays - (leaveDaysElapsed + leaveDaysFuture + wfhDaysElapsed + wfhDaysFuture));

    const totalFloorHours = Math.round((totalFloorSeconds / 3600) * 100) / 100;
    const monthlyAverage = effectiveWorkingDaysElapsed > 0
      ? Math.round((totalFloorHours / effectiveWorkingDaysElapsed) * 100) / 100
      : (totalFloorHours > 0 ? totalFloorHours : dailyTargetHours);

    const targetHoursSoFar = Math.round((effectiveWorkingDaysElapsed * dailyTargetHours) * 100) / 100;
    const shortfallHours = Math.max(0, Math.round((targetHoursSoFar - totalFloorHours) * 100) / 100);
    const surplusHours = Math.max(0, Math.round((totalFloorHours - targetHoursSoFar) * 100) / 100);

    const totalMonthTargetHours = totalWorkingDaysInMonth * dailyTargetHours;
    const hoursStillNeededTotal = Math.max(0, Math.round((totalMonthTargetHours - totalFloorHours) * 100) / 100);

    let extraPerRemainingDay = 0;
    let requiredDailyRate = 0;
    let isRecoverable = true;

    if (effectiveRemainingWorkingDays > 0) {
      requiredDailyRate = Math.round((hoursStillNeededTotal / effectiveRemainingWorkingDays) * 100) / 100;
      extraPerRemainingDay = Math.max(0, Math.round((requiredDailyRate - dailyTargetHours) * 100) / 100);
      if (requiredDailyRate > 11) {
        isRecoverable = false;
      }
    } else {
      isRecoverable = shortfallHours === 0;
    }

    return jsonResponse({
      year,
      month,
      targetUserId,
      days,
      metrics: {
        dailyTargetHours,
        totalWorkingDaysInMonth,
        calendarWorkingDays,
        elapsedCalendarWorkingDays,
        effectiveWorkingDaysElapsed,
        effectiveRemainingWorkingDays,
        leaveDaysElapsed,
        leaveDaysFuture,
        totalLeaveDays: leaveDaysElapsed + leaveDaysFuture,
        wfhDaysElapsed,
        wfhDaysFuture,
        totalWfhDays: wfhDaysElapsed + wfhDaysFuture,
        officeDaysCount,
        wfhDaysCount,
        totalFloorHours,
        monthlyAverage,
        targetHoursSoFar,
        shortfallHours,
        surplusHours,
        hoursStillNeededTotal,
        requiredDailyRate,
        extraPerRemainingDay,
        isRecoverable,
        isOnTrack: monthlyAverage >= dailyTargetHours,
      },
    });
  } catch (err) {
    return jsonResponse({ error: err.message || 'Failed to calculate monthly metrics' }, 500);
  }
}
