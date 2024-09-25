import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async ({ cookies }) => {
	cookies.delete('idToken', { path: '/' });
	cookies.delete('accessToken', { path: '/' });
	cookies.delete('codeVerifier', { path: '/' });
	cookies.delete('state', { path: '/' });
	throw redirect(
		302,
		`https://login.microsoftonline.com/common/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(env.ORIGIN)}`
	);
};
