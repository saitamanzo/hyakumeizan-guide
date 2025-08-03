-- climbsテーブルに対するRLSを有効にする
ALTER TABLE public.climbs ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーがあれば削除して再作成する
DROP POLICY IF EXISTS "Allow individual insert access for authenticated users" ON public.climbs;

-- 認証されたユーザーが自分自身の登山記録を挿入できるようにするポリシー
CREATE POLICY "Allow individual insert access for authenticated users"
ON public.climbs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 既存のポリシーがあれば削除して再作成する
DROP POLICY IF EXISTS "Allow individual read access for users" ON public.climbs;

-- ユーザーが自分自身の登山記録を読み取れるようにするポリシー
CREATE POLICY "Allow individual read access for users"
ON public.climbs
FOR SELECT
USING (auth.uid() = user_id);

-- 既存のポリシーがあれば削除して再作成する
DROP POLICY IF EXISTS "Allow individual update access for users" ON public.climbs;

-- ユーザーが自分自身の登山記録を更新できるようにするポリシー
CREATE POLICY "Allow individual update access for users"
ON public.climbs
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 既存のポリシーがあれば削除して再作成する
DROP POLICY IF EXISTS "Allow individual delete access for users" ON public.climbs;

-- ユーザーが自分自身の登山記録を削除できるようにするポリシー
CREATE POLICY "Allow individual delete access for users"
ON public.climbs
FOR DELETE
USING (auth.uid() = user_id);
