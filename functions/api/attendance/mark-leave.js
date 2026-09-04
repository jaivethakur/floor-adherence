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

    const { date, reason, action } = await request.json();
    const targetDate = date || getISTDateString();

    const existing = await env.DB.prepare(
      'SELECT * FROM attendance_sessions WHERE user_id = ? AND work_date = ? LIMIT 1'
    ).bind(user.id, targetDate).first();

    if (action === 'unmark') {
      // Remove leave status
      if (existing && existing.work_mode === 'leave') {
        await env.DB.prepare('DELETE FROM attendance_sessions WHERE id = ?').bind(existing.id).run();
      }
      return jsonResponse({ message: 'Leave removed. You can now check in normally.' });
    }

    // Mark as leave
    const leaveReason = reason?.trim() || 'Leave';
    if (existing) {
      await env.DB.prepare(
        `UPDATE attendance_sessions 
         SET work_mode = 'leave', status = 'leave', leave_reason = ?, check_in_time = NULL, check_out_time = NULL, updated_at = datetime('now')
         WHERE id = ?`
      ).bind(leaveReason, existing.id).run();
    } else {
      const sessionId = 'sess_leave_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      await env.DB.prepare(
        `INSERT INTO attendance_sessions (id, user_id, work_date, work_mode, leave_reason, status, is_auto_checkout, created_at, updated_at)
         VALUES (?, ?, ?, 'leave', ?, 'leave', 0, datetime('now'), datetime('now'))`
      ).bind(sessionId, user.id, targetDate, leaveReason).run();
    }

    return jsonResponse({
      message: 'Day marked as Leave. This day will be excluded from your monthly target hours.',
      workDate: targetDate,
      workMode: 'leave',
      leaveReason,
    });
  } catch (err) {
    return jsonResponse({ error: err.message || 'Failed to mark leave' }, 500);
  }
}
