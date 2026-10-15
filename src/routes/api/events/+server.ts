import { apiRequireUser } from '#lib/server/auth.ts';
import { getDb } from '#lib/server/db.ts';
import type { Send } from '#lib/server/live.ts';
import { live } from '#lib/server/services.ts';
import { isSessionActive } from '#lib/server/session.ts';
import type { RequestHandler } from './$types';

const HEARTBEAT_MS = 25_000;

/**
 * Server-sent events for admins and guests (see LiveEvents in #lib/types.ts).
 * Every (re)connect starts with a snapshot (`init` / `guest-init`), followed by changes.
 */
export const GET: RequestHandler = (event) => {
	const session = apiRequireUser(event);
	const encoder = new TextEncoder();
	let cleanup = () => {};

	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			let closed = false;
			const write = (chunk: string) => {
				if (!closed) controller.enqueue(encoder.encode(chunk));
			};
			const send: Send = (name, data) => write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);

			// Database access is synchronous, so no change can slip in between snapshot and registration.
			const disconnect = live.connect(session.role, session.guestId, send);

			const heartbeat = setInterval(() => {
				// Close the stream once the session has ended (logout or expiry).
				if (!isSessionActive(getDb(), session.id)) return close();
				write(': ping\n\n');
			}, HEARTBEAT_MS);

			function close() {
				if (closed) return;
				closed = true;
				clearInterval(heartbeat);
				disconnect();
				try {
					controller.close();
				} catch {
					// already closed by the client
				}
			}
			cleanup = close;
			event.request.signal.addEventListener('abort', close);
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
