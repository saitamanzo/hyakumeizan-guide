import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) dotenv.config({ path: envPath })

const STATSD_HOST = process.env.STATSD_HOST || '127.0.0.1'
const STATSD_PORT = Number(process.env.STATSD_PORT || '8125')

try {
  const hsMod = await import('hot-shots')
  const StatsD = hsMod.StatsD ?? hsMod.default ?? hsMod
  const client = new StatsD({ host: STATSD_HOST, port: STATSD_PORT })
  client.increment('hyakumeizan.test.statsd', 1)
  console.log('sent statsd increment to', STATSD_HOST, STATSD_PORT)
  try { if (typeof client.close === 'function') client.close() } catch {}
  process.exit(0)
} catch (e) {
  console.error('failed to send statsd', e)
  process.exit(1)
}
