import { error } from '@sveltejs/kit';
import * as v from 'valibot';

/** Reads a small JSON body and validates it against a schema. */
export async function readJson<S extends v.GenericSchema>(
	request: Request,
	schema: S,
	maxBytes = 4096
): Promise<v.InferOutput<S>> {
	if (!request.headers.get('content-type')?.startsWith('application/json')) {
		error(415, 'Expected application/json');
	}
	const declared = Number(request.headers.get('content-length') ?? 0);
	if (declared > maxBytes) error(413, 'Payload too large');

	const text = await request.text();
	if (Buffer.byteLength(text) > maxBytes) error(413, 'Payload too large');

	let data: unknown;
	try {
		data = JSON.parse(text);
	} catch {
		error(400, 'Invalid JSON');
	}
	const result = v.safeParse(schema, data);
	if (!result.success) error(400, 'Invalid request');
	return result.output;
}

export function tooManyRequests(retryAfterSeconds: number): never {
	error(429, `Too many requests, retry in ${retryAfterSeconds}s`);
}
