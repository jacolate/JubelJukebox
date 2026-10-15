import { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } from '$app/env/private';
import { collections } from '#lib/server/db.ts';
import { publish } from '#lib/server/pubsub.ts';
import { RateLimiter } from '#lib/server/rateLimit.ts';
import { createSongRequestStore } from '#lib/server/songRequests.ts';
import { createSpotifyClient } from '#lib/server/spotify.ts';

const MINUTE = 60_000;

export const spotify = createSpotifyClient({
	clientId: SPOTIFY_CLIENT_ID,
	clientSecret: SPOTIFY_CLIENT_SECRET
});

let store: ReturnType<typeof createSongRequestStore> | undefined;
export function songRequests() {
	store ??= createSongRequestStore(collections.songRequests(), publish);
	return store;
}

export const limits = {
	// Failed attempts per IP. Guests at a venue often share one IP, so the guest limit is generous.
	guestLoginFailures: new RateLimiter(30, 15 * MINUTE),
	adminLoginFailures: new RateLimiter(5, 15 * MINUTE),
	// Per session
	songRequests: new RateLimiter(10, MINUTE),
	searches: new RateLimiter(30, MINUTE)
};
