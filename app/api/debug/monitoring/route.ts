import { reportError, reportMessage } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'message'
  const msg = searchParams.get('msg') || 'debug-ping'

  try {
    if (type === 'error') {
      await reportError(new Error(msg), { source: 'api/debug/monitoring' })
    } else {
      await reportMessage(msg, { source: 'api/debug/monitoring' })
    }
    return Response.json({ ok: true, type, msg, env: process.env.NODE_ENV, hasDsn: Boolean(process.env.SENTRY_DSN) })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
