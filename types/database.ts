export type Mountain = {
  id: string;
  name: string;
  name_kana: string | null;
  elevation: number;
  location: string;
  prefecture: string;
  description: string | null;
  best_season: string | null;
  difficulty_level: string | null;
  latitude: number | null;
  longitude: number | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export type Route = {
  id: string;
  mountain_id: string;
  name: string;
  description: string | null;
  distance: number | null;
  elevation_gain: number | null;
  estimated_time: number | null;
  difficulty_level: string | null;
  starting_point: string | null;
  trail_head_access: string | null;
  created_at: string;
  updated_at: string;
}

export type User = {
  id: string;
  display_name: string | null;
  nickname?: string | null;
  biography: string | null;
  experience_level: string | null;
  mountains_climbed: number;
  created_at: string;
  updated_at: string;
}

export type PlanComment = {
  id: string;
  plan_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: Pick<User, 'id' | 'display_name' | 'nickname'>;
}

export type ClimbComment = {
  id: string;
  climb_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: Pick<User, 'id' | 'display_name' | 'nickname'>;
}

export type Climb = {
  id: string;
  user_id: string;
  mountain_id: string;
  route_id: string | null;
  climb_date: string;
  climb_start_date: string | null;
  climb_end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  weather_conditions: string | null;
  notes: string | null;
  transport_mode: 'car' | 'public' | 'taxi' | 'shuttle' | 'bike' | 'walk' | 'other' | null;
  lodging: string | null;
  is_public: boolean | null;
  published_at: string | null;
  difficulty_rating: number | null;
  created_at: string;
  updated_at: string;
}

export type Review = {
  id: string;
  user_id: string;
  mountain_id: string;
  route_id: string | null;
  rating: number;
  content: string | null;
  created_at: string;
  updated_at: string;
}

export type Plan = {
  id: string;
  user_id: string;
  mountain_id: string;
  title: string;
  description: string | null;
  planned_date: string | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  estimated_duration: number | null; // 分単位
  difficulty_level: 'easy' | 'moderate' | 'hard' | null;
  route_plan: string | null;
  transport_mode: 'car' | 'public' | 'taxi' | 'shuttle' | 'bike' | 'walk' | 'other' | null;
  equipment_list: string[] | null;
  lodging: string | null;
  notes: string | null;
  is_public: boolean | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

// Response types with relationships
export type MountainWithRoutes = Mountain & {
  routes: Route[];
}

export type MountainWithReviews = Mountain & {
  reviews: Review[];
}

export type UserWithClimbs = User & {
  climbs: Climb[];
}

export type ClimbWithDetails = Climb & {
  mountain: Mountain;
  route?: Route;
  user: User;
}

export type PlanWithDetails = Plan & {
  mountain: Mountain;
  user: User;
}
