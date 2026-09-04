export async function onRequestPost() {
  return new Response(JSON.stringify({ message: 'Logged out successfully' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'ca_time_token=; Path=/; Max-Age=0; SameSite=Lax',
    },
  });
}
