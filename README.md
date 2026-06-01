# Nami CRM

> A beautiful, full-featured CRM and Automation platform for WhatsApp. Created by Prasanna Balaji (2026).

## What you get out of the box

- **Shared inbox** on the official WhatsApp Business API — multiple agents working one number, per-conversation assignment, status, and notes.
- **Contacts + tags + custom fields**, CSV import, deduplication.
- **Sales pipelines** (Kanban) with deals linked to conversations.
- **Broadcasts** with Meta-approved templates, delivery + read tracking, per-recipient variable substitution.
- **No-code automations** — triggers on inbound messages, new contacts, keywords, or schedule; conditional branches, waits, tags, webhooks. Visual builder.
- **Real-time dashboard** — response times, daily volume, pipeline value, cross-module activity feed.
- **Account management** — email, password, avatar, global sign-out.

## Built With

- **App** — Next.js 16 (App Router), React 19, TypeScript, Tailwind v4.
- **Data** — Supabase (Postgres + Auth + Storage + RLS).
- **WhatsApp** — Meta Cloud API (official WhatsApp Business API).

## Quick start

```bash
git clone https://github.com/<your-username>/nami-crm.git
cd nami-crm
npm install
cp .env.local.example .env.local   # fill in Supabase + Meta creds
npm run dev
```

Open <http://localhost:3000>.

## License

[MIT](./LICENSE). Created by Prasanna Balaji.
