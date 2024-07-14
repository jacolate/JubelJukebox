import { MongoClient, ObjectId } from "mongodb";
import { publish } from "./pubsub";

const url = process.env.MONGO_URI || "mongodb://localhost:27017";
const dbName = process.env.DB_NAME || "admin";

let dbInstance = null;

async function connectToDB() {
  if (dbInstance) {
    return dbInstance;
  }

  const client = new MongoClient(url);

  try {
    await client.connect();
    console.log("Connected to MongoDB");
    dbInstance = client.db(dbName);
    return dbInstance;
  } catch (error) {
    console.error("Failed to connect to MongoDB", error);
    throw error;
  }
}

const db = await connectToDB(); // Ensure that db is initialized after connection

export async function addSongRequest(songRequest) {
  try {
    const db = await connectToDB();
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
    const db = await connectToDB();
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
    const db = await connectToDB();
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
    const db = await connectToDB();
    const deletedRequest = await db.collection("songRequests").deleteOne({ _id: new ObjectId(id) });
    return deletedRequest;
  } catch (error) {
    console.error("Failed to delete song request", error);
    throw error;
  }
}
