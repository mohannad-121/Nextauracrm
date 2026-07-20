# NextAura AI CRM — Build Plan

This is a large internal CRM. I'll enable Lovable Cloud (Supabase) and build in the 3 phases you specified. To keep each turn shippable and reviewable, I'll pause after each phase for your feedback before continuing.

## Stack
- TanStack Start + React 19, Tailwind v4, shadcn/ui
- Lovable Cloud (Supabase) — Auth, Postgres + RLS, Storage, server functions
- Lovable AI Gateway for Phase 3 assistant (tool-calling, no raw SQL)
- i18n: `i18next` + `react-i18next` with EN / AR + RTL toggle
- Design tokens in `src/styles.css`: deep navy / space bg, cyan + violet accents, glass cards, oklch tokens

## Routes (exactly these)
- `/` → landing redirect to `/login` or `/dashboard`
- `/login` (public)
- `/careers` (public)
- `/dashboard` (auth)
- `/requests` (auth) — details open in a drawer
- `/admin/careers` (auth)
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
6. App shell: compact sidebar (Dashboard, Client Requests, Career Applications, AI Assistant, Logout), glass topbar, language switcher, user menu.
7. Dashboard: summary cards, "Needs Your Attention" section, 4 charts (recharts).
8. Requests page: desktop data table + mobile cards, search/filters/quick filters/sort/pagination, WhatsApp + call actions.
9. Add/Edit Request: 5-section form with Zod validation + conditional fields.
10. Request details drawer: full info, actions (edit, status change, add note, record payment, follow-up, duplicate, archive, WhatsApp, copy summary), tabs for status history / payments / activities.
11. Public `/careers` page (bilingual copy) + application form with CV upload to private bucket.
12. `/admin/careers`: list, filters, status update, notes, rating, signed CV URLs, archive.

Pause for review.

## Phase 2 — Polish, exports, activities depth, Arabic pass
- Full activities logging + timeline UI
- CSV export (requests / payments / careers) via server function
- Complete Arabic translations pass + RTL audit
- Advanced filters, saved quick filters
- Loading/empty/error state polish

Pause for review.

## Phase 3 — Secure AI Assistant
- Server functions with tool-calling: `searchRequests`, `getRequestByNumber`, `getOverdueRequests`, `getFollowUps`, `getRevenueSummary`, `getPaymentSummary`, `getRequestsByStatus`, `getRequestsByCategory`, `getRequestsByAssignee`, `searchCustomers`, `getCareerApplicationsSummary`
- All tools go through `requireSupabaseAuth` → RLS-scoped `context.supabase` (staff only sees their assigned data)
- Chat UI in slide-over panel with suggested prompts, EN/AR
- Graceful degradation when AI gateway is down

## Notes
- No public signup; you'll create the first admin via a one-time seed step I'll walk you through after Cloud is enabled.
- Deletions are soft (`archived_at`); hard delete is admin-only with confirmation.
- No secrets in frontend, no raw SQL from AI, no full DB dumps to the model.

Ready to start Phase 1 as soon as you approve.