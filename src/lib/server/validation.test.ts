import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { normalizeSpotifyTrackUrl } from '#lib/spotifyUrl.ts';
import { SearchQuery, SongRequestInput, StatusUpdate, Username } from './validation.ts';

const ID = '2374M0fQpWi3dLnB54qaLX';
const song = { name: 'Africa', interprete: 'TOTO', url: `https://open.spotify.com/track/${ID}` };

describe('normalizeSpotifyTrackUrl', () => {
	it.each([
		`https://open.spotify.com/track/${ID}`,
		`https://open.spotify.com/track/${ID}?si=abc`,
		`https://open.spotify.com/intl-de/track/${ID}`
	])('accepts %s', (url) => {
		expect(normalizeSpotifyTrackUrl(url)).toBe(`https://open.spotify.com/track/${ID}`);
	});

	it.each([
		'javascript:alert(document.cookie)',
		`javascript://open.spotify.com/track/${ID}`,
		`http://open.spotify.com/track/${ID}`,
		`https://open.spotify.com.evil.com/track/${ID}`,
		`https://evil.com/?https://open.spotify.com/track/${ID}`,
		`https://user:pw@open.spotify.com/track/${ID}`,
		`https://open.spotify.com/track/${ID}/../../x`,
		`https://open.spotify.com/album/${ID}`,
		'data:text/html,<script>alert(1)</script>',
		'',
		42,
		null
	])('rejects %s', (url) => {
		expect(normalizeSpotifyTrackUrl(url)).toBeNull();
	});
});

describe('SongRequestInput', () => {
	it('strips fields the client must not control', () => {
		const result = v.parse(SongRequestInput, {
			song: { ...song, extra: 'x' },
			user: 'someone else',
			status: 'PLAYED',
			$where: 'sleep(1000)'
		});
		expect(result).toEqual({ song });
	});

	it('normalizes the url and trims text', () => {
		const result = v.parse(SongRequestInput, {
			song: { name: '  Africa ', interprete: 'TOTO', url: `${song.url}?si=1` }
		});
		expect(result.song).toEqual(song);
	});

	it.each([
		{ song: { ...song, url: 'javascript:alert(1)' } },
		{ song: { ...song, name: '' } },
		{ song: { ...song, name: 'x'.repeat(201) } },
		{ song: { ...song, name: { $gt: '' } } },
		{ song: { ...song, interprete: 'a\u0000b' } },
		{ song: 'Africa' },
		{}
	])('rejects %j', (input) => {
		expect(v.safeParse(SongRequestInput, input).success).toBe(false);
	});
});

describe('other schemas', () => {
	it('only allows known statuses', () => {
		expect(v.safeParse(StatusUpdate, { status: 'PLAYED' }).success).toBe(true);
		expect(v.safeParse(StatusUpdate, { status: 'HACKED' }).success).toBe(false);
		expect(v.safeParse(StatusUpdate, { status: { $ne: null } }).success).toBe(false);
	});

	it('limits usernames and search queries', () => {
		expect(v.parse(Username, '  Anna ')).toBe('Anna');
		expect(v.safeParse(Username, '').success).toBe(false);
		expect(v.safeParse(Username, 'x'.repeat(41)).success).toBe(false);
		expect(v.safeParse(Username, null).success).toBe(false);
		expect(v.safeParse(SearchQuery, 'x'.repeat(101)).success).toBe(false);
	});
});
