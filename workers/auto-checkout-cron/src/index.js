// Cloudflare Cron Worker: Daily 8:00 PM IST Auto-Checkout
// Fires every day at 14:30 UTC = 20:00 IST

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function getISTDateString(date = new Date()) {
  const istDate = new Date(date.getTime() + IST_OFFSET_MS);
  return istDate.toISOString().split('T')[0];
}

async function performAutoCheckout(env, overrideWorkDate = null) {
  if (!env.DB) {
    console.error('[AutoCheckout] Error: DB binding not found.');
    return { error: 'DB binding not found' };
  }

  const now = new Date();
  const todayIST = overrideWorkDate || getISTDateString(now);

  // Construct exact 8:00 PM IST timestamp for today
  // 20:00:00 IST is 14:30:00 UTC
  const [year, month, day] = todayIST.split('-').map(Number);
  const checkoutTimeUtc = new Date(Date.UTC(year, month - 1, day, 14, 30, 0)).toISOString();

  console.log(`[AutoCheckout] Running for work_date: ${todayIST} at target checkout time: ${checkoutTimeUtc}`);

  // 1. Find all active or on_break sessions for today
  const { results: pendingSessions } = await env.DB.prepare(
    "SELECT id, user_id, status FROM attendance_sessions WHERE work_date = ? AND status IN ('active', 'on_break')"
  ).bind(todayIST).all();

  if (!pendingSessions || pendingSessions.length === 0) {
    console.log(`[AutoCheckout] No unclosed sessions found for ${todayIST}.`);
    return { count: 0, message: 'No unclosed sessions found.' };
  }

  let closedCount = 0;

  for (const session of pendingSessions) {
    try {
      // If currently on break, close open break with the 8 PM IST timestamp
      if (session.status === 'on_break') {
        await env.DB.prepare(
          'UPDATE breaks SET break_end = ? WHERE session_id = ? AND break_end IS NULL'
        ).bind(checkoutTimeUtc, session.id).run();
      }

      // Close session with 8 PM IST timestamp and mark is_auto_checkout = 1
      await env.DB.prepare(
        `UPDATE attendance_sessions 
         SET check_out_time = ?, status = 'completed', is_auto_checkout = 1, updated_at = datetime('now')
         WHERE id = ?`
      ).bind(checkoutTimeUtc, session.id).run();

      closedCount++;
      console.log(`[AutoCheckout] Auto-checked out session: ${session.id} (user: ${session.user_id})`);
    } catch (sessionErr) {
      console.error(`[AutoCheckout] Error closing session ${session.id}:`, sessionErr);
    }
  }

  return {
    success: true,
    workDate: todayIST,
    closedCount,
    checkoutTimeUtc,
  };
}

export default {
  // Scheduled Cron Handler
  async scheduled(event, env, ctx) {
    console.log(`[AutoCheckout Cron] Triggered by cron ${event.cron} at ${new Date().toISOString()}`);
    ctx.waitUntil(performAutoCheckout(env));
  },

  // HTTP Handler (for testing / manual admin trigger)
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/trigger' || url.pathname === '/run') {
      const authKey = request.headers.get('x-cron-key') || url.searchParams.get('key');
      // Simple security protection
      if (authKey !== 'catchabit_run_auto_checkout_2026') {
        return new Response(JSON.stringify({ error: 'Unauthorized manual cron trigger' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const overrideDate = url.searchParams.get('date');
      const result = await performAutoCheckout(env, overrideDate);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ service: 'CatchAbit Floor Hours Auto Checkout Cron Worker', status: 'healthy' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
