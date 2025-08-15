-- コメント通報・軽量スパム対策用のDB変更
-- reports テーブル（簡易）
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('plan_comment','climb_comment')),
  target_id uuid not null,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);

-- インデックス
create index if not exists idx_reports_target on public.reports (target_type, target_id);
create index if not exists idx_reports_reporter on public.reports (reporter_id);

-- RLS（通報はログインユーザーのみ作成可、読取りは管理者想定で一旦全拒否）
alter table public.reports enable row level security;

create policy reports_insert_self on public.reports
  for insert to authenticated
  with check (reporter_id = auth.uid());

create policy reports_select_admin_only on public.reports
  for select using (false);

-- コメントの最短投稿間隔はアプリ側で実装（15秒）。必要に応じてDB側でも制約を追加可能。
