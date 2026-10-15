import { EventEmitter } from 'node:events';
import type { SongRequestDTO } from '#lib/types.ts';
import type { Status } from '#lib/server/validation.ts';

export type SongRequestEvent =
	| { type: 'created'; request: SongRequestDTO }
	| { type: 'updated'; id: string; status: Status }
	| { type: 'deleted'; id: string };

// In-process event bus: works because the app runs as a single instance (see README).
const emitter = new EventEmitter();
emitter.setMaxListeners(1000);

export function publish(event: SongRequestEvent) {
	emitter.emit('song-request', event);
}

export function subscribe(listener: (event: SongRequestEvent) => void): () => void {
	emitter.on('song-request', listener);
	return () => emitter.off('song-request', listener);
}
