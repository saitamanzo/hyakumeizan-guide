// 登山記録・写真関連の型定義

export interface ClimbPhoto {
  id: string;
  storage_path: string;
  thumbnail_path?: string;
  caption?: string;
  sort_order?: number;
}

export interface ClimbRecord {
  id?: string;
  user_id: string;
  mountain_id: string;
  route_id?: string;
}

export interface ClimbRecordWithMountain extends ClimbRecord {
  mountain_name?: string;
  photos?: ClimbPhoto[];
  user?: {
    id: string;
    display_name?: string;
  };
  like_count?: number;
  notes?: string;
  published_at?: string;
  difficulty_rating?: number;
  climb_date?: string;
  weather_conditions?: string;
  is_public?: boolean;
  created_at?: string;
}