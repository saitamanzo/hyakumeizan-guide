import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { MediaItem } from '@/lib/relatedMedia';

// NOTE: For this demo we mutate an in-memory map via a simple JSON file under project root.
// In production you'd use a DB. This keeps things simple for a small admin CRUD.
const DATA_FILE = path.resolve(process.cwd(), 'scripts', 'related-media.json');

function loadData(): Record<string, MediaItem[]> {
  try {
    if (!fs.existsSync(DATA_FILE)) return {};
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw) as Record<string, MediaItem[]>;
  } catch (err) {
    console.error('loadData error', err);
    return {};
  }
}

function saveData(data: Record<string, MediaItem[]>) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('saveData error', err);
  }
}

export async function GET() {
  const data = loadData();
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mountainName, item } = body as { mountainName: string; item: MediaItem };
    if (!mountainName || !item) return NextResponse.json({ error: 'invalid' }, { status: 400 });
    const data = loadData();
    data[mountainName] = data[mountainName] || [];
    // duplicate check: same URL or same title
    const exists = data[mountainName].some((it) => (it.url && it.url === item.url) || (it.title && it.title === item.title));
    if (exists) return NextResponse.json({ ok: false, error: 'duplicate' }, { status: 409 });
    data[mountainName].push(item);
    saveData(data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('related-media POST error', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { mountainName, item } = body as { mountainName: string; item: MediaItem };
    if (!mountainName || !item || !item.id) return NextResponse.json({ error: 'invalid' }, { status: 400 });
    const data = loadData();
    const arr = data[mountainName] || [];
    const idx = arr.findIndex((it) => it.id === item.id);
    if (idx === -1) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    // duplicate check against others (ignore same id)
    const dup = arr.some((it) => it.id !== item.id && ((it.url && it.url === item.url) || (it.title && it.title === item.title)));
    if (dup) return NextResponse.json({ ok: false, error: 'duplicate' }, { status: 409 });
    arr[idx] = item;
    data[mountainName] = arr;
    saveData(data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('related-media PUT error', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { mountainName, itemId } = body as { mountainName: string; itemId: string };
    if (!mountainName || !itemId) return NextResponse.json({ error: 'invalid' }, { status: 400 });
    const data = loadData();
    const arr = data[mountainName] || [];
    const newArr = arr.filter((it) => it.id !== itemId);
    data[mountainName] = newArr;
    saveData(data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('related-media DELETE error', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
