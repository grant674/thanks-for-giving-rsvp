import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (client) return client;
  const url = Netlify.env.get("SUPABASE_URL");
  const key = Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

export type Rsvp = {
  id: string;
  attending: boolean;
  first_name: string;
  last_name: string;
  title: string | null;
  organization: string | null;
  email: string;
  phone: string | null;
  entree: string | null;
  dietary: string | null;
  guest_name: string | null;
  guest_title_org: string | null;
  guest_entree: string | null;
  guest_dietary: string | null;
  notes: string | null;
  manage_token: string;
  created_at: string;
};

export type Invitee = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  organization: string | null;
  category: string | null;
  email: string | null;
};

export async function logEmail(row: { kind: string; to_email: string; rsvp_id?: string | null; subject?: string; provider_id?: string | null; status?: string; error?: string | null }) {
  await db().from("tfg_email_log").insert({ status: "sent", ...row });
}

export async function alreadySent(kind: string, email: string): Promise<boolean> {
  const { data } = await db().from("tfg_email_log").select("id").eq("kind", kind).eq("status", "sent").ilike("to_email", email).limit(1);
  return !!(data && data.length);
}
