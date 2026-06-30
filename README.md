# JobWize

**Never forget a win. Get the promotion.**

JobWize is a career-accomplishment journal that turns the wins you log day-to-day
into the material you actually need at review time, promotion cases, performance
self-reviews, and resume bullets. Capture an accomplishment in seconds, build a
searchable timeline of your impact, and synthesize it into polished, copy-ready
narratives.

## Features (MVP)

- **Authentication**: email + password sign-up and sign-in, plus Google OAuth.
- **Quick logging**: capture a win the moment it happens: title, impact, and tags, with zero blank-page friction.
- **Timeline with filters**: browse and search every win, filterable by impact, theme, and date.
- **Template-based synthesis**: group wins into promotion bullets, review highlights, and resume lines, ready to copy.
- **Installable PWA**: install JobWize to your home screen or desktop and view your timeline offline.
- **Dark mode**: automatic or manual, with the theme set before first paint to avoid flashes.

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router) with TypeScript
- [React 19](https://react.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Supabase](https://supabase.com/), Postgres, Auth, and Row Level Security
- Deployed on [Vercel](https://vercel.com/)

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project**

   Sign in at [supabase.com](https://supabase.com/) and create a new project. Note
   the project URL and API keys, you'll need them in step 4.

3. **Run the database migration**

   Open the SQL in `supabase/migrations/0001_init.sql` and run it against your
   project. Either paste it into the **Supabase → SQL Editor** and run it, or apply
   it with the Supabase CLI:

   ```bash
   supabase db push
   ```

4. **Configure environment variables**

   Copy the example file and fill in your values:

   ```bash
   cp .env.example .env.local
   ```

   | Variable | Where to find it |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → Project API keys (anon / public) |
   | `NEXT_PUBLIC_SITE_URL` | Your app's base URL, use `http://localhost:3000` for local dev |

5. **Configure authentication providers**

   In **Supabase → Authentication**:

   - Enable the **Email** and **Google** providers (for Google, supply your OAuth client ID and secret).
   - Under **URL Configuration → Redirect URLs**, add `http://localhost:3000/auth/callback` and your production `/auth/callback` URL.

6. **Start the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push the repository to GitHub.
2. In Vercel, **import** the GitHub repository as a new project.
3. Add the same environment variables (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`) under
   **Project Settings → Environment Variables**. Set `NEXT_PUBLIC_SITE_URL` to
   your Vercel deployment URL (e.g. `https://jobwize.vercel.app`).
4. In **Supabase → Authentication → URL Configuration**, add your Vercel
   `/auth/callback` URL (e.g. `https://jobwize.vercel.app/auth/callback`) to the
   allowed redirect URLs.
5. Deploy.

## PWA, installing JobWize

JobWize is an installable progressive web app with offline support for previously
visited pages.

- **Desktop (Chrome / Edge):** open JobWize and click the **install** icon in the
  address bar, or use the browser menu → *Install JobWize*.
- **Android (Chrome):** tap the menu (⋮) → *Add to Home screen* / *Install app*.
- **iOS / iPadOS (Safari):** tap the **Share** button → *Add to Home Screen*.

Once installed, JobWize launches in its own window and serves a friendly offline
page when you have no connection; wins you log while offline sync when you
reconnect.

## Roadmap

- **Integrations** to pull in accomplishments automatically, Asana, GitHub,
  Trello, Clockify, and Todoist.
- **AI-powered synthesis** to draft promotion cases, reviews, and resume bullets
  from your logged wins.
