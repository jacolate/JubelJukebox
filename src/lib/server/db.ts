import { MongoClient, type Db } from 'mongodb';
import { MONGODB_DB, MONGODB_URI } from '$app/env/private';
import type { SessionDoc } from '#lib/server/session.ts';
import type { SongRequestDoc } from '#lib/server/songRequests.ts';

let db: Db | undefined;

// The driver connects lazily on the first operation.
function getDb(): Db {
	db ??= new MongoClient(MONGODB_URI, { appName: 'jubeljukebox' }).db(MONGODB_DB);
	return db;
}

export const collections = {
	sessions: () => getDb().collection<SessionDoc>('sessions'),
	songRequests: () => getDb().collection<SongRequestDoc>('songRequests')
};

export async function ensureIndexes() {
	// MongoDB removes expired sessions automatically.
	await collections.sessions().createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
}
