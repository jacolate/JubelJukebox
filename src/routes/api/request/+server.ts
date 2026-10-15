import { apiRequireAdmin, apiRequireUser } from '#lib/server/auth.ts';
import { readJson, tooManyRequests } from '#lib/server/http.ts';
import { limits, songRequests } from '#lib/server/services.ts';
import { SongRequestInput } from '#lib/server/validation.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	apiRequireAdmin(event);
	return Response.json(songRequests().list());
};

export const POST: RequestHandler = async (event) => {
	const session = apiRequireUser(event);

	const limit = limits.songRequests.hit(session.id);
	if (!limit.allowed) tooManyRequests(limit.retryAfterSeconds);

	const input = await readJson(event.request, SongRequestInput);
	const request = songRequests().create(input, session.username);
	return Response.json({ message: 'Song request received successfully', id: request.id }, { status: 201 });
};
