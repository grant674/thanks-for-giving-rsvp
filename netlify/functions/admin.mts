import type { Config, Context } from "@netlify/functions";
import { db } from "./_lib/db.mts";
import { requireAdmin } from "./_lib/auth.mts";
import { recipientsFor } from "./_lib/audience.mts";
import { sendEmail, updateHtml, reminderHtml, confirmationHtml } from "./_lib/email.mts";
import { REMINDERS, type Audience } from "./_lib/config.mts";

// Admin API behind the shared key. Routes:
//   GET  /api/admin/summary          counts, entree totals, reminder status
//   GET  /api/admin/rsvps            all RSVPs (JSON); ?format=csv for the caterer and seating
//   GET  /api/admin/invitees         invite list
//   POST /api/admin/invitees         { csv: "first_name,last_name,title,organization,category,email,phone\n..." } upsert by email
//   POST /api/admin/send             { audience, subject, body_html, test_to? } send an update (test_to sends one copy only)
//   POST /api/admin/send-reminder    { kind, test_to? } send a scheduled reminder now
//   POST /api/admin/resend-confirmation { rsvp_id }

export default async (req: Request, context: Context) => {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const action = context.params.action;
  const supabase = db();

  if (req.method === "GET" && action === "summary") {
    const { data: rsvps } = await supabase.from("tfg_rsvps").select("attending,guest_name");
    const { count: invitees } = await supabase.from("tfg_invitees").select("id", { count: "exact", head: true });
    const { data: entrees } = await supabase.from("tfg_entree_counts").select("*");
    const { data: log } = await supabase.from("tfg_email_log").select("kind,status");
    const confirmed = (rsvps || []).filter(r => r.attending);
    const seats = confirmed.length + confirmed.filter(r => r.guest_name).length;
    const emailStats: Record<string, Record<string, number>> = {};
    for (const l of log || []) { emailStats[l.kind] ??= {}; emailStats[l.kind][l.status] = (emailStats[l.kind][l.status] || 0) + 1; }
    return Response.json({
      invitees: invitees || 0,
      responses: (rsvps || []).length,
      confirmed: confirmed.length,
      declined: (rsvps || []).length - confirmed.length,
      seats,
      entrees: entrees || [],
      reminders: REMINDERS.map(r => ({ ...r, log: emailStats[r.kind] || {} })),
      email: emailStats,
    });
  }

  if (req.method === "GET" && action === "rsvps") {
    const { data } = await supabase.from("tfg_rsvps").select("*").order("created_at", { ascending: false });
    const url = new URL(req.url);
    if (url.searchParams.get("format") === "csv") {
      const cols = ["created_at", "attending", "first_name", "last_name", "title", "organization", "email", "phone", "entree", "dietary", "guest_name", "guest_title_org", "guest_entree", "guest_dietary", "notes", "confirmation_sent_at"];
      const q = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const csv = [cols.join(","), ...(data || []).map(r => cols.map(c => q(c === "attending" ? (r.attending ? "Yes" : "No") : (r as any)[c])).join(","))].join("\r\n");
      return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="thanks-for-giving-rsvps-${new Date().toISOString().slice(0, 10)}.csv"` } });
    }
    return Response.json({ rsvps: (data || []).map(({ manage_token, source_ip, user_agent, ...r }) => r) });
  }

  if (req.method === "GET" && action === "invitees") {
    const { data } = await supabase.from("tfg_invitees").select("*").order("last_name");
    return Response.json({ invitees: data || [] });
  }

  if (req.method === "POST" && action === "invitees") {
    const { csv } = await req.json();
    const lines = String(csv || "").split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return Response.json({ error: "Paste a header row plus at least one invitee." }, { status: 400 });
    const header = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
    const rows = lines.slice(1).map(l => {
      const cells = l.match(/("([^"]|"")*"|[^,]*)(,|$)/g)?.map(c => c.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"').trim()) || [];
      const o: Record<string, string | null> = {};
      header.forEach((h, i) => { if (["first_name", "last_name", "title", "organization", "category", "email", "phone", "notes"].includes(h)) o[h] = cells[i] || null; });
      if (o.email) o.email = o.email.toLowerCase();
      return o;
    }).filter(o => o.email);
    const { error, data } = await supabase.from("tfg_invitees").upsert(rows, { onConflict: "email" }).select("id");
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ upserted: data?.length || 0 });
  }

  if (req.method === "POST" && action === "send") {
    const { audience, subject, body_html, test_to } = await req.json() as { audience: Audience; subject: string; body_html: string; test_to?: string };
    if (!subject || !body_html) return Response.json({ error: "Subject and body are required." }, { status: 400 });
    if (test_to) {
      const res = await sendEmail({ to: test_to, subject: `[TEST] ${subject}`, html: updateHtml(subject, body_html, "Test"), kind: "test" });
      return Response.json({ test: true, ...res });
    }
    const people = await recipientsFor(audience);
    let sent = 0, failed = 0;
    for (const p of people) {
      const res = await sendEmail({ to: p.email, subject, html: updateHtml(subject, body_html, p.first_name), kind: "update", rsvpId: p.rsvp_id ?? null });
      res.ok ? sent++ : failed++;
    }
    await supabase.from("tfg_updates").insert({ audience, subject, body_html, recipient_count: sent, sent_by: "admin" });
    return Response.json({ audience, recipients: people.length, sent, failed });
  }

  if (req.method === "POST" && action === "send-reminder") {
    const { kind, test_to } = await req.json();
    const rem = REMINDERS.find(r => r.kind === kind);
    if (!rem) return Response.json({ error: "Unknown reminder" }, { status: 400 });
    if (test_to) {
      const res = await sendEmail({ to: test_to, subject: `[TEST] ${rem.subject}`, html: reminderHtml(kind, { first_name: "Test" }), kind: "test" });
      return Response.json({ test: true, ...res });
    }
    const people = await recipientsFor(rem.audience);
    let sent = 0, failed = 0, skipped = 0;
    for (const p of people) {
      const { data: prior } = await supabase.from("tfg_email_log").select("id").eq("kind", kind).eq("status", "sent").ilike("to_email", p.email).limit(1);
      if (prior && prior.length) { skipped++; continue; }
      const res = await sendEmail({ to: p.email, subject: rem.subject, html: reminderHtml(kind, p), kind, rsvpId: p.rsvp_id ?? null });
      res.ok ? sent++ : failed++;
    }
    return Response.json({ kind, recipients: people.length, sent, skipped, failed });
  }

  if (req.method === "POST" && action === "resend-confirmation") {
    const { rsvp_id } = await req.json();
    const { data: r } = await supabase.from("tfg_rsvps").select("*").eq("id", rsvp_id).single();
    if (!r) return Response.json({ error: "Not found" }, { status: 404 });
    const res = await sendEmail({ to: r.email, subject: r.attending ? "You are confirmed: Thanks for Answering the Call" : "Thank you for your response: Thanks for Answering the Call", html: confirmationHtml(r), kind: "confirmation", rsvpId: r.id, attachIcs: r.attending });
    return Response.json(res);
  }

  return Response.json({ error: "Not found" }, { status: 404 });
};

export const config: Config = { path: "/api/admin/:action", method: ["GET", "POST"] };
