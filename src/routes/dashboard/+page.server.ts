import { redirect } from '@sveltejs/kit';
import { endSession, pageRequireAdmin } from '#lib/server/auth.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	pageRequireAdmin(event);
};

export const actions: Actions = {
	logout: async (event) => {
		await endSession(event);
		redirect(303, '/admin');
	}
};
