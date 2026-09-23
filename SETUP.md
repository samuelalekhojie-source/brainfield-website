# Brainfield CMS — setup guide

This turns your static site into one your client can edit themselves, using
Supabase as the database/login and a new `/admin.html` page as the dashboard.
No server code needed — it all runs in the browser, so it deploys on Vercel
exactly like the rest of the site.

Do these steps in order. About 15 minutes if you're not stuck anywhere.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → sign in → **New project**.
2. Pick any name/region, set a database password (save it somewhere), wait
   ~2 minutes for it to spin up.

## 2. Run the database schema

1. In your Supabase project, open **SQL Editor** → **New query**.
2. Open `supabase/schema.sql` from this package, copy the whole thing, paste
   it in, click **Run**.
3. This creates 3 tables (`content_blocks`, `team_members`,
   `gallery_images`), locks down who can edit what, loads in all your
   current site text as a starting point, and creates a `site-images`
   storage bucket for uploaded photos.
4. If it errors on the very last few lines about `storage.objects` policies
   already existing, that's fine — it means the bucket policies were already
   there. Everything else still ran.

## 3. Turn off public sign-ups, create your client's login

By default Supabase lets anyone sign up. Since only your client should be
able to log into `/admin.html`, turn that off and create their one account
by hand instead:

1. **Authentication → Providers → Email** → turn off "Allow new users to
   sign up" (or similar wording — Supabase's UI changes labels over time).
2. **Authentication → Users → Add user** → enter your client's email and a
   password → **Create user**. Send them these credentials separately
   (WhatsApp, not email, if you're worried about interception).
3. That's the only account. Nobody can create another one through the site.

## 4. Connect the config file

1. In Supabase: **Project Settings → API**.
2. Copy the **Project URL** and the **anon public** key (not the
   `service_role` one — that one must never go in a public file).
3. Open `js/cms-config.js` and paste them in:
   ```js
   window.BRAINFIELD_SUPABASE_URL = "https://xxxxxxxx.supabase.co";
   window.BRAINFIELD_SUPABASE_ANON_KEY = "eyJhbGciOi...";
   ```
   The anon key is meant to be public — it's safe in this file. The Row
   Level Security rules from step 2 are what actually block writes from
   anyone who isn't logged in.

## 5. Drop these files into your project and deploy

Copy everything from this package into your existing site folder, keeping
the same structure — it only adds files and replaces the ones listed below,
it doesn't touch your `assets/` folder:

- `index.html`, `about.html`, `consult.html`, `agro.html`, `gallery.html`,
  `contact.html` — replace your existing ones (same design, now wired to
  Supabase)
- `admin.html` — new
- `css/admin.css` — new
- `js/cms-config.js`, `js/cms.js` — new
- `js/main.js` — replace (same behaviour, plus one small hook the gallery
  page needs)
- `css/style.css`, `contact-handler.php` — unchanged, included for
  completeness

Then push to your repo / redeploy on Vercel as usual.

## 6. Log in and try it

1. Visit `yoursite.com/admin.html`.
2. Sign in with the account you created in step 3.
3. Edit anything, hit **Save changes**, then open the live page (or
   refresh it) to see it update.

## What's editable, and what isn't (yet)

Editable from the dashboard: every heading, paragraph, stat description,
card, team member (with add/remove and which pages they appear on), gallery
photo (with add/remove/reorder), corporate/contact info, and all the logo
images — organised by page in the left sidebar.

Left as-is for this first version: navigation labels, button text like
"Get in touch", and icons — these are structural, and changing them risks
breaking layout rather than being something a client typically wants to
edit. If you want any of these editable too, it's a small, mechanical
addition: add a row to `content_blocks` in Supabase, then add a matching
`data-cms="that.key"` attribute to the element in the HTML — the dashboard
picks up new rows automatically, no code changes needed there.

## If something doesn't show up

- Check the browser console (F12) on the live page — `js/cms.js` logs a
  warning there if it can't reach Supabase, and otherwise fails quietly by
  just showing the original static text, so the site never breaks even if
  the config is wrong.
- Double-check `js/cms-config.js` has your real URL and anon key, not the
  placeholders.
- If writes fail from `/admin.html` specifically, make sure you're actually
  logged in (top-right should show your client's email) — RLS blocks writes
  from anyone who isn't.
