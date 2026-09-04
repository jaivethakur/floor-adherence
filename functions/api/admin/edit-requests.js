import { jsonResponse } from '../_helpers.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const admin = context.data?.user;

  if (!admin || admin.role !== 'admin') {
    return jsonResponse({ error: 'Forbidden: Admin access required' }, 403);
  }

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get('status'); // 'pending' | 'approved' | 'rejected' | null

  try {
    if (!env.DB) {
      return jsonResponse({ error: 'Database not bound' }, 500);
    }

    let query = `
      SELECT 
        e.*,
        u.name as employee_name,
        u.email as employee_email,
        s.work_date,
        s.check_in_time as session_check_in,
        s.check_out_time as session_check_out,
        u_app.name as approver_name
      FROM edit_logs e
      JOIN attendance_sessions s ON e.session_id = s.id
      JOIN users u ON e.edited_by = u.id
      LEFT JOIN users u_app ON e.approved_by = u_app.id
    `;

    const params = [];
    if (statusFilter) {
      query += ' WHERE e.status = ?';
      params.push(statusFilter);
    }

    query += " ORDER BY CASE WHEN e.status = 'pending' THEN 0 ELSE 1 END, e.created_at DESC";

    const { results } = await env.DB.prepare(query).bind(...params).all();

    return jsonResponse({ requests: results || [] });
  } catch (err) {
    return jsonResponse({ error: err.message || 'Failed to fetch edit requests' }, 500);
  }
}
