import { jsonResponse, getISTDateString } from '../../_helpers.js';

export async function onRequestPost(context) {
  const { env } = context;
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

    // 1. Find session
    const session = await env.DB.prepare(
      "SELECT * FROM attendance_sessions WHERE user_id = ? AND work_date = ? AND status = 'active' LIMIT 1"
    ).bind(user.id, todayIST).first();

    if (!session) {
      return jsonResponse({ error: 'Cannot start break. You must be actively checked in.' }, 400);
    }

    // 2. Insert new break
    const breakId = 'brk_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);

    await env.DB.prepare(
      'INSERT INTO breaks (id, session_id, break_start, break_end, created_at) VALUES (?, ?, ?, NULL, datetime(\'now\'))'
    ).bind(breakId, session.id, nowIso).run();

    // 3. Update session status to on_break
    await env.DB.prepare(
      "UPDATE attendance_sessions SET status = 'on_break', updated_at = datetime('now') WHERE id = ?"
    ).bind(session.id).run();

    return jsonResponse({
      message: 'Break started',
      break: {
        id: breakId,
        session_id: session.id,
        break_start: nowIso,
        break_end: null,
      },
    }, 201);
  } catch (err) {
    return jsonResponse({ error: err.message || 'Failed to start break' }, 500);
  }
}
