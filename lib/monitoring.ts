type Extra = Record<string, unknown>

let sentry: unknown = null
let sentryInited = false

const SENTRY_DSN = process.env.SENTRY_DSN
const ENV = process.env.NODE_ENV || 'development'
const SENTRY_ENV = process.env.SENTRY_ENVIRONMENT || ENV

async function ensureSentry() {
  if (!SENTRY_DSN) return null
  if (sentry) return sentry
  try {
  // Avoid static resolution at build time
  const dynImport = new Function('m', 'return import(m)') as (m: string) => Promise<unknown>
  const mod = await dynImport('@sentry/nextjs')
  sentry = mod as unknown
  const hasCapture = 'captureException' in (mod as object) || 'captureMessage' in (mod as object)
  if (!hasCapture) return null
  // init once when available
  try {
      const maybeInit = (mod as Record<string, unknown>)['init']
      if (!sentryInited && typeof maybeInit === 'function') {
        ;(maybeInit as (o: { dsn: string; environment?: string }) => void)({ dsn: SENTRY_DSN, environment: SENTRY_ENV })
        sentryInited = true
      }
    } catch {
      // ignore init failures
    }
  return sentry
  } catch {
    return null
  }
}

async function flushIfPossible(sdk: unknown, timeoutMs = 2000) {
  try {
    const maybeFlush = (sdk as Record<string, unknown>)['flush']
    if (typeof maybeFlush === 'function') {
      await (maybeFlush as (t?: number) => Promise<unknown>)(timeoutMs)
    }
  } catch {
    // ignore
  }
}

export async function reportError(err: Error, extra?: Extra) {
  try {
    const sdk = await ensureSentry()
    if (sdk && SENTRY_DSN && ENV === 'production') {
  const fn = (sdk as Record<string, unknown>)['captureException']
  if (typeof fn === 'function') {
    (fn as (e: Error, o?: unknown)=>void)(err, { extra })
    await flushIfPossible(sdk)
  }
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
  if (typeof fn === 'function') {
    (fn as (m: string, o?: unknown)=>void)(message, { extra })
    await flushIfPossible(sdk)
  }
    } else {
      console.warn('[monitoring] message:', message, extra || {})
    }
  } catch {}
}
