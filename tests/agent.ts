// A minimal HTTP client with its own cookie jar, acting like one browser (guest or DJ).
import { ADMIN_PASSWORD, ADMIN_USERNAME, ENTRY_CODE } from './env.ts';

interface RequestOptions {
	method?: string;
	json?: unknown;
	form?: Record<string, string | undefined>;
	body?: string;
	headers?: Record<string, string>;
	/** Origin header for non-GET requests; defaults to the app's own origin. */
	origin?: string;
}

export class Agent {
	cookie = '';

	constructor(readonly base: string) {}

	async req(path: string, { method = 'GET', json, form, body, headers = {}, origin = this.base }: RequestOptions = {}) {
		const h: Record<string, string> = { 'x-forwarded-proto': 'http', ...headers };
		if (this.cookie) h.cookie = this.cookie;
		if (method !== 'GET') h.origin = origin;
		if (json !== undefined) {
			h['content-type'] = 'application/json';
			body = JSON.stringify(json);
		}
		if (form) {
			h.accept ??= 'text/html';
			h['content-type'] = 'application/x-www-form-urlencoded';
			const fields = Object.entries(form).filter((entry): entry is [string, string] => entry[1] !== undefined);
			body = new URLSearchParams(fields).toString();
		}
		const response = await fetch(this.base + path, { method, headers: h, body, redirect: 'manual' });
		for (const setCookie of response.headers.getSetCookie()) {
			const [pair] = setCookie.split(';');
			const [name, value] = pair.split('=');
			if (name === 'jj_session') this.cookie = value ? `jj_session=${value}` : '';
		}
		return response;
	}

	/** Reads server-sent events until `predicate` matches the collected text or the timeout hits. */
	async events() {
		const controller = new AbortController();
		const response = await fetch(this.base + '/api/events', {
			headers: { cookie: this.cookie, 'x-forwarded-proto': 'http' },
			signal: controller.signal
		});
		const reader = response.body!.getReader();
		const decoder = new TextDecoder();
		let text = '';
		return {
			response,
			get text() {
				return text;
			},
			async until(needle: string, timeoutMs = 3000) {
				const deadline = Date.now() + timeoutMs;
				while (!text.includes(needle) && Date.now() < deadline) {
					const chunk = await Promise.race([
						reader.read(),
						new Promise<{ done: true; value?: undefined }>((resolve) =>
							setTimeout(() => resolve({ done: true }), Math.max(0, deadline - Date.now()))
						)
					]);
					if (chunk.done) break;
					text += decoder.decode(chunk.value);
				}
				return text.includes(needle);
			},
			close: () => controller.abort()
		};
	}
}

export async function guest(base: string, name: string) {
	const agent = new Agent(base);
	const response = await agent.req('/login', { method: 'POST', form: { username: name, code: ENTRY_CODE } });
	if (response.status !== 303) throw new Error(`guest login failed: ${response.status}`);
	return agent;
}

export async function admin(base: string) {
	const agent = new Agent(base);
	const response = await agent.req('/admin', {
		method: 'POST',
		form: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD }
	});
	if (response.status !== 303) throw new Error(`admin login failed: ${response.status}`);
	return agent;
}

/** Default event settings as submitted by the settings form (checkbox = 'on'). */
export const settingsForm = (overrides: Record<string, string | undefined> = {}) => ({
	requestsOpen: 'on',
	maxOpenPerGuest: '0',
	blocklist: '',
	showTimeline: 'on',
	...overrides
});
