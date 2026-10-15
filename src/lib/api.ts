import type { RejectReason, RequestResult, SearchResult, Status } from '#lib/types.ts';

export class ApiError extends Error {
	constructor(
		readonly status: number,
		message: string,
		/** Set when a song request was rejected. */
		readonly reason?: RejectReason
	) {
		super(message);
	}
}

async function request<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
	const { json, ...rest } = init ?? {};
	const response = await fetch(path, {
		...rest,
		headers: json === undefined ? rest.headers : { 'Content-Type': 'application/json', ...rest.headers },
		body: json === undefined ? rest.body : JSON.stringify(json)
	});
	if (!response.ok) {
		let body: { message?: string; reason?: RejectReason } = {};
		try {
			body = await response.json();
		} catch {
			// not a JSON error body
		}
		throw new ApiError(response.status, body.message ?? response.statusText, body.reason);
	}
	return response.json();
}

/** Typed client for the app's own API. */
export const api = {
	search: (query: string, signal?: AbortSignal) =>
		request<SearchResult[]>(`/api/search?${new URLSearchParams({ q: query })}`, { signal }),

	/** Throws an ApiError with `reason` when the request is rejected. */
	requestSong: (trackId: string) =>
		request<{ result: RequestResult; trackId: string }>('/api/request', { method: 'POST', json: { trackId } }),

	setStatus: (trackId: string, status: Status) =>
		request<{ previous: Status }>(`/api/request/${trackId}`, { method: 'PUT', json: { status } }),

	deleteSong: (trackId: string) => request<unknown>(`/api/request/${trackId}`, { method: 'DELETE' }),

	restoreSong: (trackId: string) => request<unknown>(`/api/request/${trackId}/restore`, { method: 'POST' })
};
