import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient as createServerClient } from '@/lib/supabase/server';

async function isAdminRequest() {
  try {
    const server = await createServerClient();
    const { data: { user } } = await server.auth.getUser();
    if (!user) return false;
    const role = ((user.app_metadata && (user.app_metadata as unknown as { role?: string }).role) || (user.user_metadata && (user.user_metadata as unknown as { role?: string }).role)) || null;
    if (role === 'admin') return true;
    const allowed = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (allowed.length && user.email && allowed.includes(user.email)) return true;
    try {
      const svc = createServiceClient();
      if (user.email) {
        const { data: rows, error } = await svc.from('users').select('role').eq('email', user.email).limit(1);
        if (!error && rows && Array.isArray(rows) && rows.length) {
          type UserRow = { role?: string | null };
          const dbRole = (rows[0] as UserRow).role;
          if (dbRole === 'admin') return true;
        }
      }
    } catch (e) {
      console.debug('isAdminRequest: service client unavailable or query failed', e);
    }
    return false;
  } catch (err) {
    console.error('isAdminRequest error', err);
    return false;
  }
}

function contentTypeToExt(ct?: string | null) {
  if (!ct) return 'jpg';
  if (ct.includes('png')) return 'png';
  if (ct.includes('gif')) return 'gif';
  if (ct.includes('webp')) return 'webp';
  return 'jpg';
}

export async function POST(req: Request) {
  try {
    if (!(await isAdminRequest())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    const body = await req.json();
    const { id, sourceUrl } = body as { id: string; sourceUrl: string };
    if (!id || !sourceUrl) return NextResponse.json({ error: 'invalid' }, { status: 400 });

    // fetch the page and try to find og:image with timeout
    const DEFAULT_TIMEOUT = 10000; // 10s
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
    let pageRes: Response;
    try {
      pageRes = await fetch(sourceUrl, { headers: { 'User-Agent': 'hyakumeizan-guide-bot/1.0' }, signal: controller.signal });
    } catch {
      return NextResponse.json({ error: 'fetch_failed' }, { status: 502 });
    } finally {
      clearTimeout(timeout);
    }
    if (!pageRes.ok) return NextResponse.json({ error: 'fetch_failed' }, { status: 502 });
    const html = await pageRes.text();
    const ogMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) || html.match(/<meta\s+name=["']og:image["']\s+content=["']([^"']+)["']/i);
    const imageUrl = ogMatch ? ogMatch[1] : null;
    const finalImageUrl = imageUrl ? new URL(imageUrl, sourceUrl).toString() : null;
    if (!finalImageUrl) return NextResponse.json({ error: 'no_image_found' }, { status: 404 });

    // download image with retries, timeout and max size
    const MAX_BYTES = 3 * 1024 * 1024; // 3MB
    const RETRIES = 2;
    const BASE_TIMEOUT = 10000;
    let imgRes: Response | null = null;
  let lastErr: unknown = null;
    for (let attempt = 0; attempt <= RETRIES; attempt++) {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), BASE_TIMEOUT * (attempt + 1));
      try {
        imgRes = await fetch(finalImageUrl, { headers: { 'User-Agent': 'hyakumeizan-guide-bot/1.0' }, signal: c.signal });
        clearTimeout(t);
        if (!imgRes.ok) {
          lastErr = new Error(`status ${imgRes.status}`);
          // retry on server errors
          if (imgRes.status >= 500 && attempt < RETRIES) continue;
          break;
        }
        break;
      } catch (e) {
        lastErr = e;
        clearTimeout(t);
        if (attempt < RETRIES) {
          // backoff
          await new Promise(r => setTimeout(r, 200 * Math.pow(2, attempt)));
          continue;
        }
      }
    }
    if (!imgRes || !imgRes.ok) {
      console.error('image fetch failed', lastErr);
      return NextResponse.json({ error: 'image_fetch_failed' }, { status: 502 });
    }

    const contentTypeHeader = imgRes.headers.get('content-type');
    const contentType = contentTypeHeader || undefined;
    const ext = contentTypeToExt(contentType);
    // stream and enforce max size
    const reader = imgRes.body?.getReader();
    if (!reader) return NextResponse.json({ error: 'image_fetch_failed' }, { status: 502 });
    const chunks: Uint8Array[] = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        received += value.length;
        if (received > MAX_BYTES) {
          return NextResponse.json({ error: 'image_too_large' }, { status: 413 });
        }
        chunks.push(value);
      }
    }
    const buffer = Buffer.concat(chunks.map(c => Buffer.from(c)));

    const supabase = createServiceClient();
    const filePath = `related-media/${id}/thumbnail.${ext}`;
    const { error: uploadError } = await supabase.storage.from('related-media').upload(filePath, buffer, { upsert: true, contentType });
    if (uploadError) {
      console.error('upload error', uploadError);
      return NextResponse.json({ error: 'upload_failed' }, { status: 500 });
    }

    // get public URL
    const { data: urlData } = supabase.storage.from('related-media').getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    // update DB
    const { error: dbError } = await supabase.from('related_media').update({ thumbnail: publicUrl }).eq('id', id);
    if (dbError) {
      console.error('db update error', dbError);
      return NextResponse.json({ error: 'db_update_failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, thumbnail: publicUrl });
  } catch (err) {
    console.error('thumbnail POST error', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
