export interface Track {
	name: string;
	interprete: string;
	url: string;
}

export class SpotifyError extends Error {}

interface Options {
	clientId: string;
	clientSecret: string;
	fetch?: typeof globalThis.fetch;
	now?: () => number;
}

const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SEARCH_URL = 'https://api.spotify.com/v1/search';
const TIMEOUT_MS = 8000;

/**
 * Spotify Web API client using the client credentials flow.
 * The access token is cached and refreshed shortly before it expires.
 */
export function createSpotifyClient({ clientId, clientSecret, fetch = globalThis.fetch, now = Date.now }: Options) {
	let token: { value: string; expiresAt: number } | null = null;
	let pending: Promise<string> | null = null;

	async function requestToken(): Promise<string> {
		const response = await fetch(TOKEN_URL, {
			method: 'POST',
			headers: {
				Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: 'grant_type=client_credentials',
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});
		if (!response.ok) throw new SpotifyError(`Token request failed with status ${response.status}`);

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

	async function searchTracks(query: string, limit = 10): Promise<Track[]> {
		const url = `${SEARCH_URL}?${new URLSearchParams({ q: query, type: 'track', limit: String(limit) })}`;

		for (let attempt = 0; attempt < 2; attempt++) {
			const response = await fetch(url, {
				headers: { Authorization: `Bearer ${await getToken()}` },
				signal: AbortSignal.timeout(TIMEOUT_MS)
			});
			if (response.status === 401 && attempt === 0) {
				token = null; // revoked or expired early – fetch a new one and retry once
				continue;
			}
			if (!response.ok) throw new SpotifyError(`Search failed with status ${response.status}`);
			return parseTracks(await response.json());
		}
		throw new SpotifyError('Search failed after token refresh');
	}

	return { searchTracks };
}

function parseTracks(data: any): Track[] {
	const items: unknown[] = Array.isArray(data?.tracks?.items) ? data.tracks.items : [];
	return items.flatMap((item: any) => {
		if (typeof item?.id !== 'string' || !/^[A-Za-z0-9]{22}$/.test(item.id)) return [];
		if (typeof item.name !== 'string') return [];
		const artists = Array.isArray(item.artists) ? item.artists : [];
		return [
			{
				name: item.name,
				interprete: artists
					.map((artist: any) => artist?.name)
					.filter((name: unknown) => typeof name === 'string')
					.join(', '),
				url: `https://open.spotify.com/track/${item.id}`
			}
		];
	});
}
