-- usersテーブルに対するRLSを有効にする
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーがあれば削除して再作成する
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

-- 認証されたユーザーが自分自身のプロフィールを挿入できるようにするポリシー
CREATE POLICY "Users can insert their own profile"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 既存のポリシーがあれば削除して再作成する
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;

-- ユーザーが自分自身のプロフィールを読み取れるようにするポリシー
CREATE POLICY "Users can view own profile"
ON public.users
FOR SELECT
USING (auth.uid() = id);

-- 既存のポリシーがあれば削除して再作成する
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- ユーザーが自分自身のプロフィールを更新できるようにするポリシー
CREATE POLICY "Users can update own profile"
ON public.users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- プロフィールは削除しない（authユーザーが削除されると自動的にカスケード削除される）
