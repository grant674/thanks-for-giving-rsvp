import { Resend } from "resend";
import { EVENT, FROM, REPLY_TO, SITE_URL } from "./config.mts";
import { logEmail, type Rsvp } from "./db.mts";

const C = { cream: "#EEF2FC", paper: "#FFFFFF", char: "#10203F", dim: "#4B5A7A", red: "#0033B4", navy: "#0033B4", line: "#D9E0F0", deep: "#001E7A" };

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
<tr><td style="background:${C.red};padding:36px 40px 30px;text-align:center;">
<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#ffffff;">${esc(opts.eyebrow)}</div>
<div style="padding-top:14px;font-family:'Arial Narrow',Impact,Arial,sans-serif;font-size:42px;line-height:1;font-weight:bold;text-transform:uppercase;color:#ffffff;">Thanks for Answering the Call</div>
<div style="padding-top:10px;font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#D6E0FA;">A Celebration of Firefighters and Those Who Support Them</div>
</td></tr>
<tr><td style="padding:24px 40px 8px;font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:bold;color:${C.char};">${esc(opts.headline)}</td></tr>
<tr><td style="padding:0 40px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:${C.char};">${opts.bodyHtml}</td></tr>
<tr><td style="padding:0 40px;"><div style="border-top:1px solid ${C.navy};"></div></td></tr>
<tr><td style="padding:18px 40px 28px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${C.navy};line-height:1.7;">Hosted by ${esc(EVENT.host)}<br>In support of ${esc(EVENT.beneficiaries)}</td></tr>
</table>
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;"><tr><td style="padding:14px 8px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${C.dim};">Questions: ${esc(EVENT.contactName)}, <a href="mailto:${EVENT.contactEmail}" style="color:${C.navy};">${EVENT.contactEmail}</a> · ${esc(EVENT.contactPhone)}</td></tr></table>
</td></tr></table></body></html>`;
}

export function factsBlock(): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;border:1px solid ${C.line};background:#fff;"><tr><td style="padding:18px 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:${C.char};">
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
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Pacheco Ventures//Thanks for Answering the Call//EN", "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:thanks-for-answering-the-call-2026-12-01@${SITE_URL().replace(/^https?:\/\//, "")}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}`,
    "DTSTART:20261201T153000Z", "DTEND:20261201T173000Z",
    `SUMMARY:${EVENT.name}`,
    `LOCATION:${EVENT.venue}\\, ${EVENT.address1}\\, ${EVENT.address2}`,
    `DESCRIPTION:Hosted by ${EVENT.host}. Check-in and breakfast 8:30 a.m.\\, program 9:15 a.m.\\, networking and optional museum tour 10:00 a.m.\\, concludes 10:30 a.m. ${EVENT.parking}`,
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
<p>${esc(EVENT.shortName)} is a nationwide initiative recognizing firefighters and those who support them, and the Phoenix celebration is where it begins. If your plans change, reply to this email and we will do our best to hold a seat.</p>`,
    });
  }
  const guest = r.guest_name ? `<p><strong>Your guest:</strong> ${esc(r.guest_name)}${r.guest_title_org ? `, ${esc(r.guest_title_org)}` : ""}${r.guest_entree ? ` · ${esc(r.guest_entree)}` : ""}</p>` : "";
  return shell({
    eyebrow: "You are confirmed",
    headline: `We look forward to seeing you, ${first}.`,
    preheader: `Confirmed for ${EVENT.dateLabel}. Your entree: ${r.entree || "to be confirmed"}.`,
    bodyHtml: `<p>Your seat is reserved for ${esc(EVENT.shortName)}: A Celebration of Firefighters and Those Who Support Them. On GivingTuesday we will celebrate Arizona’s fire service and launch a nationwide initiative recognizing firefighters and the communities behind them.</p>
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
      bodyHtml: `<p>${esc(EVENT.host)} invites you to ${esc(EVENT.shortName)}, a GivingTuesday breakfast celebrating Arizona’s fire service with elected officials, fire service leaders and community partners, and launching a nationwide initiative recognizing firefighters and those who support them.</p>
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
      bodyHtml: `<p>A quick note one week ahead of ${esc(EVENT.shortName)}. Your seat is reserved and your breakfast selection is in with the caterer.</p>
${factsBlock()}
<p>The program begins at 9:15 a.m. and the morning wraps by 10:30. If you need to change your response or your guest, reply to this email.</p>`,
    });
  }
  return shell({
    eyebrow: "Tomorrow morning",
    headline: `${first}, here is everything for the morning.`,
    preheader: "Doors open 8:30 AM. Parking is in the museum lot.",
    bodyHtml: `<p>We are looking forward to tomorrow. A few details to make arrival easy:</p>
<ul style="padding-left:20px;margin:8px 0;">
<li><strong>Doors open 8:30 a.m.</strong> Check in at the table inside the entrance; badges and programs are waiting for you.</li>
<li><strong>Parking</strong> is complimentary in the museum lot at ${esc(EVENT.address1)}. A fire engine will be parked at the entrance.</li>
<li><strong>Program begins at 9:15 a.m.</strong> Networking and an optional museum tour follow at 10:00, and the morning concludes at 10:30.</li>
<li><strong>Press</strong> may be present for the recognition and donation portion of the program.</li>
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
      attachments: opts.attachIcs ? [{ filename: "thanks-for-answering-the-call.ics", content: Buffer.from(icsFile()).toString("base64"), contentType: "text/calendar" }] : undefined,
    });
    if (error) throw new Error(error.message);
    await logEmail({ kind: opts.kind, to_email: opts.to, rsvp_id: opts.rsvpId ?? null, subject: opts.subject, provider_id: data?.id ?? null });
    return { ok: true, id: data?.id };
  } catch (e: any) {
    await logEmail({ kind: opts.kind, to_email: opts.to, rsvp_id: opts.rsvpId ?? null, subject: opts.subject, status: "failed", error: String(e?.message || e) });
    return { ok: false, error: String(e?.message || e) };
  }
}
