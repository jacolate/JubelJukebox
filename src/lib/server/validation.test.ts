import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { isSpotifyImageUrl, isTrackId, trackUrl } from '#lib/spotify.ts';
import { SearchQuery, SongRequestInput, StatusUpdate, Username } from './validation.ts';

const ID = '2374M0fQpWi3dLnB54qaLX';

describe('spotify helpers', () => {
	it('accepts only 22-character base62 track ids', () => {
		expect(isTrackId(ID)).toBe(true);
		for (const id of ['', 'short', `${ID}x`, '2374M0fQpWi3dLnB54qa/X', '../../etc/passwd000000', 42, null]) {
			expect(isTrackId(id)).toBe(false);
		}
	});

	it('builds links only from valid ids', () => {
		expect(trackUrl(ID)).toBe(`https://open.spotify.com/track/${ID}`);
		expect(trackUrl('javascript:alert(1)')).toBeNull();
	});

	it('accepts only Spotify CDN images', () => {
		expect(isSpotifyImageUrl('https://i.scdn.co/image/ab67616d00004851abc123')).toBe(true);
		for (const url of [
			'http://i.scdn.co/image/abc',
			'https://i.scdn.co.evil.com/image/abc',
			'https://evil.com/image/abc',
			'https://i.scdn.co/image/abc"onerror="alert(1)',
			'javascript:alert(1)'
		]) {
			expect(isSpotifyImageUrl(url)).toBe(false);
		}
	});
});

describe('SongRequestInput', () => {
	it('only keeps the track id – song details from the client are ignored', () => {
		const result = v.parse(SongRequestInput, {
			trackId: ID,
			song: { name: 'Fake', url: 'javascript:alert(1)' },
			user: 'someone else',
			status: 'PLAYED'
		});
		expect(result).toEqual({ trackId: ID });
	});

	it.each([{}, { trackId: 'x' }, { trackId: { $gt: '' } }, { trackId: `${ID}' OR 1=1 --` }])('rejects %j', (input) => {
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
		expect(v.safeParse(Username, 'a\u0000b').success).toBe(false);
		expect(v.safeParse(Username, null).success).toBe(false);
		expect(v.safeParse(SearchQuery, 'x'.repeat(101)).success).toBe(false);
	});
});
