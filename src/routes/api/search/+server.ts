import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import { apiRequireUser } from '#lib/server/auth.ts';
import { tooManyRequests } from '#lib/server/http.ts';
import { limits, spotify } from '#lib/server/services.ts';
import { SearchQuery } from '#lib/server/validation.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const session = apiRequireUser(event);

	const query = v.safeParse(SearchQuery, event.url.searchParams.get('q') ?? '');
	if (!query.success) error(400, 'Invalid search query');

	const limit = limits.searches.hit(session.id);
	if (!limit.allowed) tooManyRequests(limit.retryAfterSeconds);

	try {
		return Response.json(await spotify.searchTracks(query.output));
	} catch (err) {
		console.error('Spotify search failed:', err instanceof Error ? err.message : err);
		error(502, 'Search is currently unavailable');
	}
};
