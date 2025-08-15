declare module '@sentry/nextjs' {
  export function captureException(error: unknown, context?: unknown): void
  export function captureMessage(message: string, context?: unknown): void
  export function getCurrentScope(): unknown
}
