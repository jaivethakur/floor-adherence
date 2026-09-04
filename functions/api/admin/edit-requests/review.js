import { jsonResponse } from '../../_helpers.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const admin = context.data?.user;

  if (!admin || admin.role !== 'admin') {
    return jsonResponse({ error: 'Forbidden: Admin access required' }, 403);
  }

  try {
    if (!env.DB) {
      return jsonResponse({ error: 'Database not bound' }, 500);
    }

    const { requestId, action } = await request.json();

    if (!requestId || !action || !['approve', 'reject'].includes(action)) {
      return jsonResponse({ error: 'Request ID and a valid action (approve/reject) are required' }, 400);
    }

    // 1. Fetch edit request
    const editReq = await env.DB.prepare('SELECT * FROM edit_logs WHERE id = ?').bind(requestId).first();
    if (!editReq) {
      return jsonResponse({ error: 'Edit request not found' }, 404);
    }

    if (editReq.status !== 'pending') {
      return jsonResponse({ error: `This request has already been ${editReq.status}.` }, 400);
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // 2. If approved, apply change
    if (action === 'approve') {
      const { session_id, field_changed, break_id, new_value } = editReq;

      if (field_changed === 'check_in_time') {
        await env.DB.prepare(
          "UPDATE attendance_sessions SET check_in_time = ?, updated_at = datetime('now') WHERE id = ?"
        ).bind(new_value, session_id).run();
      } else if (field_changed === 'check_out_time') {
        await env.DB.prepare(
          "UPDATE attendance_sessions SET check_out_time = ?, updated_at = datetime('now') WHERE id = ?"
        ).bind(new_value, session_id).run();
      } else if (field_changed === 'break_start' && break_id) {
        await env.DB.prepare('UPDATE breaks SET break_start = ? WHERE id = ?').bind(new_value, break_id).run();
      } else if (field_changed === 'break_end' && break_id) {
        await env.DB.prepare('UPDATE breaks SET break_end = ? WHERE id = ?').bind(new_value, break_id).run();
      }
    }

    // 3. Update edit_logs row
    await env.DB.prepare(
      'UPDATE edit_logs SET status = ?, approved_by = ? WHERE id = ?'
    ).bind(newStatus, admin.id, requestId).run();

    return jsonResponse({
      message: `Edit request ${newStatus} successfully`,
      requestId,
      status: newStatus,
    });
  } catch (err) {
    return jsonResponse({ error: err.message || 'Failed to review edit request' }, 500);
  }
}
