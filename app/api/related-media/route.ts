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
    data[mountainName].push(item);
    saveData(data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('related-media POST error', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
