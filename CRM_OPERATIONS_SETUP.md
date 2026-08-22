# CRM operations hub setup

This release adds Clients, Pipeline, My Work, Reports, invoices, payment milestones, activities, private client files, and automation rules.

## Apply the database migration

Deploy the migration before using the new navigation items:

```powershell
npx supabase login
npx supabase link --project-ref trctjnmjkjqsspfljkio
npx supabase db push --dry-run
npx supabase db push
```

Review the dry run. If the CLI cannot connect from your network, open Supabase Dashboard → SQL Editor, paste the complete contents of `supabase/migrations/20260822230050_crm_operations_hub.sql`, and run it once.

The migration keeps existing requests and creates/links their client profiles. It also creates a private `client-files` bucket, so attachments require no new public access policy.

## What is automated

- Moving a request to **Quote Sent** adds a follow-up date when missing.
- Approved/in-progress work with a delivery date gets a **Prepare delivery** task.
- The **Reports → Run now** action marks stale untouched new leads as on hold and flags invoices past their due dates.

Email and WhatsApp buttons open the configured email/WhatsApp client. Fully automatic delivery requires a provider such as Resend or WhatsApp Business API and its credentials; those are intentionally not added to the browser application.
