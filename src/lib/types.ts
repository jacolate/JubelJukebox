export interface Song {
	name: string;
	interprete: string;
	url: string;
}

export interface SongRequestDTO {
	id: string;
	song: Song;
	user: string;
	status: 'PENDING' | 'STASHED' | 'PLAYED';
	createdAt: string;
}
