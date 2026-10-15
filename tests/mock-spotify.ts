// Minimal Spotify Web API mock for end-to-end tests.
// Start: node tests/mock-spotify.ts [port]   (default 4010)
// App:   SPOTIFY_ACCOUNTS_URL=http://127.0.0.1:4010 SPOTIFY_API_URL=http://127.0.0.1:4010/v1
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

export const MOCK_TRACKS = [
	{ id: '2374M0fQpWi3dLnB54qaLX', name: 'Africa', artists: ['TOTO'], explicit: false },
	{ id: '003vvx7Niy0yvhvHt4a68B', name: 'Mr. Brightside', artists: ['The Killers'], explicit: false },
	{ id: '0GjEhVFGZW8afUYGChu3Rr', name: 'Dancing Queen', artists: ['ABBA'], explicit: false },
	{ id: '7KXjTSCq5nL1LoYtL7XAwS', name: 'Explicit Song', artists: ['Parental Advisory'], explicit: true },
	{ id: '1cOboCuWaeQXDTtBlQnvnc', name: 'Atemlos durch die Nacht', artists: ['Helene Fischer'], explicit: false },
	// Only found when searching for "long": tests layouts with long titles and artist lists.
	{
		id: 'LongTitleTrack00000001',
		name: 'Bohemian Rhapsody – Remastered 2011 (Live at Wembley Stadium, 13 July 1986)',
		artists: ['Queen', 'The Extraordinarily Long Named Wedding Orchestra', 'Freddie Mercury'],
		explicit: false
	},
	// Deterministic filler tracks, so every test can work with its own songs: search "track 07" etc.
	...Array.from({ length: 40 }, (_, i) => {
		const n = String(i + 1).padStart(2, '0');
		return { id: `TestTrack${n.padStart(13, '0')}`, name: `Test Track ${n}`, artists: [`Test Artist ${n}`], explicit: false };
	})
];

/** Id of the n-th filler track (1–40). */
export const testTrackId = (n: number) => `TestTrack${String(n).padStart(2, '0').padStart(13, '0')}`;

function toApiTrack(track: (typeof MOCK_TRACKS)[number]) {
	return {
		id: track.id,
		name: track.name,
		explicit: track.explicit,
		artists: track.artists.map((name) => ({ name })),
		album: { images: [{ url: `https://i.scdn.co/image/${track.id.toLowerCase()}`, width: 64, height: 64 }] }
	};
}

export function startMockSpotify(port = 4010) {
	const server = createServer((req, res) => {
		const url = new URL(req.url ?? '/', 'http://localhost');
		const json = (status: number, body: unknown) => {
			res.writeHead(status, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify(body));
		};

		if (req.method === 'POST' && url.pathname === '/api/token') {
			return json(200, { access_token: 'mock-token', token_type: 'Bearer', expires_in: 3600 });
		}
		if (req.headers.authorization !== 'Bearer mock-token') return json(401, { error: 'invalid token' });

		if (url.pathname === '/v1/search') {
			const q = (url.searchParams.get('q') ?? '').toLowerCase();
			const items = MOCK_TRACKS.filter((t) => {
				// filler tracks only show up when explicitly searched for ("test track …")
				if (t.id.startsWith('TestTrack') && !q.includes('test')) return false;
				if (t.id.startsWith('LongTitle')) return q.includes('long');
				return q === '*' || t.name.toLowerCase().includes(q) || t.artists.some((a) => a.toLowerCase().includes(q));
			}).slice(0, Number(url.searchParams.get('limit') ?? 10));
			return json(200, { tracks: { items: items.map(toApiTrack) } });
		}
		const match = /^\/v1\/tracks\/([A-Za-z0-9]{22})$/.exec(url.pathname);
		if (match) {
			const track = MOCK_TRACKS.find((t) => t.id === match[1]);
			return track ? json(200, toApiTrack(track)) : json(404, { error: 'not found' });
		}
		json(404, { error: 'not found' });
	});
	return new Promise<typeof server>((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

// started directly (not imported by a test)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const port = Number(process.argv[2] ?? 4010);
	await startMockSpotify(port);
	console.log(`Mock Spotify listening on http://127.0.0.1:${port}`);
}
