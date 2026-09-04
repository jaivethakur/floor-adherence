import { jsonResponse, calculateSessionSeconds } from '../_helpers.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const user = context.data?.user;

  if (!user) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId');
  const workDate = url.searchParams.get('date');
  const targetUserId = url.searchParams.get('userId') || user.id;

  if (user.role !== 'admin' && targetUserId !== user.id) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }

  try {
    if (!env.DB) {
      return jsonResponse({ error: 'Database not bound' }, 500);
    }

    let session = null;
    if (sessionId) {
      session = await env.DB.prepare('SELECT * FROM attendance_sessions WHERE id = ?').bind(sessionId).first();
    } else if (workDate) {
      session = await env.DB.prepare(
        'SELECT * FROM attendance_sessions WHERE user_id = ? AND work_date = ? LIMIT 1'
      ).bind(targetUserId, workDate).first();
    }

    if (!session) {
      return jsonResponse({ session: null, breaks: [], edits: [] });
    }

    // Verify access
    if (user.role !== 'admin' && session.user_id !== user.id) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    // Fetch breaks
    const breaksRes = await env.DB.prepare(
      'SELECT * FROM breaks WHERE session_id = ? ORDER BY break_start ASC'
    ).bind(session.id).all();
    const breaks = breaksRes?.results || [];

    // Fetch audit edit logs
    const editsRes = await env.DB.prepare(
      `SELECT e.*, u.name as editor_name 
       FROM edit_logs e 
       LEFT JOIN users u ON e.edited_by = u.id 
       WHERE e.session_id = ? 
       ORDER BY e.created_at DESC`
    ).bind(session.id).all();
    const edits = editsRes?.results || [];

    const stats = calculateSessionSeconds(session, breaks);

    return jsonResponse({
      session,
      breaks,
      edits,
      stats,
    });
  } catch (err) {
    return jsonResponse({ error: err.message || 'Failed to fetch session detail' }, 500);
  }
}
