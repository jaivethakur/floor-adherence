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

    if (!sessionId || !fieldChanged || !newValue || !reason?.trim()) {
      return jsonResponse({ error: 'Session, field changed, new value, and a valid reason are required.' }, 400);
    }

    // Verify session belongs to user (or user is admin)
    const session = await env.DB.prepare('SELECT * FROM attendance_sessions WHERE id = ?').bind(sessionId).first();
    if (!session) {
      return jsonResponse({ error: 'Attendance session not found.' }, 404);
    }

    if (user.role !== 'admin' && session.user_id !== user.id) {
      return jsonResponse({ error: 'Forbidden: You can only request edits for your own sessions.' }, 403);
    }

    // Determine oldValue
    let oldValue = null;
    if (fieldChanged === 'check_in_time') {
      oldValue = session.check_in_time;
    } else if (fieldChanged === 'check_out_time') {
      oldValue = session.check_out_time;
    } else if (fieldChanged === 'break_start' || fieldChanged === 'break_end') {
      if (breakId) {
        const brk = await env.DB.prepare('SELECT * FROM breaks WHERE id = ?').bind(breakId).first();
        if (brk) {
          oldValue = fieldChanged === 'break_start' ? brk.break_start : brk.break_end;
        }
      }
    }

    const logId = 'edit_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);

    // If admin is submitting, it is auto-approved and applied immediately; if employee, it is pending
    const isAdmin = user.role === 'admin';
    const status = isAdmin ? 'approved' : 'pending';
    const approvedBy = isAdmin ? user.id : null;

    await env.DB.prepare(
      `INSERT INTO edit_logs (id, session_id, edited_by, field_changed, break_id, old_value, new_value, reason, approved_by, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(logId, sessionId, user.id, fieldChanged, breakId || null, oldValue, newValue, reason.trim(), approvedBy, status).run();

    // If admin, apply change immediately
    if (isAdmin) {
      if (fieldChanged === 'check_in_time') {
        await env.DB.prepare('UPDATE attendance_sessions SET check_in_time = ?, updated_at = datetime(\'now\') WHERE id = ?')
          .bind(newValue, sessionId).run();
      } else if (fieldChanged === 'check_out_time') {
        await env.DB.prepare('UPDATE attendance_sessions SET check_out_time = ?, updated_at = datetime(\'now\') WHERE id = ?')
          .bind(newValue, sessionId).run();
      } else if (fieldChanged === 'break_start' && breakId) {
        await env.DB.prepare('UPDATE breaks SET break_start = ? WHERE id = ?').bind(newValue, breakId).run();
      } else if (fieldChanged === 'break_end' && breakId) {
        await env.DB.prepare('UPDATE breaks SET break_end = ? WHERE id = ?').bind(newValue, breakId).run();
      }
    }

    return jsonResponse({
      message: isAdmin ? 'Edit applied successfully' : 'Edit request submitted for admin review',
      editLog: {
        id: logId,
        sessionId,
        status,
        fieldChanged,
        oldValue,
        newValue,
        reason,
      },
    }, 201);
  } catch (err) {
    return jsonResponse({ error: err.message || 'Failed to submit edit request' }, 500);
  }
}
