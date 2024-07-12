import { connect } from '$lib/db.js';
import { produce } from 'sveltekit-sse'


export async function GET() {
    try {
        const db = await connect();
        const songRequestsCollection = db.collection('songRequests');
        const songRequests = await songRequestsCollection.find({}).toArray();

        return new Response(JSON.stringify(songRequests), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error fetching song requests:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch song requests' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function POST({ request }) {

    try {
        const songRequest = await request.json();
        const db = await connect();
        const result = await db.collection('songRequests').insertOne(songRequest);
      
        return new Response(JSON.stringify({ message: 'Song request received successfully', id: result.insertedId }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error processing song request:', error);
        return new Response(JSON.stringify({ error: 'Failed to process song request' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
