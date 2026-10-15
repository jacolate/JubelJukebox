import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LiveEvents, Track } from '#lib/types.ts';
import { createLiveHub, type Send } from './live.ts';
import { blockReason, createSettingsStore, DEFAULT_SETTINGS } from './settings.ts';
import { createSongStore } from './songs.ts';
import { openDatabase, type Database } from './sqlite.ts';

const AFRICA: Track = { trackId: '2374M0fQpWi3dLnB54qaLX', name: 'Africa', artists: 'TOTO', image: null, explicit: false };
const KILLERS: Track = { trackId: '003vvx7Niy0yvhvHt4a68B', name: 'Mr. Brightside', artists: 'The Killers', image: null, explicit: false };
const EXPLICIT: Track = { trackId: '7KXjTSCq5nL1LoYtL7XAwS', name: 'Explicit Song', artists: 'Someone', image: null, explicit: true };
const SCHLAGER: Track = { trackId: '1cOboCuWaeQXDTtBlQnvnc', name: 'Atemlos durch die Nacht', artists: 'Helene Fischer', image: null, explicit: false };
const anna = { id: 'guest-anna', name: 'Anna' };
const ben = { id: 'guest-ben', name: 'Ben' };

let db: Database;
beforeEach(() => {
	db = openDatabase(':memory:');
});

describe('settings', () => {
	it('starts with defaults and validates updates', () => {
		const publish = vi.fn();
		const store = createSettingsStore(db, publish);
		expect(store.get()).toEqual(DEFAULT_SETTINGS);
		expect(DEFAULT_SETTINGS).toMatchObject({ requestsOpen: true, showNames: false, showTimeline: true, maxOpenPerGuest: 0 });

		const next = store.update({ maxOpenPerGuest: 3, blocklist: [' Helene ', '', 'helene ', 'Helene'] });
		expect(next.maxOpenPerGuest).toBe(3);
		expect(next.blocklist).toEqual(['Helene', 'helene']);
		expect(publish).toHaveBeenCalledWith({ type: 'settings', settings: next });

		expect(() => store.update({ maxOpenPerGuest: -1 })).toThrow();
		expect(() => store.update({ requestsOpen: 'no' as unknown as boolean })).toThrow();
		// persisted
		expect(createSettingsStore(db, () => {}).get().maxOpenPerGuest).toBe(3);
	});

	it('falls back to defaults for corrupt stored values', () => {
		db.prepare("INSERT INTO settings VALUES ('event', '{not json')").run();
		expect(createSettingsStore(db, () => {}).get()).toEqual(DEFAULT_SETTINGS);
	});

	it('blocks explicit tracks and blocklist matches case-insensitively', () => {
		const rules = { blockExplicit: true, blocklist: ['helene fischer'] };
		expect(blockReason(EXPLICIT, rules)).toBe('explicit');
		expect(blockReason(SCHLAGER, rules)).toBe('blocked');
		expect(blockReason(AFRICA, rules)).toBeNull();
		expect(blockReason(EXPLICIT, { blockExplicit: false, blocklist: [] })).toBeNull();
	});
});

describe('request rules', () => {
	const open = { requestsOpen: true, maxOpenPerGuest: 0, blockExplicit: false, blocklist: [] };

	it('rejects everything while paused', () => {
		const store = createSongStore(db, () => {});
		expect(store.request(AFRICA, anna, { ...open, requestsOpen: false })).toEqual({ ok: false, reason: 'paused' });
	});

	it('enforces blocklist and explicit filter, also for votes on existing songs', () => {
		const store = createSongStore(db, () => {});
		store.request(SCHLAGER, anna, open);
		expect(store.request(SCHLAGER, ben, { ...open, blocklist: ['atemlos'] })).toEqual({ ok: false, reason: 'blocked' });
		expect(store.request(EXPLICIT, ben, { ...open, blockExplicit: true })).toEqual({ ok: false, reason: 'explicit' });
	});

	it('limits open requests per guest but allows repeated votes', () => {
		const store = createSongStore(db, () => {});
		const rules = { ...open, maxOpenPerGuest: 1 };
		expect(store.request(AFRICA, anna, rules)).toMatchObject({ ok: true, result: 'created' });
		expect(store.request(KILLERS, anna, rules)).toEqual({ ok: false, reason: 'limit' });
		expect(store.request(AFRICA, anna, rules)).toMatchObject({ ok: true, result: 'already-voted' });
		// once the song is played, the guest may request again
		store.setStatus(AFRICA.trackId, 'PLAYED');
		expect(store.request(KILLERS, anna, rules)).toMatchObject({ ok: true, result: 'created' });
	});
});

describe('guest views', () => {
	it('shows each guest only their own songs, without other names', () => {
		const store = createSongStore(db, () => {});
		store.request(AFRICA, anna);
		store.request(AFRICA, ben);
		store.request(KILLERS, ben);

		expect(store.forGuest(anna.id).map((s) => s.name)).toEqual(['Africa']);
		expect(store.forGuest(ben.id).map((s) => s.name)).toEqual(['Mr. Brightside', 'Africa']);
		expect(JSON.stringify(store.forGuest(anna.id))).not.toContain('Ben');
		expect(store.forGuest(anna.id)[0].votes).toBe(2);
	});

	it('builds the timeline with names only on request', () => {
		const store = createSongStore(db, () => {});
		store.request(AFRICA, anna);
		store.request(KILLERS, ben);
		store.setStatus(AFRICA.trackId, 'PLAYED', 100);
		store.setStatus(KILLERS.trackId, 'PLAYED', 200);

		expect(store.timeline(false).map((e) => e.name)).toEqual(['Mr. Brightside', 'Africa']);
		expect(store.timeline(false)[0]).not.toHaveProperty('requesters');
		expect(store.timeline(true)[0].requesters).toEqual(['Ben']);
	});

	it('marks search results relative to the guest', () => {
		const store = createSongStore(db, () => {});
		store.request(AFRICA, anna);
		store.request(KILLERS, anna);
		store.setStatus(KILLERS.trackId, 'PLAYED');
		const states = store.searchStates([AFRICA, KILLERS, EXPLICIT, SCHLAGER], ben.id, {
			...DEFAULT_SETTINGS,
			blockExplicit: true
		});
		expect(Object.fromEntries(states)).toEqual({
			[AFRICA.trackId]: { state: 'requested', votes: 1 },
			[KILLERS.trackId]: { state: 'played', votes: 1 },
			[EXPLICIT.trackId]: { state: 'unavailable', votes: 0 },
			[SCHLAGER.trackId]: { state: 'new', votes: 0 }
		});
		expect(store.searchStates([AFRICA], anna.id, DEFAULT_SETTINGS).get(AFRICA.trackId)?.state).toBe('mine');
	});
});

describe('live hub', () => {
	function setup() {
		const events: ((e: Parameters<ReturnType<typeof createLiveHub>['dispatch']>[0]) => void)[] = [];
		const publish = (e: Parameters<(typeof events)[number]>[0]) => events.forEach((fn) => fn(e));
		const songs = createSongStore(db, publish);
		const settings = createSettingsStore(db, publish);
		const hub = createLiveHub(() => songs, () => settings);
		events.push(hub.dispatch);
		return { songs, settings, hub };
	}

	function recorder() {
		const received: { name: keyof LiveEvents; data: unknown }[] = [];
		const send: Send = (name, data) => received.push({ name, data });
		return { received, send, names: () => received.map((r) => r.name) };
	}

	it('gives guests only their own songs and no foreign names', () => {
		const { songs, hub } = setup();
		const admin = recorder();
		const annaClient = recorder();
		const benClient = recorder();
		hub.connect('admin', 'admin-id', admin.send);
		hub.connect('guest', anna.id, annaClient.send);
		hub.connect('guest', ben.id, benClient.send);

		songs.request(AFRICA, anna);
		expect(admin.names()).toEqual(['init', 'song']);
		expect(annaClient.names()).toEqual(['guest-init', 'mine']);
		expect(benClient.names()).toEqual(['guest-init']);

		songs.request(AFRICA, ben);
		songs.setStatus(AFRICA.trackId, 'PLAYED');
		const benPayloads = JSON.stringify(benClient.received);
		expect(benPayloads).not.toContain('Anna');
		expect(benClient.names()).toContain('timeline');
		expect(JSON.stringify(admin.received)).toContain('Anna');
	});

	it('resends the timeline with names when the DJ allows them', () => {
		const { songs, settings, hub } = setup();
		songs.request(AFRICA, anna);
		songs.setStatus(AFRICA.trackId, 'PLAYED');
		const guest = recorder();
		hub.connect('guest', ben.id, guest.send);
		expect(JSON.stringify(guest.received)).not.toContain('Anna');

		settings.update({ showNames: true });
		const last = guest.received.at(-1)!;
		expect(last.name).toBe('timeline');
		expect((last.data as LiveEvents['timeline']).timeline?.[0].requesters).toEqual(['Anna']);

		settings.update({ showTimeline: false });
		expect((guest.received.at(-1)!.data as LiveEvents['timeline']).timeline).toBeNull();
		// public settings never contain the blocklist
		settings.update({ blocklist: ['secret term'] });
		expect(JSON.stringify(guest.received)).not.toContain('secret term');
	});

	it('stops sending after disconnect', () => {
		const { songs, hub } = setup();
		const admin = recorder();
		const disconnect = hub.connect('admin', 'a', admin.send);
		disconnect();
		songs.request(AFRICA, anna);
		expect(admin.names()).toEqual(['init']);
		expect(hub.size).toBe(0);
	});
});
