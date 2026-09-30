-- WASSCEPASSCO Supabase schema
create extension if not exists pgcrypto;

create table if not exists public.profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'student' check (role in ('student','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.resources(
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text not null,
  year int,
  type text not null,
  paper text,
  description text,
  file_path text,
  file_url text,
  storage_provider text not null default 'github' check (storage_provider in ('github','supabase')),
  published boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_resources(
  user_id uuid references auth.users(id) on delete cascade,
  resource_id uuid references public.resources(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id,resource_id)
);

create table if not exists public.practice_results(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_key text not null,
  test_title text not null,
  score int not null check(score >= 0),
  total int not null check(total > 0),
  percentage numeric(5,2) generated always as (round((score::numeric / total::numeric) * 100, 2)) stored,
  answers jsonb not null default '[]'::jsonb,
  completed_at timestamptz not null default now()
);

create index if not exists resources_published_idx on public.resources(published);
create index if not exists resources_subject_idx on public.resources(subject);
create index if not exists practice_results_user_idx on public.practice_results(user_id, completed_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists resources_set_updated_at on public.resources;
create trigger resources_set_updated_at before update on public.resources for each row execute procedure public.set_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name', new.email)) on conflict(id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.resources enable row level security;
alter table public.saved_resources enable row level security;
alter table public.practice_results enable row level security;

drop policy if exists profile_own_read on public.profiles;
drop policy if exists profile_own_update on public.profiles;
drop policy if exists profile_own_insert on public.profiles;
create policy profile_own_read on public.profiles for select to authenticated using(id=auth.uid());
create policy profile_own_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy profile_own_insert on public.profiles for insert to authenticated with check(id=auth.uid());

drop policy if exists published_resources_read on public.resources;
drop policy if exists admin_resources_insert on public.resources;
drop policy if exists admin_resources_update on public.resources;
drop policy if exists admin_resources_delete on public.resources;
create policy published_resources_read on public.resources for select to anon,authenticated using(published=true or created_by=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
create policy admin_resources_insert on public.resources for insert to authenticated with check(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
create policy admin_resources_update on public.resources for update to authenticated using(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')) with check(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
create policy admin_resources_delete on public.resources for delete to authenticated using(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

drop policy if exists saved_own_read on public.saved_resources;
drop policy if exists saved_own_insert on public.saved_resources;
drop policy if exists saved_own_delete on public.saved_resources;
create policy saved_own_read on public.saved_resources for select to authenticated using(user_id=auth.uid());
create policy saved_own_insert on public.saved_resources for insert to authenticated with check(user_id=auth.uid());
create policy saved_own_delete on public.saved_resources for delete to authenticated using(user_id=auth.uid());

drop policy if exists practice_own_read on public.practice_results;
drop policy if exists practice_own_insert on public.practice_results;
create policy practice_own_read on public.practice_results for select to authenticated using(user_id=auth.uid());
create policy practice_own_insert on public.practice_results for insert to authenticated with check(user_id=auth.uid());

-- Storage for admin-uploaded PDFs. Existing GitHub PDFs remain in the repo.
insert into storage.buckets(id,name,public) values('resources','resources',true) on conflict(id) do update set public=true;
drop policy if exists public_resource_files on storage.objects;
drop policy if exists admin_resource_upload on storage.objects;
drop policy if exists admin_resource_delete on storage.objects;
create policy public_resource_files on storage.objects for select to anon,authenticated using(bucket_id='resources');
create policy admin_resource_upload on storage.objects for insert to authenticated with check(bucket_id='resources' and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
create policy admin_resource_delete on storage.objects for delete to authenticated using(bucket_id='resources' and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

-- Seed the resources that you will place in GitHub /resources/.
-- Safe to run more than once because titles are used for conflict handling.
insert into public.resources(title,subject,year,type,paper,description,file_url,storage_provider,published)
values
('Core Mathematics 2026 — Paper 1','Core Mathematics',2026,'Past Question','Paper 1','2026 Core Mathematics Paper 1.','resources/2026-core-mathematics-paper-1.pdf','github',true),
('English Language 2026 — Paper 1','English Language',2026,'Past Question','Paper 1','2026 English Language Paper 1.','resources/2026-english-language-paper-1.pdf','github',true),
('Integrated Science 2026 — Paper 1','Integrated Science',2026,'Past Question','Paper 1','2026 Integrated Science Paper 1.','resources/2026-integrated-science-paper-1.pdf','github',true),
('Social Studies 2026 — Paper 1','Social Studies',2026,'Past Question','Paper 1','2026 Social Studies Paper 1.','resources/2026-social-studies-paper-1.pdf','github',true),
('Government 2022 — Paper 2','Government',2022,'Past Question','Paper 2','2022 Government Paper 2.','resources/2022-government-paper-2.pdf','github',true),
('Integrated Science — Practical','Integrated Science',2026,'Past Question','Practical','Integrated Science practical resource.','resources/2026-integrated-science-practical.pdf','github',true),
('Science Selected Answers','Integrated Science',2026,'Answer / Marking Scheme','General','Selected science answers.','resources/wassce-science-selected-answers.pdf','github',true),
('Core Mathematics — Black Mock 2026','Core Mathematics',2026,'Mock','General','Core Mathematics Black Mock 2026.','resources/core-mathematics-black-mock-2026.pdf','github',true),
('Core Mathematics — Midnight Mock 2026','Core Mathematics',2026,'Mock','General','Core Mathematics Midnight Mock 2026.','resources/core-mathematics-midnight-mock-2026.pdf','github',true),
('Core Mathematics — Red Mock 2026','Core Mathematics',2026,'Mock','General','Core Mathematics Red Mock 2026.','resources/core-mathematics-red-mock-2026.pdf','github',true),
('The Dark Stain on Today’s Society','Islamic Studies / Book',2026,'Study Guide','General','Study material.','resources/the-dark-stain-on-todays-society.pdf','github',true)
on conflict do nothing;

-- After creating your account, run ONE line with your real user UUID:
-- update public.profiles set role='admin' where id='YOUR-USER-UUID';
