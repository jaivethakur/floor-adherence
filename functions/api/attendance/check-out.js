import { jsonResponse, getISTDateString, calculateSessionSeconds } from '../_helpers.js';

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

    // 1. Find active or on_break session for today
    const session = await env.DB.prepare(
      "SELECT * FROM attendance_sessions WHERE user_id = ? AND work_date = ? AND status IN ('active', 'on_break') LIMIT 1"
    ).bind(user.id, todayIST).first();

    if (!session) {
      return jsonResponse({ error: 'No active check-in found to check out.' }, 400);
    }

    // 2. If on break, automatically close the open break at checkout time
    if (session.status === 'on_break') {
      await env.DB.prepare(
        'UPDATE breaks SET break_end = ? WHERE session_id = ? AND break_end IS NULL'
      ).bind(nowIso, session.id).run();
    }

    // 3. Complete session
    await env.DB.prepare(
      "UPDATE attendance_sessions SET check_out_time = ?, status = 'completed', updated_at = datetime('now') WHERE id = ?"
    ).bind(nowIso, session.id).run();

    // 4. Retrieve final session & breaks for accurate summary
    const updatedSession = await env.DB.prepare('SELECT * FROM attendance_sessions WHERE id = ?').bind(session.id).first();
    const breaksRes = await env.DB.prepare('SELECT * FROM breaks WHERE session_id = ? ORDER BY break_start ASC').bind(session.id).all();
    const breaks = breaksRes?.results || [];

    const stats = calculateSessionSeconds(updatedSession, breaks);

    return jsonResponse({
      message: 'Checked out successfully',
      session: updatedSession,
      breaks,
      stats,
    });
  } catch (err) {
    return jsonResponse({ error: err.message || 'Check-out failed' }, 500);
  }
}
