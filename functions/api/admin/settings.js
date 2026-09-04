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

    const { results } = await env.DB.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const r of results || []) {
      settings[r.key] = r.value;
    }

    return jsonResponse({
      daily_target_hours: parseFloat(settings.daily_target_hours) || 7,
      auto_checkout_time: settings.auto_checkout_time || '20:00',
      work_days: settings.work_days || 'Mon,Tue,Wed,Thu,Fri,Sat',
    });
  } catch (err) {
    return jsonResponse({ error: err.message || 'Failed to fetch settings' }, 500);
  }
}

export async function onRequestPut(context) {
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
    const validKeys = ['daily_target_hours', 'auto_checkout_time', 'work_days'];

    for (const key of validKeys) {
      if (body[key] !== undefined) {
        await env.DB.prepare(
          'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
        ).bind(key, String(body[key])).run();
      }
    }

    return jsonResponse({ message: 'Settings updated successfully' });
  } catch (err) {
    return jsonResponse({ error: err.message || 'Failed to update settings' }, 500);
  }
}
