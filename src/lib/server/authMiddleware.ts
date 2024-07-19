import { redirect, fail, type RequestEvent } from '@sveltejs/kit';

export async function requireAuth(event: RequestEvent) {
	if (!event.locals.user) {
        console.log("user failed");
		throw redirect(302, '/login');
	}
	if (!event.locals.session) {
        console.log("sessions");
		throw fail(401, { message: 'Unauthorized' });
	}
}
