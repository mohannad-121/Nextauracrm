# NextAura AI CRM

A TanStack Start CRM backed by Supabase Auth, Postgres, Row Level Security, and Storage.

## Run locally

1. Copy `.env.example` to `.env` and fill in your Supabase project URL and publishable key. Never put a secret or `service_role` key in a `VITE_` variable.
2. Install dependencies and start the app:

   ```powershell
   npm install
   npm run dev
   ```

3. Open [http://localhost:8080](http://localhost:8080).

The repository's current `.env` is already configured for a reachable Supabase project. It is ignored by Git.

## Install the Supabase SQL

For a **new Supabase project**, open **SQL Editor** in the Supabase dashboard and run the entire `supabase/fresh-project-setup.sql` file once. It creates the complete schema in dependency order inside one transaction, avoiding missing-table errors such as `public.user_roles does not exist`.

The timestamped files in `supabase/migrations` are for Supabase CLI migration history. Together they:

- make the first/oldest account the CRM administrator if no role exists yet;
- leave later public signups pending until an administrator assigns a role;
- create the private legacy `cvs` Storage bucket without anonymous upload access;
- grant authenticated users the sequence access required to generate request numbers; and
- create the authenticated, staff-managed Career Portal with name, phone, ID, field, and links.

For an existing project that already contains the base CRM tables, apply only pending timestamped migrations. You can do that with the Supabase CLI after authenticating and linking the correct project:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push --dry-run
npx supabase db push
```

Always review the dry run before pushing. Do not run `fresh-project-setup.sql` against a database where the CRM tables already exist.

For an existing database that already has the CRM schema, the Career Portal change is the file below. Run it once through the CLI flow above, or paste its complete contents into **Supabase Dashboard → SQL Editor** and select **Run**:

```text
supabase/migrations/20260720201318_internal_career_profiles.sql
```

This migration disables anonymous career submissions and creates `public.career_profiles`. The `/careers` page will show a migration-required message until it has been applied.

### Auth settings

In Supabase, go to **Authentication → URL Configuration**:

- During local development, add `http://localhost:8080/**` to Redirect URLs.
- After deployment, set Site URL to your exact production domain, such as `https://your-app.vercel.app`.
- Add `https://*-YOUR_VERCEL_TEAM_SLUG.vercel.app/**` for Vercel preview deployments.

In **Authentication → Sign In / Providers → Email**, keep **Allow new users to sign up** enabled. If **Confirm email** is enabled, the signup page asks the user to check their inbox. With a custom email template, make sure its confirmation link respects `{{ .RedirectTo }}` or uses `{{ .ConfirmationURL }}`.

### Give a later account access

New accounts after the first one see an access-pending screen. Assign one of `admin`, `manager`, or `staff` in SQL Editor:

```sql
insert into public.user_roles (user_id, role)
select id, 'staff'::public.app_role
from auth.users
where lower(email) = lower('teammate@example.com')
on conflict (user_id, role) do nothing;
```

## Deploy to Vercel

The project is configured to build with Nitro's Vercel preset and emits the Vercel Build Output API structure. A local production build passes with:

```powershell
npm run build
```

### Recommended: deploy from Git

1. In Vercel, choose **Add New → Project** and import [`mohannad-121/Nextauracrm`](https://github.com/mohannad-121/Nextauracrm).
2. Confirm the root directory is the repository root and the framework preset is **TanStack Start**. Vercel detects the Nitro build automatically, so leave the Build Command and Output Directory at their defaults.
3. Add these variables under **Project Settings → Environment Variables** for Production, Preview, and Development:

   ```text
   VITE_SUPABASE_URL
   VITE_SUPABASE_PUBLISHABLE_KEY
   SUPABASE_URL
   SUPABASE_PUBLISHABLE_KEY
   ```

   The two values are the same URL and publishable key used locally. Do not add a service-role key to a `VITE_` variable.

4. Deploy the project. Pushes to `main` create production deployments; pushes to other branches create previews.
5. Copy the production and preview URLs into the Supabase Auth URL settings described above, then redeploy after any environment-variable changes.

### Deploy with the Vercel CLI

```powershell
npx vercel
npx vercel --prod
```

The first command links the folder and creates a preview. The second creates a production deployment. For a validated preview, you can promote the exact artifact instead of rebuilding:

```powershell
npx vercel promote YOUR_PREVIEW_URL
```

After deployment, verify `/`, `/signup`, `/login`, and an authenticated `/dashboard` session. If nested routes return 404, confirm the framework is **TanStack Start** and that `vite.config.ts` still contains `nitro: { preset: "vercel" }`.
