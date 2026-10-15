import * as v from 'valibot';
import type { SongEvent } from '#lib/server/pubsub.ts';
import type { Database } from '#lib/server/sqlite.ts';
import type { EventSettings, PublicSettings, Track } from '#lib/types.ts';

const entry = v.pipe(v.string(), v.trim(), v.maxLength(100));

/** Every field has a default, so partial or outdated stored settings are always valid. */
export const EventSettingsSchema = v.object({
	requestsOpen: v.optional(v.boolean(), true),
	maxOpenPerGuest: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(50)), 0),
	blockExplicit: v.optional(v.boolean(), false),
	blocklist: v.optional(
		v.pipe(
			v.array(entry),
			v.transform((list) => [...new Set(list.filter(Boolean))]),
			v.maxLength(200)
		),
		[]
	),
	showNames: v.optional(v.boolean(), false),
	showTimeline: v.optional(v.boolean(), true)
});

export const DEFAULT_SETTINGS: EventSettings = v.parse(EventSettingsSchema, {});

export function toPublicSettings(settings: EventSettings): PublicSettings {
	return {
		requestsOpen: settings.requestsOpen,
		maxOpenPerGuest: settings.maxOpenPerGuest,
		showNames: settings.showNames,
		showTimeline: settings.showTimeline
	};
}

/** Why a track can't be requested under the current settings, or null. */
export function blockReason(
	track: Track,
	settings: Pick<EventSettings, 'blockExplicit' | 'blocklist'>
): 'explicit' | 'blocked' | null {
	if (settings.blockExplicit && track.explicit) return 'explicit';
	const haystack = `${track.name}\n${track.artists}`.toLocaleLowerCase();
	if (settings.blocklist.some((term) => haystack.includes(term.toLocaleLowerCase()))) return 'blocked';
	return null;
}

export function createSettingsStore(db: Database, publish: (event: SongEvent) => void) {
	const read = db.prepare("SELECT value FROM settings WHERE key = 'event'");
	const write = db.prepare(
		"INSERT INTO settings (key, value) VALUES ('event', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value"
	);
	let cached: EventSettings | undefined;

	return {
		get(): EventSettings {
			if (cached) return cached;
			const row = read.get() as { value: string } | undefined;
			let stored: unknown = {};
			try {
				stored = row ? JSON.parse(row.value) : {};
			} catch {
				// corrupt value: fall back to the defaults
			}
			const result = v.safeParse(EventSettingsSchema, stored);
			cached = result.success ? result.output : DEFAULT_SETTINGS;
			return cached;
		},

		/** Merges and validates the change; throws a ValiError for invalid values. */
		update(change: Partial<EventSettings>): EventSettings {
			const next = v.parse(EventSettingsSchema, { ...this.get(), ...change });
			write.run(JSON.stringify(next));
			cached = next;
			publish({ type: 'settings', settings: next });
			return next;
		}
	};
}

export type SettingsStore = ReturnType<typeof createSettingsStore>;
