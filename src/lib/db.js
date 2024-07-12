import { MongoClient } from 'mongodb';

const url = process.env.MONGO_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'admin';
const client = new MongoClient(url);

export async function connect() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        return client.db(dbName);
    } catch (error) {
        console.error('Failed to connect to MongoDB', error);
        throw error;
    }
}