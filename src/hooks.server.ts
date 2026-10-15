import type { Handle, HandleServerError, ServerInit } from '@sveltejs/kit/hooks';
import { clearSessionCookie, SESSION_COOKIE, setSessionCookie } from '#lib/server/auth.ts';
import { getDb } from '#lib/server/db.ts';
import { deleteExpiredSessions, validateSessionToken } from '#lib/server/session.ts';

export const init: ServerInit = () => {
	// Opens the database and runs migrations, so a broken DATABASE_PATH fails at startup.
	deleteExpiredSessions(getDb());
	setInterval(() => deleteExpiredSessions(getDb()), 60 * 60 * 1000).unref();
};

const SECURITY_HEADERS: Record<string, string> = {
	'X-Content-Type-Options': 'nosniff',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
	'Cross-Origin-Opener-Policy': 'same-origin'
};

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.session = null;

	const token = event.cookies.get(SESSION_COOKIE);
	if (token) {
		const result = token.length <= 64 ? validateSessionToken(getDb(), token) : null;
		if (result) {
			event.locals.session = result.session;
			if (result.renewed) setSessionCookie(event.cookies, token, result.session.expiresAt);
		} else {
			clearSessionCookie(event.cookies);
		}
	}

	const response = await resolve(event);
	for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
		if (!response.headers.has(name)) response.headers.set(name, value);
	}
	if (event.url.protocol === 'https:') {
		response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	}
	if (event.url.pathname.startsWith('/api/')) response.headers.set('Cache-Control', 'no-store');
	return response;
};

export const handleError: HandleServerError = ({ kind, error, event }) => {
	// Only unexpected errors are logged; the client always gets a generic message for them.
	if (kind === 'unknown') {
		console.error(`Unexpected error in ${event.request.method} ${event.route.id ?? event.url.pathname}:`, error);
	}
};
