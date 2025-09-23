// NOTE: This script requires Redis. It uses optional dependencies: ioredis.
// To run this script locally or in CI, set `REDIS_URL` and install optional deps:
//   npm install --include=optional
// Example:
//   REDIS_URL=redis://... node scripts/migrate-redis-prefix.mjs --patterns=overpass:* --apply
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) dotenv.config({ path: envPath })

const REDIS_URL = process.env.REDIS_URL
if (!REDIS_URL) {
  console.error('REDIS_URL not set')
  process.exit(2)
}

const PREFIX = process.env.REDIS_KEY_PREFIX || 'hyakumeizan:'
const apply = process.argv.includes('--apply')
const force = process.argv.includes('--force')

// allow overriding patterns via --patterns=pat1,pat2
const patternsArg = process.argv.find((a) => a.startsWith('--patterns='))
const patterns = patternsArg ? patternsArg.split('=')[1].split(',') : ['overpass:*', 'lock:overpass:*', 'metrics:*', 'thumb:*']

console.log(`Redis URL: ${REDIS_URL}`)
console.log(`Prefix: ${PREFIX} (apply=${apply}, force=${force})`)
console.log('Patterns:', patterns.join(', '))

try {
  const IORedis = await import('ioredis')
  const Redis = IORedis.default ?? IORedis
  const r = new Redis(REDIS_URL)

  let totalFound = 0
  const counts = {
    matched: 0,
    renamed: 0,
    renamedForcibly: 0,
    copied: 0,
    skipped: 0,
    errors: 0,
  }
  for (const pat of patterns) {
    console.log('Scanning pattern', pat)
    let cursor = '0'
    do {
      const [next, keys] = await r.scan(cursor, 'MATCH', pat, 'COUNT', 1000)
      cursor = next
      if (Array.isArray(keys) && keys.length > 0) {
        for (const k of keys) {
          totalFound++
          counts.matched++
          const newKey = PREFIX + k
          if (!apply) {
            console.log('[DRY] will migrate', k, '->', newKey)
            continue
          }

          try {
            // Preferred safe move: RENAMENX when not forcing overwrite
            if (!force) {
              const ren = await r.renamenx(k, newKey)
              if (ren === 1) {
                console.log('RENAMENX', k, '->', newKey)
                counts.renamed++
                continue
              }

              // RENAMENX failed because target exists. Try copy via DUMP/RESTORE without REPLACE
              try {
                const dump = await r.dump(k)
                if (!dump) {
                  console.log('SKIPPED (empty dump):', k)
                  counts.skipped++
                  continue
                }
                const ttl = await r.pttl(k)
                const ttlForRestore = ttl && ttl > 0 ? ttl : 0
                try {
                  await r.restore(newKey, ttlForRestore, dump)
                  await r.del(k)
                  console.log('DUMP/RESTORE', k, '->', newKey)
                  counts.copied++
                  continue
                } catch {
                  // restore may fail if newKey exists; skip in that case
                  console.log('SKIPPED (target exists):', k, '->', newKey)
                  counts.skipped++
                  continue
                }
              } catch (dumpErr) {
                console.error('Failed DUMP/RESTORE fallback for', k, dumpErr)
                counts.errors++
                continue
              }
            } else {
              // force: use RENAME which will replace existing key
              try {
                await r.rename(k, newKey)
                console.log('RENAME (force)', k, '->', newKey)
                counts.renamedForcibly++
                continue
              } catch {
                // If rename failed (rare), fallback to DUMP/RESTORE with REPLACE
                try {
                  const dump = await r.dump(k)
                  if (!dump) {
                    console.log('SKIPPED (empty dump):', k)
                    counts.skipped++
                    continue
                  }
                  const ttl = await r.pttl(k)
                  const ttlForRestore = ttl && ttl > 0 ? ttl : 0
                  // RESTORE ... REPLACE
                  await r.call('RESTORE', newKey, ttlForRestore, dump, 'REPLACE')
                  await r.del(k)
                  console.log('DUMP/RESTORE REPLACE', k, '->', newKey)
                  counts.copied++
                  continue
                } catch (e2) {
                  console.error('Failed to force-migrate', k, e2)
                  counts.errors++
                  continue
                }
              }
            }
          } catch (e) {
            console.error('Error migrating key', k, e)
            counts.errors++
          }
        }
      }
    } while (cursor !== '0')
  }
  console.log('\nSummary:')
  console.log('  total matched:', totalFound)
  console.log('  renamed (safe RENAMENX):', counts.renamed)
  console.log('  renamed (force RENAME):', counts.renamedForcibly)
  console.log('  copied (DUMP/RESTORE):', counts.copied)
  console.log('  skipped:', counts.skipped)
  console.log('  errors:', counts.errors)
  await r.quit()
  process.exit(0)
} catch (e) {
  console.error('Migration failed', e)
  process.exit(1)
}
