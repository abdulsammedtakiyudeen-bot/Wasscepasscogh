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
