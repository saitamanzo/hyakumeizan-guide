import { Plan, User } from './database';

export interface PlanWithMountain extends Plan {
  mountains?: { name: string }[] | { name: string } | null;
  users?: { id: string; display_name?: string | null }[] | { id: string; display_name?: string | null } | null;
  // convenience single user when querying with relationships
  user?: { id: string; display_name?: string | null } | null;
  mountain_name?: string | null;
  plan_favorites?: { count: number }[] | null;
  like_count?: number | null;
}
