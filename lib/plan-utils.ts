import { createClient } from './supabase/client';
const supabase = createClient();

// 登山計画の型定義
export interface Plan {
  id?: string;
  user_id: string;
  mountain_id: string;
  title: string;
  description?: string;
  planned_date?: string;
  planned_start_date?: string;
  planned_end_date?: string;
  estimated_duration?: number; // 分単位
  difficulty_level?: 'easy' | 'moderate' | 'hard';
  route_plan?: string;
  transport_mode?: 'car' | 'public' | 'taxi' | 'shuttle' | 'bike' | 'walk' | 'other';
  equipment_list?: string[];
  lodging?: string;
  notes?: string;
  is_public?: boolean;
  published_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PlanWithMountain extends Plan {
  mountain_name?: string;
  user?: {
    id: string;
    display_name?: string;
  };
  like_count?: number;
}

/**
 * 公開されている登山計画を取得（like_count含む）
 */
export async function getPublicPlans(limit: number = 50): Promise<PlanWithMountain[]> {
  try {
    const { data, error }: { data: any[] | null; error: any } = await supabase
      .from('plans')
      .select(`
        *,
        mountains (name),
        users (id, display_name),
        plan_favorites(count)
      `)
      .eq('is_public', true)
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error && (error.message || Object.keys(error).length > 0)) {
      console.error('公開登山計画取得エラー:', error.message || error);
      return [];
    }
    if (!data || !Array.isArray(data)) {
      console.error('公開登山計画取得エラー: データが取得できません', { data });
      return [];
    }

    return data.map(plan => ({
      ...plan,
      mountain_name: Array.isArray(plan.mountains)
        ? plan.mountains[0]?.name
        : plan.mountains?.name || '不明',
      user: Array.isArray(plan.users)
        ? plan.users[0]
        : plan.users,
      like_count: Array.isArray(plan.plan_favorites) ? plan.plan_favorites[0]?.count || 0 : 0
    }));
  } catch (error) {
    console.error('公開登山計画取得例外:', error);
    return [];
  }
}

/**
 * 登山計画を保存
 */
export async function savePlan(
  userId: string,
  mountainId: string,
  data: {
    title: string;
    description?: string;
  plannedDate?: string; // backward compatible
  plannedStartDate?: string;
  plannedEndDate?: string;
    estimatedDuration?: number;
    difficultyLevel?: 'easy' | 'moderate' | 'hard';
    routePlan?: string;
  transportMode?: 'car' | 'public' | 'taxi' | 'shuttle' | 'bike' | 'walk' | 'other';
    equipmentList?: string[];
  lodging?: string;
    notes?: string;
    isPublic?: boolean;
  }
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const plan = {
      user_id: userId,
      mountain_id: mountainId,
      title: data.title,
      description: data.description,
  planned_date: data.plannedDate,
  planned_start_date: data.plannedStartDate ?? data.plannedDate,
  planned_end_date: data.plannedEndDate ?? data.plannedDate,
      estimated_duration: data.estimatedDuration,
      difficulty_level: data.difficultyLevel,
      route_plan: data.routePlan,
  transport_mode: data.transportMode,
      equipment_list: data.equipmentList,
  lodging: data.lodging,
      notes: data.notes,
      is_public: data.isPublic || false,
    };

    const { data: result, error } = await supabase
      .from('plans')
      .insert(plan)
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
 * ユーザーの登山計画を取得
 */
export async function getUserPlans(userId: string): Promise<PlanWithMountain[]> {
  try {
    console.log('getUserPlans: 開始 - userID:', userId);
    
    const { data, error } = await supabase
      .from('plans')
      .select(`
        *,
        mountains (name)
      `)
      .eq('user_id', userId)
      .order('planned_date', { ascending: true });

    console.log('getUserPlans: Supabase応答', { data: data?.length || 0, error });

    if (error) {
      console.error('登山計画取得エラー:', error);
      return [];
    }

    const result = (data || []).map(plan => ({
      ...plan,
      mountain_name: Array.isArray(plan.mountains) 
        ? plan.mountains[0]?.name 
        : plan.mountains?.name || '不明'
    }));

    console.log('getUserPlans: 成功 -', result.length, '件取得');
    return result;
  } catch (error) {
    console.error('登山計画取得例外:', error);
    return [];
  }
}



/**
 * 特定の山の公開登山計画を取得
 */
export async function getPublicPlansByMountain(mountainId: string): Promise<PlanWithMountain[]> {
  try {
    const { data, error } = await supabase
      .from('plans')
      .select(`
        *,
        mountains (name),
        users (id, display_name)
      `)
      .eq('mountain_id', mountainId)
      .eq('is_public', true)
      .order('published_at', { ascending: false });

    if (error) {
      console.error('山別公開登山計画取得エラー:', error);
      return [];
    }

    const result = (data || []).map(plan => ({
      ...plan,
      mountain_name: Array.isArray(plan.mountains) 
        ? plan.mountains[0]?.name 
        : plan.mountains?.name || '不明',
      user: Array.isArray(plan.users)
        ? plan.users[0]
        : plan.users
    }));

    return result;
  } catch (error) {
    console.error('山別公開登山計画取得例外:', error);
    return [];
  }
}

/**
 * 登山計画の公開状態を更新
 */
export async function updatePlanPublicStatus(
  planId: string, 
  isPublic: boolean
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('plans')
      .update({ 
        is_public: isPublic,
        // published_at はトリガーで自動設定される
      })
      .eq('id', planId);

    return !error;
  } catch {
    return false;
  }
}

/**
 * 登山計画を更新
 */
export async function updatePlan(
  planId: string,
  data: {
    title?: string;
    description?: string;
  planned_date?: string;
  planned_start_date?: string;
  planned_end_date?: string;
    estimated_duration?: number;
    difficulty_level?: 'easy' | 'moderate' | 'hard';
    route_plan?: string;
  transport_mode?: 'car' | 'public' | 'taxi' | 'shuttle' | 'bike' | 'walk' | 'other';
    equipment_list?: string[];
  lodging?: string;
    notes?: string;
    is_public?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('plans')
      .update(data)
      .eq('id', planId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * 登山計画を削除
 */
export async function deletePlan(planId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('plans')
      .delete()
      .eq('id', planId);

    return !error;
  } catch {
    return false;
  }
}
