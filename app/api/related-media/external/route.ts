import { NextResponse } from 'next/server';
import { getExternalSearchLinks } from '@/lib/relatedMedia';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const name = url.searchParams.get('name') || '';
    if (!name) return NextResponse.json({ items: [] });
    const items = getExternalSearchLinks(name);
    return NextResponse.json({ items });
  } catch (err) {
    console.error('related-media external GET error', err);
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}
