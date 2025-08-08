
import { createClient } from './supabase/client';
import type { ClimbPhoto, ClimbRecordWithMountain } from '../types/climb';
export type { ClimbRecordWithMountain } from '../types/climb';
const supabase = createClient();

/**
 * 登山記録を保存
 */
export async function saveClimbRecord(
  userId: string,
  mountainId: string,
  data: {
    date: string;
    route: string;
    duration: string;
    difficulty: 'easy' | 'moderate' | 'hard';
    weather: string;
    companions: string;
    notes: string;
    rating: number;
    isPublic?: boolean;
  }
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const difficultyMap = { easy: 1, moderate: 3, hard: 5 };
    const record = {
      user_id: userId,
      mountain_id: mountainId,
      climb_date: data.date,
      notes: [
        `ルート: ${data.route}`,
        `所要時間: ${data.duration}`,
        `同行者: ${data.companions}`,
        `満足度: ${data.rating}/5`,
        data.notes
      ].filter(Boolean).join('\n'),
      weather_conditions: data.weather,
      difficulty_rating: difficultyMap[data.difficulty],
      is_public: !!data.isPublic,
    };
    const { data: result, error } = await supabase
      .from('climbs')
      .insert(record)
      .select('id')
      .single();
    if (error) return { success: false, error: error.message };
    return { success: true, id: result.id };
  } catch {
    return { success: false, error: 'Unknown error' };
  }
}

/**
 * ユーザーの登山記録を取得（写真データも含む）
 */
export async function getUserClimbRecords(userId: string): Promise<ClimbRecordWithMountain[]> {
  try {
    const { data, error } = await supabase
      .from('climbs')
      .select(`
        id,
        user_id,
        mountain_id,
        climb_date,
        notes,
        weather_conditions,
        difficulty_rating,
        is_public,
        mountains (name),
        climb_photos (
          id,
          storage_path,
          thumbnail_path,
          caption,
          sort_order
        )
      `)
      .eq('user_id', userId)
      .order('climb_date', { ascending: false });
    if (error) return [];
    return (data || []).map(record => {
      let mountainName = '不明';
      if (Array.isArray(record.mountains)) {
        const m = record.mountains[0];
        mountainName = (m && typeof m === 'object' && 'name' in m) ? (m as { name?: string }).name || '不明' : '不明';
      } else if (record.mountains && typeof record.mountains === 'object' && 'name' in record.mountains) {
        mountainName = (record.mountains as { name?: string }).name || '不明';
      }
      return {
        ...record,
        mountainName,
        photos: Array.isArray(record.climb_photos)
          ? record.climb_photos.sort((a: ClimbPhoto, b: ClimbPhoto) => (a.sort_order || 0) - (b.sort_order || 0))
          : [],
      };
    });
  } catch {
    return [];
  }
}


/**
 * 公開されている登山記録を取得（自分の投稿も含む）
 */
export async function getPublicClimbRecords(limit: number = 50): Promise<ClimbRecordWithMountain[]> {
  try {
    const { data, error } = await supabase
      .from('climbs')
      .select(`
        *,
        mountains (name),
        users (id, display_name),
        climb_photos (
          id,
          storage_path,
          thumbnail_path,
          caption,
          sort_order
        ),
        climb_favorites(count)
      `)
      .eq('is_public', true)
      .order('published_at', { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data || []).map(record => ({
      ...record,
      mountainName: Array.isArray(record.mountains)
        ? record.mountains[0]?.name
        : record.mountains?.name || '不明',
      user: Array.isArray(record.users)
        ? record.users[0]
        : record.users,
      photos: Array.isArray(record.climb_photos)
        ? record.climb_photos.sort((a: ClimbPhoto, b: ClimbPhoto) => (a.sort_order || 0) - (b.sort_order || 0))
        : [],
      likeCount: Array.isArray(record.climbFavorites) ? record.climbFavorites[0]?.count || 0 : 0
    }));
  } catch {
    return [];
  }
}

/**
 * 特定の山の公開登山記録を取得
 */
export async function getPublicClimbRecordsByMountain(mountainId: string): Promise<ClimbRecordWithMountain[]> {
  try {
    const { data, error } = await supabase
      .from('climbs')
      .select(`
        *,
        mountains (name),
        users (id, display_name),
        climb_photos (
          id,
          storage_path,
          thumbnail_path,
          caption,
          sort_order
        )
      `)
      .eq('mountain_id', mountainId)
      .eq('is_public', true)
      .order('published_at', { ascending: false });
    if (error) return [];
    return (data || []).map(record => ({
      ...record,
      mountainName: Array.isArray(record.mountains)
        ? record.mountains[0]?.name
        : record.mountains?.name || '不明',
      user: Array.isArray(record.users)
        ? record.users[0]
        : record.users,
      photos: Array.isArray(record.climb_photos)
        ? record.climb_photos.sort((a: ClimbPhoto, b: ClimbPhoto) => (a.sort_order || 0) - (b.sort_order || 0))
        : [],
    }));
  } catch {
    return [];
  }
}

/**
 * 特定の山の登山記録を取得
 */
export async function getMountainClimbRecords(
  userId: string,
  mountainId: string
): Promise<ClimbRecordWithMountain[]> {
  try {
    const { data, error } = await supabase
      .from('climbs')
      .select(`
        *,
        mountains (name)
      `)
      .eq('user_id', userId)
      .eq('mountain_id', mountainId)
      .order('climb_date', { ascending: false });
    if (error) return [];
    return (data || []).map(record => ({
      ...record,
      mountainName: Array.isArray(record.mountains)
        ? record.mountains[0]?.name
        : record.mountains?.name || '不明'
    }));
  } catch {
    return [];
  }
}

/**
 * 登山記録の公開状態を更新
 */
export async function updateClimbRecordPublicStatus(
  recordId: string,
  isPublic: boolean
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('climbs')
      .update({
        is_public: isPublic,
      })
      .eq('id', recordId);
    return !error;
  } catch {
    return false;
  }
}

/**
 * 登山記録を更新（未実装）
 */
export async function updateClimbRecord(recordId: string, data: Partial<ClimbRecordWithMountain>): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('climbs')
      .update(data)
      .eq('id', recordId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}



/**
 * 登山記録を削除
 */
export async function deleteClimbRecord(recordId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('climbs')
      .delete()
      .eq('id', recordId);
    return !error;
  } catch {
    return false;
  }
}
