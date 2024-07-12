import {ObjectId} from "mongodb";
import {connect} from "$lib/db.js";

export async function PUT({ params, request }) {
    const { id } = params;

    if (!ObjectId.isValid(id)) {
        return new Response(JSON.stringify({ error: 'Invalid ID' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // Connect to the database
        const db = await connect();

        // Parse the request body
        const songRequest = await request.json();

        // Update the song request in the collection
        const result = await db.collection('songRequests').updateOne(
            { _id: new ObjectId(id) },
            { $set: { status: songRequest.status } } // Update only the status field
        );

        if (result.matchedCount === 0) {
            return new Response(JSON.stringify({ error: 'Song request not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Respond with a success message
        return new Response(JSON.stringify({ message: 'Song request updated successfully' }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error updating song request:', error);

        return new Response(JSON.stringify({ error: 'Failed to update song request' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

}

export async function DELETE({ params }) {
    const { id } = params;

    if (!ObjectId.isValid(id)) {
        return new Response(JSON.stringify({ error: 'Invalid ID' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // Connect to the database
        const db = await connect();

        // Delete the song request from the collection
        const result = await db.collection('songRequests').deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return new Response(JSON.stringify({ error: 'Song request not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Respond with a success message
        return new Response(JSON.stringify({ message: 'Song request deleted successfully' }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error deleting song request:', error);

        return new Response(JSON.stringify({ error: 'Failed to delete song request' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}