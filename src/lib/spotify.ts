// Helpers shared by client and server.

const TRACK_ID = /^[A-Za-z0-9]{22}$/;
const IMAGE_URL = /^https:\/\/i\.scdn\.co\/image\/[A-Za-z0-9]+$/;

export function isTrackId(value: unknown): value is string {
	return typeof value === 'string' && TRACK_ID.test(value);
}

/** Link to the track on open.spotify.com, built from a validated id only. */
export function trackUrl(trackId: string): string | null {
	return isTrackId(trackId) ? `https://open.spotify.com/track/${trackId}` : null;
}

/** Album covers are only ever loaded from Spotify's image CDN (see CSP img-src). */
export function isSpotifyImageUrl(value: unknown): value is string {
	return typeof value === 'string' && IMAGE_URL.test(value);
}
