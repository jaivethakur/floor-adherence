import { jsonResponse, getISTDateString } from '../_helpers.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const user = context.data?.user;

  if (!user) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  try {
    if (!env.DB) {
      return jsonResponse({ error: 'Database not bound' }, 500);
    }

    const body = await request.json().catch(() => ({}));
    const targetDate = body.date || getISTDateString();

    const [year, month, day] = targetDate.split('-').map(Number);
    // 20:00 IST is 14:30 UTC
    const checkoutTimeUtc = new Date(Date.UTC(year, month - 1, day, 14, 30, 0)).toISOString();

    const { results: pendingSessions } = await env.DB.prepare(
      "SELECT id, user_id, status FROM attendance_sessions WHERE work_date = ? AND status IN ('active', 'on_break')"
    ).bind(targetDate).all();

    if (!pendingSessions || pendingSessions.length === 0) {
      return jsonResponse({ message: 'No unclosed sessions found for ' + targetDate, count: 0 });
    }

    let closedCount = 0;
    for (const session of pendingSessions) {
      if (session.status === 'on_break') {
        await env.DB.prepare(
          'UPDATE breaks SET break_end = ? WHERE session_id = ? AND break_end IS NULL'
        ).bind(checkoutTimeUtc, session.id).run();
      }

      await env.DB.prepare(
        `UPDATE attendance_sessions 
         SET check_out_time = ?, status = 'completed', is_auto_checkout = 1, updated_at = datetime('now')
         WHERE id = ?`
      ).bind(checkoutTimeUtc, session.id).run();

      closedCount++;
    }

    return jsonResponse({
      message: `Successfully auto-checked out ${closedCount} session(s) at 8:00 PM IST`,
      count: closedCount,
      targetDate,
      checkoutTimeUtc,
    });
  } catch (err) {
    return jsonResponse({ error: err.message || 'Auto checkout execution failed' }, 500);
  }
}
