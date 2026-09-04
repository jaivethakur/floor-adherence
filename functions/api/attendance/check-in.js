import { jsonResponse, getISTDateString } from '../_helpers.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const user = context.data?.user;

  if (!user) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const todayIST = getISTDateString();
  const nowIso = new Date().toISOString();

  try {
    if (!env.DB) {
      return jsonResponse({ error: 'Database not bound' }, 500);
    }

    const body = await request.json().catch(() => ({}));
    const workMode = body.work_mode === 'wfh' ? 'wfh' : 'office';

    // 1. Check if user already has a session for today
    const existing = await env.DB.prepare(
      'SELECT id, status, work_mode FROM attendance_sessions WHERE user_id = ? AND work_date = ? LIMIT 1'
    ).bind(user.id, todayIST).first();

    if (existing) {
      if (existing.status === 'completed') {
        return jsonResponse(
          { error: 'You have already completed your session for today. Use Edit to modify your hours if needed.' },
          400
        );
      }
      if (existing.status === 'leave') {
        return jsonResponse(
          { error: 'Today is currently marked as Leave. Switch mode to Office or WFH first.' },
          400
        );
      }
      return jsonResponse({ error: 'You are already checked in for today.' }, 400);
    }

    // 2. Create new attendance session
    const sessionId = 'sess_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);

    await env.DB.prepare(
      `INSERT INTO attendance_sessions (id, user_id, work_date, work_mode, check_in_time, status, is_auto_checkout, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'active', 0, datetime('now'), datetime('now'))`
    ).bind(sessionId, user.id, todayIST, workMode, nowIso).run();

    return jsonResponse({
      message: `Checked in successfully (${workMode === 'wfh' ? 'Work From Home' : 'Office Floor'})`,
      session: {
        id: sessionId,
        user_id: user.id,
        work_date: todayIST,
        work_mode: workMode,
        check_in_time: nowIso,
        check_out_time: null,
        status: 'active',
        is_auto_checkout: 0,
      },
    }, 201);
  } catch (err) {
    return jsonResponse({ error: err.message || 'Check-in failed' }, 500);
  }
}
