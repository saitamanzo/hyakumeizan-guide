import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function GET(request: Request, context: any) {
	const { id } = await context.params;
	const supabase = await createClient();
	const { data, error } = await supabase
		.from('mountains')
		.select('*')
		.eq('id', id)
		.single();
	if (error || !data) {
		return NextResponse.json({ error: error?.message || 'Not found' }, { status: 404 });
	}
	return NextResponse.json(data);
}

