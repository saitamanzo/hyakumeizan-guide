import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { MediaItem } from '@/lib/relatedMedia';

async function isAdminRequest() {
  try {
    const server = await createServerClient();
    const { data: { user } } = await server.auth.getUser();
    if (!user) return false;
    // prefer app_metadata.role, fall back to user_metadata
    const role = ((user.app_metadata && (user.app_metadata as unknown as { role?: string }).role) || (user.user_metadata && (user.user_metadata as unknown as { role?: string }).role)) || null;
    if (role === 'admin') return true;
    const allowed = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (allowed.length && user.email && allowed.includes(user.email)) return true;
    // fallback: if service role key is available, check users table for role column
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
      // service client may be unavailable during build or in some runtimes; ignore
      console.debug('isAdminRequest: service client unavailable or query failed', e);
    }
    return false;
  } catch (err) {
    console.error('isAdminRequest error', err);
    return false;
  }
}

export async function GET(req: Request) {
  try {
    const supabase = createServiceClient();
    const url = new URL(req.url);
    const mountainName = url.searchParams.get('mountainName');
    if (mountainName) {
      const { data, error } = await supabase.from('related_media').select('*').eq('mountain_name', mountainName).order('created_at', { ascending: false });
      if (error) throw error;
      return NextResponse.json({ data });
    }
    const { data, error } = await supabase.from('related_media').select('*').order('mountain_name', { ascending: true }).order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err) {
    console.error('admin related-media GET error', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // ensure caller is admin
    if (!(await isAdminRequest())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    const supabase = createServiceClient();
    const body = await req.json();
    const { mountainName, item } = body as { mountainName: string; item: MediaItem };
    if (!mountainName || !item) return NextResponse.json({ error: 'invalid' }, { status: 400 });
    const { data: existing } = await supabase.from('related_media').select('id').eq('mountain_name', mountainName).filter('url', 'eq', item.url);
    if (existing && existing.length) return NextResponse.json({ ok: false, error: 'duplicate' }, { status: 409 });
    const insert = { id: item.id, mountain_name: mountainName, type: item.type, title: item.title, author: item.author || null, year: item.year || null, thumbnail: item.thumbnail || null, url: item.url };
    const { data: d, error } = await supabase.from('related_media').insert([insert]);
    if (error) throw error;
    return NextResponse.json({ ok: true, data: d });
  } catch (err) {
    console.error('admin related-media POST error', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    if (!(await isAdminRequest())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    const supabase = createServiceClient();
    const body = await req.json();
    const { mountainName, item } = body as { mountainName: string; item: MediaItem };
    if (!mountainName || !item || !item.id) return NextResponse.json({ error: 'invalid' }, { status: 400 });
    const { data: dup } = await supabase.from('related_media').select('id').eq('mountain_name', mountainName).filter('url', 'eq', item.url).neq('id', item.id);
    if (dup && dup.length) return NextResponse.json({ ok: false, error: 'duplicate' }, { status: 409 });
    const updates = { type: item.type, title: item.title, author: item.author || null, year: item.year || null, thumbnail: item.thumbnail || null, url: item.url, updated_at: new Date().toISOString() };
    const { data: d, error } = await supabase.from('related_media').update(updates).eq('id', item.id);
    if (error) throw error;
    return NextResponse.json({ ok: true, data: d });
  } catch (err) {
    console.error('admin related-media PUT error', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    if (!(await isAdminRequest())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    const supabase = createServiceClient();
    const body = await req.json();
    const { mountainName, itemId } = body as { mountainName: string; itemId: string };
    if (!mountainName || !itemId) return NextResponse.json({ error: 'invalid' }, { status: 400 });
    const { data: d, error } = await supabase.from('related_media').delete().eq('id', itemId);
    if (error) throw error;
    return NextResponse.json({ ok: true, data: d });
  } catch (err) {
    console.error('admin related-media DELETE error', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
