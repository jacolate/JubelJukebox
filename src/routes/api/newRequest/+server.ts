import { json } from '@sveltejs/kit';
import { produce } from 'sveltekit-sse';
import { publish, subscribe } from '$lib/pubsub.js';
import { getSongRequests } from '$lib/songRequests.js';
import { requireAuth } from '$lib/server/authMiddleware';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async (event) => {
  await requireAuth(event); // Check authentication

  let unsubscribeSongRequests;

  try {
    // Ensure getSongRequests fetches the data correctly
    let songRequests = await getSongRequests();

    // Start producing SSE stream
    return produce(async function start({ emit }) {
      // Emit initial song requests
      const { error } = emit('song-requests', JSON.stringify(songRequests));
      if (error) {
        console.error('Error emitting song requests:', error);
        return;
      }

      // Subscribe to updates in song requests
      unsubscribeSongRequests = subscribe('song-requests', (newSongRequest) => {
        emit('song-request-update', JSON.stringify(newSongRequest));
      });

      // Clean up subscription on close
      return () => {
        if (unsubscribeSongRequests) unsubscribeSongRequests();
      };
    });
  } catch (err) {
    console.error('Error in SSE POST handler:', err);
    return json({ error: 'Failed to initiate SSE' }, { status: 500 });
  }
};
