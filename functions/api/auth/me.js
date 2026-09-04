export async function onRequestGet(context) {
  const user = context.data?.user;

  if (!user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
