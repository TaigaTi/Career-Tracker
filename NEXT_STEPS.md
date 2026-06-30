# Next Steps, Getting JobWize Running

The app is built. This is the checklist of everything **you** still need to do to
take it from source code to a working app, locally first, then deployed. Work
through it top to bottom; each section depends on the ones before it.

> The [`README.md`](./README.md) has the condensed version. This file is the
> hands-on walkthrough, including the parts the README glosses over (Google
> OAuth, deployment, verification).

---

## 0. Prerequisites

- [ ] **Node.js 20+** installed (`node -v`)
- [ ] A **Supabase** account, https://supabase.com (free tier is fine)
- [ ] A **GitHub** account (for deploying via Vercel)
- [ ] A **Vercel** account, https://vercel.com (free tier is fine)
- [ ] *(Optional, for Google sign-in)* A **Google Cloud** account

```bash
npm install
```

---

## 1. Create the Supabase project

1. [ ] Go to https://supabase.com/dashboard and click **New project**.
2. [ ] Pick a name (e.g. `jobwize`), generate a strong **database password**, and
       choose the region closest to your users.
3. [ ] Wait ~2 minutes for it to provision.

Keep this tab open, you'll grab keys from it in step 3.

---

## 2. Run the database migration

This creates the `profiles` and `entries` tables, all the Row-Level-Security
policies, and the trigger that auto-creates a profile on signup.

**Option A, SQL Editor (easiest, no CLI):**

1. [ ] In your Supabase project, open **SQL Editor → New query**.
2. [ ] Copy the entire contents of [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql)
       and paste it in.
3. [ ] Click **Run**. You should see "Success. No rows returned."

**Option B, Supabase CLI:**

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

✅ **Verify:** In **Table Editor**, you should now see `profiles` and `entries`
tables, both showing a green **RLS enabled** badge.

---

## 3. Configure environment variables (local)

1. [ ] Copy the example file:

   ```bash
   cp .env.example .env.local
   ```

2. [ ] In Supabase, go to **Project Settings → API** and fill in `.env.local`:

   | Variable | Where to find it |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → **Project URL** |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → **Project API keys → `anon` / `public`** |
   | `NEXT_PUBLIC_SITE_URL` | Leave as `http://localhost:3000` for local dev |

> ⚠️ Use the **`anon` / public** key, **not** the `service_role` key. The
> `service_role` key bypasses RLS and must never ship to the browser.

`.env.local` is gitignored, your keys stay out of source control.

---

## 4. Configure authentication

In **Supabase → Authentication**:

### 4a. Email/password (required)

1. [ ] **Sign In / Providers → Email**: make sure it's **enabled**.
2. [ ] For fast local testing, you can turn **Confirm email** *off* (Authentication
       → Sign In / Providers → Email) so new signups work without an inbox. Turn
       it back **on** before going to production.

### 4b. Redirect URLs (required)

1. [ ] **Authentication → URL Configuration → Site URL**: set to
       `http://localhost:3000`.
2. [ ] **Redirect URLs**: add
       - `http://localhost:3000/auth/callback`
       - *(later)* your production URL, e.g. `https://jobwize.vercel.app/auth/callback`

### 4c. Google OAuth (optional, only if you want the "Continue with Google" button)

The sign-in UI already has a Google button. To make it work you need a Google
OAuth client, then paste its credentials into Supabase.

**In Google Cloud Console** (https://console.cloud.google.com):

1. [ ] Create (or select) a project.
2. [ ] **APIs & Services → OAuth consent screen**: configure it (External user
       type is fine for testing; add yourself as a test user).
3. [ ] **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
4. [ ] Application type: **Web application**.
5. [ ] Under **Authorized redirect URIs**, add the callback Supabase gives you, it lives at:

       ```
       https://<your-project-ref>.supabase.co/auth/v1/callback
       ```

       > Note: this is **Supabase's** callback, *not* your app's `/auth/callback`.
       > Google → Supabase → your app. You'll find the exact URL in Supabase under
       > Authentication → Sign In / Providers → Google.
6. [ ] Copy the generated **Client ID** and **Client secret**.

**Back in Supabase:**

7. [ ] **Authentication → Sign In / Providers → Google**: enable it and paste in
       the Client ID and Client secret. Save.

> Skipping Google for now? Fine, email/password works on its own. Just don't
> click the Google button until this is configured.

---

## 5. Run it locally

```bash
npm run dev
```

Open http://localhost:3000.

✅ **Verify the happy path:**

- [ ] Visit `/signup`, create an account, and land on `/dashboard`.
- [ ] In Supabase **Table Editor → profiles**, confirm a row was auto-created for
      your new user.
- [ ] Log a win on `/log`; confirm it appears in `/timeline` and as a row in the
      `entries` table.
- [ ] Open `/synthesis` and confirm your win gets grouped into output.
- [ ] Sign out and sign back in.

If signup hangs or errors, it's almost always (a) wrong env keys or (b) the
redirect URL not added in step 4b, see Troubleshooting below.

---

## 6. Deploy to Vercel

1. [ ] Push this repo to GitHub (if it isn't already).
2. [ ] In Vercel, **Add New → Project** and import the GitHub repo.
3. [ ] Vercel auto-detects Next.js, no build config changes needed.
4. [ ] Under **Settings → Environment Variables**, add the same three variables
       from `.env.local`, but set:

       ```
       NEXT_PUBLIC_SITE_URL = https://<your-app>.vercel.app
       ```

5. [ ] Click **Deploy**.

### 6a. Wire the production URL back into Supabase

Once you have your Vercel URL:

1. [ ] **Supabase → Authentication → URL Configuration**: add
       `https://<your-app>.vercel.app/auth/callback` to **Redirect URLs**, and
       consider updating **Site URL** to the production URL.
2. [ ] *(If using Google)* add the same Vercel callback logic, Google's redirect
       URI stays as the Supabase `/auth/v1/callback`, so no change needed there,
       but make sure your OAuth consent screen is published if you want
       non-test-users to sign in.
3. [ ] Re-deploy if you changed any Vercel env vars (env changes require a new
       build).

✅ **Verify:** sign up on the live URL and confirm a `profiles` row appears.

---

## 7. Install as a PWA (optional check)

- [ ] On the deployed site, Chrome/Edge should show an **install** icon in the
      address bar.
- [ ] Install it, go offline, and confirm previously visited pages still load and
      the offline page appears.

---

## Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| `Invalid API key` / blank dashboard | Wrong or missing `NEXT_PUBLIC_SUPABASE_*` values in `.env.local`. Double-check you used the **anon** key. Restart `npm run dev` after editing env. |
| Redirected to `/auth/auth-code-error` after login | The callback URL isn't in Supabase's **Redirect URLs** (step 4b), or the OAuth `code` expired (just retry). |
| Signup "succeeds" but no session | **Confirm email** is on but you didn't click the email link. Either confirm via email or disable it for testing (step 4a). |
| Can't see other users' data, *good!* | That's RLS working. Every user sees only their own rows. |
| Google button errors | Provider not enabled in Supabase, or the Supabase `/auth/v1/callback` URL isn't in Google's Authorized redirect URIs (step 4c). |
| Env change ignored on Vercel | Env vars only apply to **new** builds, trigger a redeploy. |

---

## Where things live

| What | Path |
| --- | --- |
| Database schema & RLS | `supabase/migrations/0001_init.sql` |
| Supabase clients (browser/server/middleware) | `src/lib/supabase/` |
| Auth callback handler | `src/app/auth/callback/route.ts` |
| Env template | `.env.example` |
| App routes | `src/app/` |

---

## After the MVP (roadmap)

These are intentionally **not** built yet, see `README.md` for the vision:

- AI-powered synthesis (Claude) to draft promotion cases, reviews, and resume
  bullets from logged wins.
- Integrations to auto-pull accomplishments: Asana, GitHub, Trello, Clockify,
  Todoist.
