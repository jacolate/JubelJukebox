import { error } from '@sveltejs/kit';
import { apiRequireAdmin, apiRequireUser } from '#lib/server/auth.ts';
import { readJson, tooManyRequests } from '#lib/server/http.ts';
import { limits, settings, songs, spotify } from '#lib/server/services.ts';
import { SongRequestInput } from '#lib/server/validation.ts';
import type { RejectReason } from '#lib/types.ts';
import type { RequestHandler } from './$types';

const REJECT_STATUS: Record<RejectReason, number> = {
	paused: 423,
	played: 409,
	limit: 409,
	unavailable: 410,
	blocked: 410,
	explicit: 410
};

export const GET: RequestHandler = async (event) => {
	apiRequireAdmin(event);
	return Response.json(songs().list());
};

export const POST: RequestHandler = async (event) => {
	const session = apiRequireUser(event);

	const limit = limits.songRequests.hit(session.id);
	if (!limit.allowed) tooManyRequests(limit.retryAfterSeconds);

	const { trackId } = await readJson(event.request, SongRequestInput);

	// Never trust song details from the client: look them up at Spotify.
	let track;
	try {
		track = await spotify.getTrack(trackId);
	} catch (err) {
		console.error('Spotify track lookup failed:', err instanceof Error ? err.message : err);
		error(502, 'Spotify is currently unavailable');
	}
	if (!track) error(400, 'Unknown track');

	const outcome = songs().request(track, { id: session.guestId, name: session.username }, settings().get());
	if (!outcome.ok) {
		return Response.json(
			{ message: `Request rejected: ${outcome.reason}`, reason: outcome.reason },
			{ status: REJECT_STATUS[outcome.reason] }
		);
	}
	return Response.json(
		{ result: outcome.result, trackId: track.trackId },
		{ status: outcome.result === 'created' ? 201 : 200 }
	);
};
