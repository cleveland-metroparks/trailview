import { env } from '$env/dynamic/private';
import { generateCodeVerifier, generateState, MicrosoftEntraId } from 'arctic';
import type { JwtHeader, SigningKeyCallback } from 'jsonwebtoken';
import jwksClient, { type SigningKey } from 'jwks-rsa';
import jwt from 'jsonwebtoken';
import { Client as GraphClient, ResponseType } from '@microsoft/microsoft-graph-client';
import { z } from 'zod';
import type { Cookies } from '@sveltejs/kit';
import { building, dev } from '$app/environment';

const microsoftEntraId = (
	building
		? null
		: new MicrosoftEntraId(
				env.TV_ENTRA_TENANT_ID,
				env.TV_ENTRA_CLIENT_ID,
				env.TV_ENTRA_CLIENT_SECRET_VALUE,
				env.TV_ENTRA_REDIRECT_URL
			)
) as MicrosoftEntraId;

/**
 * Get the authentication URL that prompts to user to log in.
 * @returns A state string which needs to be set as a cookie "state" to prevent CSRF,
 *          a code verifier to prevent interception attacks which needs to be set to a cookie,
 *          and the url to redirect to.
 */
export async function getAuthUrl(): Promise<{ state: string; codeVerifier: string; url: URL }> {
	const state = generateState(); // Set as cookie to prevent CSRF
	const codeVerifier = generateCodeVerifier();
	const url = microsoftEntraId.createAuthorizationURL(state, codeVerifier, [
		'openid',
		'user.read',
		'offline_access'
	]);
	return { state, codeVerifier, url };
}

/**
 * Gets called from the callback/redirect URL to get the JWT tokens
 * @param params Takes in the code and state parameters from the callback URL,
 *               as well as the stored state and code verifier from cookies
 * @returns Tokens if successful and null if unsuccessful
 */
export async function getTokens(params: {
	code: string;
	state: string;
	storedState: string;
	codeVerifier: string;
}): Promise<{ accessToken: string; idToken: string; refreshToken: string | null } | null> {
	if (params.state !== params.storedState) {
		return null;
	}
	try {
		const tokens = await microsoftEntraId.validateAuthorizationCode(
			params.code,
			params.codeVerifier
		);
		return {
			accessToken: tokens.accessToken(),
			idToken: tokens.idToken(),
			refreshToken: tokens.hasRefreshToken() ? tokens.refreshToken() : null
		};
	} catch (e) {
		console.error(e);
		return null;
	}
}

const keyClient = jwksClient({
	jwksUri: 'https://login.microsoftonline.com/common/discovery/v2.0/keys'
});

function getKey(header: JwtHeader, callback: SigningKeyCallback) {
	keyClient.getSigningKey(header.kid, (err: Error | null, key: SigningKey | undefined) => {
		if (err !== null) {
			callback(err);
			return;
		}
		if (key === undefined) {
			callback(new Error('Signing key not found'));
			return;
		}
		const signingKey = key.getPublicKey();
		callback(null, signingKey);
	});
}

/**
 * Verifies JWT to determine if user is still authorized
 * @param idToken Token to verify
 * @returns true if authorized, false if not
 */
export async function verifyToken(idToken: string): Promise<boolean> {
	return new Promise((resolve) => {
		jwt.verify(idToken, getKey, { algorithms: ['RS256'] }, (err) => {
			if (err !== null) {
				console.error(err);
				resolve(false);
				return;
			}
			resolve(true);
		});
	});
}

export async function getUserInfo(accessToken: string): Promise<{
	displayName: string | undefined;
	mail: string | undefined;
	photo: string;
} | null> {
	const client = GraphClient.init({
		authProvider: (done) => {
			done(null, accessToken);
		}
	});

	const userSchema = z.object({
		mail: z.string().optional(),
		displayName: z.string().optional()
	});

	try {
		const user = await client.api('/me').get();
		const userParse = userSchema.parse(user);
		const photo = await client
			.api('/me/photos/48x48/$value')
			.responseType(ResponseType.ARRAYBUFFER)
			.get();
		const base64Image = Buffer.from(photo).toString('base64');
		const image = `data:image/jpeg;base64,${base64Image}`;
		return { displayName: userParse.displayName, mail: userParse.mail, photo: image };
	} catch (e) {
		console.error(e);
		return null;
	}
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
	try {
		const tokens = await microsoftEntraId.refreshAccessToken(refreshToken, [
			'openid',
			'user.read',
			'offline_access'
		]);
		return tokens.accessToken();
	} catch (e) {
		console.error(e);
		return null;
	}
}

function isTokenExpiringSoon(accessToken: string): boolean {
	const decoded = jwt.decode(accessToken) as { exp: number };
	const current = Math.floor(Date.now() / 1000);
	return decoded.exp - current < 60 * 5; // 5 min
}

export async function isSessionValid(cookies: Cookies): Promise<boolean> {
	const cookieAccessToken = cookies.get('accessToken');
	const cookieIdToken = cookies.get('idToken');
	if (cookieAccessToken !== undefined && cookieIdToken !== undefined) {
		const refreshToken = cookies.get('refreshToken');
		if (isTokenExpiringSoon(cookieAccessToken) === true && refreshToken !== undefined) {
			const newAccessToken = await refreshAccessToken(refreshToken);
			if (newAccessToken !== null) {
				cookies.set('accessToken', newAccessToken, { path: '/', httpOnly: true, secure: !dev });
				return true;
			}
		}
		const verifyIdToken = await verifyToken(cookieIdToken);
		if (verifyIdToken === true) {
			return true;
		}
	}
	return false;
}
