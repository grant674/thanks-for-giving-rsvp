import type { Config } from "@netlify/functions";
import { db, alreadySent } from "./_lib/db.mts";
import { REMINDERS } from "./_lib/config.mts";
import { reminderHtml, sendEmail } from "./_lib/email.mts";
import { recipientsFor } from "./_lib/audience.mts";

// Runs daily at 16:00 UTC = 9:00 AM Phoenix (Arizona does not observe DST).
// Sends each reminder whose sendOn date is today or earlier (so a missed day catches up),
// once per recipient, as recorded in tfg_email_log.
export default async (req: Request) => {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Phoenix" }); // YYYY-MM-DD
  const due = REMINDERS.filter(r => r.sendOn <= today);
  const summary: Record<string, { sent: number; skipped: number; failed: number }> = {};

  for (const rem of due) {
    const stats = { sent: 0, skipped: 0, failed: 0 };
    const people = await recipientsFor(rem.audience);
    for (const p of people) {
      if (!p.email) continue;
      if (await alreadySent(rem.kind, p.email)) { stats.skipped++; continue; }
      const res = await sendEmail({ to: p.email, subject: rem.subject, html: reminderHtml(rem.kind, p), kind: rem.kind, rsvpId: p.rsvp_id ?? null });
      res.ok ? stats.sent++ : stats.failed++;
    }
    summary[rem.kind] = stats;
  }
  console.log("reminders", today, JSON.stringify(summary));
  return Response.json({ today, summary });
};

export const config: Config = { schedule: "0 16 * * *" };
