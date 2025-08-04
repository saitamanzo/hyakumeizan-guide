import { createClient } from './supabase/client';
const supabase = createClient();

// 写真データの型定義
export interface ClimbPhoto {
  id: string;
  storage_path: string;
  thumbnail_path?: string;
  caption?: string;
  sort_order?: number;
}

// 基本的な登山記録の型定義（データベーススキーマに合わせて）
export interface ClimbRecord {
  id?: string;
  user_id: string;
  mountain_id: string;
  route_id?: string;
  climb_date: string;
  start_time?: string;
  end_time?: string;
  weather_conditions?: string;
  notes?: string;
  difficulty_rating?: number;
  is_public?: boolean;
  published_at?: string;
  created_at?: string;
  updated_at?: string;
}

// 表示用の登山記録（山の名前と写真データ込み）
export interface ClimbRecordWithMountain extends ClimbRecord {
  mountain_name?: string;
  photos?: ClimbPhoto[];
  user?: {
    id: string;
    display_name?: string;
  };
}

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
      notes: `ルート: ${data.route}\n所要時間: ${data.duration}\n同行者: ${data.companions}\n満足度: ${data.rating}/5\n\n${data.notes}`,
      weather_conditions: data.weather,
      difficulty_rating: difficultyMap[data.difficulty],
      is_public: data.isPublic || false,
    };

    const { data: result, error } = await supabase
      .from('climbs')
      .insert(record)
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, id: result.id };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * ユーザーの登山記録を取得（写真データも含む）
 */
export async function getUserClimbRecords(userId: string): Promise<ClimbRecordWithMountain[]> {
  try {
    console.log('getUserClimbRecords: 開始 - userID:', userId);
    
    const { data, error } = await supabase
      .from('climbs')
      .select(`
        *,
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

    console.log('getUserClimbRecords: Supabase応答', { data: data?.length || 0, error });

    if (error) {
      console.error('登山記録取得エラー:', error);
      return [];
    }

    const result = (data || []).map(record => ({
      ...record,
      mountain_name: Array.isArray(record.mountains) 
        ? record.mountains[0]?.name 
        : record.mountains?.name || '不明',
      // 写真データをソートして追加
      photos: (record.climb_photos || [])
        .sort((a: ClimbPhoto, b: ClimbPhoto) => (a.sort_order || 0) - (b.sort_order || 0))
    }));

    console.log('getUserClimbRecords: 成功 -', result.length, '件取得');
    console.log('写真付き記録:', result.filter(r => r.photos && r.photos.length > 0).length, '件');
    
    // 写真データの詳細をログ出力
    result.forEach((record, index) => {
      if (record.photos && record.photos.length > 0) {
        console.log(`記録 ${index + 1} (${record.mountain_name}):`, {
          climbId: record.id,
          photoCount: record.photos.length,
          photos: record.photos.map((p: ClimbPhoto) => ({
            id: p.id,
            storage_path: p.storage_path,
            thumbnail_path: p.thumbnail_path,
            caption: p.caption
          }))
        });
      }
    });
    
    return result;
  } catch (error) {
    console.error('getUserClimbRecords: 例外発生:', error);
    return [];
  }
}

/**
 * 公開されている登山記録を取得（自分の投稿も含む）
 */
export async function getPublicClimbRecords(limit: number = 20): Promise<ClimbRecordWithMountain[]> {
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
      .eq('is_public', true)
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('公開登山記録取得エラー:', error);
      return [];
    }

    const result = (data || []).map(record => ({
      ...record,
      mountain_name: Array.isArray(record.mountains) 
        ? record.mountains[0]?.name 
        : record.mountains?.name || '不明',
      user: Array.isArray(record.users)
        ? record.users[0]
        : record.users,
      // 写真データをソートして追加
      photos: (record.climb_photos || [])
        .sort((a: ClimbPhoto, b: ClimbPhoto) => (a.sort_order || 0) - (b.sort_order || 0))
    }));

    return result;
  } catch (error) {
    console.error('公開登山記録取得例外:', error);
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

    if (error) {
      console.error('山別公開登山記録取得エラー:', error);
      return [];
    }

    const result = (data || []).map(record => ({
      ...record,
      mountain_name: Array.isArray(record.mountains) 
        ? record.mountains[0]?.name 
        : record.mountains?.name || '不明',
      user: Array.isArray(record.users)
        ? record.users[0]
        : record.users,
      // 写真データをソートして追加
      photos: (record.climb_photos || [])
        .sort((a: ClimbPhoto, b: ClimbPhoto) => (a.sort_order || 0) - (b.sort_order || 0))
    }));

    return result;
  } catch (error) {
    console.error('山別公開登山記録取得例外:', error);
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

    if (error) {
      return [];
    }

    return (data || []).map(record => ({
      ...record,
      mountain_name: Array.isArray(record.mountains) 
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
        // published_at はトリガーで自動設定される
      })
      .eq('id', recordId);

    return !error;
  } catch {
    return false;
  }
}

/**
 * 登山記録を更新
 */
export async function updateClimbRecord(
  recordId: string,
  data: {
    climb_date?: string;
    route_id?: string;
    start_time?: string;
    end_time?: string;
    weather_conditions?: string;
    notes?: string;
    difficulty_rating?: number;
    is_public?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('climbs')
      .update(data)
      .eq('id', recordId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
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
