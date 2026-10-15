// Integration tests against a real (in-memory) SQLite database.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
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
import { createSongRequestStore } from './songRequests.ts';
import { openDatabase, type Database } from './sqlite.ts';

let db: Database;

beforeEach(() => {
	db = openDatabase(':memory:');
});

describe('schema', () => {
	const dir = mkdtempSync(join(tmpdir(), 'jukebox-test-'));
	afterAll(() => rmSync(dir, { recursive: true, force: true }));

	it('creates the file and migrates only once', () => {
		const path = join(dir, 'nested', 'jukebox.db');
		const first = openDatabase(path);
		first.prepare("INSERT INTO sessions VALUES ('x', 'guest', 'Anna', 1)").run();
		first.close();

		const second = openDatabase(path);
		expect(second.prepare('PRAGMA user_version').get()).toEqual({ user_version: 1 });
		expect(second.prepare('SELECT count(*) AS n FROM sessions').get()).toEqual({ n: 1 });
		second.close();
	});

	it('rejects invalid roles and statuses at the database level', () => {
		expect(() => db.prepare("INSERT INTO sessions VALUES ('x', 'root', 'Anna', 1)").run()).toThrow();
		expect(() =>
			db.prepare("INSERT INTO song_requests VALUES ('x', 'n', 'i', 'u', 'Anna', 'HACKED', 1)").run()
		).toThrow();
	});
});

describe('sessions', () => {
	it('stores only a hash of the token', () => {
		const token = generateSessionToken();
		createSession(db, token, 'guest', 'Anna', 0);
		const rows = db.prepare('SELECT * FROM sessions').all();
		expect(rows).toHaveLength(1);
		expect(rows[0].id).toBe(sessionIdFromToken(token));
		expect(JSON.stringify(rows)).not.toContain(token);
	});

	it('validates, renews and expires sessions', () => {
		const token = generateSessionToken();
		const lifetime = SESSION_LIFETIME.guest;
		createSession(db, token, 'guest', 'Anna', 0);

		expect(validateSessionToken(db, token, 1000)).toMatchObject({
			renewed: false,
			session: { role: 'guest', username: 'Anna' }
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

describe('song request store', () => {
	const song = { name: 'Africa', interprete: 'TOTO', url: 'https://open.spotify.com/track/2374M0fQpWi3dLnB54qaLX' };

	it('creates, updates and deletes requests and publishes events', () => {
		const publish = vi.fn();
		const store = createSongRequestStore(db, publish);

		const created = store.create({ song }, 'Anna');
		expect(created).toMatchObject({ song, user: 'Anna', status: 'PENDING' });
		expect(publish).toHaveBeenLastCalledWith({ type: 'created', request: created });

		expect(store.updateStatus(created.id, 'PLAYED')).toBe(true);
		expect(publish).toHaveBeenLastCalledWith({ type: 'updated', id: created.id, status: 'PLAYED' });
		expect(store.list()[0].status).toBe('PLAYED');

		expect(store.delete(created.id)).toBe(true);
		expect(publish).toHaveBeenLastCalledWith({ type: 'deleted', id: created.id });
		expect(store.list()).toEqual([]);

		publish.mockClear();
		expect(store.updateStatus(created.id, 'PENDING')).toBe(false);
		expect(store.delete(created.id)).toBe(false);
		expect(publish).not.toHaveBeenCalled();
	});

	it('lists requests in creation order and treats input as data', () => {
		const store = createSongRequestStore(db, () => {});
		store.create({ song: { ...song, name: "Robert'); DROP TABLE song_requests;--" } }, 'Anna', 2);
		store.create({ song }, 'Ben', 1);
		expect(store.list().map((r) => r.user)).toEqual(['Ben', 'Anna']);
		expect(store.list()[1].song.name).toBe("Robert'); DROP TABLE song_requests;--");
	});
});
