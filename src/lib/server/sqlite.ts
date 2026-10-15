import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export type Database = DatabaseSync;

// Each entry upgrades the schema by one version (tracked in PRAGMA user_version). Only ever append.
export const MIGRATIONS = [
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
	`,
	// v2: one row per track with votes, soft delete, event settings, stable guest ids
	`
	CREATE TABLE songs (
		track_id    TEXT PRIMARY KEY CHECK (length(track_id) = 22),
		name        TEXT NOT NULL,
		artists     TEXT NOT NULL,
		album_image TEXT,
		explicit    INTEGER NOT NULL DEFAULT 0 CHECK (explicit IN (0, 1)),
		status      TEXT NOT NULL CHECK (status IN ('PENDING', 'STASHED', 'PLAYED')),
		created_at  INTEGER NOT NULL,
		played_at   INTEGER,
		deleted_at  INTEGER
	) STRICT;
	CREATE INDEX songs_played_at ON songs (played_at) WHERE played_at IS NOT NULL;

	CREATE TABLE votes (
		track_id   TEXT NOT NULL REFERENCES songs (track_id) ON DELETE CASCADE,
		guest_id   TEXT NOT NULL,
		guest_name TEXT NOT NULL,
		created_at INTEGER NOT NULL,
		PRIMARY KEY (track_id, guest_id)
	) STRICT;
	CREATE INDEX votes_guest_id ON votes (guest_id);

	CREATE TABLE settings (
		key   TEXT PRIMARY KEY,
		value TEXT NOT NULL
	) STRICT;

	ALTER TABLE sessions ADD COLUMN guest_id TEXT NOT NULL DEFAULT '';
	UPDATE sessions SET guest_id = lower(hex(randomblob(16)));

	-- Carry over v1 requests: duplicates of the same track become votes.
	-- v1 urls are normalized to https://open.spotify.com/track/<id> (31 characters before the id).
	INSERT INTO songs (track_id, name, artists, status, created_at, played_at)
		SELECT substr(url, 32, 22), name, interprete, status, min(created_at),
		       CASE WHEN status = 'PLAYED' THEN max(created_at) END
		FROM song_requests
		WHERE url LIKE 'https://open.spotify.com/track/%' AND length(url) = 53
		GROUP BY substr(url, 32, 22);
	INSERT OR IGNORE INTO votes (track_id, guest_id, guest_name, created_at)
		SELECT substr(url, 32, 22), 'v1-' || id, requested_by, created_at
		FROM song_requests
		WHERE substr(url, 32, 22) IN (SELECT track_id FROM songs);
	DROP TABLE song_requests;
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
		PRAGMA foreign_keys = ON;
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
