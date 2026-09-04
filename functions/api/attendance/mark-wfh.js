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

    const { date, action } = await request.json().catch(() => ({}));
    const targetDate = date || getISTDateString();
    const nowIso = new Date().toISOString();

    const existing = await env.DB.prepare(
      'SELECT * FROM attendance_sessions WHERE user_id = ? AND work_date = ? LIMIT 1'
    ).bind(user.id, targetDate).first();

    if (action === 'unmark') {
      if (existing && existing.work_mode === 'wfh') {
        await env.DB.prepare('DELETE FROM attendance_sessions WHERE id = ?').bind(existing.id).run();
      }
      return jsonResponse({ message: 'WFH removed. You can now check in normally to the office.' });
    }

    // Mark as WFH
    if (existing) {
      await env.DB.prepare(
        `UPDATE attendance_sessions 
         SET work_mode = 'wfh', status = 'completed', check_in_time = ?, check_out_time = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).bind(existing.check_in_time || nowIso, existing.check_out_time || nowIso, existing.id).run();
    } else {
      const sessionId = 'sess_wfh_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      await env.DB.prepare(
        `INSERT INTO attendance_sessions (id, user_id, work_date, work_mode, check_in_time, check_out_time, status, is_auto_checkout, created_at, updated_at)
         VALUES (?, ?, ?, 'wfh', ?, ?, 'completed', 0, datetime('now'), datetime('now'))`
      ).bind(sessionId, user.id, targetDate, nowIso, nowIso).run();
    }

    return jsonResponse({
      message: 'Day marked as Work From Home. WFH hours do not count toward Floor Adherence.',
      workDate: targetDate,
      workMode: 'wfh',
    });
  } catch (err) {
    return jsonResponse({ error: err.message || 'Failed to mark WFH' }, 500);
  }
}
