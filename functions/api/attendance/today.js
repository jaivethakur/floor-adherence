import { jsonResponse, getISTDateString, calculateSessionSeconds } from '../_helpers.js';

export async function onRequestGet(context) {
  const { env } = context;
  const user = context.data?.user;

  if (!user) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const todayIST = getISTDateString();

  try {
    let session = null;
    let breaks = [];
    let hasEdits = false;
    let settings = {
      daily_target_hours: 7,
      auto_checkout_time: '20:00',
      work_days: 'Mon,Tue,Wed,Thu,Fri',
    };

    if (env.DB) {
      // 1. Fetch settings
      const settingsRes = await env.DB.prepare('SELECT key, value FROM settings').all();
      if (settingsRes?.results) {
        for (const row of settingsRes.results) {
          settings[row.key] = row.value;
        }
      }

      // 2. Fetch today's session
      const sessionRes = await env.DB.prepare(
        'SELECT * FROM attendance_sessions WHERE user_id = ? AND work_date = ? ORDER BY created_at DESC LIMIT 1'
      ).bind(user.id, todayIST).all();

      if (sessionRes?.results && sessionRes.results.length > 0) {
        session = sessionRes.results[0];

        // 3. Fetch breaks
        const breaksRes = await env.DB.prepare(
          'SELECT * FROM breaks WHERE session_id = ? ORDER BY break_start ASC'
        ).bind(session.id).all();

        breaks = breaksRes?.results || [];

        // 4. Check edits
        const editRes = await env.DB.prepare(
          'SELECT COUNT(*) as count FROM edit_logs WHERE session_id = ?'
        ).bind(session.id).first();

        hasEdits = (editRes?.count || 0) > 0;
      }
    }

    const [y, m, d] = todayIST.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dateObj.getUTCDay()];
    const isWeekend = (dayOfWeek === 'Sat' || dayOfWeek === 'Sun');

    const isLeave = session?.work_mode === 'leave' || session?.status === 'leave';
    const isWFH = session?.work_mode === 'wfh';
    const isExempted = isLeave || isWFH || isWeekend;

    const calculations = (isLeave || isWFH)
      ? { floorSeconds: 0, breakSeconds: 0, grossSeconds: 0 }
      : calculateSessionSeconds(session, breaks);

    return jsonResponse({
      workDate: todayIST,
      dayOfWeek,
      isWeekend,
      isExempted,
      session,
      workMode: session?.work_mode || (isLeave ? 'leave' : (isWFH ? 'wfh' : (isWeekend ? 'weekend' : 'office'))),
      isLeave,
      isWFH,
      leaveReason: session?.leave_reason || null,
      breaks,
      hasEdits,
      settings: {
        dailyTargetHours: parseFloat(settings.daily_target_hours) || 7,
        autoCheckoutTime: settings.auto_checkout_time || '20:00',
        workDays: settings.work_days || 'Mon,Tue,Wed,Thu,Fri',
      },
      stats: {
        floorSeconds: calculations.floorSeconds,
        breakSeconds: calculations.breakSeconds,
        grossSeconds: calculations.grossSeconds,
        targetSeconds: isExempted ? 0 : (parseFloat(settings.daily_target_hours) || 7) * 3600,
      },
    });
  } catch (err) {
    return jsonResponse({ error: err.message || 'Failed to fetch today session' }, 500);
  }
}
