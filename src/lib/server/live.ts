import type { SongEvent } from '#lib/server/pubsub.ts';
import type { Role } from '#lib/server/session.ts';
import { toPublicSettings, type SettingsStore } from '#lib/server/settings.ts';
import type { SongStore } from '#lib/server/songs.ts';
import type { GuestSongDTO, LiveEvents, SongDTO } from '#lib/types.ts';

export type Send = <K extends keyof LiveEvents>(name: K, data: LiveEvents[K]) => void;

interface Connection {
	role: Role;
	guestId: string;
	send: Send;
}

function toGuestSong({ requesters: _r, createdAt: _c, ...song }: SongDTO): GuestSongDTO {
	return song;
}

/**
 * Fans domain events out to the connected clients. Admins see everything; guests only get
 * their own songs, the public timeline (names only if the DJ allows) and the public settings.
 */
export function createLiveHub(songs: () => SongStore, settings: () => SettingsStore) {
	const connections = new Set<Connection>();
	let lastTimeline: string | undefined;

	function timeline() {
		const current = settings().get();
		return current.showTimeline ? songs().timeline(current.showNames) : null;
	}

	function broadcastTimeline(guests: Connection[], force = false) {
		const entries = timeline();
		const json = JSON.stringify(entries);
		if (!force && json === lastTimeline) return;
		lastTimeline = json;
		for (const connection of guests) connection.send('timeline', { timeline: entries });
	}

	function dispatch(event: SongEvent) {
		const admins = [...connections].filter((c) => c.role === 'admin');
		const guests = [...connections].filter((c) => c.role === 'guest');

		if (event.type === 'settings') {
			for (const admin of admins) admin.send('settings', { settings: event.settings });
			const publicSettings = toPublicSettings(event.settings);
			for (const guest of guests) guest.send('public-settings', { settings: publicSettings });
			broadcastTimeline(guests, true);
			return;
		}

		if (event.type === 'song') {
			for (const admin of admins) admin.send('song', { song: event.song });
			const mine = toGuestSong(event.song);
			for (const guest of guests) {
				if (songs().hasVoted(event.song.trackId, guest.guestId)) guest.send('mine', { song: mine });
			}
		} else {
			for (const admin of admins) admin.send('removed', { trackId: event.trackId });
			for (const guest of guests) {
				if (songs().hasVoted(event.trackId, guest.guestId)) guest.send('mine-removed', { trackId: event.trackId });
			}
		}
		if (guests.length > 0) broadcastTimeline(guests);
	}

	return {
		dispatch,

		/** Registers a client and sends its initial snapshot. Returns the unregister function. */
		connect(role: Role, guestId: string, send: Send): () => void {
			const connection: Connection = { role, guestId, send };
			if (role === 'admin') {
				send('init', { songs: songs().list(), settings: settings().get() });
			} else {
				const entries = timeline();
				lastTimeline ??= JSON.stringify(entries);
				send('guest-init', {
					mine: songs().forGuest(guestId),
					timeline: entries,
					settings: toPublicSettings(settings().get())
				});
			}
			connections.add(connection);
			return () => connections.delete(connection);
		},

		get size() {
			return connections.size;
		}
	};
}

export type LiveHub = ReturnType<typeof createLiveHub>;
