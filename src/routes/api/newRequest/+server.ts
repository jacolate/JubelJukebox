import { json } from "@sveltejs/kit";
import { produce } from "sveltekit-sse";
import { publish, subscribe } from "$lib/pubsub.js";
import { get, type Unsubscriber } from "svelte/store";
import { getSongRequests } from "$lib/songRequests.js";

// SSE function to stream back user list and new messages
export async function POST({ url }) {
  let unsubscribeSongRequests: Unsubscriber;

  try {
    // Ensure getSongRequests fetches the data correctly
    let songRequests = await getSongRequests();
    console.log(songRequests);

    // Start producing SSE stream
    return produce(async function start({ emit }) {
      // Emit initial song requests
      const { error } = emit('song-requests', JSON.stringify(songRequests));
      if (error) {
        console.error("Error emitting song requests:", error);
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
    console.error("Error in SSE POST handler:", err);
    return json({ error: 'Failed to initiate SSE' }, { status: 500 });
  }
}
