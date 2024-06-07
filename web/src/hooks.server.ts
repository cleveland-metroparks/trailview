import { isApiAuth } from '$api/common';
import { isSessionValid } from '$lib/server/auth';
import { error, redirect, type Handle } from '@sveltejs/kit';

function appendSecurityHeaders(res: Response) {
	// Security-related headers
	// CSP related headers are set in svelte.config.js
	res.headers.append('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	res.headers.append('X-Content-Type-Options', 'nosniff');
	res.headers.append('Referrer-Policy', 'same-origin');
	res.headers.append('X-XSS-Protection', '1; mode=block');
}

export const handle = (async ({ event, resolve }) => {
	if (event.cookies.getAll().length !== 0) {
		console.log(event.cookies.getAll());
	}
	if (event.url.pathname.startsWith('/api')) {
		if (event.request.method === 'OPTIONS') {
			return new Response(null, {
				headers: {
					'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Headers': '*'
				}
			});
		}
		if (!event.url.pathname.startsWith('/api/panImage') && !event.url.pathname.startsWith('/api/tiles')) {
			if ((await isApiAuth(event.cookies, event.request.headers)) === false) {
				throw error(403, 'Unauthorized');
			}
		}
		const res = await resolve(event);
		res.headers.append('Access-Control-Allow-Origin', '*');
		res.headers.append('Access-Control-Allow-Headers', '*');
		appendSecurityHeaders(res);
		return res;
	}
	if (event.url.pathname.startsWith('/admin')) {
		if ((await isSessionValid(event.cookies)) !== true) {
			throw redirect(302, '/login');
		}
	}
	const res = await resolve(event);
	appendSecurityHeaders(res);
	return res;
}) satisfies Handle;
