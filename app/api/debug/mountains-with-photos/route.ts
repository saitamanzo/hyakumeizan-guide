import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('mountains')
    .select('id,name,photo_url')
    .order('name', { ascending: true })
    .limit(20)
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, count: data?.length ?? 0, items: data }, { status: 200 })
}
