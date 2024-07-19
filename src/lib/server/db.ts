import { MongoClient, Db } from 'mongodb';

let client: MongoClient;
let dbb: Db;

const dbUrl = process.env.MONGODB_HOST || "localhost:27017";
const dbUser = process.env.MONGODB_USERNAME || "admin";
const dbPassword = process.env.MONGODB_PASSWORD || "admin";
const NODE_ENV = process.env.NODE_ENV || "development";

const dbURI = NODE_ENV === "development"
    ? `mongodb://localhost:27017`
    : `mongodb://${dbUser}:${dbPassword}@${dbUrl}`;

const connectToDatabase = async (): Promise<Db> => {
    console.log("Connecting to MongoDB:", dbURI);
    if (NODE_ENV !== "build") {
        if (!client) {
            client = new MongoClient(dbURI);

            await client.connect();
            dbb = client.db("songRequests"); // Use your database name
        }
    }

    return dbb;
};

// Lazy loading database connection
let dbPromise: Promise<Db> | null = null;

export const getDb = (): Promise<Db> => {
    if (!dbPromise) {
        dbPromise = connectToDatabase();
    }
    return dbPromise;
};
