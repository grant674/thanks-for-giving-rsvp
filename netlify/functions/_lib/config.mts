// Event facts and the reminder schedule. Edit here; redeploy to apply.
export const EVENT = {
  name: "Thanks for Answering the Call: A Celebration of Firefighters and Those Who Support Them",
  shortName: "Thanks for Answering the Call",
  host: "PMI U.S.",
  dateLabel: "Tuesday, December 1, 2026",
  dateISO: "2026-12-01",
  timezone: "America/Phoenix",
  startLocal: "08:30",
  endLocal: "10:30",
  schedule: [
    "8:30 a.m. Check-in and breakfast",
    "9:15 a.m. Program",
    "10:00 a.m. Networking and optional museum tour",
    "10:30 a.m. Event concludes",
  ],
  venue: "Hall of Flame Museum of Firefighting",
  address1: "6101 E. Van Buren St.",
  address2: "Phoenix, AZ 85008",
  parking: "Complimentary parking in the museum lot. Look for the fire engine at the entrance.",
  rsvpDeadline: "Tuesday, November 17",
  beneficiaries: "the Professional Fire Fighters of Arizona and the Hall of Flame Museum of Firefighting",
  contactName: "Grant Packwood",
  contactEmail: "grant@pachecoventuresaz.com",
  contactPhone: "(602) 617-3881",
  mapsUrl: "https://maps.google.com/?q=6101+E+Van+Buren+St,+Phoenix,+AZ+85008",
};

// Reminders are evaluated once a day at 9:00 AM Phoenix (16:00 UTC; Arizona does not observe DST).
// Each reminder sends once per recipient per kind; the email log prevents repeats.
export type Audience = "confirmed" | "declined" | "nonresponders" | "all";
export const REMINDERS: { kind: string; sendOn: string; audience: Audience; subject: string }[] = [
  { kind: "reminder_2wk",   sendOn: "2026-11-17", audience: "nonresponders", subject: "A reminder to RSVP: Thanks for Answering the Call, December 1" },
  { kind: "reminder_1wk",   sendOn: "2026-11-24", audience: "confirmed",     subject: "One week out: Thanks for Answering the Call" },
  { kind: "reminder_dayof", sendOn: "2026-11-30", audience: "confirmed",     subject: "Tomorrow morning: arrival and parking for Thanks for Answering the Call" },
];

export const FROM = () => Netlify.env.get("FROM_EMAIL") || "Thanks for Answering the Call <rsvp@pachecoventuresaz.com>";
export const REPLY_TO = () => Netlify.env.get("REPLY_TO_EMAIL") || EVENT.contactEmail;
export const SITE_URL = () => (Netlify.env.get("SITE_URL") || Netlify.env.get("URL") || "https://thanks-for-giving-rsvp.netlify.app").replace(/\/$/, "");
