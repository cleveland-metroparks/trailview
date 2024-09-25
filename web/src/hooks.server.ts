import { dev } from '$app/environment';
import { getAuthUrl, isSessionValid } from '$lib/server/auth-entra';
import { redirect, type Handle } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

function appendSecurityHeaders(res: Response) {
	// Security-related headers
	// CSP related headers are set in svelte.config.js
	res.headers.append('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	res.headers.append('X-Content-Type-Options', 'nosniff');
	res.headers.append('Referrer-Policy', 'same-origin');
	res.headers.append('X-XSS-Protection', '1; mode=block');
}

const accessTokenSchema = z.object({
	name: z.string()
});

export const handle = (async ({ event, resolve }) => {
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
		// if (
		// 	!event.url.pathname.startsWith('/api/pan-image') &&
		// 	!event.url.pathname.startsWith('/api/tiles')
		// ) {
		// 	if ((await common.isApiAuth(event.cookies, event.request.headers)) === false) {
		// 		throw error(403, 'Unauthorized');
		// 	}
		// }
		const res = await resolve(event);
		res.headers.append('Access-Control-Allow-Origin', '*');
		res.headers.append('Access-Control-Allow-Headers', '*');
		appendSecurityHeaders(res);
		return res;
	}
	if (event.url.pathname.startsWith('/admin')) {
		const accessToken = event.cookies.get('accessToken');
		if (accessToken !== undefined && (await isSessionValid(event.cookies)) === true) {
			event.locals.accessToken = accessToken;
			const decoded = jwt.decode(accessToken);
			const accessTokenParse = accessTokenSchema.safeParse(decoded);
			if (accessTokenParse.success === true) {
				event.locals.entraName = accessTokenParse.data.name;
			} else {
				console.error('Failed to parse Entra accessToken name');
			}
			const response = await resolve(event);
			return response;
		}
		const auth = await getAuthUrl();
		event.cookies.set('state', auth.state, { path: '/', httpOnly: true, secure: !dev });
		event.cookies.set('codeVerifier', auth.codeVerifier, {
			path: '/',
			httpOnly: true,
			secure: !dev
		});
		throw redirect(303, auth.url);
	}
	const res = await resolve(event);
	appendSecurityHeaders(res);
	return res;
}) satisfies Handle;
