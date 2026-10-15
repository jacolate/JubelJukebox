import { apiRequireAdmin } from '#lib/server/auth.ts';
import { collections } from '#lib/server/db.ts';
import { subscribe, type SongRequestEvent } from '#lib/server/pubsub.ts';
import { songRequests } from '#lib/server/services.ts';
import type { RequestHandler } from './$types';

const HEARTBEAT_MS = 25_000;

/**
 * Server-sent events for the DJ dashboard.
 * Sends the full list as `init` on every (re)connect, followed by `created` / `updated` / `deleted` events.
 */
export const GET: RequestHandler = async (event) => {
	const session = apiRequireAdmin(event);
	const encoder = new TextEncoder();
	let cleanup = () => {};

	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			let closed = false;
			const send = (chunk: string) => {
				if (!closed) controller.enqueue(encoder.encode(chunk));
			};
			const sendEvent = (name: string, data: unknown) => send(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);

			// Subscribe before loading the list so no change can slip through in between.
			const buffered: SongRequestEvent[] = [];
			let live = false;
			const unsubscribe = subscribe((change) => {
				if (live) sendEvent(change.type, change);
				else buffered.push(change);
			});

			const heartbeat = setInterval(async () => {
				// Close the stream once the admin session has ended (logout or expiry).
				const stillValid = await collections
					.sessions()
					.countDocuments({ _id: session.id, expiresAt: { $gt: new Date() } }, { limit: 1 })
					.catch(() => 1);
				if (!stillValid) return close();
				send(': ping\n\n');
			}, HEARTBEAT_MS);

			function close() {
				if (closed) return;
				closed = true;
				clearInterval(heartbeat);
				unsubscribe();
				try {
					controller.close();
				} catch {
					// already closed by the client
				}
			}
			cleanup = close;
			event.request.signal.addEventListener('abort', close);

			try {
				sendEvent('init', await songRequests().list());
				for (const change of buffered) sendEvent(change.type, change);
				live = true;
			} catch (err) {
				console.error('Failed to load song requests for event stream:', err);
				close();
			}
		},
		cancel() {
			cleanup();
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-store',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no'
		}
	});
};
