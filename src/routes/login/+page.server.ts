import { ENTRY_CODE } from '$app/env/private';
import { fail, redirect } from '@sveltejs/kit';
import * as v from 'valibot';
import { startSession } from '#lib/server/auth.ts';
import { safeEqual } from '#lib/server/password.ts';
import { limits } from '#lib/server/services.ts';
import { Username } from '#lib/server/validation.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.session) redirect(303, '/');
};

const normalizeCode = (code: string) => code.trim().toUpperCase();

export const actions: Actions = {
	default: async (event) => {
		const ip = event.getClientAddress();
		if (limits.guestLoginFailures.isBlocked(ip)) {
			return fail(429, { message: 'Zu viele Versuche. Bitte später erneut versuchen.' });
		}

		const formData = await event.request.formData();
		const username = v.safeParse(Username, formData.get('username'));
		const code = formData.get('code');

		if (typeof code !== 'string' || !safeEqual(normalizeCode(code), normalizeCode(ENTRY_CODE))) {
			limits.guestLoginFailures.hit(ip);
			return fail(400, { message: 'Ungültiger Code' });
		}
		if (!username.success) {
			return fail(400, { message: 'Bitte einen Namen mit maximal 40 Zeichen angeben' });
		}

		await startSession(event, 'guest', username.output);
		redirect(303, '/');
	}
};
