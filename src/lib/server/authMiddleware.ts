import { redirect, fail, type RequestEvent } from '@sveltejs/kit';

export async function requireAuth(event: RequestEvent) {
	if (!event.locals.user) {
		throw redirect(302, '/login');
	}
	if (!event.locals.session) {
		throw fail(401, { message: 'Unauthorized' });
	}
}
