# NextAura AI CRM — Build Plan

This is a large internal CRM. I'll enable Lovable Cloud (Supabase) and build in the 3 phases you specified. To keep each turn shippable and reviewable, I'll pause after each phase for your feedback before continuing.

## Stack

- TanStack Start + React 19, Tailwind v4, shadcn/ui
- Lovable Cloud (Supabase) — Auth, Postgres + RLS, Storage, server functions
- In-app CRM Assistant with RLS-scoped Supabase summaries
- i18n: `i18next` + `react-i18next` with EN / AR + RTL toggle
- Design tokens in `src/styles.css`: deep navy / space bg, cyan + violet accents, glass cards, oklch tokens

## Routes (exactly these)

- `/` → landing redirect to `/login` or `/dashboard`
- `/login` (public)
- `/careers` (auth) — internal talent directory managed by staff
- `/dashboard` (auth)
- `/requests` (auth) — details open in a drawer
- AI Assistant lives as a slide-over panel inside the dashboard shell (sidebar entry), not a separate route

## Phase 1 — Foundation, Auth, CRM, Careers form + admin

1. Enable Lovable Cloud.
2. Design system: navy/space palette, cyan/violet accents, glass card variants, gradient tokens, sidebar tokens.
3. i18n scaffolding + language switcher (EN/AR with `dir="rtl"`).
4. Auth: Supabase email/password, no public signup. `_authenticated` gate. Sign-out hygiene.
5. Database migration:
   - `app_role` enum (admin/manager/staff) + `user_roles` + `has_role()` SECURITY DEFINER
   - `profiles`
   - `project_categories` (seeded), `project_services`
   - `client_requests` (all fields you listed, `request_number` via sequence trigger `NA-YYYY-####`, `archived_at`)
   - `request_service_links`, `request_status_history`, `request_payments`, `request_activities`
   - `career_applications` (+ `archived_at`)
   - Triggers: auto request number, updated_at, status-history on status change, activity auto-log, payment totals view
   - Private storage bucket `cvs` (PDF/DOC/DOCX, 5MB)
   - RLS everywhere; role-scoped (admin all, manager add/edit, staff assigned-only)
   - GRANTs per public-schema rule
6. App shell: compact sidebar (Dashboard, Client Requests, Career Portal, AI Assistant, Logout), glass topbar, language switcher, user menu.
7. Dashboard: summary cards, "Needs Your Attention" section, 4 charts (recharts).
8. Requests page: desktop data table + mobile cards, search/filters/quick filters/sort/pagination, WhatsApp + call actions.
9. Add/Edit Request: 5-section form with Zod validation + conditional fields.
10. Request details drawer: full info, actions (edit, status change, add note, record payment, follow-up, duplicate, archive, WhatsApp, copy summary), tabs for status history / payments / activities.
11. Internal `/careers` page: staff manually add and maintain people with name, phone, ID, field, and links. There is no public application flow.

Pause for review.

## Phase 2 — Polish, exports, activities depth, Arabic pass

- Full activities logging + timeline UI
- CSV export (requests / payments / careers) via server function
- Complete Arabic translations pass + RTL audit
- Advanced filters, saved quick filters
- Loading/empty/error state polish

Pause for review.

## Phase 3 — Secure CRM Assistant

- Live, RLS-scoped CRM summaries for request pipeline, follow-ups, payments, and the internal talent directory
- Every query uses the signed-in Supabase client, so database RLS controls which records are visible
- Chat UI in a slide-over panel with suggested prompts
- Graceful database and missing-migration error states

## Notes

- The first account becomes the administrator; later accounts wait for a role assignment.
- Deletions are soft (`archived_at`); hard delete is admin-only with confirmation.
- No secrets in frontend, no raw SQL from AI, no full DB dumps to the model.

The implemented routes and database setup are kept in sync with this plan.
