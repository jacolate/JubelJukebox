// src/routes/api/request/+server.js

export async function GET() {
    // Handle GET request
    const data = { message: 'Hello from the server!' };
    return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
});
}

export async function POST({ request }) {
    try {
    const songRequest = await request.json();

    // Process the song request (e.g., save to database, perform some action)
    console.log('Received song request:', songRequest);

    // Respond with a success message or data
    return new Response(JSON.stringify({ message: 'Song request received successfully' }), {
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

