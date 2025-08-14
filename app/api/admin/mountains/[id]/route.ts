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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function PUT(request: Request, context: any) {
	const { id } = await context.params;
	const body = await request.json();
	const supabase = await createClient();
	const { error } = await supabase
		.from('mountains')
		.update(body)
		.eq('id', id);
	if (error) {
		return NextResponse.json({ success: false, error: error.message }, { status: 500 });
	}
	return NextResponse.json({ success: true });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function DELETE(request: Request, context: any) {
	const { id } = await context.params;
	const supabase = await createClient();
	const { error } = await supabase
		.from('mountains')
		.delete()
		.eq('id', id);
	if (error) {
		return NextResponse.json({ success: false, error: error.message }, { status: 500 });
	}
	return NextResponse.json({ success: true });
}
