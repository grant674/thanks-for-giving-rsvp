import { Resend } from "resend";
import { EVENT, FROM, REPLY_TO, SITE_URL } from "./config.mts";
import { logEmail, type Rsvp } from "./db.mts";

const C = { cream: "#F7F2EA", paper: "#FFFDF9", char: "#1F1B1A", dim: "#6B5E54", red: "#B3261E", navy: "#1F2A44", line: "#E3D9C8" };

function esc(s: string | null | undefined): string {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

// Branded shell shared by every message. Inline CSS only, table layout, reads well in Outlook and Gmail.
export function shell(opts: { eyebrow: string; headline: string; bodyHtml: string; preheader?: string }): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(opts.headline)}</title></head>
<body style="margin:0;padding:0;background:${C.cream};">
<span style="display:none;font-size:1px;color:${C.cream};max-height:0;overflow:hidden;">${esc(opts.preheader || "")}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.cream};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:${C.paper};border:1px solid ${C.navy};">
<tr><td style="height:8px;background:${C.red};font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:36px 40px 8px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:${C.navy};">${esc(opts.eyebrow)}</td></tr>
<tr><td style="padding:0 40px;text-align:center;font-family:'Arial Narrow',Impact,Arial,sans-serif;font-size:44px;line-height:1;font-weight:bold;text-transform:uppercase;color:${C.char};">Thanks for <span style="color:${C.red};">Giving</span></td></tr>
<tr><td style="padding:6px 40px 20px;text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-style:italic;color:${C.char};">Kickoff Breakfast</td></tr>
<tr><td style="padding:0 40px;"><div style="border-top:1px solid ${C.navy};"></div></td></tr>
<tr><td style="padding:24px 40px 8px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:bold;color:${C.char};">${esc(opts.headline)}</td></tr>
<tr><td style="padding:0 40px 28px;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.5;color:${C.char};">${opts.bodyHtml}</td></tr>
<tr><td style="padding:0 40px;"><div style="border-top:1px solid ${C.navy};"></div></td></tr>
<tr><td style="padding:18px 40px 28px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${C.navy};line-height:1.7;">Hosted by ${esc(EVENT.host)}<br>In support of ${esc(EVENT.beneficiaries)}</td></tr>
</table>
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;"><tr><td style="padding:14px 8px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${C.dim};">Questions: ${esc(EVENT.contactName)}, <a href="mailto:${EVENT.contactEmail}" style="color:${C.navy};">${EVENT.contactEmail}</a> · ${esc(EVENT.contactPhone)}</td></tr></table>
</td></tr></table></body></html>`;
}

export function factsBlock(): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;border:1px solid ${C.line};background:#fff;"><tr><td style="padding:18px 20px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.5;color:${C.char};">
<div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${C.navy};">When</div>
<div style="font-weight:bold;font-size:18px;">${esc(EVENT.dateLabel)}</div>
<div>${EVENT.schedule.map(esc).join("<br>")}</div>
<div style="height:12px;"></div>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${C.navy};">Where</div>
<div style="font-weight:bold;font-size:18px;">${esc(EVENT.venue)}</div>
<div>${esc(EVENT.address1)}<br>${esc(EVENT.address2)} · <a href="${EVENT.mapsUrl}" style="color:${C.navy};">Map</a></div>
<div style="color:${C.dim};font-style:italic;">${esc(EVENT.parking)}</div>
</td></tr></table>`;
}

export function button(label: string, href: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:18px auto;"><tr><td style="background:${C.red};"><a href="${href}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:3px;text-transform:uppercase;font-weight:bold;color:#ffffff;text-decoration:none;">${esc(label)}</a></td></tr></table>`;
}

export function icsFile(): string {
  // 8:30 to 10:00 AM Phoenix = 15:30 to 17:00 UTC (no DST in Arizona)
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Pacheco Ventures//Thanks for Giving//EN", "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:thanks-for-giving-2026-12-01@${SITE_URL().replace(/^https?:\/\//, "")}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}`,
    "DTSTART:20261201T153000Z", "DTEND:20261201T170000Z",
    `SUMMARY:${EVENT.name}`,
    `LOCATION:${EVENT.venue}\\, ${EVENT.address1}\\, ${EVENT.address2}`,
    `DESCRIPTION:Hosted by ${EVENT.host}. Check-in and breakfast 8:30 AM\\, program 9:00 to 9:40 AM\\, museum tour to 10:00 AM. ${EVENT.parking}`,
    `URL:${SITE_URL()}`,
    "END:VEVENT", "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

export function confirmationHtml(r: Rsvp): string {
  const first = esc(r.first_name);
  if (!r.attending) {
    return shell({
      eyebrow: "Response received",
      headline: `Thank you, ${first}.`,
      preheader: "We have your response for December 1.",
      bodyHtml: `<p>We are sorry you cannot join us on ${esc(EVENT.dateLabel)}, and we appreciate you letting us know.</p>
<p>${esc(EVENT.shortName)} continues through the holiday season with meals and thank-you kits for ten Valley fire stations. If your plans change, reply to this email and we will do our best to hold a seat.</p>`,
    });
  }
  const guest = r.guest_name ? `<p><strong>Your guest:</strong> ${esc(r.guest_name)}${r.guest_title_org ? `, ${esc(r.guest_title_org)}` : ""}${r.guest_entree ? ` · ${esc(r.guest_entree)}` : ""}</p>` : "";
  return shell({
    eyebrow: "You are confirmed",
    headline: `We look forward to seeing you, ${first}.`,
    preheader: `Confirmed for ${EVENT.dateLabel}. Your entree: ${r.entree || "to be confirmed"}.`,
    bodyHtml: `<p>Your seat is reserved for the ${esc(EVENT.name)}, honoring the men and women of Arizona’s fire service and launching a season of giving for Valley firehouses.</p>
${factsBlock()}
<p><strong>Your entree:</strong> ${esc(r.entree || "To be confirmed")}${r.dietary ? `<br><strong>Dietary note:</strong> ${esc(r.dietary)}` : ""}</p>
${guest}
<p>A calendar invitation is attached. We will send arrival details the day before the event. If anything changes, reply to this email.</p>`,
  });
}

export function reminderHtml(kind: string, r: { first_name: string | null }): string {
  const first = esc(r.first_name || "there");
  if (kind === "reminder_2wk") {
    return shell({
      eyebrow: "A reminder to reply",
      headline: `${first}, may we save you a seat?`,
      preheader: `Please reply by ${EVENT.rsvpDeadline}.`,
      bodyHtml: `<p>${esc(EVENT.host)} invites you to the ${esc(EVENT.name)}, a morning with Arizona’s fire chiefs, elected officials and civic leaders to thank Valley firefighters and launch a season of giving.</p>
${factsBlock()}
<p>Seating is limited and the caterer needs our count soon. Please let us know by <strong>${esc(EVENT.rsvpDeadline)}</strong>.</p>
${button("RSVP now", SITE_URL())}`,
    });
  }
  if (kind === "reminder_1wk") {
    return shell({
      eyebrow: "One week out",
      headline: `${first}, we will see you Tuesday the 1st.`,
      preheader: "Your seat is reserved. Here are the details again.",
      bodyHtml: `<p>A quick note one week ahead of the ${esc(EVENT.name)}. Your seat is reserved and your breakfast selection is in with the caterer.</p>
${factsBlock()}
<p>The program runs 9:00 to 9:40 AM and you will be back at your desk by 10:00. If you need to change your response or your guest, reply to this email.</p>`,
    });
  }
  return shell({
    eyebrow: "Tomorrow morning",
    headline: `${first}, here is everything for the morning.`,
    preheader: "Doors open 8:30 AM. Parking is in the museum lot.",
    bodyHtml: `<p>We are looking forward to tomorrow. A few details to make arrival easy:</p>
<ul style="padding-left:20px;margin:8px 0;">
<li><strong>Doors open 8:30 AM.</strong> Check in at the table inside the entrance; badges and programs are waiting for you.</li>
<li><strong>Parking</strong> is complimentary in the museum lot at ${esc(EVENT.address1)}. A fire engine will be parked at the entrance.</li>
<li><strong>Program begins at 9:00 AM sharp</strong> and ends at 9:40, followed by a short tour of the museum.</li>
<li><strong>Press</strong> will be present for the donation presentation and a brief availability at 9:40.</li>
</ul>
${factsBlock()}
<p>Day-of contact: ${esc(EVENT.contactName)}, ${esc(EVENT.contactPhone)}.</p>`,
  });
}

export function updateHtml(subject: string, bodyHtml: string, first: string | null): string {
  return shell({ eyebrow: "Event update", headline: subject, preheader: subject, bodyHtml: `<p>Dear ${esc(first || "friend")},</p>${bodyHtml}` });
}

export type SendResult = { ok: boolean; id?: string; error?: string };

export async function sendEmail(opts: { to: string; subject: string; html: string; kind: string; rsvpId?: string | null; attachIcs?: boolean }): Promise<SendResult> {
  const key = Netlify.env.get("RESEND_API_KEY");
  if (!key) {
    await logEmail({ kind: opts.kind, to_email: opts.to, rsvp_id: opts.rsvpId ?? null, subject: opts.subject, status: "skipped", error: "RESEND_API_KEY not set" });
    return { ok: false, error: "RESEND_API_KEY not set" };
  }
  const resend = new Resend(key);
  try {
    const { data, error } = await resend.emails.send({
      from: FROM(),
      to: [opts.to],
      replyTo: REPLY_TO(),
      subject: opts.subject,
      html: opts.html,
      attachments: opts.attachIcs ? [{ filename: "thanks-for-giving.ics", content: Buffer.from(icsFile()).toString("base64"), contentType: "text/calendar" }] : undefined,
    });
    if (error) throw new Error(error.message);
    await logEmail({ kind: opts.kind, to_email: opts.to, rsvp_id: opts.rsvpId ?? null, subject: opts.subject, provider_id: data?.id ?? null });
    return { ok: true, id: data?.id };
  } catch (e: any) {
    await logEmail({ kind: opts.kind, to_email: opts.to, rsvp_id: opts.rsvpId ?? null, subject: opts.subject, status: "failed", error: String(e?.message || e) });
    return { ok: false, error: String(e?.message || e) };
  }
}
