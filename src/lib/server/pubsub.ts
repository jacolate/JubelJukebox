import { EventEmitter } from 'node:events';
import type { EventSettings, SongDTO } from '#lib/types.ts';

/** Domain events; /api/events turns them into what each client role may see. */
export type SongEvent =
	| { type: 'song'; song: SongDTO }
	| { type: 'removed'; trackId: string }
	| { type: 'settings'; settings: EventSettings };

// In-process event bus: works because the app runs as a single instance (see README).
const emitter = new EventEmitter();
emitter.setMaxListeners(1000);

export function publish(event: SongEvent) {
	emitter.emit('song', event);
}

export function subscribe(listener: (event: SongEvent) => void): () => void {
	emitter.on('song', listener);
	return () => emitter.off('song', listener);
}
