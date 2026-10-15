import type { Cookies, RequestEvent } from '@sveltejs/kit';
import { error, redirect } from '@sveltejs/kit';
import { collections } from '#lib/server/db.ts';
import {
	createSession,
	generateSessionToken,
	invalidateSession,
	type Role,
	type Session
} from '#lib/server/session.ts';

export const SESSION_COOKIE = 'jj_session';

export function setSessionCookie(cookies: Cookies, token: string, expires: Date) {
	// httpOnly and secure (except on http://localhost) are SvelteKit defaults – stated explicitly here.
	cookies.set(SESSION_COOKIE, token, { path: '/', httpOnly: true, sameSite: 'lax', expires });
}

export function clearSessionCookie(cookies: Cookies) {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

export async function startSession(event: RequestEvent, role: Role, username: string) {
	// Replace any existing session instead of keeping it alive alongside the new one.
	if (event.locals.session) await invalidateSession(collections.sessions(), event.locals.session.id);
	const token = generateSessionToken();
	const session = await createSession(collections.sessions(), token, role, username);
	setSessionCookie(event.cookies, token, session.expiresAt);
	event.locals.session = session;
}

export async function endSession(event: RequestEvent) {
	if (event.locals.session) await invalidateSession(collections.sessions(), event.locals.session.id);
	clearSessionCookie(event.cookies);
	event.locals.session = null;
}

// --- Guards for API endpoints (respond with 401/403) ---

export function apiRequireUser(event: RequestEvent): Session {
	const session = event.locals.session;
	if (!session) error(401, 'Unauthorized');
	return session;
}

export function apiRequireAdmin(event: RequestEvent): Session {
	const session = apiRequireUser(event);
	if (session.role !== 'admin') error(403, 'Forbidden');
	return session;
}

// --- Guards for pages (redirect to the matching login) ---

export function pageRequireUser(event: RequestEvent): Session {
	const session = event.locals.session;
	if (!session) redirect(303, '/login');
	return session;
}

export function pageRequireAdmin(event: RequestEvent): Session {
	const session = event.locals.session;
	if (session?.role !== 'admin') redirect(303, '/admin');
	return session;
}
