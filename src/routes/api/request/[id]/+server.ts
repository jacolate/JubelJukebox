import { error } from '@sveltejs/kit';
import { apiRequireAdmin } from '#lib/server/auth.ts';
import { readJson } from '#lib/server/http.ts';
import { songRequests } from '#lib/server/services.ts';
import { StatusUpdate } from '#lib/server/validation.ts';
import type { RequestHandler } from './$types';

function requestId(id: string): string {
	if (!/^[a-f0-9]{24}$/i.test(id)) error(400, 'Invalid ID');
	return id.toLowerCase();
}

export const PUT: RequestHandler = async (event) => {
	apiRequireAdmin(event);
	const id = requestId(event.params.id);
	const { status } = await readJson(event.request, StatusUpdate);

	if (!(await songRequests().updateStatus(id, status))) error(404, 'Song request not found');
	return Response.json({ message: 'Song request updated successfully' });
};

export const DELETE: RequestHandler = async (event) => {
	apiRequireAdmin(event);
	const id = requestId(event.params.id);

	if (!(await songRequests().delete(id))) error(404, 'Song request not found');
	return Response.json({ message: 'Song request deleted successfully' });
};
