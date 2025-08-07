// APIレスポンス共通型
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };