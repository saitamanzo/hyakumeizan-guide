-- Create related_media table to store library items per mountain
create table if not exists public.related_media (
  id text primary key,
  mountain_name text not null,
  type text not null,
  title text not null,
  author text,
  year text,
  thumbnail text,
  url text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_related_media_mountain_name on public.related_media(mountain_name);
create index if not exists idx_related_media_url on public.related_media(url);

-- External site settings: which external sites are enabled and their priority order
create table if not exists public.external_site_settings (
  id serial primary key,
  site_key text not null unique,
  display_name text not null,
  enabled boolean default true,
  priority int default 100,
  config jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
