import { error } from '@sveltejs/kit';
import { apiRequireAdmin } from '#lib/server/auth.ts';
import { readJson } from '#lib/server/http.ts';
import { songs } from '#lib/server/services.ts';
import { isTrackId } from '#lib/spotify.ts';
import { StatusUpdate } from '#lib/server/validation.ts';
import type { RequestHandler } from './$types';

function trackIdParam(id: string): string {
	if (!isTrackId(id)) error(400, 'Invalid ID');
	return id;
}

export const PUT: RequestHandler = async (event) => {
	apiRequireAdmin(event);
	const trackId = trackIdParam(event.params.id);
	const { status } = await readJson(event.request, StatusUpdate);

	const changed = songs().setStatus(trackId, status);
	if (!changed) error(404, 'Song not found');
	return Response.json({ previous: changed.previous });
};

export const DELETE: RequestHandler = async (event) => {
	apiRequireAdmin(event);
	const trackId = trackIdParam(event.params.id);

	if (!songs().remove(trackId)) error(404, 'Song not found');
	return Response.json({ message: 'Song deleted' });
};
