/**
 * Typed access to the generated catalog.
 *
 * src/data/catalog.json is produced by scripts/build-catalog.mjs from the MP3s
 * in ~/Dropbox/Uploads and committed to git — Cloudflare's build machine has no
 * Dropbox access, so it cannot be generated at deploy time.
 */

import catalogData from "../data/catalog.json";
import type { ChoraleTrack } from "./chorale";

export interface Tuning {
	label: string;
	short: string;
	description: string;
}

export interface Album {
	id: string;
	title: string;
	date: string;
	tuning: string;
	blurb: string;
	featured?: boolean;
	trackCount: number;
	tracks: ChoraleTrack[];
}

const catalog = catalogData as unknown as {
	tunings: Record<string, Tuning>;
	albums: Album[];
};

/** Albums, newest first. */
export const albums: Album[] = [...catalog.albums].sort((a, b) =>
	b.date.localeCompare(a.date),
);

export const tunings: Record<string, Tuning> = catalog.tunings;

export function getAlbum(id: string): Album | undefined {
	return albums.find((a) => a.id === id);
}

export function tuningOf(album: Album): Tuning {
	return (
		tunings[album.tuning] ?? {
			label: album.tuning,
			short: album.tuning,
			description: "",
		}
	);
}

/** The album the daily post draws from — flagged `featured` in albums.json. */
export const featuredAlbum: Album = albums.find((a) => a.featured) ?? albums[0];

/**
 * Every recording of one chorale, newest first — the basis of the
 * "same chorale, different tunings" comparison.
 */
export function recordingsOf(
	bwv: string,
): Array<{ album: Album; track: ChoraleTrack }> {
	return albums.flatMap((album) =>
		album.tracks
			.filter((track) => track.bwv === bwv)
			.map((track) => ({ album, track })),
	);
}

/** Distinct BWV numbers across the whole catalog, ascending. */
export const allBwv: string[] = [
	...new Set(albums.flatMap((a) => a.tracks.map((t) => t.bwv))),
].sort();
