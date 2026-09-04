import { jsonResponse } from '../_helpers.js';

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'catchabit_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestGet(context) {
  const { env } = context;
  const admin = context.data?.user;

  if (!admin || admin.role !== 'admin') {
    return jsonResponse({ error: 'Forbidden: Admin access required' }, 403);
  }

  try {
    if (!env.DB) {
      return jsonResponse({ error: 'Database not bound' }, 500);
    }

    const { results } = await env.DB.prepare(
      'SELECT id, name, email, role, is_active, created_at FROM users ORDER BY name ASC'
    ).all();

    return jsonResponse({ users: results || [] });
  } catch (err) {
    return jsonResponse({ error: err.message || 'Failed to fetch users' }, 500);
  }
}

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

    const { name, email, password, role } = await request.json();

    if (!name || !email || !password) {
      return jsonResponse({ error: 'Name, email, and password are required' }, 400);
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanRole = role === 'admin' ? 'admin' : 'employee';
    const pwdHash = await hashPassword(password.trim());
    const newId = 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

    await env.DB.prepare(
      'INSERT INTO users (id, name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, 1)'
    ).bind(newId, name.trim(), cleanEmail, pwdHash, cleanRole).run();

    return jsonResponse({
      message: 'User created successfully',
      user: { id: newId, name: name.trim(), email: cleanEmail, role: cleanRole },
    }, 201);
  } catch (err) {
    return jsonResponse({ error: err.message || 'Failed to create user' }, 500);
  }
}
