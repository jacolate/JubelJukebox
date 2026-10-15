import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Unknown pages lead back to the start page.
export const GET: RequestHandler = () => {
	redirect(307, '/');
};
