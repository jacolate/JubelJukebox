// Integration tests against a real SQLite database (in memory or in a temp dir).
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Track } from '#lib/types.ts';
import {
	createSession,
	deleteExpiredSessions,
	generateSessionToken,
	invalidateSession,
	isSessionActive,
	SESSION_LIFETIME,
	sessionIdFromToken,
	validateSessionToken
} from './session.ts';
import { createSongStore } from './songs.ts';
import { MIGRATIONS, openDatabase, type Database } from './sqlite.ts';

const dir = mkdtempSync(join(tmpdir(), 'jukebox-test-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

let db: Database;
beforeEach(() => {
	db = openDatabase(':memory:');
});

const AFRICA: Track = { trackId: '2374M0fQpWi3dLnB54qaLX', name: 'Africa', artists: 'TOTO', image: null, explicit: false };
const BRIGHTSIDE: Track = { trackId: '003vvx7Niy0yvhvHt4a68B', name: 'Mr. Brightside', artists: 'The Killers', image: null, explicit: false };
const anna = { id: 'guest-anna', name: 'Anna' };
const ben = { id: 'guest-ben', name: 'Ben' };

describe('schema', () => {
	it('creates the file and migrates only once', () => {
		const path = join(dir, 'nested', 'jukebox.db');
		const first = openDatabase(path);
		first.prepare("INSERT INTO settings VALUES ('x', '1')").run();
		first.close();

		const second = openDatabase(path);
		expect(second.prepare('PRAGMA user_version').get()).toEqual({ user_version: MIGRATIONS.length });
		expect(second.prepare('SELECT count(*) AS n FROM settings').get()).toEqual({ n: 1 });
		second.close();
	});

	it('rejects invalid roles, statuses and track ids at the database level', () => {
		expect(() => db.prepare("INSERT INTO sessions VALUES ('x', 'root', 'Anna', 1, 'g')").run()).toThrow();
		expect(() =>
			db.prepare(`INSERT INTO songs (track_id, name, artists, status, created_at) VALUES ('${AFRICA.trackId}', 'n', 'a', 'HACKED', 1)`).run()
		).toThrow();
		expect(() =>
			db.prepare("INSERT INTO songs (track_id, name, artists, status, created_at) VALUES ('short', 'n', 'a', 'PENDING', 1)").run()
		).toThrow();
	});

	it('migrates v1 song requests into songs with votes', () => {
		const path = join(dir, 'v1.db');
		const v1 = new DatabaseSync(path);
		v1.exec(MIGRATIONS[0]);
		v1.exec('PRAGMA user_version = 1');
		const insert = v1.prepare('INSERT INTO song_requests VALUES (?, ?, ?, ?, ?, ?, ?)');
		const url = (id: string) => `https://open.spotify.com/track/${id}`;
		insert.run('r1', 'Africa', 'TOTO', url(AFRICA.trackId), 'Anna', 'PENDING', 10);
		insert.run('r2', 'Africa', 'TOTO', url(AFRICA.trackId), 'Ben', 'PENDING', 20);
		insert.run('r3', 'Mr. Brightside', 'The Killers', url(BRIGHTSIDE.trackId), 'Clara', 'PLAYED', 30);
		insert.run('r4', 'Bad', 'Bad', 'javascript:alert(1)', 'Evil', 'PENDING', 40);
		v1.exec("INSERT INTO sessions VALUES ('s1', 'guest', 'Anna', 999)");
		v1.close();

		const migrated = openDatabase(path);
		const store = createSongStore(migrated, () => {});
		const list = store.list();
		expect(list.map((s) => [s.name, s.votes, s.requesters, s.status])).toEqual([
			['Africa', 2, ['Anna', 'Ben'], 'PENDING'],
			['Mr. Brightside', 1, ['Clara'], 'PLAYED']
		]);
		expect(list[1].playedAt).toBe(new Date(30).toISOString());
		expect(migrated.prepare("SELECT name FROM sqlite_master WHERE name = 'song_requests'").get()).toBeUndefined();
		const session = migrated.prepare('SELECT guest_id FROM sessions').get() as { guest_id: string };
		expect(session.guest_id).toMatch(/^[0-9a-f]{32}$/);
		migrated.close();
	});
});

describe('sessions', () => {
	it('stores only a hash of the token and a random guest id', () => {
		const token = generateSessionToken();
		const session = createSession(db, token, 'guest', 'Anna', 0);
		const rows = db.prepare('SELECT * FROM sessions').all();
		expect(rows).toHaveLength(1);
		expect(rows[0].id).toBe(sessionIdFromToken(token));
		expect(rows[0].guest_id).toBe(session.guestId);
		expect(session.guestId).not.toBe(session.id);
		expect(JSON.stringify(rows)).not.toContain(token);
	});

	it('validates, renews and expires sessions', () => {
		const token = generateSessionToken();
		const lifetime = SESSION_LIFETIME.guest;
		const created = createSession(db, token, 'guest', 'Anna', 0);

		expect(validateSessionToken(db, token, 1000)).toMatchObject({
			renewed: false,
			session: { role: 'guest', username: 'Anna', guestId: created.guestId }
		});

		const renewed = validateSessionToken(db, token, lifetime * 0.75);
		expect(renewed?.renewed).toBe(true);
		expect(renewed?.session.expiresAt.getTime()).toBe(lifetime * 1.75);

		expect(validateSessionToken(db, token, lifetime * 2)).toBeNull();
		expect(db.prepare('SELECT count(*) AS n FROM sessions').get()).toEqual({ n: 0 });
	});

	it('rejects unknown and invalidated tokens', () => {
		const token = generateSessionToken();
		const session = createSession(db, token, 'admin', 'dj');
		expect(isSessionActive(db, session.id)).toBe(true);
		expect(validateSessionToken(db, generateSessionToken())).toBeNull();
		// The stored id must not work as a token either.
		expect(validateSessionToken(db, session.id)).toBeNull();

		invalidateSession(db, session.id);
		expect(validateSessionToken(db, token)).toBeNull();
		expect(isSessionActive(db, session.id)).toBe(false);
	});

	it('deletes expired sessions', () => {
		createSession(db, generateSessionToken(), 'admin', 'dj', 0);
		createSession(db, generateSessionToken(), 'guest', 'Anna', 0);
		deleteExpiredSessions(db, SESSION_LIFETIME.admin + 1);
		expect(db.prepare('SELECT role FROM sessions').all()).toEqual([{ role: 'guest' }]);
	});
});

describe('song store', () => {
	it('turns duplicate requests into votes, once per guest', () => {
		const publish = vi.fn();
		const store = createSongStore(db, publish);

		const first = store.request(AFRICA, anna, undefined, 1);
		expect(first).toMatchObject({ ok: true, result: 'created', song: { votes: 1, requesters: ['Anna'], status: 'PENDING' } });
		expect(store.request(AFRICA, anna, undefined, 2)).toMatchObject({ ok: true, result: 'already-voted' });
		expect(store.request(AFRICA, ben, undefined, 3)).toMatchObject({ ok: true, result: 'voted', song: { votes: 2, requesters: ['Anna', 'Ben'] } });

		// already-voted doesn't publish anything
		expect(publish).toHaveBeenCalledTimes(2);
		expect(store.list()).toHaveLength(1);
	});

	it('rejects requests for played and deleted songs', () => {
		const store = createSongStore(db, () => {});
		store.request(AFRICA, anna);
		store.setStatus(AFRICA.trackId, 'PLAYED');
		expect(store.request(AFRICA, ben)).toEqual({ ok: false, reason: 'played' });

		store.request(BRIGHTSIDE, anna);
		store.remove(BRIGHTSIDE.trackId);
		expect(store.request(BRIGHTSIDE, ben)).toEqual({ ok: false, reason: 'unavailable' });
	});

	it('tracks played_at and returns the previous status for undo', () => {
		const store = createSongStore(db, () => {});
		store.request(AFRICA, anna, undefined, 1);

		expect(store.setStatus(AFRICA.trackId, 'PLAYED', 100)).toEqual({ previous: 'PENDING' });
		expect(store.get(AFRICA.trackId)?.playedAt).toBe(new Date(100).toISOString());
		// marking it played again keeps the original time
		store.setStatus(AFRICA.trackId, 'PLAYED', 200);
		expect(store.get(AFRICA.trackId)?.playedAt).toBe(new Date(100).toISOString());

		expect(store.setStatus(AFRICA.trackId, 'PENDING', 300)).toEqual({ previous: 'PLAYED' });
		expect(store.get(AFRICA.trackId)?.playedAt).toBeNull();
		expect(store.setStatus(BRIGHTSIDE.trackId, 'PLAYED')).toBeNull();
	});

	it('soft-deletes and restores songs including their votes', () => {
		const publish = vi.fn();
		const store = createSongStore(db, publish);
		store.request(AFRICA, anna);
		store.request(AFRICA, ben);

		expect(store.remove(AFRICA.trackId)).toBe(true);
		expect(publish).toHaveBeenLastCalledWith({ type: 'removed', trackId: AFRICA.trackId });
		expect(store.list()).toEqual([]);
		expect(store.get(AFRICA.trackId)).toBeUndefined();
		expect(store.remove(AFRICA.trackId)).toBe(false);

		expect(store.restore(AFRICA.trackId)).toBe(true);
		expect(store.list()[0]).toMatchObject({ votes: 2, requesters: ['Anna', 'Ben'] });
		expect(store.restore(AFRICA.trackId)).toBe(false);
	});

	it('stores song details as data', () => {
		const store = createSongStore(db, () => {});
		store.request({ ...AFRICA, name: "Robert'); DROP TABLE songs;--" }, { id: 'x', name: "'; DELETE FROM votes;--" });
		expect(store.list()[0]).toMatchObject({ name: "Robert'); DROP TABLE songs;--", requesters: ["'; DELETE FROM votes;--"] });
	});
});
