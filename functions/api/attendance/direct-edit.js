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

    const body = await request.json();
    const { date, sessionId, fieldChanged, breakId, newValue, workMode, checkInTime, checkOutTime, breaks, leaveReason, reason } = body;

    // A. Full-Day Universal Edit by Date
    if (date) {
      let session = await env.DB.prepare(
        'SELECT * FROM attendance_sessions WHERE user_id = ? AND work_date = ? LIMIT 1'
      ).bind(user.id, date).first();

      const nowIso = new Date().toISOString();

      if (workMode === 'clear') {
        if (session) {
          await env.DB.prepare('DELETE FROM breaks WHERE session_id = ?').bind(session.id).run();
          await env.DB.prepare('DELETE FROM attendance_sessions WHERE id = ?').bind(session.id).run();
        }
        return jsonResponse({ message: 'Day cleared successfully', date, workMode: 'cleared' });
      }

      let sessId = session?.id;
      if (!sessId) {
        sessId = 'sess_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      }

      if (workMode === 'leave') {
        const lReason = leaveReason?.trim() || 'Personal Leave';
        if (session) {
          await env.DB.prepare('DELETE FROM breaks WHERE session_id = ?').bind(session.id).run();
          await env.DB.prepare(
            `UPDATE attendance_sessions 
             SET work_mode = 'leave', status = 'leave', leave_reason = ?, check_in_time = NULL, check_out_time = NULL, updated_at = datetime('now')
             WHERE id = ?`
          ).bind(lReason, session.id).run();
        } else {
          await env.DB.prepare(
            `INSERT INTO attendance_sessions (id, user_id, work_date, work_mode, leave_reason, status, is_auto_checkout, created_at, updated_at)
             VALUES (?, ?, ?, 'leave', ?, 'leave', 0, datetime('now'), datetime('now'))`
          ).bind(sessId, user.id, date, lReason).run();
        }
        return jsonResponse({ message: 'Marked as Leave', date, workMode: 'leave', leaveReason: lReason });
      }

      if (workMode === 'wfh') {
        if (session) {
          await env.DB.prepare('DELETE FROM breaks WHERE session_id = ?').bind(session.id).run();
          await env.DB.prepare(
            `UPDATE attendance_sessions 
             SET work_mode = 'wfh', status = 'completed', check_in_time = ?, check_out_time = ?, updated_at = datetime('now')
             WHERE id = ?`
          ).bind(checkInTime || nowIso, checkOutTime || nowIso, session.id).run();
        } else {
          await env.DB.prepare(
            `INSERT INTO attendance_sessions (id, user_id, work_date, work_mode, check_in_time, check_out_time, status, is_auto_checkout, created_at, updated_at)
             VALUES (?, ?, ?, 'wfh', ?, ?, 'completed', 0, datetime('now'), datetime('now'))`
          ).bind(sessId, user.id, date, checkInTime || nowIso, checkOutTime || nowIso).run();
        }
        return jsonResponse({ message: 'Marked as WFH', date, workMode: 'wfh' });
      }

      // Office Floor mode
      const sessionStatus = checkOutTime ? 'completed' : (checkInTime ? 'active' : 'not_checked_in');

      if (session) {
        await env.DB.prepare(
          `UPDATE attendance_sessions 
           SET work_mode = 'office', status = ?, check_in_time = ?, check_out_time = ?, updated_at = datetime('now')
           WHERE id = ?`
        ).bind(sessionStatus, checkInTime, checkOutTime, session.id).run();
      } else {
        await env.DB.prepare(
          `INSERT INTO attendance_sessions (id, user_id, work_date, work_mode, check_in_time, check_out_time, status, is_auto_checkout, created_at, updated_at)
           VALUES (?, ?, ?, 'office', ?, ?, ?, 0, datetime('now'), datetime('now'))`
        ).bind(sessId, user.id, date, checkInTime, checkOutTime, sessionStatus).run();
      }

      // Sync Breaks
      await env.DB.prepare('DELETE FROM breaks WHERE session_id = ?').bind(sessId).run();
      if (Array.isArray(breaks) && breaks.length > 0) {
        for (const b of breaks) {
          if (b.break_start) {
            const brkId = 'brk_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
            await env.DB.prepare(
              `INSERT INTO breaks (id, session_id, break_start, break_end, created_at)
               VALUES (?, ?, ?, ?, datetime('now'))`
            ).bind(brkId, sessId, b.break_start, b.break_end || null).run();
          }
        }
      }

      // Audit Log
      const logId = 'edit_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
      await env.DB.prepare(
        `INSERT INTO edit_logs (id, session_id, edited_by, field_changed, old_value, new_value, reason, approved_by, status, created_at)
         VALUES (?, ?, ?, 'full_day_edit', 'multiple', ?, ?, ?, 'approved', datetime('now'))`
      ).bind(logId, sessId, user.id, workMode, reason || 'User Day Edit', user.id).run();

      return jsonResponse({
        message: 'Day attendance updated successfully',
        date,
        sessionId: sessId,
        workMode: 'office',
        checkInTime,
        checkOutTime,
        breaksCount: breaks?.length || 0,
      });
    }

    // B. Legacy Single-Field Edit
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
