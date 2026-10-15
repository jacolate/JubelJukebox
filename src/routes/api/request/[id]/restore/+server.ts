import { error } from '@sveltejs/kit';
import { apiRequireAdmin } from '#lib/server/auth.ts';
import { songs } from '#lib/server/services.ts';
import { isTrackId } from '#lib/spotify.ts';
import type { RequestHandler } from './$types';

/** Undo for DELETE /api/request/:id */
export const POST: RequestHandler = async (event) => {
	apiRequireAdmin(event);
	if (!isTrackId(event.params.id)) error(400, 'Invalid ID');

	if (!songs().restore(event.params.id)) error(404, 'Song not found');
	return Response.json({ message: 'Song restored' });
};
