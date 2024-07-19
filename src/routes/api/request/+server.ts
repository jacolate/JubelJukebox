import { produce } from 'sveltekit-sse';
import { addSongRequest, getSongRequests } from '$lib/songRequests';
import { requireAuth } from '$lib/server/authMiddleware';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async (event) => {
	try {
		await requireAuth(event); // Check authentication

		const songRequests = await getSongRequests();

		return new Response(JSON.stringify(songRequests), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.error('Error fetching song requests:', error);
		return new Response(
			JSON.stringify({ error: 'Failed to fetch song requests' }),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	}
};

export const POST: RequestHandler = async (event) => {
	try {
		await requireAuth(event); // Check authentication

		const songRequest = await event.request.json();
		const result = await addSongRequest(songRequest);

		return new Response(
			JSON.stringify({
				message: 'Song request received successfully',
				id: result.insertedId,
			}),
			{
				headers: { 'Content-Type': 'application/json' },
			}
		);
	} catch (error) {
		console.error('Error processing song request:', error);
		return new Response(
			JSON.stringify({ error: 'Failed to process song request' }),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	}
};
