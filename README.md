# WASSCEPASSCO

Professional mobile-first WASSCE preparation PWA using GitHub Pages + Supabase.

## Architecture
- GitHub Pages: website and the PDFs you manually place in `/resources/`.
- Supabase Auth: real email/password accounts, Google OAuth readiness and password reset.
- Supabase Postgres: profiles, resource metadata, saved resources and practice results.
- Supabase Storage: admin-uploaded PDFs from the website.
- Row Level Security: students can access only their own saved items/results; admins manage resources.

## Setup
1. Replace the placeholder files in `/resources/` with your real PDFs, keeping the exact filenames.
2. In Supabase Dashboard → SQL Editor, paste and run `sql/schema.sql`.
3. Create your first account on the site.
4. In Supabase SQL Editor run: `select id,email from auth.users order by created_at desc;`
5. Copy your user UUID and run: `update public.profiles set role='admin' where id='YOUR-USER-UUID';`
6. Refresh WASSCEPASSCO. The **Admin dashboard** will appear.
7. Upload the whole project to the `main` branch of GitHub repository `wasscepassco`.
8. GitHub → Settings → Pages → Deploy from branch → `main` → `/ (root)`. No GitHub Actions required.

## Important
The Supabase publishable key in `config.js` is designed for a browser app. Never put a Supabase secret/service-role key or database password in this repository.

Existing GitHub PDFs are represented in Supabase by metadata rows. This makes saving and filtering work through the database while the PDF itself remains on GitHub Pages. New PDFs uploaded through the Admin dashboard are stored in Supabase Storage.

Google sign-in requires enabling Google under Supabase Authentication → Providers and configuring the OAuth redirect URL for the deployed GitHub Pages site.

AdSense is intentionally a real placement only until you have an approved publisher ID. Never use a fake publisher ID.

## PWA + Google login fixes in this version
- PWA now has required 192px and 512px PNG icons and an explicit Install app button.
- The service worker uses a GitHub Pages-safe relative scope.
- The Account button scrolls to the dashboard when already signed in.
- Google OAuth uses the deployed page URL as the redirect target.

### Supabase Google OAuth
In Supabase Dashboard → Authentication → Providers → Google, enable Google and enter the Google OAuth Client ID/Secret from Google Cloud. Then in Authentication → URL Configuration add your exact GitHub Pages URL to **Redirect URLs**, for example:
`https://abdulsammedtakiyudeen-bot.github.io/Wasscepasscogh/`
Also set the Site URL to that same deployed URL. The code does not change or delete your existing users, resources, Storage files, or database rows.

### If the browser still does not show an automatic install prompt
Chrome only exposes `beforeinstallprompt` when its installability checks are satisfied and it has not already been installed/dismissed. Use the visible **Install app** button when it appears, or Chrome → ⋮ → **Install app** / **Add to Home screen**. After replacing the old site files, clear the old site cache/service worker or open the site in a fresh/incognito tab so the new manifest and service worker are loaded.
