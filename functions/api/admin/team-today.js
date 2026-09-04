import { jsonResponse, getISTDateString, calculateSessionSeconds } from '../_helpers.js';

export async function onRequestGet(context) {
  const { env } = context;
  const user = context.data?.user;

  if (!user) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const todayIST = getISTDateString();

  try {
    if (!env.DB) {
      return jsonResponse({ error: 'Database not bound' }, 500);
    }

    // 1. Fetch all active users
    const usersRes = await env.DB.prepare(
      'SELECT id, name, email, is_active FROM users WHERE is_active = 1 ORDER BY name ASC'
    ).all();
    const users = usersRes?.results || [];

    // 2. Fetch today's sessions
    const sessionsRes = await env.DB.prepare(
      'SELECT * FROM attendance_sessions WHERE work_date = ?'
    ).bind(todayIST).all();
    const sessions = sessionsRes?.results || [];

    const sessionMap = new Map();
    const sessionIds = [];
    for (const s of sessions) {
      sessionMap.set(s.user_id, s);
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

    // 4. Combine team presence with WFO, WFH, Leave
    const team = users.map(u => {
      const session = sessionMap.get(u.id) || null;
      const breaks = session ? (breaksMap.get(session.id) || []) : [];
      const isLeave = session?.work_mode === 'leave' || session?.status === 'leave';

      const stats = session && !isLeave
        ? calculateSessionSeconds(session, breaks)
        : { floorSeconds: 0, breakSeconds: 0, grossSeconds: 0 };

      let status = 'not_checked_in';
      if (session) {
        if (isLeave) {
          status = 'leave';
        } else if (session.status === 'completed') {
          status = session.is_auto_checkout ? 'auto_checked_out' : 'checked_out';
        } else if (session.status === 'on_break') {
          status = 'on_break';
        } else if (session.status === 'active') {
          status = 'active';
        }
      }

      return {
        user: u,
        session,
        workMode: session?.work_mode || (isLeave ? 'leave' : 'office'),
        leaveReason: session?.leave_reason || null,
        breaks,
        status,
        stats: {
          floorSeconds: stats.floorSeconds,
          floorHours: Math.round((stats.floorSeconds / 3600) * 100) / 100,
          breakSeconds: stats.breakSeconds,
          breakHours: Math.round((stats.breakSeconds / 3600) * 100) / 100,
          grossSeconds: stats.grossSeconds,
        },
      };
    });

    const summary = {
      totalEmployees: team.length,
      inOffice: team.filter(t => t.status === 'active' && t.workMode === 'office').length,
      wfh: team.filter(t => t.status === 'active' && t.workMode === 'wfh').length,
      onBreak: team.filter(t => t.status === 'on_break').length,
      onLeave: team.filter(t => t.status === 'leave').length,
      checkedOut: team.filter(t => t.status === 'checked_out' || t.status === 'auto_checked_out').length,
      notInYet: team.filter(t => t.status === 'not_checked_in').length,
    };

    return jsonResponse({
      todayIST,
      summary,
      team,
    });
  } catch (err) {
    return jsonResponse({ error: err.message || 'Failed to fetch team presence' }, 500);
  }
}
