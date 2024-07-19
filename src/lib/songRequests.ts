import { MongoClient } from "mongodb";
import { publish } from "./pubsub";
import { db } from "$lib/server/db";


export async function addSongRequest(songRequest) {
    try {
        const result = await db.collection("songRequests").insertOne(songRequest);
        console.log("Song request added:", result.insertedId);

        publish("song-requests", songRequest);

        return result;
    } catch (error) {
        console.error("Failed to add song request", error);
        throw error;
    }
}

export async function getSongRequests() {
    try {
        const songRequests = await db.collection("songRequests").find({}).toArray();
        console.log("Retrieved all song requests");
        return songRequests;
    } catch (error) {
        console.error("Failed to retrieve all song request", error);
        throw error;
    }
}

export async function updateSongRequest(id, songRequest) {
    try {
        const updatedRequest = await db.collection("songRequests").updateOne(
            { _id: id },
            { $set: { status: songRequest.status } } // Update only the status field
        );
        return updatedRequest;
    } catch (error) {
        console.error("Failed to update song request", error);
        throw error;
    }
}

export async function deleteSongRequest(id) {
    try {
        const deletedRequest = await db.collection("songRequests").deleteOne({ _id: id });
        return deletedRequest;
    } catch (error) {
        console.error("Failed to delete song request", error);
        throw error;
    }
}
