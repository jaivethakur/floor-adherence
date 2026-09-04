import { signJWT } from '../_middleware.js';
import { jsonResponse } from '../_helpers.js';

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'catchabit_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const secret = env.JWT_SECRET || 'catchabit_floor_hours_jwt_secret_token_key_2026';

  try {
    const { name, email, password } = await request.json().catch(() => ({}));

    if (!name || !email || !password) {
      return jsonResponse({ error: 'Name, email, and password are required' }, 400);
    }

    const cleanName = name.trim();
    const cleanEmail = email.toLowerCase().trim();
    const cleanPass = password.trim();

    if (cleanName.length < 2) {
      return jsonResponse({ error: 'Name must be at least 2 characters long' }, 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return jsonResponse({ error: 'Please provide a valid email address' }, 400);
    }

    if (cleanPass.length < 6) {
      return jsonResponse({ error: 'Password must be at least 6 characters long' }, 400);
    }

    const userId = 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

    if (env.DB) {
      const existing = await env.DB.prepare(
        'SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1'
      ).bind(cleanEmail).first();

      if (existing) {
        return jsonResponse({ error: 'An account with this email already exists. Please sign in.' }, 409);
      }

      const passwordHash = await hashPassword(cleanPass);

      await env.DB.prepare(
        `INSERT INTO users (id, name, email, password_hash, role, is_active, created_at)
         VALUES (?, ?, ?, ?, 'employee', 1, datetime('now'))`
      ).bind(userId, cleanName, cleanEmail, passwordHash).run();
    }

    const token = await signJWT(
      {
        id: userId,
        name: cleanName,
        email: cleanEmail,
        role: 'employee',
      },
      secret
    );

    return jsonResponse({
      message: 'Account created successfully',
      token,
      user: {
        id: userId,
        name: cleanName,
        email: cleanEmail,
        role: 'employee',
      },
    }, 201);
  } catch (err) {
    return jsonResponse({ error: err.message || 'Registration failed' }, 500);
  }
}
