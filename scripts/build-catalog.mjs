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
// two capture orders. `_ap` is absent on --short_repeats renders. A chaconne
// render with --chaconne_density appends its copies' levels to the density,
// c + one digit per copy (b403a_df4c3214_...), not captured.
const CURRENT_RE =
	/^b(\d{3})(\w?)_(md|df)(\d+)(?:c\d+)?_t(\d+)_d(\d+)_(\d+)_t(\d+)(?:_ap(\d+))?_lm(\d+)_r([\d.]+)\.mp3$/;
const LEGACY_RE =
	/^ball9-t(\d{2,3})(\w?)_lm(\d+)_r([\d.]+)_(?:sf[\d.]+_)?(md|df)(\d+)_(?:sp\d+_)?t(\d+)_d(\d+)_(\d+)_t(\d+)(?:_ap(\d+))?\.mp3$/;

// Whole-work renders (Goldberg Variations): b988-01a_vrwt_d01_03_t100.mp3,
// b988-aa_... (Aria), b988qa_... (Quodlibet; the dash is optional). No tuning-
// search tokens at all, so this is a third grammar. Mirrors WORK_RE in
// src/lib/chorale.ts.
const WORK_RE = /^b(\d{3})-?([0-9a-z]+?)_([a-z]+)_d(\d+)_(\d+)_t(\d+)\.mp3$/;

// Spring-tuned renders (goldberg_diamond.sh): score name then tuning tag, no
// separator. b988-00d7h32_... Aria, b988v16ad7h32_... Var. 16 first part,
// b988v32d7h32_... Aria da capo. Mirrors SPRING_RE in src/lib/chorale.ts.
const SPRING_RE = /^b(\d{3})(?:-|v)(\d{2}[a-z]?)(d\d+h\d+)_d(\d+)_(\d+)_t(\d+)\.mp3$/;

const WORK_TITLES = { 988: "Goldberg Variations" };
const GOLDBERG_CANONS = {
	3: "Canone all'Unisono",
	6: "Canone alla Seconda",
	9: "Canone alla Terza",
	12: "Canone alla Quarta",
	15: "Canone alla Quinta",
	18: "Canone alla Sesta",
	21: "Canone alla Settima",
	24: "Canone all'Ottava",
	27: "Canone alla Nona",
};

// Title and running order for a movement token. Mirrors movementOf() in
// src/lib/chorale.ts.
function movementOf(bwv, token) {
	const m = /^(\d+)([a-z]?)$/.exec(token);
	if (bwv === "988") {
		if (token === "aa") return { title: "Aria", order: 0 };
		if (token === "qa") return { title: "Variatio 30. Quodlibet", order: 30 };
		if (m) {
			const n = Number(m[1]);
			// Spring renders number the Aria 00 and its da capo 32.
			if (n === 0) return { title: "Aria", order: 0 };
			if (n === 32) return { title: "Aria da capo", order: 32 };
			if (n === 30) return { title: "Variatio 30. Quodlibet", order: 30 };
			const name =
				n === 16
					? m[2] === "b"
						? "Ouverture (second part)"
						: "Ouverture"
					: GOLDBERG_CANONS[n];
			return {
				title: `Variatio ${n}${name ? `. ${name}` : ""}`,
				order: n + (m[2] ? (m[2].charCodeAt(0) - 97) / 10 : 0),
			};
		}
	}
	return { title: `${WORK_TITLES[bwv] ?? "Bach"} ${token}`, order: m ? Number(m[1]) : 999 };
}

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
	// 367-414 added 25 Oct 2026: 367-378 checked page by page against
	// bach-chorales.com/BWV0NNN.htm, 379-414 as in daily_chorale_tweet.py.
	367: "In allen meinen Taten",
	368: "In dulci jubilo",
	369: "Keinen hat Gott verlassen",
	370: "Komm, Gott Schöpfer, Heiliger Geist",
	371: "Kyrie, Gott Vater in Ewigkeit",
	372: "Lass, o Herr, dein Ohr sich neigen",
	373: "Liebster Jesu, wir sind hier",
	374: "Lobet den Herren, denn er ist sehr freundlich",
	375: "Lobt Gott, ihr Christen, allzugleich",
	376: "Lobt Gott, ihr Christen, allzugleich",
	377: "Machs mit mir, Gott, nach deiner Güt",
	378: "Mein Augen schließ ich jetzt",
	379: "Meinen Jesum laß ich nicht, Jesus",
	380: "Meinen Jesum laß ich nicht, weil",
	381: "Meines Lebens letzte Zeit",
	382: "Mit Fried und Freud ich fahr dahin",
	383: "Mitten wir im Leben sind",
	384: "Nicht so traurig, nicht so sehr",
	385: "Nun bitten wir den Heiligen Geist",
	386: "Nun danket alle Gott",
	387: "Nun freut euch, Gottes Kinder all",
	388: "Nun freut euch, lieben Christen g'mein",
	389: "Nun lob, mein Seel, den Herren",
	390: "Nun lob, mein Seel, den Herren",
	391: "Nun preiset alle Gottes Barmherzigkeit",
	392: "Nun ruhen alle Wälder",
	393: "O Welt, sieh hier dein Leben",
	394: "O Welt, sieh hier dein Leben",
	395: "O Welt, sieh hier dein Leben",
	396: "Nun sich der Tag geendet hat",
	397: "O Ewigkeit, du Donnerwort",
	398: "O Gott, du frommer Gott",
	399: "O Gott, du frommer Gott",
	400: "O Herzensangst, o Bangigkeit",
	401: "O Lamm Gottes, unschuldig",
	402: "O Mensch, bewein dein Sünde groß",
	403: "O Mensch, schau Jesum Christum an",
	404: "O Traurigkeit, o Herzeleid",
	405: "O wie selig seid ihr doch, ihr Frommen",
	406: "O wie selig seid ihr doch, ihr Frommen",
	407: "O wir armen Sünder",
	408: "Schaut, ihr Sünder",
	409: "Seelenbräutigam",
	410: "Sei gegrüßet, Jesu gütig",
	411: "Singt dem Herrn ein neues Lied",
	412: "So gibst du nun, mein Jesu, gute Nacht",
	413: "Sollt ich meinem Gott nicht singen",
	414: "Uns ist ein Kindlein heut geborn",
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
	} else if (!LEGACY_RE.test(file)) {
		const work = WORK_RE.exec(file) ?? SPRING_RE.exec(file);
		if (!work) return null;
		const [, bwv, token, temperament, min, sec, bpm] = work;
		const { title, order } = movementOf(bwv, token);
		const minutes = Number(min);
		const seconds = Number(sec);
		return {
			file,
			bwv,
			title,
			variant: token,
			duration: `${minutes}:${String(seconds).padStart(2, "0")}`,
			durationSeconds: minutes * 60 + seconds,
			tempo: Number(bpm),
			temperament,
			order,
		};
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
	// Within one BWV number, whole-work movements go in performance order;
	// chorales have no `order` and keep their filename order.
	tracks.sort(
		(a, b) => a.bwv.localeCompare(b.bwv) || (a.order ?? 0) - (b.order ?? 0),
	);

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
