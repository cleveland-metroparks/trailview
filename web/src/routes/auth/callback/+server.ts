import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dev } from '$app/environment';
import { getTokens } from '$lib/server/auth-entra';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const paramCode = url.searchParams.get('code');
	const paramState = url.searchParams.get('state');
	const cookieState = cookies.get('state');
	const cookieCodeVerifier = cookies.get('codeVerifier');
	if (
		paramCode === null ||
		paramState === null ||
		cookieState === undefined ||
		cookieCodeVerifier === undefined
	) {
		throw redirect(302, '/');
	}

	const tokens = await getTokens({
		code: paramCode,
		state: paramState,
		storedState: cookieState,
		codeVerifier: cookieCodeVerifier
	});

	if (tokens === null) {
		throw redirect(302, '/');
	}

	cookies.set('accessToken', tokens.accessToken, { path: '/', httpOnly: true, secure: !dev });
	cookies.set('idToken', tokens.idToken, { path: '/', httpOnly: true, secure: !dev });
	if (tokens.refreshToken !== null) {
		cookies.set('refreshToken', tokens.refreshToken, { path: '/', httpOnly: true, secure: !dev });
	}
	throw redirect(303, '/admin');
};
