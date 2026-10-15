import { isSpotifyImageUrl, isTrackId } from '#lib/spotify.ts';
import type { Track } from '#lib/types.ts';

export class SpotifyError extends Error {
	constructor(
		message: string,
		readonly status?: number
	) {
		super(message);
	}
}

interface Options {
	clientId: string;
	clientSecret: string;
	/** Only overridden in tests (mock server). */
	accountsUrl?: string;
	apiUrl?: string;
	fetch?: typeof globalThis.fetch;
	now?: () => number;
}

const TIMEOUT_MS = 8000;
const TRACK_CACHE_MS = 60 * 60 * 1000;
const TRACK_CACHE_SIZE = 2000;

/**
 * Spotify Web API client using the client credentials flow.
 * The access token is cached and refreshed shortly before it expires.
 */
export function createSpotifyClient({
	clientId,
	clientSecret,
	accountsUrl = 'https://accounts.spotify.com',
	apiUrl = 'https://api.spotify.com/v1',
	fetch = globalThis.fetch,
	now = Date.now
}: Options) {
	let token: { value: string; expiresAt: number } | null = null;
	let pending: Promise<string> | null = null;
	const trackCache = new Map<string, { track: Track; expiresAt: number }>();

	async function requestToken(): Promise<string> {
		const response = await fetch(`${accountsUrl}/api/token`, {
			method: 'POST',
			headers: {
				Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: 'grant_type=client_credentials',
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});
		if (!response.ok) throw new SpotifyError(`Token request failed with status ${response.status}`, response.status);

		const data = (await response.json()) as { access_token?: unknown; expires_in?: unknown };
		if (typeof data.access_token !== 'string') throw new SpotifyError('Token response is missing access_token');
		const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 3600;

		// Refresh one minute early so a token never expires mid-request.
		token = { value: data.access_token, expiresAt: now() + (expiresIn - 60) * 1000 };
		return token.value;
	}

	function getToken(): Promise<string> {
		if (token && token.expiresAt > now()) return Promise.resolve(token.value);
		// Deduplicate concurrent refreshes.
		pending ??= requestToken().finally(() => (pending = null));
		return pending;
	}

	/** GET request against the Web API; retries once with a fresh token on 401. */
	async function get(path: string): Promise<unknown> {
		for (let attempt = 0; attempt < 2; attempt++) {
			const response = await fetch(`${apiUrl}${path}`, {
				headers: { Authorization: `Bearer ${await getToken()}` },
				signal: AbortSignal.timeout(TIMEOUT_MS)
			});
			if (response.status === 401 && attempt === 0) {
				token = null; // revoked or expired early – fetch a new one and retry once
				continue;
			}
			if (!response.ok) throw new SpotifyError(`Request ${path.split('?')[0]} failed with status ${response.status}`, response.status);
			return response.json();
		}
		throw new SpotifyError('Request failed after token refresh');
	}

	function cacheTrack(track: Track) {
		if (trackCache.size >= TRACK_CACHE_SIZE) trackCache.delete(trackCache.keys().next().value!);
		trackCache.set(track.trackId, { track, expiresAt: now() + TRACK_CACHE_MS });
	}

	async function searchTracks(query: string, limit = 10): Promise<Track[]> {
		const data = (await get(`/search?${new URLSearchParams({ q: query, type: 'track', limit: String(limit) })}`)) as any;
		const items: unknown[] = Array.isArray(data?.tracks?.items) ? data.tracks.items : [];
		const tracks = items.map(parseTrack).filter((track): track is Track => track !== null);
		tracks.forEach(cacheTrack);
		return tracks;
	}

	/** Track metadata straight from Spotify (cached). Returns null for unknown tracks. */
	async function getTrack(trackId: string): Promise<Track | null> {
		if (!isTrackId(trackId)) return null;
		const cached = trackCache.get(trackId);
		if (cached && cached.expiresAt > now()) return cached.track;

		try {
			const track = parseTrack(await get(`/tracks/${trackId}`));
			if (track) cacheTrack(track);
			return track;
		} catch (err) {
			if (err instanceof SpotifyError && (err.status === 404 || err.status === 400)) return null;
			throw err;
		}
	}

	return { searchTracks, getTrack };
}

function parseTrack(item: any): Track | null {
	if (!isTrackId(item?.id) || typeof item.name !== 'string' || !item.name.trim()) return null;
	const artists = (Array.isArray(item.artists) ? item.artists : [])
		.map((artist: any) => artist?.name)
		.filter((name: unknown) => typeof name === 'string');
	return {
		trackId: item.id,
		name: item.name.slice(0, 300),
		artists: artists.join(', ').slice(0, 300),
		image: pickImage(item.album?.images),
		explicit: item.explicit === true
	};
}

/** Smallest album image that is still at least 64 px wide. */
function pickImage(images: unknown): string | null {
	if (!Array.isArray(images)) return null;
	const valid = images.filter((image: any) => isSpotifyImageUrl(image?.url));
	valid.sort((a: any, b: any) => (a.width ?? 0) - (b.width ?? 0));
	const image = valid.find((image: any) => (image.width ?? 0) >= 64) ?? valid.at(-1);
	return image ? (image as any).url : null;
}
