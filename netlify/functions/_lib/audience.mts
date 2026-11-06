import { db } from "./db.mts";
import type { Audience } from "./config.mts";

export type Recipient = { email: string; first_name: string | null; rsvp_id?: string | null };

// confirmed: RSVP yes · declined: RSVP no · nonresponders: on the invite list with no RSVP · all: invitees plus anyone who RSVP'd
export async function recipientsFor(audience: Audience): Promise<Recipient[]> {
  const supabase = db();
  const { data: rsvps } = await supabase.from("tfg_rsvps").select("id,email,first_name,attending");
  const { data: invitees } = await supabase.from("tfg_invitees").select("email,first_name");
  const rsvpByEmail = new Map((rsvps || []).map(r => [r.email.toLowerCase(), r]));
  const out = new Map<string, Recipient>();

  if (audience === "confirmed" || audience === "all") {
    for (const r of rsvps || []) if (r.attending) out.set(r.email.toLowerCase(), { email: r.email, first_name: r.first_name, rsvp_id: r.id });
  }
  if (audience === "declined") {
    for (const r of rsvps || []) if (!r.attending) out.set(r.email.toLowerCase(), { email: r.email, first_name: r.first_name, rsvp_id: r.id });
  }
  if (audience === "nonresponders" || audience === "all") {
    for (const i of invitees || []) {
      if (!i.email) continue;
      const e = i.email.toLowerCase();
      if (!rsvpByEmail.has(e)) out.set(e, { email: i.email, first_name: i.first_name });
    }
  }
  return [...out.values()];
}
