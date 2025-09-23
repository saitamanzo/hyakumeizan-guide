// NOTE: This script requires Redis and the optional dependency `ioredis`.
// Install optional deps with:
//   npm install --include=optional
// and set `REDIS_URL` in your environment before running.
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

const REDIS_URL = process.env.REDIS_URL
if (!REDIS_URL) {
  console.error('REDIS_URL not set')
  process.exit(2)
}

try {
  const IORedis = await import('ioredis')
  const Redis = IORedis.default ?? IORedis
  const client = new Redis(REDIS_URL)
  await client.set('hyakumeizan:test', 'ok', 'EX', 10)
  const v = await client.get('hyakumeizan:test')
  console.log('redis get ->', v)
  await client.quit()
  process.exit(0)
} catch (e) {
  console.error('redis test failed', e)
  process.exit(1)
}
