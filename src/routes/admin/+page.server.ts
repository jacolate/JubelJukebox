import { ADMIN_PASSWORD_HASH, ADMIN_USERNAME } from '$app/env/private';
import { fail, redirect } from '@sveltejs/kit';
import { m } from '#lib/paraglide/messages.js';
import { startSession } from '#lib/server/auth.ts';
import { safeEqual, verifyPassword } from '#lib/server/password.ts';
import { limits } from '#lib/server/services.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.session?.role === 'admin') redirect(303, '/dashboard');
};

export const actions: Actions = {
	default: async (event) => {
		const ip = event.getClientAddress();
		if (limits.adminLoginFailures.isBlocked(ip)) {
			return fail(429, { message: m.login_too_many() });
		}

		const formData = await event.request.formData();
		const username = formData.get('username');
		const password = formData.get('password');

		// Always run the (slow) password check so the response time does not reveal valid usernames.
		const passwordOk =
			typeof password === 'string' && password.length <= 1024 && (await verifyPassword(password, ADMIN_PASSWORD_HASH));
		const usernameOk = typeof username === 'string' && safeEqual(username.trim(), ADMIN_USERNAME);

		if (!passwordOk || !usernameOk) {
			limits.adminLoginFailures.hit(ip);
			return fail(400, { message: m.login_invalid_credentials() });
		}

		limits.adminLoginFailures.reset(ip);
		startSession(event, 'admin', ADMIN_USERNAME);
		redirect(303, '/dashboard');
	}
};
