import { produce } from "sveltekit-sse";
import { addSongRequest, getSongRequests } from "$lib/songRequests.ts";

export async function GET() {
  try {
    const songRequests = await getSongRequests();

    return new Response(JSON.stringify(songRequests), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching song requests:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch song requests" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function POST({ request }) {
  try {
    const songRequest = await request.json();

    const result = await addSongRequest(songRequest);

    return new Response(
      JSON.stringify({
        message: "Song request received successfully",
        id: result.insertedId,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing song request:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process song request" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
