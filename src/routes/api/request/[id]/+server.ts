import { ObjectId } from "mongodb";
import { updateSongRequest, deleteSongRequest } from "$lib/songRequests";
import { requireAuth } from "$lib/server/authMiddleware";
import type { RequestHandler } from '@sveltejs/kit';

export const PUT: RequestHandler = async (event) => {
  await requireAuth(event); // Check authentication

  const { id } = event.params;

  if (!ObjectId.isValid(id)) {
    return new Response(JSON.stringify({ error: "Invalid ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const songRequest = await event.request.json();

    const result = await updateSongRequest(new ObjectId(id), songRequest);

    if (result.matchedCount === 0) {
      return new Response(JSON.stringify({ error: "Song request not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ message: "Song request updated successfully" }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error updating song request:", error);

    return new Response(
      JSON.stringify({ error: "Failed to update song request" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

export const DELETE: RequestHandler = async (event) => {
  await requireAuth(event); // Check authentication

  const { id } = event.params;

  if (!ObjectId.isValid(id)) {
    return new Response(JSON.stringify({ error: "Invalid ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const result = await deleteSongRequest(new ObjectId(id));

    if (result.deletedCount === 0) {
      return new Response(JSON.stringify({ error: "Song request not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ message: "Song request deleted successfully" }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error deleting song request:", error);

    return new Response(
      JSON.stringify({ error: "Failed to delete song request" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
