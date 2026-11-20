# Mail Analytics

A small, password-protected dashboard for the STAUFF email automation. It reads the email log that the n8n workflows write to Supabase and shows what needs attention: which emails are overdue for a reply, how mail splits by category, which customers send the most enquiries and POs, and a searchable list of every email.

Built with Next.js (App Router). There is no client-side database access: the page is rendered on the server, so the Supabase key never reaches the browser.

## What it shows

| Section | What it does |
|---|---|
| **Overdue emails** | Three tiles counting unreplied emails at overdue Day 1, Day 5 and Day 10, plus a list of every unreplied overdue email with its level, customer, received date and age. |
| **Emails by category** | Bar chart of email counts per category (RFQ Enquiry, Customer PO and so on). |
| **Top customers** | Top 8 customers by volume, with enquiry (RFQ) and PO counts for each. |
| **All emails** | Table of every email with search (subject, customer, enquiry number, order number, sender) and a category filter. |

## How it fits together

```
Outlook  ->  n8n workflows  ->  Supabase (mail_log table)  ->  mail_analytics view  ->  this dashboard
```

- n8n classifies each email, tracks replies and read status, flags overdue levels, and extracts customer, enquiry and order numbers into `mail_log`.
- The `mail_analytics` view exposes the columns the dashboard needs.
- The dashboard loads up to 5,000 of the most recent rows on every page load (no caching) and builds all the charts and counts from them.

## Requirements

- Node.js 18.18 or newer
- A Supabase project containing a `mail_analytics` view with these columns: `id`, `subject`, `from_address`, `received_at`, `category`, `folder_name`, `customer_name`, `enquiry_number`, `order_number`, `is_read`, `is_replied`, `processed`, `overdue_level`

## Setup

```bash
npm install
cp .env.example .env.local      # on Windows: copy .env.example .env.local
```

Fill in `.env.local`:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | Project URL, for example `https://abcdxyz.supabase.co` (no trailing slash) |
| `SUPABASE_SERVICE_KEY` | A **secret** key (`sb_secret_...`) or the legacy `service_role` key, from Supabase, Project Settings, API Keys |
| `DASHBOARD_PASSWORD` | The password used to sign in |

Then start it:

```bash
npm run dev
```

Open http://localhost:3000 and sign in with any username and your `DASHBOARD_PASSWORD`.

## Security

- The whole site is behind HTTP Basic authentication (`middleware.js`). If `DASHBOARD_PASSWORD` is not set, the site refuses to load.
- The Supabase secret key bypasses row-level security. It is only used on the server, and `.env.local` is git-ignored. **Never commit it or put it in client code.**
- Lock the view down so it cannot be read through the public API:

  ```sql
  ALTER VIEW public.mail_analytics SET (security_invoker = true);
  REVOKE ALL ON public.mail_analytics FROM anon, authenticated;
  ```

- Keep this repository private: the dashboard displays business emails.
- Basic authentication is simple and suits a small internal tool. Always serve it over HTTPS (Vercel does this by default).

## Deploy to Vercel

1. Push this repository to GitHub.
2. In Vercel, choose **Add New, Project** and import the repository.
3. Under **Environment Variables**, add `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` and `DASHBOARD_PASSWORD`.
4. Deploy. Redeploy after changing any variable.

## Project structure

```
app/page.js       Data loading and all four dashboard sections
app/layout.js     Page shell and font
app/globals.css   Styling
middleware.js     Password protection
.env.example      Template for required environment variables
```

## Notes

- Overdue levels come from the n8n email tracking workflow (`mail_log.overdue_level`). The dashboard only displays them; it does not change data.
- Customer names, enquiry numbers and order numbers appear only for emails the n8n extraction step has processed.
