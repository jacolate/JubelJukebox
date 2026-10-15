import { randomUUID } from 'node:crypto';
import type { SongRequestDTO } from '#lib/types.ts';
import type { SongRequestEvent } from '#lib/server/pubsub.ts';
import type { Database } from '#lib/server/sqlite.ts';
import type { SongRequestInput, Status } from '#lib/server/validation.ts';

interface SongRequestRow {
	id: string;
	name: string;
	interprete: string;
	url: string;
	requested_by: string;
	status: Status;
	created_at: number;
}

function toDTO(row: SongRequestRow): SongRequestDTO {
	return {
		id: row.id,
		song: { name: row.name, interprete: row.interprete, url: row.url },
		user: row.requested_by,
		status: row.status,
		createdAt: new Date(row.created_at).toISOString()
	};
}

export function createSongRequestStore(db: Database, publish: (event: SongRequestEvent) => void) {
	const statements = {
		list: db.prepare('SELECT * FROM song_requests ORDER BY created_at, rowid'),
		insert: db.prepare(
			`INSERT INTO song_requests (id, name, interprete, url, requested_by, status, created_at)
			 VALUES (?, ?, ?, ?, ?, 'PENDING', ?)
			 RETURNING *`
		),
		updateStatus: db.prepare('UPDATE song_requests SET status = ? WHERE id = ?'),
		delete: db.prepare('DELETE FROM song_requests WHERE id = ?')
	};

	return {
		list(): SongRequestDTO[] {
			return (statements.list.all() as unknown as SongRequestRow[]).map(toDTO);
		},

		create({ song }: SongRequestInput, user: string, now = Date.now()): SongRequestDTO {
			const row = statements.insert.get(randomUUID(), song.name, song.interprete, song.url, user, now);
			const request = toDTO(row as unknown as SongRequestRow);
			publish({ type: 'created', request });
			return request;
		},

		/** Returns false if no request with that id exists. */
		updateStatus(id: string, status: Status): boolean {
			if (statements.updateStatus.run(status, id).changes === 0) return false;
			publish({ type: 'updated', id, status });
			return true;
		},

		/** Returns false if no request with that id exists. */
		delete(id: string): boolean {
			if (statements.delete.run(id).changes === 0) return false;
			publish({ type: 'deleted', id });
			return true;
		}
	};
}

export type SongRequestStore = ReturnType<typeof createSongRequestStore>;
