import { supabase } from './supabase';

// 基本的な登山記録の型定義
export interface ClimbRecord {
  id?: string;
  user_id: string;
  mountain_id: string;
  climb_date: string;
  notes?: string;
  weather_conditions?: string;
  difficulty_rating?: number;
  created_at?: string;
  updated_at?: string;
}

// 表示用の登山記録（山の名前込み）
export interface ClimbRecordWithMountain extends ClimbRecord {
  mountain_name?: string;
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
 * ユーザーの登山記録を取得
 */
export async function getUserClimbRecords(userId: string): Promise<ClimbRecordWithMountain[]> {
  try {
    const { data, error } = await supabase
      .from('climbs')
      .select(`
        *,
        mountains (name)
      `)
      .eq('user_id', userId)
      .order('climb_date', { ascending: false });

    if (error) {
      console.error('登山記録取得エラー:', error);
      return [];
    }

    return (data || []).map(record => ({
      ...record,
      mountain_name: Array.isArray(record.mountains) 
        ? record.mountains[0]?.name 
        : record.mountains?.name || '不明'
    }));
  } catch (error) {
    console.error('登山記録取得例外:', error);
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
      console.error('山別登山記録取得エラー:', error);
      return [];
    }

    return (data || []).map(record => ({
      ...record,
      mountain_name: Array.isArray(record.mountains) 
        ? record.mountains[0]?.name 
        : record.mountains?.name || '不明'
    }));
  } catch (error) {
    console.error('山別登山記録取得例外:', error);
    return [];
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
  } catch (error) {
    console.error('登山記録削除エラー:', error);
    return false;
  }
}
