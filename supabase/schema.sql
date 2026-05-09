-- ═══════════════════════════════════════════════════
-- riri/dev/urandom — Supabase Schema
-- Run this in the Supabase SQL editor
-- ═══════════════════════════════════════════════════

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ── Books ─────────────────────────────────────────────
create table if not exists books (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  author       text,
  file_path    text not null,
  file_type    text not null check (file_type in ('pdf', 'epub')),
  cover_color  text default '#e6b400',
  progress     float default 0,
  current_page int default 0,
  total_pages  int default 0,
  created_at   timestamptz default now()
);

-- ── Posts ─────────────────────────────────────────────
create table if not exists posts (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  content       text,
  category      text default 'book' check (category in ('book', 'film', 'series')),
  related_title text,
  rating        int check (rating between 1 and 5),
  published     boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger posts_updated_at
  before update on posts
  for each row execute procedure update_updated_at();

-- ── Tracks ────────────────────────────────────────────
create table if not exists tracks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  artist       text,
  file_path    text not null,
  cover_color  text default '#e6b400',
  duration     float,
  created_at   timestamptz default now()
);

-- ── Highlights ────────────────────────────────────────
create table if not exists highlights (
  id         uuid primary key default gen_random_uuid(),
  book_id    uuid references books(id) on delete cascade,
  text       text not null,
  note       text,
  page       int,
  color      text default '#e6b400',
  created_at timestamptz default now()
);

-- ── Site Settings ─────────────────────────────────────
create table if not exists site_settings (
  id        uuid primary key default gen_random_uuid(),
  theme     text default 'cottage',
  site_name text default 'riri/dev/urandom',
  tagline   text default 'every thing i loved'
);

-- Insert default settings row
insert into site_settings (theme, site_name, tagline)
values ('cottage', 'riri/dev/urandom', 'every thing i loved')
on conflict do nothing;

-- ── Storage Buckets (run these separately or via Supabase dashboard) ──
-- create bucket "books" with public = false
-- create bucket "music" with public = false

-- ── RLS Policies ─────────────────────────────────────
-- Books: public read
alter table books enable row level security;
create policy "books_public_read" on books for select using (true);
create policy "books_service_insert" on books for insert with check (true);
create policy "books_service_update" on books for update using (true);

-- Posts: public read published only
alter table posts enable row level security;
create policy "posts_public_read" on posts for select using (published = true);
create policy "posts_service_all" on posts for all using (true);

-- Tracks: public read
alter table tracks enable row level security;
create policy "tracks_public_read" on tracks for select using (true);
create policy "tracks_service_insert" on tracks for insert with check (true);

-- Highlights: public read
alter table highlights enable row level security;
create policy "highlights_public_read" on highlights for select using (true);
create policy "highlights_service_all" on highlights for all using (true);

-- Site settings: public read
alter table site_settings enable row level security;
create policy "settings_public_read" on site_settings for select using (true);
