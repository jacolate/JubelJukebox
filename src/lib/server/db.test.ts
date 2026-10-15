// Integration tests against a real (in-memory) MongoDB.
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, type Db } from 'mongodb';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	createSession,
	generateSessionToken,
	invalidateSession,
	SESSION_LIFETIME,
	sessionIdFromToken,
	validateSessionToken,
	type SessionDoc
} from './session.ts';
import { createSongRequestStore, type SongRequestDoc } from './songRequests.ts';

let server: MongoMemoryServer;
let client: MongoClient;
let db: Db;

beforeAll(async () => {
	server = await MongoMemoryServer.create();
	client = await new MongoClient(server.getUri()).connect();
	db = client.db('test');
});

afterAll(async () => {
	await client?.close();
	await server?.stop();
});

beforeEach(async () => {
	await db.dropDatabase();
});

describe('sessions', () => {
	const sessions = () => db.collection<SessionDoc>('sessions');

	it('stores only a hash of the token', async () => {
		const token = generateSessionToken();
		await createSession(sessions(), token, 'guest', 'Anna', 0);
		const docs = await sessions().find().toArray();
		expect(docs).toHaveLength(1);
		expect(docs[0]._id).toBe(sessionIdFromToken(token));
		expect(JSON.stringify(docs)).not.toContain(token);
	});

	it('validates, renews and expires sessions', async () => {
		const token = generateSessionToken();
		const lifetime = SESSION_LIFETIME.guest;
		await createSession(sessions(), token, 'guest', 'Anna', 0);

		const fresh = await validateSessionToken(sessions(), token, 1000);
		expect(fresh).toMatchObject({ renewed: false, session: { role: 'guest', username: 'Anna' } });

		const renewed = await validateSessionToken(sessions(), token, lifetime * 0.75);
		expect(renewed?.renewed).toBe(true);
		expect(renewed?.session.expiresAt.getTime()).toBe(lifetime * 1.75);

		expect(await validateSessionToken(sessions(), token, lifetime * 2)).toBeNull();
		expect(await sessions().countDocuments()).toBe(0);
	});

	it('rejects unknown and invalidated tokens', async () => {
		const token = generateSessionToken();
		const session = await createSession(sessions(), token, 'admin', 'dj');
		expect(await validateSessionToken(sessions(), generateSessionToken())).toBeNull();
		// The stored id must not work as a token either.
		expect(await validateSessionToken(sessions(), session.id)).toBeNull();
		await invalidateSession(sessions(), session.id);
		expect(await validateSessionToken(sessions(), token)).toBeNull();
	});
});

describe('song request store', () => {
	const song = { name: 'Africa', interprete: 'TOTO', url: 'https://open.spotify.com/track/2374M0fQpWi3dLnB54qaLX' };

	it('creates, updates and deletes requests and publishes events', async () => {
		const publish = vi.fn();
		const store = createSongRequestStore(db.collection<SongRequestDoc>('songRequests'), publish);

		const created = await store.create({ song }, 'Anna');
		expect(created).toMatchObject({ song, user: 'Anna', status: 'PENDING' });
		expect(created._id).toMatch(/^[a-f0-9]{24}$/);
		expect(publish).toHaveBeenLastCalledWith({ type: 'created', request: created });

		expect(await store.updateStatus(created._id, 'PLAYED')).toBe(true);
		expect(publish).toHaveBeenLastCalledWith({ type: 'updated', id: created._id, status: 'PLAYED' });
		expect((await store.list())[0].status).toBe('PLAYED');

		expect(await store.delete(created._id)).toBe(true);
		expect(publish).toHaveBeenLastCalledWith({ type: 'deleted', id: created._id });
		expect(await store.list()).toEqual([]);

		publish.mockClear();
		expect(await store.updateStatus(created._id, 'PENDING')).toBe(false);
		expect(await store.delete(created._id)).toBe(false);
		expect(publish).not.toHaveBeenCalled();
	});
});
