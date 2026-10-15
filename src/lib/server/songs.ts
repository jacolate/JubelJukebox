import type { SongEvent } from '#lib/server/pubsub.ts';
import { blockReason } from '#lib/server/settings.ts';
import type { Database } from '#lib/server/sqlite.ts';
import type {
	EventSettings,
	GuestSongDTO,
	RejectReason,
	RequestResult,
	SearchState,
	SongDTO,
	Status,
	TimelineEntry,
	Track
} from '#lib/types.ts';

interface SongRow {
	track_id: string;
	name: string;
	artists: string;
	album_image: string | null;
	explicit: number;
	status: Status;
	created_at: number;
	played_at: number | null;
	deleted_at: number | null;
	votes: number;
	requesters: string;
}

const SELECT_SONG = `
	SELECT s.*,
		(SELECT count(*) FROM votes v WHERE v.track_id = s.track_id) AS votes,
		(SELECT json_group_array(guest_name) FROM (
			SELECT guest_name FROM votes v WHERE v.track_id = s.track_id ORDER BY created_at, rowid
		)) AS requesters
	FROM songs s`;

function toTrack(row: SongRow): Track {
	return {
		trackId: row.track_id,
		name: row.name,
		artists: row.artists,
		image: row.album_image,
		explicit: row.explicit === 1
	};
}

function toGuestDTO(row: SongRow): GuestSongDTO {
	return {
		...toTrack(row),
		status: row.status,
		votes: row.votes,
		playedAt: row.played_at === null ? null : new Date(row.played_at).toISOString()
	};
}

function toDTO(row: SongRow): SongDTO {
	return {
		...toTrack(row),
		status: row.status,
		createdAt: new Date(row.created_at).toISOString(),
		playedAt: row.played_at === null ? null : new Date(row.played_at).toISOString(),
		votes: row.votes,
		requesters: JSON.parse(row.requesters)
	};
}

export type RequestOutcome =
	| { ok: true; result: RequestResult; song: SongDTO }
	| { ok: false; reason: RejectReason };

/** The settings that decide whether a request is accepted. */
export type RequestRules = Pick<EventSettings, 'requestsOpen' | 'maxOpenPerGuest' | 'blockExplicit' | 'blocklist'>;

const OPEN_RULES: RequestRules = { requestsOpen: true, maxOpenPerGuest: 0, blockExplicit: false, blocklist: [] };

export interface Guest {
	id: string;
	name: string;
}

export function createSongStore(db: Database, publish: (event: SongEvent) => void) {
	const statements = {
		list: db.prepare(`${SELECT_SONG} WHERE s.deleted_at IS NULL ORDER BY s.created_at, s.rowid`),
		get: db.prepare(`${SELECT_SONG} WHERE s.track_id = ?`),
		insertSong: db.prepare(
			`INSERT INTO songs (track_id, name, artists, album_image, explicit, status, created_at)
			 VALUES (?, ?, ?, ?, ?, 'PENDING', ?)`
		),
		insertVote: db.prepare(
			'INSERT OR IGNORE INTO votes (track_id, guest_id, guest_name, created_at) VALUES (?, ?, ?, ?)'
		),
		setStatus: db.prepare(
			'UPDATE songs SET status = ?, played_at = ? WHERE track_id = ? AND deleted_at IS NULL'
		),
		softDelete: db.prepare('UPDATE songs SET deleted_at = ? WHERE track_id = ? AND deleted_at IS NULL'),
		restore: db.prepare('UPDATE songs SET deleted_at = NULL WHERE track_id = ? AND deleted_at IS NOT NULL'),
		hasVoted: db.prepare('SELECT 1 FROM votes WHERE track_id = ? AND guest_id = ?'),
		forGuest: db.prepare(
			`${SELECT_SONG} JOIN votes mine ON mine.track_id = s.track_id AND mine.guest_id = ?
			 WHERE s.deleted_at IS NULL ORDER BY mine.created_at DESC, mine.rowid DESC`
		),
		openForGuest: db.prepare(
			`SELECT count(*) AS n FROM votes v JOIN songs s ON s.track_id = v.track_id
			 WHERE v.guest_id = ? AND s.status = 'PENDING' AND s.deleted_at IS NULL`
		),
		timeline: db.prepare(
			`${SELECT_SONG} WHERE s.status = 'PLAYED' AND s.deleted_at IS NULL AND s.played_at IS NOT NULL
			 ORDER BY s.played_at DESC`
		)
	};

	function getRow(trackId: string): SongRow | undefined {
		return statements.get.get(trackId) as SongRow | undefined;
	}

	function transaction<T>(fn: () => T): T {
		db.exec('BEGIN IMMEDIATE');
		try {
			const result = fn();
			db.exec('COMMIT');
			return result;
		} catch (err) {
			db.exec('ROLLBACK');
			throw err;
		}
	}

	return {
		/** All songs that are not deleted, oldest first. */
		list(): SongDTO[] {
			return (statements.list.all() as unknown as SongRow[]).map(toDTO);
		},

		get(trackId: string): SongDTO | undefined {
			const row = getRow(trackId);
			return row && row.deleted_at === null ? toDTO(row) : undefined;
		},

		/** Songs the guest requested or voted for, newest vote first. */
		forGuest(guestId: string): GuestSongDTO[] {
			return (statements.forGuest.all(guestId) as unknown as SongRow[]).map(toGuestDTO);
		},

		/** The song as the guest sees it, if they voted for it. */
		guestSong(trackId: string, guestId: string): GuestSongDTO | undefined {
			if (!statements.hasVoted.get(trackId, guestId)) return undefined;
			const row = getRow(trackId);
			return row && row.deleted_at === null ? toGuestDTO(row) : undefined;
		},

		hasVoted(trackId: string, guestId: string): boolean {
			return !!statements.hasVoted.get(trackId, guestId);
		},

		/** Played songs, latest first. Names only when `withNames`. */
		timeline(withNames: boolean): TimelineEntry[] {
			return (statements.timeline.all() as unknown as SongRow[]).map((row) => ({
				...toTrack(row),
				playedAt: new Date(row.played_at!).toISOString(),
				...(withNames ? { requesters: JSON.parse(row.requesters) as string[] } : {})
			}));
		},

		/** How each track relates to the existing requests, for the guest's search results. */
		searchStates(tracks: Track[], guestId: string, settings: RequestRules): Map<string, { state: SearchState; votes: number }> {
			const states = new Map<string, { state: SearchState; votes: number }>();
			for (const track of tracks) {
				const row = getRow(track.trackId);
				let state: SearchState = 'new';
				if (row?.deleted_at != null || blockReason(track, settings)) state = 'unavailable';
				else if (row?.status === 'PLAYED') state = 'played';
				else if (row && statements.hasVoted.get(track.trackId, guestId)) state = 'mine';
				else if (row) state = 'requested';
				states.set(track.trackId, { state, votes: row?.deleted_at == null ? (row?.votes ?? 0) : 0 });
			}
			return states;
		},

		/**
		 * A guest requests a track. A track that was already requested gets a vote instead
		 * (idempotent per guest). Played tracks, tracks the DJ deleted and blocked tracks
		 * can't be requested; `rules` come from the event settings.
		 */
		request(track: Track, guest: Guest, rules: RequestRules = OPEN_RULES, now = Date.now()): RequestOutcome {
			const outcome = transaction((): RequestOutcome => {
				if (!rules.requestsOpen) return { ok: false, reason: 'paused' };
				const existing = getRow(track.trackId);
				if (existing?.deleted_at != null) return { ok: false, reason: 'unavailable' };
				if (existing?.status === 'PLAYED') return { ok: false, reason: 'played' };
				if (existing && statements.hasVoted.get(track.trackId, guest.id)) {
					return { ok: true, result: 'already-voted', song: toDTO(existing) };
				}
				const blocked = blockReason(track, rules);
				if (blocked) return { ok: false, reason: blocked };
				if (rules.maxOpenPerGuest > 0) {
					const { n } = statements.openForGuest.get(guest.id) as { n: number };
					if (n >= rules.maxOpenPerGuest) return { ok: false, reason: 'limit' };
				}

				if (!existing) {
					statements.insertSong.run(
						track.trackId,
						track.name,
						track.artists,
						track.image,
						track.explicit ? 1 : 0,
						now
					);
				}
				const voted = statements.insertVote.run(track.trackId, guest.id, guest.name, now).changes > 0;
				const result: RequestResult = !existing ? 'created' : voted ? 'voted' : 'already-voted';
				return { ok: true, result, song: toDTO(getRow(track.trackId)!) };
			});
			if (outcome.ok && outcome.result !== 'already-voted') publish({ type: 'song', song: outcome.song });
			return outcome;
		},

		/** Changes the status and returns the previous one (for undo), or null if the song doesn't exist. */
		setStatus(trackId: string, status: Status, now = Date.now()): { previous: Status } | null {
			const before = getRow(trackId);
			if (!before || before.deleted_at !== null) return null;
			statements.setStatus.run(status, status === 'PLAYED' ? (before.played_at ?? now) : null, trackId);
			publish({ type: 'song', song: toDTO(getRow(trackId)!) });
			return { previous: before.status };
		},

		/** Soft delete: the song disappears but can be restored. Deleted songs can't be requested again. */
		remove(trackId: string, now = Date.now()): boolean {
			if (statements.softDelete.run(now, trackId).changes === 0) return false;
			publish({ type: 'removed', trackId });
			return true;
		},

		restore(trackId: string): boolean {
			if (statements.restore.run(trackId).changes === 0) return false;
			publish({ type: 'song', song: toDTO(getRow(trackId)!) });
			return true;
		}
	};
}

export type SongStore = ReturnType<typeof createSongStore>;
