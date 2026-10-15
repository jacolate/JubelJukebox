import { describe, expect, it, vi } from 'vitest';
import { createSpotifyClient, SpotifyError } from './spotify.ts';

const ID = '2374M0fQpWi3dLnB54qaLX';
const searchResponse = {
	tracks: {
		items: [
			{
				id: ID,
				name: 'Africa',
				explicit: false,
				artists: [{ name: 'TOTO' }],
				album: {
					images: [
						{ url: 'https://i.scdn.co/image/large', width: 640 },
						{ url: 'https://i.scdn.co/image/small', width: 64 },
						{ url: 'https://evil.com/image/tiny', width: 32 }
					]
				}
			},
			{ id: 'bad', name: 'Invalid id', artists: [] }
		]
	}
};

function mockFetch(handler: (url: string, init?: RequestInit) => Response) {
	return vi.fn(async (input: string | URL | Request, init?: RequestInit) => handler(String(input), init));
}

describe('Spotify client', () => {
	it('caches the token and refreshes it before expiry', async () => {
		let now = 0;
		let tokens = 0;
		const fetch = mockFetch((url, init) => {
			if (url.startsWith('https://accounts.spotify.com')) {
				expect(init?.headers).toMatchObject({ Authorization: `Basic ${btoa('id:secret')}` });
				return Response.json({ access_token: `t${++tokens}`, expires_in: 3600 });
			}
			return Response.json(searchResponse);
		});
		const client = createSpotifyClient({ clientId: 'id', clientSecret: 'secret', fetch, now: () => now });

		await client.searchTracks('a');
		await client.searchTracks('b');
		expect(tokens).toBe(1);

		now = 3600 * 1000 - 30 * 1000; // within the last minute of validity
		await client.searchTracks('c');
		expect(tokens).toBe(2);
	});

	it('encodes the query and maps results to canonical urls', async () => {
		const fetch = mockFetch((url) =>
			url.startsWith('https://accounts') ? Response.json({ access_token: 't', expires_in: 3600 }) : Response.json(searchResponse)
		);
		const client = createSpotifyClient({ clientId: 'id', clientSecret: 'secret', fetch });

		const tracks = await client.searchTracks('AC/DC & Queen #1');
		expect(tracks).toEqual([
			{ trackId: ID, name: 'Africa', artists: 'TOTO', image: 'https://i.scdn.co/image/small', explicit: false }
		]);

		const searchUrl = new URL(fetch.mock.calls[1][0] as string);
		expect(searchUrl.searchParams.get('q')).toBe('AC/DC & Queen #1');
		expect(searchUrl.searchParams.get('type')).toBe('track');
	});

	it('retries once with a fresh token on 401', async () => {
		let searches = 0;
		const fetch = mockFetch((url) => {
			if (url.startsWith('https://accounts')) return Response.json({ access_token: 't', expires_in: 3600 });
			return ++searches === 1 ? new Response(null, { status: 401 }) : Response.json(searchResponse);
		});
		const client = createSpotifyClient({ clientId: 'id', clientSecret: 'secret', fetch });
		expect(await client.searchTracks('x')).toHaveLength(1);
		expect(searches).toBe(2);
	});

	it('looks up single tracks and caches them', async () => {
		const fetch = mockFetch((url) => {
			if (url.startsWith('https://accounts')) return Response.json({ access_token: 't', expires_in: 3600 });
			if (url.endsWith(`/tracks/${ID}`)) return Response.json({ ...searchResponse.tracks.items[0], explicit: true });
			return new Response(null, { status: 404 });
		});
		const client = createSpotifyClient({ clientId: 'id', clientSecret: 'secret', fetch });

		expect(await client.getTrack(ID)).toMatchObject({ trackId: ID, name: 'Africa', explicit: true });
		await client.getTrack(ID);
		expect(fetch.mock.calls.filter(([url]) => String(url).includes('/tracks/'))).toHaveLength(1);

		expect(await client.getTrack('0000000000000000000000')).toBeNull();
		expect(await client.getTrack('../search?q=x')).toBeNull();
	});

	it('throws a SpotifyError when the API fails', async () => {
		const fetch = mockFetch(() => new Response(null, { status: 500 }));
		const client = createSpotifyClient({ clientId: 'id', clientSecret: 'secret', fetch });
		await expect(client.searchTracks('x')).rejects.toBeInstanceOf(SpotifyError);
	});
});
