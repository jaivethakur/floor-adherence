import { jsonResponse } from '../_helpers.js';

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

    const { sessionId, fieldChanged, breakId, newValue, reason } = await request.json();

    if (!sessionId || !fieldChanged || !newValue) {
      return jsonResponse({ error: 'Session ID, field changed, and new value are required' }, 400);
    }

    const session = await env.DB.prepare('SELECT * FROM attendance_sessions WHERE id = ?').bind(sessionId).first();
    if (!session) {
      return jsonResponse({ error: 'Session not found' }, 404);
    }

    let oldValue = null;
    if (fieldChanged === 'check_in_time') {
      oldValue = session.check_in_time;
      await env.DB.prepare("UPDATE attendance_sessions SET check_in_time = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(newValue, sessionId).run();
    } else if (fieldChanged === 'check_out_time') {
      oldValue = session.check_out_time;
      await env.DB.prepare("UPDATE attendance_sessions SET check_out_time = ?, status = 'completed', updated_at = datetime('now') WHERE id = ?")
        .bind(newValue, sessionId).run();
    } else if (fieldChanged === 'work_mode') {
      oldValue = session.work_mode;
      await env.DB.prepare("UPDATE attendance_sessions SET work_mode = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(newValue, sessionId).run();
    } else if (fieldChanged === 'break_start' && breakId) {
      const brk = await env.DB.prepare('SELECT * FROM breaks WHERE id = ?').bind(breakId).first();
      oldValue = brk?.break_start;
      await env.DB.prepare('UPDATE breaks SET break_start = ? WHERE id = ?').bind(newValue, breakId).run();
    } else if (fieldChanged === 'break_end' && breakId) {
      const brk = await env.DB.prepare('SELECT * FROM breaks WHERE id = ?').bind(breakId).first();
      oldValue = brk?.break_end;
      await env.DB.prepare('UPDATE breaks SET break_end = ? WHERE id = ?').bind(newValue, breakId).run();
    } else {
      return jsonResponse({ error: 'Unsupported field edit' }, 400);
    }

    // Insert audit log
    const logId = 'edit_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    await env.DB.prepare(
      `INSERT INTO edit_logs (id, session_id, edited_by, field_changed, break_id, old_value, new_value, reason, approved_by, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', datetime('now'))`
    ).bind(logId, sessionId, user.id, fieldChanged, breakId || null, oldValue, newValue, reason || 'Self-Update', user.id).run();

    return jsonResponse({
      message: 'Time updated successfully',
      sessionId,
      fieldChanged,
      oldValue,
      newValue,
    });
  } catch (err) {
    return jsonResponse({ error: err.message || 'Direct edit failed' }, 500);
  }
}
