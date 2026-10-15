import * as v from 'valibot';
import { normalizeSpotifyTrackUrl } from '#lib/spotifyUrl.ts';

export const STATUSES = ['PENDING', 'STASHED', 'PLAYED'] as const;
export type Status = (typeof STATUSES)[number];

// Letters, numbers, punctuation, symbols and spaces – no control or formatting characters.
const PRINTABLE = /^[^\p{C}]*$/u;

const text = (max: number) =>
	v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(max), v.regex(PRINTABLE));

export const Username = text(40);

export const SpotifyTrackUrl = v.pipe(
	v.string(),
	v.check((url) => normalizeSpotifyTrackUrl(url) !== null, 'Invalid Spotify track URL'),
	v.transform((url) => normalizeSpotifyTrackUrl(url) as string)
);

/** Unknown keys (e.g. `user`, `status`) are stripped – the server sets them itself. */
export const SongRequestInput = v.object({
	song: v.object({
		name: text(200),
		interprete: text(200),
		url: SpotifyTrackUrl
	})
});
export type SongRequestInput = v.InferOutput<typeof SongRequestInput>;

export const StatusUpdate = v.object({
	status: v.picklist(STATUSES)
});

export const SearchQuery = text(100);
