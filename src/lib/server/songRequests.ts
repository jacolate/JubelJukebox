import { ObjectId, type Collection } from 'mongodb';
import type { SongRequestDTO } from '#lib/types.ts';
import type { SongRequestEvent } from '#lib/server/pubsub.ts';
import type { SongRequestInput, Status } from '#lib/server/validation.ts';

export interface SongRequestDoc {
	_id: ObjectId;
	song: SongRequestInput['song'];
	user: string;
	status: Status;
	createdAt: Date;
}

function toDTO(doc: SongRequestDoc): SongRequestDTO {
	return {
		_id: doc._id.toHexString(),
		song: { name: doc.song.name, interprete: doc.song.interprete, url: doc.song.url },
		user: doc.user,
		status: doc.status,
		createdAt: (doc.createdAt ?? doc._id.getTimestamp()).toISOString()
	};
}

export function createSongRequestStore(
	collection: Collection<SongRequestDoc>,
	publish: (event: SongRequestEvent) => void
) {
	return {
		async list(): Promise<SongRequestDTO[]> {
			const docs = await collection.find({}).sort({ _id: 1 }).toArray();
			return docs.map(toDTO);
		},

		async create(input: SongRequestInput, user: string): Promise<SongRequestDTO> {
			const doc: SongRequestDoc = {
				_id: new ObjectId(),
				song: input.song,
				user,
				status: 'PENDING',
				createdAt: new Date()
			};
			await collection.insertOne(doc);
			const request = toDTO(doc);
			publish({ type: 'created', request });
			return request;
		},

		/** Returns false if no request with that id exists. */
		async updateStatus(id: string, status: Status): Promise<boolean> {
			const _id = new ObjectId(id);
			const result = await collection.updateOne({ _id }, { $set: { status } });
			if (result.matchedCount === 0) return false;
			publish({ type: 'updated', id, status });
			return true;
		},

		/** Returns false if no request with that id exists. */
		async delete(id: string): Promise<boolean> {
			const result = await collection.deleteOne({ _id: new ObjectId(id) });
			if (result.deletedCount === 0) return false;
			publish({ type: 'deleted', id });
			return true;
		}
	};
}

export type SongRequestStore = ReturnType<typeof createSongRequestStore>;
