import { SPOTIFY_ACCOUNTS_URL, SPOTIFY_API_URL, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } from '$app/env/private';
import { getDb } from '#lib/server/db.ts';
import { createLiveHub } from '#lib/server/live.ts';
import { publish, subscribe } from '#lib/server/pubsub.ts';
import { RateLimiter } from '#lib/server/rateLimit.ts';
import { createSettingsStore, type SettingsStore } from '#lib/server/settings.ts';
import { createSongStore, type SongStore } from '#lib/server/songs.ts';
import { createSpotifyClient } from '#lib/server/spotify.ts';

const MINUTE = 60_000;

export const spotify = createSpotifyClient({
	clientId: SPOTIFY_CLIENT_ID,
	clientSecret: SPOTIFY_CLIENT_SECRET,
	accountsUrl: SPOTIFY_ACCOUNTS_URL,
	apiUrl: SPOTIFY_API_URL
});

let songStore: SongStore | undefined;
export function songs(): SongStore {
	songStore ??= createSongStore(getDb(), publish);
	return songStore;
}

let settingsStore: SettingsStore | undefined;
export function settings(): SettingsStore {
	settingsStore ??= createSettingsStore(getDb(), publish);
	return settingsStore;
}

export const live = createLiveHub(songs, settings);
subscribe(live.dispatch);

export const limits = {
	// Failed attempts per IP. Guests at a venue often share one IP, so the guest limit is generous.
	guestLoginFailures: new RateLimiter(30, 15 * MINUTE),
	adminLoginFailures: new RateLimiter(5, 15 * MINUTE),
	// Per session
	songRequests: new RateLimiter(10, MINUTE),
	searches: new RateLimiter(60, MINUTE)
};
