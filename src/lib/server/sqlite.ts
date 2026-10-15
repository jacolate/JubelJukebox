import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export type Database = DatabaseSync;

// Each entry upgrades the schema by one version (tracked in PRAGMA user_version). Only ever append.
const MIGRATIONS = [
	`
	CREATE TABLE sessions (
		id         TEXT PRIMARY KEY,
		role       TEXT NOT NULL CHECK (role IN ('guest', 'admin')),
		username   TEXT NOT NULL,
		expires_at INTEGER NOT NULL
	) STRICT;
	CREATE INDEX sessions_expires_at ON sessions (expires_at);

	CREATE TABLE song_requests (
		id           TEXT PRIMARY KEY,
		name         TEXT NOT NULL,
		interprete   TEXT NOT NULL,
		url          TEXT NOT NULL,
		requested_by TEXT NOT NULL,
		status       TEXT NOT NULL CHECK (status IN ('PENDING', 'STASHED', 'PLAYED')),
		created_at   INTEGER NOT NULL
	) STRICT;
	CREATE INDEX song_requests_created_at ON song_requests (created_at);
	`
];

export function openDatabase(path: string): Database {
	if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });

	const db = new DatabaseSync(path);
	db.exec(`
		PRAGMA journal_mode = WAL;
		PRAGMA synchronous = NORMAL;
		PRAGMA busy_timeout = 5000;
		PRAGMA temp_store = MEMORY;
	`);
	migrate(db);
	return db;
}

function migrate(db: Database) {
	const { user_version } = db.prepare('PRAGMA user_version').get() as { user_version: number };
	for (let version = user_version; version < MIGRATIONS.length; version++) {
		db.exec('BEGIN');
		try {
			db.exec(MIGRATIONS[version]);
			db.exec(`PRAGMA user_version = ${version + 1}`);
			db.exec('COMMIT');
		} catch (err) {
			db.exec('ROLLBACK');
			throw err;
		}
	}
}
