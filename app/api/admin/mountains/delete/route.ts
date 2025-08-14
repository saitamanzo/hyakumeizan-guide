import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const id = body?.id as string | undefined;
		if (!id || typeof id !== 'string') {
			return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
		}

		const supabase = await createClient();
		const { error } = await supabase.from('mountains').delete().eq('id', id);
		if (error) {
			return NextResponse.json({ success: false, error: error.message }, { status: 500 });
		}
		return NextResponse.json({ success: true });
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unknown error';
		return NextResponse.json({ success: false, error: message }, { status: 500 });
	}
}
