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

    // 1. Find session on break
    const session = await env.DB.prepare(
      "SELECT * FROM attendance_sessions WHERE user_id = ? AND work_date = ? AND status = 'on_break' LIMIT 1"
    ).bind(user.id, todayIST).first();

    if (!session) {
      return jsonResponse({ error: 'Cannot resume. You are not currently on a break.' }, 400);
    }

    // 2. Close open break
    await env.DB.prepare(
      'UPDATE breaks SET break_end = ? WHERE session_id = ? AND break_end IS NULL'
    ).bind(nowIso, session.id).run();

    // 3. Update session status to active
    await env.DB.prepare(
      "UPDATE attendance_sessions SET status = 'active', updated_at = datetime('now') WHERE id = ?"
    ).bind(session.id).run();

    return jsonResponse({
      message: 'Resumed from break',
      status: 'active',
      resumedAt: nowIso,
    });
  } catch (err) {
    return jsonResponse({ error: err.message || 'Failed to resume from break' }, 500);
  }
}
