import { pageRequireUser } from '#lib/server/auth.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	pageRequireUser(event);
};
