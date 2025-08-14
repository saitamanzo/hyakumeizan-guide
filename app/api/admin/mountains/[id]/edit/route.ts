import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function GET(request: Request, context: any) {
	const supabase = await createClient();
	const { data: { session } } = await supabase.auth.getSession();
	const allowed = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim()).filter(Boolean);
	const email = session?.user?.email || '';
	if (!email || (allowed.length > 0 && !allowed.includes(email))) {
		return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
	}
	const { id } = await context.params;
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

