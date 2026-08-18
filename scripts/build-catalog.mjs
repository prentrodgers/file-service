#!/usr/bin/env node
/**
 * Generates src/data/catalog.json from the MP3s in ~/Dropbox/Uploads.
 *
 * Why this is a build step and not done at render time: Cloudflare's build
 * machine has no access to Dropbox. The generated catalog is committed to git,
 * so the site builds anywhere. Re-run this (via scripts/publish-album.sh) after
 * adding an album.
 *
 * Usage:  node scripts/build-catalog.mjs [--uploads <dir>]
 */

import { readdirSync, statSync, writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ALBUMS_FILE = join(ROOT, "src/data/albums.json");
const OUT_FILE = join(ROOT, "src/data/catalog.json");

const argIdx = process.argv.indexOf("--uploads");
const UPLOADS =
	argIdx !== -1 ? process.argv[argIdx + 1] : join(homedir(), "Dropbox/Uploads");

// Mirrors FILENAME_RE in src/lib/chorale.ts and daily_chorale_tweet.py.
const FILENAME_RE =
	/^ball9-t(\d{2,3})(\w?)_lm(\d+)_r([\d.]+)_(?:sf[\d.]+_)?(md|df)(\d+)_(?:sp\d+_)?t(\d+)_d(\d+)_(\d+)_t(\d+)\.mp3$/;

const BWV_TITLES = {
	253: "Ach bleib bei uns, Herr Jesu Christ",
	254: "Ach Gott, erhör mein Seufzen und Wehklagen",
	255: "Ach Gott und Herr, wie groß und schwer",
	256: "Ach lieben Christen, seid getrost",
	257: "Wär Gott nicht mit uns diese Zeit",
	258: "Wo Gott der Herr nicht bei uns hält",
	259: "Ach, was soll ich Sünder machen",
	260: "Allein Gott in der Höh sei Ehr",
	261: "Allein zu dir, Herr Jesu Christ",
	262: "Alle Menschen müssen sterben",
	263: "Alles ist an Gottes Segen",
	264: "Als der gütige Gott",
};

function parse(file) {
	const m = FILENAME_RE.exec(file);
	if (!m) return null;
	const [, track, variant, limit, ratio, dKind, dVal, tol, min, sec, tempo] = m;
	const bwv = `2${track}`;
	const minutes = Number(min);
	const seconds = Number(sec);
	return {
		file,
		bwv,
		title: BWV_TITLES[bwv] ?? "Bach Chorale",
		variant,
		limit: Number(limit),
		ratio: Number(ratio),
		detail: { kind: dKind === "df" ? "density" : "maxDelta", value: Number(dVal) },
		tolerance: Number(tol),
		duration: `${minutes}:${String(seconds).padStart(2, "0")}`,
		durationSeconds: minutes * 60 + seconds,
		tempo: Number(tempo),
	};
}

const meta = JSON.parse(readFileSync(ALBUMS_FILE, "utf8"));
const albums = [];
let skipped = 0;

for (const album of meta.albums) {
	const dir = join(UPLOADS, album.dir);
	let entries;
	try {
		if (!statSync(dir).isDirectory()) throw new Error("not a directory");
		entries = readdirSync(dir);
	} catch {
		// Missing directory is a warning, not a failure — an album may live on
		// another node, and we still want the rest of the catalog to build.
		console.warn(`! skipping ${album.id}: cannot read ${dir}`);
		skipped++;
		continue;
	}

	const tracks = [];
	for (const f of entries.filter((f) => f.endsWith(".mp3")).sort()) {
		const t = parse(f);
		if (t) tracks.push(t);
		else console.warn(`  ? unparsed filename in ${album.dir}: ${f}`);
	}
	tracks.sort((a, b) => a.bwv.localeCompare(b.bwv));

	const { needsReview, dir: _dir, ...rest } = album;
	albums.push({ ...rest, trackCount: tracks.length, tracks });
	console.log(`  ${album.id.padEnd(32)} ${tracks.length} tracks`);
}

const catalog = {
	generated: "run scripts/publish-album.sh to refresh",
	tunings: meta.tunings,
	albums,
};

writeFileSync(OUT_FILE, `${JSON.stringify(catalog, null, "\t")}\n`);
console.log(
	`\nWrote ${OUT_FILE}: ${albums.length} albums, ` +
		`${albums.reduce((n, a) => n + a.tracks.length, 0)} tracks` +
		(skipped ? `, ${skipped} skipped` : ""),
);
