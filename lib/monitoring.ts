type Extra = Record<string, unknown>

let sentry: unknown = null

const SENTRY_DSN = process.env.SENTRY_DSN
const ENV = process.env.NODE_ENV || 'development'

async function ensureSentry() {
  if (!SENTRY_DSN) return null
  if (sentry) return sentry
  try {
  // Avoid static resolution at build time
  const dynImport = new Function('m', 'return import(m)') as (m: string) => Promise<unknown>
  const mod = await dynImport('@sentry/nextjs')
  sentry = mod as unknown
  const hasScope = 'getCurrentScope' in (mod as object)
  if (!hasScope) {
      return null
    }
  return sentry
  } catch {
    return null
  }
}

export async function reportError(err: Error, extra?: Extra) {
  try {
    const sdk = await ensureSentry()
    if (sdk && SENTRY_DSN && ENV === 'production') {
  const fn = (sdk as Record<string, unknown>)['captureException']
  if (typeof fn === 'function') (fn as (e: Error, o?: unknown)=>void)(err, { extra })
    } else {
      // fallback to console in non-prod or when Sentry unavailable
      console.error('[monitoring] error:', err.message, extra || {})
    }
  } catch {
    // swallow
  }
}

export async function reportMessage(message: string, extra?: Extra) {
  try {
    const sdk = await ensureSentry()
    if (sdk && SENTRY_DSN && ENV === 'production') {
  const fn = (sdk as Record<string, unknown>)['captureMessage']
  if (typeof fn === 'function') (fn as (m: string, o?: unknown)=>void)(message, { extra })
    } else {
      console.warn('[monitoring] message:', message, extra || {})
    }
  } catch {}
}
