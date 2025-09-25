import { NextResponse } from 'next/server';

// Simple shim: the canonical admin API is at /api/admin/related-media
// Keep this file as a safe 404 so legacy callers fail fast.

export async function GET(req: Request) {
  void req;
  return NextResponse.json({ error: 'use /api/admin/related-media for admin operations' }, { status: 404 });
}

export async function POST(req: Request) {
  void req;
  return NextResponse.json({ error: 'use /api/admin/related-media for admin operations' }, { status: 404 });
}

export async function PUT(req: Request) {
  void req;
  return NextResponse.json({ error: 'use /api/admin/related-media for admin operations' }, { status: 404 });
}

export async function DELETE(req: Request) {
  void req;
  return NextResponse.json({ error: 'use /api/admin/related-media for admin operations' }, { status: 404 });
}
