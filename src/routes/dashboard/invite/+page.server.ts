import { pageRequireAdmin } from '#lib/server/auth.ts';
import { invite } from '#lib/server/invite.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	pageRequireAdmin(event);
	return invite(event);
};
