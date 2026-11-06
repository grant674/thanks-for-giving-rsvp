// Admin endpoints require the shared admin key in the x-admin-key header.
export function requireAdmin(req: Request): Response | null {
  const expected = Netlify.env.get("ADMIN_PASSWORD");
  if (!expected) return Response.json({ error: "ADMIN_PASSWORD is not configured" }, { status: 500 });
  const given = req.headers.get("x-admin-key") || "";
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

function timingSafeEqual(a: string, b: string): boolean {
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
