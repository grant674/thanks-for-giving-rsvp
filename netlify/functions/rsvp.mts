import type { Config, Context } from "@netlify/functions";
import { db, type Rsvp } from "./_lib/db.mts";
import { confirmationHtml, sendEmail } from "./_lib/email.mts";
import { EVENT } from "./_lib/config.mts";

const ENTREES = new Set(["Brioche French Toast", "Sausage and Egg Brioche Sandwich", "Dietary alternate (please describe below)"]);
const clean = (v: FormDataEntryValue | null, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const ct = req.headers.get("content-type") || "";
  const form = ct.includes("application/json")
    ? Object.entries(await req.json()).reduce((fd, [k, v]) => (fd.append(k, String(v ?? "")), fd), new FormData())
    : await req.formData();

  // Honeypot
  if (clean(form.get("bot-field"))) return Response.json({ ok: true });

  const attendingRaw = clean(form.get("attending"));
  const attending = attendingRaw.toLowerCase().startsWith("yes");
  const email = clean(form.get("email")).toLowerCase();
  const first_name = clean(form.get("first_name"), 80);
  const last_name = clean(form.get("last_name"), 80);
  const entree = clean(form.get("entree"));

  const errors: string[] = [];
  if (!attendingRaw) errors.push("Please tell us whether you will attend.");
  if (!first_name || !last_name) errors.push("First and last name are required.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push("A valid email is required.");
  if (attending && !ENTREES.has(entree)) errors.push("Please choose an entree.");
  if (errors.length) return Response.json({ ok: false, errors }, { status: 400 });

  const row = {
    attending,
    first_name, last_name,
    title: clean(form.get("title")) || null,
    organization: clean(form.get("organization")) || null,
    email,
    phone: clean(form.get("phone"), 40) || null,
    entree: attending ? entree : null,
    dietary: attending ? clean(form.get("dietary"), 500) || null : null,
    guest_name: attending ? clean(form.get("guest_name")) || null : null,
    guest_title_org: attending ? clean(form.get("guest_title_org")) || null : null,
    guest_entree: attending ? clean(form.get("guest_entree")) || null : null,
    guest_dietary: attending ? clean(form.get("guest_dietary"), 500) || null : null,
    notes: clean(form.get("notes"), 1000) || null,
    source_ip: context.ip || null,
    user_agent: (req.headers.get("user-agent") || "").slice(0, 300) || null,
    updated_at: new Date().toISOString(),
  };

  const supabase = db();

  // One RSVP per email: a resubmission updates the earlier response.
  const { data: existing } = await supabase.from("tfg_rsvps").select("id").ilike("email", email).limit(1).maybeSingle();
  let saved: Rsvp;
  if (existing) {
    const { data, error } = await supabase.from("tfg_rsvps").update(row).eq("id", existing.id).select("*").single();
    if (error) return Response.json({ ok: false, errors: ["We could not save your response. Please try again."] }, { status: 500 });
    saved = data as Rsvp;
  } else {
    const { data: inv } = await supabase.from("tfg_invitees").select("id").ilike("email", email).limit(1).maybeSingle();
    const { data, error } = await supabase.from("tfg_rsvps").insert({ ...row, invitee_id: inv?.id ?? null }).select("*").single();
    if (error) return Response.json({ ok: false, errors: ["We could not save your response. Please try again."] }, { status: 500 });
    saved = data as Rsvp;
  }

  // Confirmation email (does not block the guest if the provider is down).
  const subject = attending
    ? `You are confirmed: Thanks for Answering the Call, ${EVENT.dateLabel}`
    : `Thank you for your response: Thanks for Answering the Call`;
  context.waitUntil((async () => {
    const res = await sendEmail({ to: email, subject, html: confirmationHtml(saved), kind: "confirmation", rsvpId: saved.id, attachIcs: attending });
    if (res.ok) await supabase.from("tfg_rsvps").update({ confirmation_sent_at: new Date().toISOString() }).eq("id", saved.id);
  })());

  // Browser form posts get redirected to the thank-you page; fetch() callers get JSON.
  const wantsJson = (req.headers.get("accept") || "").includes("application/json");
  if (wantsJson) return Response.json({ ok: true, attending });
  return Response.redirect(new URL(attending ? "/thank-you" : "/thank-you?declined=1", req.url).toString(), 303);
};

export const config: Config = { path: "/api/rsvp", method: ["POST"] };
