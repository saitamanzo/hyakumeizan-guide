import { ClimbRecordWithMountain } from './climb-utils';
import { PlanWithMountain } from './plan-utils';

// ソーシャルメディア投稿用の型定義
export interface SocialShareData {
  text: string;
  url: string;
  hashtags?: string[];
  image?: string;
}

/**
 * 登山記録をTwitter投稿用のテキストに変換
 */
export function createClimbTweetText(climb: ClimbRecordWithMountain): SocialShareData {
  const mountainName = climb.mountain_name || '百名山';
  const climbDate = climb.climb_date ? new Date(climb.climb_date).toLocaleDateString('ja-JP') : '先日';
  const difficultyText = climb.difficulty_rating === 1 ? '初級' : climb.difficulty_rating === 3 ? '中級' : '上級';
  const weatherText = climb.weather_conditions || '良好';
  
  let text = `⛰️ ${mountainName}に登山してきました！\n\n`;
  text += `📅 登山日: ${climbDate}\n`;
  text += `🏔️ 難易度: ${difficultyText}\n`;
  text += `☀️ 天候: ${weatherText}\n`;
  
  if (climb.notes) {
    const shortNotes = climb.notes.length > 50 ? climb.notes.substring(0, 50) + '...' : climb.notes;
    text += `\n📝 ${shortNotes}`;
  }
  
  text += '\n\n#百名山 #登山 #山登り #アウトドア #ハイキング';
  
  const hashtags = ['百名山', '登山', '山登り', 'アウトドア', 'ハイキング'];
  
  return {
    text,
    url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://hyakumeizan-guide.vercel.app'}/mountains/${climb.mountain_id}`,
    hashtags
  };
}

/**
 * 登山計画をTwitter投稿用のテキストに変換
 */
export function createPlanTweetText(plan: PlanWithMountain): SocialShareData {
  const mountainName = plan.mountain_name || '百名山';
  const plannedDate = plan.planned_date ? new Date(plan.planned_date).toLocaleDateString('ja-JP') : '近日';
  const duration = plan.estimated_duration ? `${Math.round(plan.estimated_duration / 60)}時間` : '未定';
  
  let text = `⛰️ ${mountainName}の登山計画を立てました！\n\n`;
  text += `📅 予定日: ${plannedDate}\n`;
  text += `⏰ 予想時間: ${duration}\n`;
  text += `🥾 ルート: ${plan.route_plan || '一般ルート'}\n`;
  
  if (plan.equipment_list && plan.equipment_list.length > 0) {
    text += `🎒 装備: ${plan.equipment_list.slice(0, 3).join('、')}など\n`;
  }
  
  if (plan.notes) {
    const shortNotes = plan.notes.length > 40 ? plan.notes.substring(0, 40) + '...' : plan.notes;
    text += `\n📝 ${shortNotes}`;
  }
  
  text += '\n\n#百名山 #登山計画 #山登り #登山準備 #アウトドア';
  
  const hashtags = ['百名山', '登山計画', '山登り', '登山準備', 'アウトドア'];
  
  return {
    text,
    url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://hyakumeizan-guide.vercel.app'}/mountains/${plan.mountain_id}`,
    hashtags
  };
}

/**
 * Instagram投稿用のキャプションを作成（登山記録）
 */
export function createClimbInstagramCaption(climb: ClimbRecordWithMountain): SocialShareData {
  const mountainName = climb.mountain_name || '百名山';
  const climbDate = climb.climb_date ? new Date(climb.climb_date).toLocaleDateString('ja-JP') : '先日';
  const difficultyText = climb.difficulty_rating === 1 ? '初級' : climb.difficulty_rating === 3 ? '中級' : '上級';
  
  let text = `⛰️ ${mountainName}登山完了！\n\n`;
  text += `今回は${difficultyText}コースに挑戦してきました。\n`;
  text += `登山日: ${climbDate}\n`;
  
  if (climb.weather_conditions) {
    text += `天候: ${climb.weather_conditions}\n`;
  }
  
  if (climb.notes) {
    text += `\n${climb.notes}\n`;
  }
  
  text += '\n大自然のパワーをたくさんもらいました！✨\n';
  text += 'また新しい山に挑戦したいと思います💪\n\n';
  text += '#百名山 #登山 #山登り #自然 #アウトドア #ハイキング #山好き #絶景 #nature #hiking #mountains';
  
  const hashtags = ['百名山', '登山', '山登り', '自然', 'アウトドア', 'ハイキング', '山好き', '絶景', 'nature', 'hiking', 'mountains'];
  
  return {
    text,
    url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://hyakumeizan-guide.vercel.app'}/mountains/${climb.mountain_id}`,
    hashtags
  };
}

/**
 * Instagram投稿用のキャプションを作成（登山計画）
 */
export function createPlanInstagramCaption(plan: PlanWithMountain): SocialShareData {
  const mountainName = plan.mountain_name || '百名山';
  const plannedDate = plan.planned_date ? new Date(plan.planned_date).toLocaleDateString('ja-JP') : '近日';
  
  let text = `⛰️ 次の登山計画：${mountainName}\n\n`;
  text += `予定日: ${plannedDate} 📅\n`;
  
  if (plan.estimated_duration) {
    text += `予想時間: ${Math.round(plan.estimated_duration / 60)}時間 ⏰\n`;
  }
  
  text += `ルート: ${plan.route_plan || '一般ルート'} 🥾\n\n`;
  
  if (plan.equipment_list && plan.equipment_list.length > 0) {
    text += `準備する装備:\n`;
    plan.equipment_list.slice(0, 5).forEach(item => {
      text += `✓ ${item}\n`;
    });
    if (plan.equipment_list.length > 5) {
      text += `...他${plan.equipment_list.length - 5}点\n`;
    }
    text += '\n';
  }
  
  if (plan.notes) {
    text += `${plan.notes}\n\n`;
  }
  
  text += '安全第一で楽しい登山にしたいと思います！💪✨\n\n';
  text += '#百名山 #登山計画 #山登り #登山準備 #アウトドア #ハイキング #山好き #nature #hiking #mountaineering #outdoor';
  
  const hashtags = ['百名山', '登山計画', '山登り', '登山準備', 'アウトドア', 'ハイキング', '山好き', 'nature', 'hiking', 'mountaineering', 'outdoor'];
  
  return {
    text,
    url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://hyakumeizan-guide.vercel.app'}/mountains/${plan.mountain_id}`,
    hashtags
  };
}

/**
 * TwitterのWeb Intent URLを生成
 */
export function createTwitterShareUrl(shareData: SocialShareData): string {
  const params = new URLSearchParams();
  params.append('text', shareData.text);
  params.append('url', shareData.url);
  
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

/**
 * InstagramのWebシェアURL（実際にはクリップボードにコピー）
 * Instagramは直接WebからのシェアAPIがないため、キャプションをクリップボードにコピーして
 * ユーザーがInstagramアプリで投稿する形式
 */
export function shareToInstagram(shareData: SocialShareData): void {
  // クリップボードにキャプションをコピー
  if (navigator.clipboard) {
    navigator.clipboard.writeText(shareData.text).then(() => {
      alert('キャプションをクリップボードにコピーしました！\nInstagramアプリを開いて投稿してください。');
    }).catch(() => {
      // フォールバック
      fallbackCopyTextToClipboard(shareData.text);
    });
  } else {
    // フォールバック
    fallbackCopyTextToClipboard(shareData.text);
  }
}

/**
 * フォールバック用のクリップボードコピー
 */
function fallbackCopyTextToClipboard(text: string): void {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.top = '0';
  textArea.style.left = '0';
  textArea.style.position = 'fixed';
  
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    document.execCommand('copy');
    alert('キャプションをクリップボードにコピーしました！\nInstagramアプリを開いて投稿してください。');
  } catch (err) {
    console.error('クリップボードへのコピーに失敗:', err);
    alert('クリップボードへのコピーに失敗しました。手動でコピーしてください。');
  }
  
  document.body.removeChild(textArea);
}

/**
 * ソーシャルメディアのシェア統計を記録（オプション）
 */
export function trackSocialShare(platform: 'twitter' | 'instagram', contentType: 'climb' | 'plan', contentId: string): void {
  // 将来的にアナリティクス機能を追加する場合に使用
  console.log(`Social share tracked: ${platform} - ${contentType} - ${contentId}`);
}
