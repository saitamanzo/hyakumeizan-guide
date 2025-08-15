import { createClient } from './supabase/client';
import type { PlanComment, ClimbComment } from '@/types/database';

const supabase = createClient();

type PlanCommentRow = PlanComment & { users?: { id: string; display_name: string | null; nickname: string | null } | { id: string; display_name: string | null; nickname: string | null }[] };
type ClimbCommentRow = ClimbComment & { users?: { id: string; display_name: string | null; nickname: string | null } | { id: string; display_name: string | null; nickname: string | null }[] };

export async function getPlanComments(planId: string, opts?: { limit?: number; offset?: number }): Promise<PlanComment[]> {
  const { data, error } = await supabase
    .from('plan_comments')
    .select('*, users ( id, display_name, nickname )')
    .eq('plan_id', planId)
  .order('created_at', { ascending: false })
  .range(opts?.offset ?? 0, (opts?.offset ?? 0) + (opts?.limit ?? 20) - 1);
  if (error) {
    console.error('getPlanComments error', error);
    return [];
  }
  return ((data as PlanCommentRow[]) || []).map((c) => ({
    id: c.id,
    plan_id: c.plan_id,
    user_id: c.user_id,
    content: c.content,
    created_at: c.created_at,
    user: Array.isArray(c.users) ? c.users[0] : c.users,
  }));
}

export async function addPlanComment(planId: string, userId: string, content: string): Promise<{ success: boolean; error?: string }>{
  const { error } = await supabase.from('plan_comments').insert({ plan_id: planId, user_id: userId, content });
  return { success: !error, error: error?.message };
}

export async function updatePlanComment(id: string, content: string): Promise<{ success: boolean; error?: string }>{
  const { error } = await supabase.from('plan_comments').update({ content }).eq('id', id);
  return { success: !error, error: error?.message };
}

export async function deletePlanComment(id: string): Promise<{ success: boolean; error?: string }>{
  const { error } = await supabase.from('plan_comments').delete().eq('id', id);
  return { success: !error, error: error?.message };
}

export async function getClimbComments(climbId: string, opts?: { limit?: number; offset?: number }): Promise<ClimbComment[]> {
  const { data, error } = await supabase
    .from('climb_comments')
    .select('*, users ( id, display_name, nickname )')
    .eq('climb_id', climbId)
  .order('created_at', { ascending: false })
  .range(opts?.offset ?? 0, (opts?.offset ?? 0) + (opts?.limit ?? 20) - 1);
  if (error) {
    console.error('getClimbComments error', error);
    return [];
  }
  return ((data as ClimbCommentRow[]) || []).map((c) => ({
    id: c.id,
    climb_id: c.climb_id,
    user_id: c.user_id,
    content: c.content,
    created_at: c.created_at,
    user: Array.isArray(c.users) ? c.users[0] : c.users,
  }));
}

export async function addClimbComment(climbId: string, userId: string, content: string): Promise<{ success: boolean; error?: string }>{
  const { error } = await supabase.from('climb_comments').insert({ climb_id: climbId, user_id: userId, content });
  return { success: !error, error: error?.message };
}

export async function updateClimbComment(id: string, content: string): Promise<{ success: boolean; error?: string }>{
  const { error } = await supabase.from('climb_comments').update({ content }).eq('id', id);
  return { success: !error, error: error?.message };
}

export async function deleteClimbComment(id: string): Promise<{ success: boolean; error?: string }>{
  const { error } = await supabase.from('climb_comments').delete().eq('id', id);
  return { success: !error, error: error?.message };
}

// 通報テーブル（reports）を想定: { id, target_type: 'plan_comment'|'climb_comment', target_id, reporter_id, reason, created_at }
export async function reportComment(targetType: 'plan_comment' | 'climb_comment', targetId: string, reporterId: string, reason: string): Promise<{ success: boolean; error?: string }>{
  const { error } = await supabase.from('reports').insert({ target_type: targetType, target_id: targetId, reporter_id: reporterId, reason });
  return { success: !error, error: error?.message };
}
