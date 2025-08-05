import { createClient } from './supabase/client';
const supabase = createClient();

export async function isClimbFavoritedByUser(climbId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('climb_favorites')
    .select('id')
    .eq('climb_id', climbId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

export async function getClimbFavoriteCount(climbId: string): Promise<number> {
  const { count, error } = await supabase
    .from('climb_favorites')
    .select('id', { count: 'exact', head: true })
    .eq('climb_id', climbId);
  if (error || count == null) return 0;
  return count;
}

export async function addClimbFavorite(climbId: string, userId: string): Promise<void> {
  await supabase.from('climb_favorites').insert({ climb_id: climbId, user_id: userId });
}

export async function removeClimbFavorite(climbId: string, userId: string): Promise<void> {
  await supabase
    .from('climb_favorites')
    .delete()
    .eq('climb_id', climbId)
    .eq('user_id', userId);
}

export async function toggleClimbFavorite(climbId: string, userId: string): Promise<boolean> {
  const isFav = await isClimbFavoritedByUser(climbId, userId);
  if (isFav) {
    await removeClimbFavorite(climbId, userId);
    return false;
  } else {
    await addClimbFavorite(climbId, userId);
    return true;
  }
}
