# Supabase setup for Quizamo

The baseline schema (`docs/quizmosa-db.sql` in the Vue original) was never in the
repo, so `migrations/20261101000000_baseline.sql` is a **reconstruction** from the
generated `Database` type + what the 5 patches assume. Expect a possible
"run → error → fix" round or two.

## 1. Deploy the schema

**Option A — SQL Editor (simplest):** open your project's SQL Editor, paste all of
`deploy.sql`, and Run. It is the 6 migration files concatenated in order.

**Option B — Supabase CLI:**

```bash
cd quizamo
supabase link --project-ref piynygndtsnpuaetdypv
supabase db push        # applies everything in migrations/ in order
```

If the editor reports an error, copy the exact message back and I'll fix the
baseline — the patches are verbatim from the original, so errors will be in the
reconstructed baseline.

## 2. Dashboard settings

- **Authentication → Providers → Anonymous**: turn **on** (quizzers sign in
  anonymously). Keep "Allow new users to sign up" on.
- **Authentication → Rate limits**: raise the anonymous sign-in limit — a whole
  room shares one IP on the same Wi-Fi.

## 3. Create the admin

The app has no admin sign-up and clients can't insert into `hosts`.

1. **Authentication → Users → Add user** → create your admin email + password
   (this is what you'll log in with).
2. In the SQL Editor, link that user to a host row:

```sql
insert into public.hosts (user_id, host_name)
select id, 'Admin' from auth.users where email = 'you@example.com';
```

## 4. Point the app at it

`.env.local` is already set:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

Once the schema is live and the admin exists, tell me — I'll wire the frontend
(install `@supabase/supabase-js`, add the client + `Database` type, and swap
`mockDb`/`AuthProvider` for real queries).
