import { describe, expect, it } from 'vitest';
import type { Track } from '#lib/types.ts';
import { buildRecap, csvCell, songsToCsv, type CsvLabels } from './recap.ts';

const LABELS: CsvLabels = {
	header: ['Titel', 'Interpret', 'Status', 'Wünsche', 'Gewünscht von', 'Erster Wunsch', 'Gespielt um'],
	status: { PENDING: 'Offen', STASHED: 'Zurückgestellt', PLAYED: 'Gespielt' }
};
import { createSongStore } from './songs.ts';
import { openDatabase } from './sqlite.ts';

const track = (trackId: string, name: string, artists: string): Track => ({ trackId, name, artists, image: null, explicit: false });

describe('csv', () => {
	it.each([
		['=HYPERLINK("http://evil","x")', `"'=HYPERLINK(""http://evil"",""x"")"`],
		['+1+1', "'+1+1"],
		['-2', "'-2"],
		['@SUM(A1)', "'@SUM(A1)"],
		['\tTab', "'\tTab"],
		['Semi;colon', '"Semi;colon"'],
		['Line\nbreak', '"Line\nbreak"'],
		['Africa', 'Africa'],
		[null, '']
	])('escapes %j', (input, expected) => {
		expect(csvCell(input)).toBe(expected);
	});

	it('writes a BOM, header and one row per song', () => {
		const db = openDatabase(':memory:');
		const store = createSongStore(db, () => {});
		store.request(track('2374M0fQpWi3dLnB54qaLX', '=cmd|calc', 'TOTO'), { id: 'a', name: '@Anna' });
		const csv = songsToCsv(store.list(), (iso) => (iso ? 'TIME' : ''), LABELS);
		expect(csv.startsWith('﻿Titel;Interpret;Status')).toBe(true);
		const row = csv.split('\r\n')[1];
		expect(row).toBe("'=cmd|calc;TOTO;Offen;1;'@Anna;TIME;;https://open.spotify.com/track/2374M0fQpWi3dLnB54qaLX");
	});
});

describe('recap', () => {
	it('counts songs, votes, guests and ranks artists', () => {
		const db = openDatabase(':memory:');
		const store = createSongStore(db, () => {});
		const africa = track('2374M0fQpWi3dLnB54qaLX', 'Africa', 'TOTO');
		const rosanna = track('003vvx7Niy0yvhvHt4a68B', 'Rosanna', 'TOTO');
		const queen = track('0GjEhVFGZW8afUYGChu3Rr', 'Dancing Queen', 'ABBA');
		store.request(africa, { id: 'a', name: 'Anna' }, undefined, 1);
		store.request(africa, { id: 'b', name: 'Ben' }, undefined, 2);
		store.request(rosanna, { id: 'a', name: 'Anna' }, undefined, 3);
		store.request(queen, { id: 'c', name: 'Clara' }, undefined, 4);
		store.setStatus(queen.trackId, 'PLAYED', 10);
		store.request(track('7KXjTSCq5nL1LoYtL7XAwS', 'Deleted', 'Gone'), { id: 'd', name: 'Dora' }, undefined, 5);
		store.remove('7KXjTSCq5nL1LoYtL7XAwS');

		const recap = buildRecap(db, store.list());
		expect(recap).toMatchObject({ songs: 3, played: 1, votes: 4, guests: 3 });
		expect(recap.topArtists).toEqual([
			{ name: 'TOTO', count: 3 },
			{ name: 'ABBA', count: 1 }
		]);
		expect(recap.topSongs.map((s) => s.name)).toEqual(['Africa']);
		expect(recap.topGuests[0]).toEqual({ name: 'Anna', count: 2 });
		expect(recap.firstRequestAt).toBe(new Date(1).toISOString());
		expect(recap.lastPlayedAt).toBe(new Date(10).toISOString());
	});
});
