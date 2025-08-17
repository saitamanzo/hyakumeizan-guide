-- usersテーブルの拡張
alter table users add column if not exists avatar_url text;
alter table users add column if not exists bio text;
alter table users add column if not exists experience_level text check (experience_level in ('初級', '中級', '上級', 'エキスパート'));
alter table users add column if not exists privacy_settings jsonb default '{"profile": "public", "climbing_history": "public"}';
alter table users add column if not exists favorite_mountains text[] default array[]::text[];

-- プロフィール画像のストレージポリシーの設定
insert into storage.buckets (id, name) values ('avatars', 'avatars')
on conflict do nothing;

-- ストレージのセキュリティ設定
drop policy if exists "Avatar images are publicly accessible" on storage.objects;
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check ( bucket_id = 'avatars' AND auth.uid() = owner );