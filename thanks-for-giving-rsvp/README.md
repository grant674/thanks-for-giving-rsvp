# Thanks for Giving RSVP

Static invitation page + Netlify Functions + Supabase + Resend.

## Deploy
Drag this folder onto the `thanks-for-giving-rsvp` project in Netlify (Deploys tab), or run `netlify deploy --prod` from this folder after `netlify link`.

## Environment variables (Netlify > Project configuration > Environment variables, scope: Functions)
- SUPABASE_URL                 set
- SUPABASE_SERVICE_ROLE_KEY    Supabase > Project Settings > API > service_role (secret)
- RESEND_API_KEY               Resend > API Keys
- FROM_EMAIL                   set: Thanks for Giving <rsvp@pachecoventuresaz.com>
- REPLY_TO_EMAIL               set: grant@pachecoventuresaz.com
- ADMIN_PASSWORD               set (rotate any time)
- SITE_URL                     optional; defaults to the Netlify URL

## Pages and endpoints
- /                      invitation and RSVP form (posts to /api/rsvp)
- /thank-you             confirmation page
- /admin                 event team dashboard (admin key)
- POST /api/rsvp         saves the RSVP, sends confirmation with .ics
- /api/admin/*           summary, rsvps (JSON or CSV), invitees import, send update, send-reminder, resend-confirmation
- reminders              scheduled daily 16:00 UTC (9:00 AM Phoenix); dates in netlify/functions/_lib/config.mts

## Data (Supabase project "PMI America 250 Community Futures Challenge", tables prefixed tfg_)
tfg_invitees, tfg_rsvps, tfg_email_log, tfg_updates, view tfg_entree_counts
