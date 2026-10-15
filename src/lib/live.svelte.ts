import type { LiveEvents } from '#lib/types.ts';

type Handlers = { [K in keyof LiveEvents]?: (data: LiveEvents[K]) => void };

/**
 * Subscribes to the server-sent events at /api/events.
 * The browser reconnects automatically; the server resends `init` on every reconnect.
 * Call inside onMount / $effect and return `close` for cleanup.
 */
export function connectLive(handlers: Handlers, { onClosed }: { onClosed?: () => void } = {}) {
	const source = new EventSource('/api/events');
	const state = $state({ connected: false });

	source.addEventListener('open', () => (state.connected = true));
	source.addEventListener('error', () => {
		state.connected = false;
		// A CLOSED stream will not be retried by the browser, e.g. after the session ended.
		if (source.readyState === EventSource.CLOSED) onClosed?.();
	});

	for (const name of Object.keys(handlers) as (keyof LiveEvents)[]) {
		source.addEventListener(name, (event) => {
			(handlers[name] as (data: unknown) => void)(JSON.parse((event as MessageEvent).data));
		});
	}

	return {
		get connected() {
			return state.connected;
		},
		close: () => source.close()
	};
}
