import * as v from 'valibot';
import { isTrackId } from '#lib/spotify.ts';

export const STATUSES = ['PENDING', 'STASHED', 'PLAYED'] as const;
export type Status = (typeof STATUSES)[number];

// Letters, numbers, punctuation, symbols and spaces – no control or formatting characters.
const PRINTABLE = /^[^\p{C}]*$/u;

const text = (max: number) =>
	v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(max), v.regex(PRINTABLE));

export const Username = text(40);

export const TrackId = v.pipe(v.string(), v.check((id: string) => isTrackId(id), 'Invalid track id'));

/** Guests only send the track id; title, artists and cover come from Spotify on the server. */
export const SongRequestInput = v.object({
	trackId: TrackId
});

export const StatusUpdate = v.object({
	status: v.picklist(STATUSES)
});

export const SearchQuery = text(100);
