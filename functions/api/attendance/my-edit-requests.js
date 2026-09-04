import { jsonResponse } from '../_helpers.js';

export async function onRequestGet(context) {
  const { env } = context;
  const user = context.data?.user;

  if (!user) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  try {
    if (!env.DB) {
      return jsonResponse({ error: 'Database not bound' }, 500);
    }

    const { results } = await env.DB.prepare(
      `SELECT e.*, s.work_date, u_app.name as approver_name
       FROM edit_logs e
       JOIN attendance_sessions s ON e.session_id = s.id
       LEFT JOIN users u_app ON e.approved_by = u_app.id
       WHERE e.edited_by = ?
       ORDER BY e.created_at DESC`
    ).bind(user.id).all();

    return jsonResponse({ requests: results || [] });
  } catch (err) {
    return jsonResponse({ error: err.message || 'Failed to fetch edit requests' }, 500);
  }
}
