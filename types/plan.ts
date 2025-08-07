// 登山計画関連の型定義

export interface Plan {
  id?: string;
  user_id: string;
  mountain_id: string;
  title: string;
  description?: string;
  planned_date?: string;
  estimated_duration?: number; // 分単位
  difficulty_level?: 'easy' | 'moderate' | 'hard';
  route_plan?: string;
  equipment_list?: string[];
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