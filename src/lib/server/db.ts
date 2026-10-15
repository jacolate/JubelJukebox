import { DATABASE_PATH } from '$app/env/private';
import { openDatabase, type Database } from '#lib/server/sqlite.ts';

let db: Database | undefined;

/** Opens the database (and runs migrations) on first use. */
export function getDb(): Database {
	db ??= openDatabase(DATABASE_PATH);
	return db;
}
