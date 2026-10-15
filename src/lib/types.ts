export type Status = 'PENDING' | 'STASHED' | 'PLAYED';

/** A track as returned by the search and stored with a song. */
export interface Track {
	trackId: string;
	name: string;
	artists: string;
	/** https://i.scdn.co/… or null */
	image: string | null;
	explicit: boolean;
}

/** A requested song as the DJ sees it. */
export interface SongDTO extends Track {
	status: Status;
	createdAt: string;
	playedAt: string | null;
	votes: number;
	/** Names of everyone who requested the song, first requester first. */
	requesters: string[];
}

/** A song the guest requested or voted for. Contains no names of other guests. */
export interface GuestSongDTO extends Track {
	status: Status;
	votes: number;
	playedAt: string | null;
}

/** An entry of the public "played" timeline. `requesters` only when the DJ allows names. */
export interface TimelineEntry extends Track {
	playedAt: string;
	requesters?: string[];
}

/** How a search result relates to the event's requests, from the guest's point of view. */
export type SearchState = 'new' | 'requested' | 'mine' | 'played' | 'unavailable';

export interface SearchResult extends Track {
	state: SearchState;
	votes: number;
}

export interface TabItem {
	key: string;
	label: string;
	href: string;
	count?: number;
}

/** Tabs on the guest page, kept in ?tab= */
export type GuestTab = 'search' | 'mine' | 'played';

/** Result of a song request: a new song, a vote for an existing one, or a repeated vote. */
export type RequestResult = 'created' | 'voted' | 'already-voted';

/** Why a request was rejected. */
export type RejectReason = 'paused' | 'played' | 'unavailable' | 'blocked' | 'explicit' | 'limit';

export interface EventSettings {
	/** false pauses all requests */
	requestsOpen: boolean;
	/** maximum PENDING songs per guest, 0 = unlimited */
	maxOpenPerGuest: number;
	blockExplicit: boolean;
	/** case-insensitive terms matched against title and artists */
	blocklist: string[];
	showNames: boolean;
	showTimeline: boolean;
}

/** The part of the settings guests may see. */
export type PublicSettings = Pick<EventSettings, 'requestsOpen' | 'maxOpenPerGuest' | 'showNames' | 'showTimeline'>;

/** Server-sent events on /api/events, by event name. Admins and guests get different events. */
export interface LiveEvents {
	// admin
	init: { songs: SongDTO[]; settings: EventSettings };
	song: { song: SongDTO };
	removed: { trackId: string };
	settings: { settings: EventSettings };
	// guest
	'guest-init': { mine: GuestSongDTO[]; timeline: TimelineEntry[] | null; settings: PublicSettings };
	mine: { song: GuestSongDTO };
	'mine-removed': { trackId: string };
	timeline: { timeline: TimelineEntry[] | null };
	'public-settings': { settings: PublicSettings };
}
