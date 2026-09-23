-- Haitian Global directory schema. Applied to Supabase project fnoizxstszexmtjonlgw.
-- Run on a fresh project only; production already has these tables and policies.
create table if not exists public.businesses (
 id bigint generated always as identity primary key,
 slug text not null unique,
 name text not null,
 category text not null,
 secondary text[] not null default '{}',
 city text not null,
 region text not null,
 country text not null check (country in ('United States','Canada','France','Haiti')),
 description text not null default '',
 services text[] not null default '{}',
 languages text[] not null default '{}',
 phone text not null default '',
 whatsapp text not null default '',
 website text not null default '',
 hours text not null default '',
 established integer,
 mode text not null default 'In person',
 featured boolean not null default false,
 joined date not null default current_date,
 status text not null default 'draft' check (status in ('draft','published','archived')),
 is_demo boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.reviews (
 id bigint generated always as identity primary key,
 business_id bigint not null references public.businesses(id) on delete cascade,
 reviewer_name text not null check (char_length(reviewer_name) between 2 and 80),
 rating smallint not null check (rating between 1 and 5),
 comment text not null check (char_length(comment) between 10 and 1500),
 status text not null default 'pending' check (status in ('pending','approved','rejected')),
 created_at timestamptz not null default now()
);
create table if not exists public.search_events (
 id bigint generated always as identity primary key,
 category text not null check (char_length(category) between 1 and 80),
 created_at timestamptz not null default now()
);
create index if not exists businesses_public_idx on public.businesses(status,country,category);
create index if not exists reviews_public_idx on public.reviews(business_id,status);
create index if not exists search_events_created_idx on public.search_events(created_at);
create or replace function public.is_directory_admin() returns boolean
language sql stable security definer set search_path = ''
as $$select auth.uid() is not null and auth.jwt()->>'email' = 'thewebswann@gmail.com'$$;
revoke all on function public.is_directory_admin() from public;
grant execute on function public.is_directory_admin() to anon, authenticated;
alter table public.businesses enable row level security;
alter table public.reviews enable row level security;
alter table public.search_events enable row level security;
create policy public_published_businesses on public.businesses for select to anon,authenticated using (status='published' or public.is_directory_admin());
create policy owner_adds_businesses on public.businesses for insert to authenticated with check (public.is_directory_admin());
create policy owner_edits_businesses on public.businesses for update to authenticated using (public.is_directory_admin()) with check (public.is_directory_admin());
create policy owner_removes_businesses on public.businesses for delete to authenticated using (public.is_directory_admin());
create policy approved_reviews_or_owner on public.reviews for select to anon,authenticated using (status='approved' or public.is_directory_admin());
create policy visitors_submit_pending_reviews on public.reviews for insert to anon,authenticated with check (status='pending' and exists (select 1 from public.businesses b where b.id=business_id and b.status='published'));
create policy owner_moderates_reviews on public.reviews for update to authenticated using (public.is_directory_admin()) with check (public.is_directory_admin());
create policy owner_removes_reviews on public.reviews for delete to authenticated using (public.is_directory_admin());
create policy visitors_record_search on public.search_events for insert to anon,authenticated with check (true);
create policy owner_reads_analytics on public.search_events for select to authenticated using (public.is_directory_admin());
