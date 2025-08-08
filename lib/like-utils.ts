
import { createClient } from './supabase/client';
const supabase = createClient();

/**
 * 登山記録のお気に入り（Like）数を取得
 */
export async function getClimbLikeCount(climbId: string): Promise<number> {
	const { data, error } = await supabase
		.from('climb_likes')
		.select('id', { count: 'exact', head: true })
		.eq('climb_id', climbId);
	if (error) return 0;
	return data?.length ?? 0;
}

/**
 * 登山記録のお気に入り（Like）トグル
 */
export async function toggleClimbLike(climbId: string, userId: string): Promise<boolean> {
	// 既にLikeしているか確認
	const { data, error } = await supabase
		.from('climb_likes')
		.select('id')
		.eq('climb_id', climbId)
		.eq('user_id', userId)
		.single();
	if (error && error.code !== 'PGRST116') return false;
	if (data) {
		// 既にLikeしている場合は削除
		const { error: deleteError } = await supabase
			.from('climb_likes')
			.delete()
			.eq('id', data.id);
		return !deleteError;
	} else {
		// Likeしていない場合は追加
		const { error: insertError } = await supabase
			.from('climb_likes')
			.insert({ climb_id: climbId, user_id: userId });
		return !insertError;
	}
}
