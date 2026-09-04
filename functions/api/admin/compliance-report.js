import { jsonResponse, getISTDateString, calculateSessionSeconds, isWorkingDay } from '../_helpers.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const admin = context.data?.user;

  if (!admin || admin.role !== 'admin') {
    return jsonResponse({ error: 'Forbidden: Admin access required' }, 403);
  }

  const url = new URL(request.url);
  const todayIST = getISTDateString();
  const [currentYear, currentMonth, currentDay] = todayIST.split('-').map(Number);

  const year = parseInt(url.searchParams.get('year')) || currentYear;
  const month = parseInt(url.searchParams.get('month')) || currentMonth;
  const format = url.searchParams.get('format'); // 'csv' or json

  try {
    if (!env.DB) {
      return jsonResponse({ error: 'Database not bound' }, 500);
    }

    // 1. Fetch settings
    let dailyTargetHours = 7;
    let workDaysString = 'Mon,Tue,Wed,Thu,Fri,Sat';
    const settingsRes = await env.DB.prepare('SELECT key, value FROM settings').all();
    if (settingsRes?.results) {
      for (const row of settingsRes.results) {
        if (row.key === 'daily_target_hours') dailyTargetHours = parseFloat(row.value) || 7;
        if (row.key === 'work_days') workDaysString = row.value;
      }
    }

    // 2. Compute working days in month and elapsed
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const daysInMonth = new Date(year, month, 0).getDate();

    let totalWorkingDays = 0;
    let elapsedWorkingDays = 0;
    const isCurrentMonth = (year === currentYear && month === currentMonth);
    const isPastMonth = (year < currentYear || (year === currentYear && month < currentMonth));

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(Date.UTC(year, month - 1, d));
      const working = isWorkingDay(dateObj, workDaysString);
      if (working) {
        totalWorkingDays++;
        if (isPastMonth || (isCurrentMonth && d <= currentDay)) {
          elapsedWorkingDays++;
        }
      }
    }

    // 3. Fetch all active employees
    const usersRes = await env.DB.prepare(
      'SELECT id, name, email, role FROM users WHERE is_active = 1 ORDER BY name ASC'
    ).all();
    const users = usersRes?.results || [];

    // 4. Fetch all sessions for this month
    const sessionsRes = await env.DB.prepare(
      `SELECT * FROM attendance_sessions WHERE work_date LIKE ?`
    ).bind(`${monthStr}%`).all();
    const sessions = sessionsRes?.results || [];

    // Fetch breaks
    const sessionIds = sessions.map(s => s.id);
    const breaksMap = new Map();
    if (sessionIds.length > 0) {
      const placeholders = sessionIds.map(() => '?').join(',');
      const breaksRes = await env.DB.prepare(
        `SELECT * FROM breaks WHERE session_id IN (${placeholders})`
      ).bind(...sessionIds).all();

      for (const b of breaksRes?.results || []) {
        if (!breaksMap.has(b.session_id)) {
          breaksMap.set(b.session_id, []);
        }
        breaksMap.get(b.session_id).push(b);
      }
    }

    // Map user sessions
    const userSessionsMap = new Map();
    for (const s of sessions) {
      if (!userSessionsMap.has(s.user_id)) {
        userSessionsMap.set(s.user_id, []);
      }
      userSessionsMap.get(s.user_id).push(s);
    }

    // 5. Aggregate report per employee
    const targetHoursSoFar = Math.round((elapsedWorkingDays * dailyTargetHours) * 100) / 100;

    const report = users.map(u => {
      const uSessions = userSessionsMap.get(u.id) || [];
      let totalFloorSec = 0;
      let daysPresent = 0;
      let autoCheckoutCount = 0;

      for (const s of uSessions) {
        const brks = breaksMap.get(s.id) || [];
        const stats = calculateSessionSeconds(s, brks);
        totalFloorSec += stats.floorSeconds;
        daysPresent++;
        if (s.is_auto_checkout) autoCheckoutCount++;
      }

      const totalHours = Math.round((totalFloorSec / 3600) * 100) / 100;
      const avgHours = elapsedWorkingDays > 0 ? Math.round((totalHours / elapsedWorkingDays) * 100) / 100 : 0;
      const shortfall = Math.max(0, Math.round((targetHoursSoFar - totalHours) * 100) / 100);
      const surplus = Math.max(0, Math.round((totalHours - targetHoursSoFar) * 100) / 100);
      const complianceRate = targetHoursSoFar > 0 ? Math.min(100, Math.round((totalHours / targetHoursSoFar) * 100)) : 100;

      return {
        user: u,
        daysPresent,
        autoCheckoutCount,
        totalFloorHours: totalHours,
        averageHoursPerDay: avgHours,
        targetHours: targetHoursSoFar,
        shortfallHours: shortfall,
        surplusHours: surplus,
        complianceRate,
        isOnTrack: avgHours >= dailyTargetHours,
      };
    });

    // 6. Support CSV export
    if (format === 'csv') {
      let csv = `Employee Name,Email,Role,Days Present,Total Floor Hours,Daily Average,Target So Far,Shortfall Hours,Surplus Hours,Compliance %\n`;
      for (const row of report) {
        csv += `"${row.user.name}","${row.user.email}","${row.user.role}",${row.daysPresent},${row.totalFloorHours},${row.averageHoursPerDay},${row.targetHours},${row.shortfallHours},${row.surplusHours},${row.complianceRate}%\n`;
      }
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="floor_hours_compliance_${monthStr}.csv"`,
        },
      });
    }

    return jsonResponse({
      monthStr,
      year,
      month,
      dailyTargetHours,
      totalWorkingDays,
      elapsedWorkingDays,
      targetHoursSoFar,
      report,
    });
  } catch (err) {
    return jsonResponse({ error: err.message || 'Failed to generate compliance report' }, 500);
  }
}
