import { DEFAULT_LOCALE } from '$app/env/private';
import { sequence, type Handle, type HandleServerError, type ServerInit } from '@sveltejs/kit/hooks';
import { cookieName, defineCustomServerStrategy, extractLocaleFromHeader, isLocale } from '#lib/paraglide/runtime.js';
import { paraglideMiddleware } from '#lib/paraglide/server.js';
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

// Paraglide runs custom server strategies before the built-in ones, so the DE/EN switch cookie is read
// here first. Without an explicit choice: the browser's language, else the event's default.
defineCustomServerStrategy('custom-request', {
	getLocale: (request) => {
		if (!request) return DEFAULT_LOCALE;
		const cookie = request.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${cookieName}=([^;]*)`))?.[1];
		if (cookie && isLocale(cookie)) return cookie;
		return extractLocaleFromHeader(request) || DEFAULT_LOCALE;
	}
});

const i18n: Handle = ({ event, resolve }) =>
	// Without the URL strategy Paraglide doesn't rewrite the request, so the event is passed on as is.
	paraglideMiddleware(event.request, ({ locale }) =>
		resolve(event, { transformPageChunk: ({ html }) => html.replace('%lang%', locale) })
	);

const app: Handle = async ({ event, resolve }) => {
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

export const handle = sequence(i18n, app);

export const handleError: HandleServerError = ({ kind, error, event }) => {
	// Only unexpected errors are logged; the client always gets a generic message for them.
	if (kind === 'unknown') {
		console.error(`Unexpected error in ${event.request.method} ${event.route.id ?? event.url.pathname}:`, error);
	}
};
