-- GateFlow Supabase Setup SQL
-- Run this in Supabase SQL Editor

-- Enable pgcrypto
create extension if not exists pgcrypto;

-- PROFILES table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null check (role in ('Security','Devaraj','Sharath')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- JOB CARDS table
create table if not exists public.job_cards (
  id uuid primary key default gen_random_uuid(),
  status text not null,
  data jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Updated at function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

drop trigger if exists set_job_cards_updated_at on public.job_cards;
create trigger set_job_cards_updated_at
  before update on public.job_cards
  for each row execute procedure public.handle_updated_at();

-- Create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'role', 'Security')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.job_cards enable row level security;

-- Profiles policies
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "Prevent client role change" on public.profiles;
create policy "Prevent client role change"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

-- Job cards policies
drop policy if exists "Authenticated can read job cards" on public.job_cards;
create policy "Authenticated can read job cards"
  on public.job_cards for select
  to authenticated
  using (true);

drop policy if exists "Security can create job cards" on public.job_cards;
create policy "Security can create job cards"
  on public.job_cards for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'Security')
    and created_by = auth.uid()
  );

drop policy if exists "Role based updates" on public.job_cards;
create policy "Role based updates"
  on public.job_cards for update
  to authenticated
  using (true)
  with check (true);

-- Storage policies
drop policy if exists "Authenticated upload gate photos" on storage.objects;
create policy "Authenticated upload gate photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'gate-photos');

drop policy if exists "Authenticated read gate photos" on storage.objects;
create policy "Authenticated read gate photos"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'gate-photos');

drop policy if exists "Authenticated update own gate photos" on storage.objects;
create policy "Authenticated update own gate photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'gate-photos' and auth.uid() = owner);

drop policy if exists "Authenticated delete own gate photos" on storage.objects;
create policy "Authenticated delete own gate photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'gate-photos' and auth.uid() = owner);
