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

// Mirrors CURRENT_RE / LEGACY_RE in src/lib/chorale.ts and FILENAME_RE in
// daily_chorale_tweet.py. Keep all three in sync.
//
// CURRENT (since 24 Sep 2026): b424f_df0_t3_d04_08_t092_ap4_lm19_r1.25.mp3
// LEGACY (still on R2, still linked from posted tweets):
//                              ball9-t53c_lm17_r1.12_df2_t1_d07_34_t106.mp3
// The field ORDER differs, not just the prefix, so these are two patterns with
// two capture orders. `_ap` is absent on --short_repeats renders.
const CURRENT_RE =
	/^b(\d{3})(\w?)_(md|df)(\d+)_t(\d+)_d(\d+)_(\d+)_t(\d+)(?:_ap(\d+))?_lm(\d+)_r([\d.]+)\.mp3$/;
const LEGACY_RE =
	/^ball9-t(\d{2,3})(\w?)_lm(\d+)_r([\d.]+)_(?:sf[\d.]+_)?(md|df)(\d+)_(?:sp\d+_)?t(\d+)_d(\d+)_(\d+)_t(\d+)(?:_ap(\d+))?\.mp3$/;

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
	// 267 and 415-438, checked against bach-chorales.com on 19 Sep 2026.
	267: "An Wasserflüssen Babylon",
	415: "Valet will ich dir geben",
	416: "Vater unser im Himmelreich",
	417: "Von Gott will ich nicht lassen",
	418: "Von Gott will ich nicht lassen",
	419: "Von Gott will ich nicht lassen",
	420: "Warum betrübst du dich, mein Herz",
	421: "Warum betrübst du dich, mein Herz",
	422: "Warum sollt ich mich denn grämen",
	423: "Was betrübst du dich, mein Herze",
	424: "Was bist du doch, o Seele so betrübet",
	425: "Was willst du dich, o meine Seele, kränken",
	426: "Weltlich Ehr und zeitlich Gut",
	427: "Wenn ich in Angst und Not",
	428: "Wenn mein Stündlein vorhanden ist",
	429: "Wenn mein Stündlein vorhanden ist",
	430: "Wenn mein Stündlein vorhanden ist",
	431: "Wenn wir in höchsten Nöten sein",
	432: "Wenn wir in höchsten Nöten sein",
	433: "Wer Gott vertraut, hat wohl gebaut",
	434: "Wer nur den lieben Gott lässt walten",
	435: "Wie bist du, Seele, in mir so gar betrübt",
	436: "Wie schön leuchtet der Morgenstern",
	437: "Wir glauben all an einen Gott",
	438: "Wo Gott zum Haus nicht gibt sein Gunst",
};

// Three digits carry the BWV number outright. Two-digit tokens predate 19 Sep
// 2026 and dropped the hundreds: track 53 is BWV 253, but track 27 is BWV *4*27,
// not 227. The tuned chorales are 253-267 and 415-438, whose last two digits
// never collide, so the candidate with a title is the right one.
function bwvFromTrack(track) {
	if (track.length === 3) return track;
	return [`2${track}`, `4${track}`].find((c) => c in BWV_TITLES) ?? `2${track}`;
}

function parse(file) {
	let track, variant, limit, ratio, dKind, dVal, tol, min, sec, tempo, primes;
	const cur = CURRENT_RE.exec(file);
	if (cur) {
		[, track, variant, dKind, dVal, tol, min, sec, tempo, primes, limit, ratio] = cur;
	} else {
		const old = LEGACY_RE.exec(file);
		if (!old) return null;
		[, track, variant, limit, ratio, dKind, dVal, tol, min, sec, tempo, primes] = old;
	}
	const bwv = bwvFromTrack(track);
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
		...(primes === undefined ? {} : { primes: Number(primes) }),
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
		// The R2 key carries the album directory. Without it two albums holding
		// the same filename collide at the bucket root and the later upload
		// silently serves both albums' links.
		if (t) tracks.push({ ...t, key: `${album.dir}/${f}` });
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
