// Cloudflare Pages Functions Authentication Middleware

export async function signJWT(payload, secret) {
  const encoder = new TextEncoder();
  const header = { alg: 'HS256', typ: 'JWT' };
  
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const data = encoder.encode(`${encodedHeader}.${encodedPayload}`);
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, data);
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

export async function verifyJWT(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(`${parts[0]}.${parts[1]}`);
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    const sigStr = atob(parts[2].replace(/-/g, '+').replace(/_/g, '/'));
    const sigBuf = new Uint8Array(sigStr.length);
    for (let i = 0; i < sigStr.length; i++) sigBuf[i] = sigStr.charCodeAt(i);
    
    const valid = await crypto.subtle.verify('HMAC', key, sigBuf, data);
    if (!valid) return null;
    
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    
    return payload;
  } catch (err) {
    return null;
  }
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const secret = env.JWT_SECRET || 'catchabit_floor_hours_jwt_secret_token_key_2026';

  // Handle CORS Preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // Public Routes Bypass
  if (
    url.pathname.endsWith('/api/auth/login') ||
    url.pathname.endsWith('/api/health')
  ) {
    return await context.next();
  }

  // Extract Auth Token
  let token = null;
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) {
      const cookies = Object.fromEntries(cookieHeader.split(';').map(c => c.trim().split('=')));
      token = cookies['ca_time_token'];
    }
  }

  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized. Please log in.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const user = await verifyJWT(token, secret);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Session expired or invalid. Please log in again.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // All authenticated users have full access across the app
  context.data.user = user;
  return await context.next();
}
