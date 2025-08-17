import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function isSafePath(path: string | null): path is string {
	if (!path) return false
	// allow only relative paths starting with '/'
	if (!path.startsWith('/')) return false
	// prevent open-redirect to auth endpoints
	const disallow = ['/auth/callback']
	return !disallow.includes(path)
}

export async function GET(request: NextRequest) {
	const url = new URL(request.url)
	const code = url.searchParams.get('code')
	const next = url.searchParams.get('next')
	const error = url.searchParams.get('error')

	// If provider returned an error
	if (error) {
		const redirectUrl = new URL('/auth/error', request.url)
		redirectUrl.searchParams.set('reason', 'oauth_error')
		redirectUrl.searchParams.set('message', error)
		return NextResponse.redirect(redirectUrl)
	}

	// Exchange the auth code for a session (sets cookies)
	if (code) {
		const supabase = await createClient()
		await supabase.auth.exchangeCodeForSession(code)
	}

	// Decide where to send the user next
	const destination = isSafePath(next) ? next : '/'
	return NextResponse.redirect(new URL(destination, request.url))
}
