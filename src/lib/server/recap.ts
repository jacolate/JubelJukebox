import type { Database } from '#lib/server/sqlite.ts';
import type { SongDTO } from '#lib/types.ts';

export interface Recap {
	songs: number;
	played: number;
	votes: number;
	guests: number;
	topArtists: { name: string; count: number }[];
	topSongs: SongDTO[];
	topGuests: { name: string; count: number }[];
	firstRequestAt: string | null;
	lastPlayedAt: string | null;
}

/** Statistics for the end-of-event recap. `songs` are the non-deleted songs. */
export function buildRecap(db: Database, songs: SongDTO[]): Recap {
	const played = songs.filter((s) => s.status === 'PLAYED');

	const artistCounts = new Map<string, number>();
	for (const song of songs) {
		for (const artist of song.artists.split(', ').filter(Boolean)) {
			artistCounts.set(artist, (artistCounts.get(artist) ?? 0) + song.votes);
		}
	}

	const { guests } = db
		.prepare(
			`SELECT count(DISTINCT v.guest_id) AS guests FROM votes v
			 JOIN songs s ON s.track_id = v.track_id WHERE s.deleted_at IS NULL`
		)
		.get() as { guests: number };
	const topGuests = db
		.prepare(
			`SELECT v.guest_name AS name, count(*) AS count FROM votes v
			 JOIN songs s ON s.track_id = v.track_id WHERE s.deleted_at IS NULL
			 GROUP BY v.guest_id ORDER BY count DESC, min(v.created_at) LIMIT 5`
		)
		.all() as unknown as { name: string; count: number }[];

	const times = (list: string[]) => list.sort();
	return {
		songs: songs.length,
		played: played.length,
		votes: songs.reduce((sum, s) => sum + s.votes, 0),
		guests,
		topArtists: [...artistCounts]
			.map(([name, count]) => ({ name, count }))
			.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
			.slice(0, 5),
		topSongs: songs
			.filter((s) => s.votes > 1)
			.sort((a, b) => b.votes - a.votes || a.createdAt.localeCompare(b.createdAt))
			.slice(0, 5),
		topGuests,
		firstRequestAt: times(songs.map((s) => s.createdAt))[0] ?? null,
		lastPlayedAt: times(played.map((s) => s.playedAt!)).at(-1) ?? null
	};
}

/** Prevents spreadsheet formula injection (=, +, -, @ …) and quotes where needed. */
export function csvCell(value: string | number | null): string {
	let text = value === null ? '' : String(value);
	if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
	return /[;"\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export interface CsvLabels {
	header: string[];
	status: Record<SongDTO['status'], string>;
}

/** Semicolon-separated CSV with BOM, so German Excel opens it correctly. */
export function songsToCsv(songs: SongDTO[], formatTime: (iso: string | null) => string, labels: CsvLabels): string {
	const header = [...labels.header, 'Spotify'];
	const rows = songs.map((s) => [
		s.name,
		s.artists,
		labels.status[s.status],
		s.votes,
		s.requesters.join(', '),
		formatTime(s.createdAt),
		formatTime(s.playedAt),
		`https://open.spotify.com/track/${s.trackId}`
	]);
	return '﻿' + [header, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n') + '\r\n';
}
