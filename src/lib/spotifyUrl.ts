const TRACK_PATH = /^\/(?:intl-[a-z]{2}(?:-[a-z]{2})?\/)?track\/([A-Za-z0-9]{22})$/;

/** Returns the canonical track URL for a valid open.spotify.com track link, otherwise null. */
export function normalizeSpotifyTrackUrl(value: unknown): string | null {
	if (typeof value !== 'string' || value.length > 300) return null;
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		return null;
	}
	if (url.protocol !== 'https:' || url.hostname !== 'open.spotify.com') return null;
	if (url.username || url.password || url.port) return null;
	const match = TRACK_PATH.exec(url.pathname);
	return match ? `https://open.spotify.com/track/${match[1]}` : null;
}
