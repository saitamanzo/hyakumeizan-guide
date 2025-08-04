import { createClient } from './supabase/client';
const supabase = createClient();

// いいねの型定義
export interface Like {
  id?: string;
  user_id: string;
  climb_id?: string;
  plan_id?: string;
  created_at?: string;
}

// いいね数の型定義
export interface LikeCount {
  count: number;
  user_has_liked: boolean;
}

/**
 * 登山記録にいいねを追加
 */
export async function addClimbLike(
  userId: string,
  climbId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('likes')
      .insert({
        user_id: userId,
        climb_id: climbId
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * 登山記録のいいねを削除
 */
export async function removeClimbLike(
  userId: string,
  climbId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', userId)
      .eq('climb_id', climbId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * 登山計画にいいねを追加
 */
export async function addPlanLike(
  userId: string,
  planId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('likes')
      .insert({
        user_id: userId,
        plan_id: planId
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * 登山計画のいいねを削除
 */
export async function removePlanLike(
  userId: string,
  planId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', userId)
      .eq('plan_id', planId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * 登山記録のいいね数とユーザーのいいね状況を取得
 */
export async function getClimbLikeCount(
  climbId: string,
  userId?: string
): Promise<LikeCount> {
  try {
    // いいね数を取得
    const { data: countData, error: countError } = await supabase
      .from('likes')
      .select('id')
      .eq('climb_id', climbId);

    if (countError) {
      console.error('いいね数取得エラー:', countError);
      return { count: 0, user_has_liked: false };
    }

    const count = countData?.length || 0;

    // ユーザーがいいねしているかチェック（ログインしている場合のみ）
    let user_has_liked = false;
    if (userId) {
      const { data: userLikeData, error: userLikeError } = await supabase
        .from('likes')
        .select('id')
        .eq('climb_id', climbId)
        .eq('user_id', userId)
        .single();

      if (!userLikeError && userLikeData) {
        user_has_liked = true;
      }
    }

    return { count, user_has_liked };
  } catch (error) {
    console.error('いいね数取得例外:', error);
    return { count: 0, user_has_liked: false };
  }
}

/**
 * 登山計画のいいね数とユーザーのいいね状況を取得
 */
export async function getPlanLikeCount(
  planId: string,
  userId?: string
): Promise<LikeCount> {
  try {
    // いいね数を取得
    const { data: countData, error: countError } = await supabase
      .from('likes')
      .select('id')
      .eq('plan_id', planId);

    if (countError) {
      console.error('いいね数取得エラー:', countError);
      return { count: 0, user_has_liked: false };
    }

    const count = countData?.length || 0;

    // ユーザーがいいねしているかチェック（ログインしている場合のみ）
    let user_has_liked = false;
    if (userId) {
      const { data: userLikeData, error: userLikeError } = await supabase
        .from('likes')
        .select('id')
        .eq('plan_id', planId)
        .eq('user_id', userId)
        .single();

      if (!userLikeError && userLikeData) {
        user_has_liked = true;
      }
    }

    return { count, user_has_liked };
  } catch (error) {
    console.error('いいね数取得例外:', error);
    return { count: 0, user_has_liked: false };
  }
}

/**
 * いいねをトグル（追加または削除）- 登山記録用
 */
export async function toggleClimbLike(
  userId: string,
  climbId: string
): Promise<{ success: boolean; action: 'added' | 'removed'; error?: string }> {
  try {
    // 現在のいいね状況をチェック
    const { data: existingLike, error: checkError } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', userId)
      .eq('climb_id', climbId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = 結果が見つからない（いいねしていない）
      return { success: false, action: 'removed', error: checkError.message };
    }

    if (existingLike) {
      // いいねを削除
      const result = await removeClimbLike(userId, climbId);
      return { 
        success: result.success, 
        action: 'removed', 
        error: result.error 
      };
    } else {
      // いいねを追加
      const result = await addClimbLike(userId, climbId);
      return { 
        success: result.success, 
        action: 'added', 
        error: result.error 
      };
    }
  } catch (error) {
    return { 
      success: false, 
      action: 'removed', 
      error: String(error) 
    };
  }
}

/**
 * いいねをトグル（追加または削除）- 登山計画用
 */
export async function togglePlanLike(
  userId: string,
  planId: string
): Promise<{ success: boolean; action: 'added' | 'removed'; error?: string }> {
  try {
    // 現在のいいね状況をチェック
    const { data: existingLike, error: checkError } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', userId)
      .eq('plan_id', planId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = 結果が見つからない（いいねしていない）
      return { success: false, action: 'removed', error: checkError.message };
    }

    if (existingLike) {
      // いいねを削除
      const result = await removePlanLike(userId, planId);
      return { 
        success: result.success, 
        action: 'removed', 
        error: result.error 
      };
    } else {
      // いいねを追加
      const result = await addPlanLike(userId, planId);
      return { 
        success: result.success, 
        action: 'added', 
        error: result.error 
      };
    }
  } catch (error) {
    return { 
      success: false, 
      action: 'removed', 
      error: String(error) 
    };
  }
}
