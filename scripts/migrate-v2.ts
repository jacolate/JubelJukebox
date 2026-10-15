// One-time migration from v1 to v2. Run once against the production database:
//   MONGODB_URI='mongodb://…' node scripts/migrate-v2.ts            (dry run)
//   MONGODB_URI='mongodb://…' node scripts/migrate-v2.ts --apply
//
// - drops the v1 `users` collection (it stored the entry code in plain text)
// - deletes v1 Lucia sessions (they have no `role` and are no longer valid)
// - removes song requests whose URL is not a Spotify track link (possible XSS payloads)
//   and normalizes the remaining ones
import { MongoClient } from 'mongodb';
import { normalizeSpotifyTrackUrl } from '../src/lib/spotifyUrl.ts';

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI is required');
const apply = process.argv.includes('--apply');

const client = await new MongoClient(uri).connect();
try {
	const db = client.db(process.env.MONGODB_DB || 'songRequests');

	const users = await db.listCollections({ name: 'users' }).toArray();
	console.log(`users collection: ${users.length ? 'present → drop' : 'absent'}`);
	if (apply && users.length) await db.collection('users').drop();

	const oldSessions = { role: { $exists: false } };
	console.log(`v1 sessions to delete: ${await db.collection('sessions').countDocuments(oldSessions)}`);
	if (apply) await db.collection('sessions').deleteMany(oldSessions);

	const requests = db.collection('songRequests');
	let removed = 0;
	let normalized = 0;
	for await (const doc of requests.find({})) {
		const url = normalizeSpotifyTrackUrl(doc.song?.url);
		const valid =
			url && typeof doc.song?.name === 'string' && typeof doc.song?.interprete === 'string';
		if (!valid) {
			removed++;
			console.log(`  remove ${doc._id}: invalid song`, JSON.stringify(doc.song)?.slice(0, 200));
			if (apply) await requests.deleteOne({ _id: doc._id });
			continue;
		}
		const status = ['PENDING', 'STASHED', 'PLAYED'].includes(doc.status) ? doc.status : 'PENDING';
		const clean = {
			song: { name: doc.song.name.slice(0, 200), interprete: doc.song.interprete.slice(0, 200), url },
			user: String(doc.user ?? '').slice(0, 40),
			status,
			createdAt: doc.createdAt instanceof Date ? doc.createdAt : doc._id.getTimestamp()
		};
		normalized++;
		if (apply) await requests.replaceOne({ _id: doc._id }, clean);
	}
	console.log(`song requests: ${removed} removed, ${normalized} normalized`);
	console.log(apply ? 'Migration applied.' : 'Dry run – re-run with --apply to change data.');
} finally {
	await client.close();
}
