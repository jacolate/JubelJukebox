import { fail, redirect } from '@sveltejs/kit';
import * as v from 'valibot';
import { m } from '#lib/paraglide/messages.js';
import { endSession, pageRequireAdmin } from '#lib/server/auth.ts';
import { invite } from '#lib/server/invite.ts';
import { settings } from '#lib/server/services.ts';
import { EventSettingsSchema } from '#lib/server/settings.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	pageRequireAdmin(event);
	return { settings: settings().get(), ...invite(event) };
};

export const actions: Actions = {
	settings: async (event) => {
		pageRequireAdmin(event);
		const form = await event.request.formData();
		const checked = (name: string) => form.get(name) === 'on';

		const result = v.safeParse(EventSettingsSchema, {
			requestsOpen: checked('requestsOpen'),
			maxOpenPerGuest: Number(form.get('maxOpenPerGuest') || 0),
			blockExplicit: checked('blockExplicit'),
			blocklist: String(form.get('blocklist') ?? '').slice(0, 20_000).split('\n'),
			showNames: checked('showNames'),
			showTimeline: checked('showTimeline')
		});
		if (!result.success) return fail(400, { message: m.settings_invalid() });

		settings().update(result.output);
		return { saved: true };
	},

	logout: (event) => {
		endSession(event);
		redirect(303, '/admin');
	}
};
