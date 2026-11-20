/**
 * Parses the MP3 filenames produced by the tuning pipeline.
 *
 * Ported from `daily_chorale_tweet.py` (FILENAME_RE / BWV_TITLES) in
 * prentrodgers/One-footed-bride-tuning. Keep the two in sync — that script
 * builds the URLs posted to X, this builds the pages those URLs point at.
 *
 * Examples:
 *   b424f_df0_t3_d04_08_t092_ap4_lm19_r1.25.mp3   (current, since 24 Sep 2026)
 *   → BWV 424, 19-limit, ratio 1.25, density 0, ±3¢, 4:08, 92 BPM, pattern ap4
 *
 *   ball9-t53c_lm17_r1.12_df2_t1_d07_34_t106.mp3  (legacy, still served)
 *   → BWV 253, 17-limit, ratio 1.12, density 2, ±1¢, 7:34, 106 BPM
 *
 * Both are parsed. Albums published before the rename are live on R2 and linked
 * from tweets already posted, so the legacy grammar cannot be retired the way
 * it was in the tuning repo, where names only ever pointed at local files.
 */

/** BWV number → chorale title. Bach's chorales BWV 253–264 = tracks 53–64. */
export const BWV_TITLES: Record<string, string> = {
	"253": "Ach bleib bei uns, Herr Jesu Christ",
	"254": "Ach Gott, erhör mein Seufzen und Wehklagen",
	"255": "Ach Gott und Herr, wie groß und schwer",
	"256": "Ach lieben Christen, seid getrost",
	"257": "Wär Gott nicht mit uns diese Zeit",
	"258": "Wo Gott der Herr nicht bei uns hält",
	"259": "Ach, was soll ich Sünder machen",
	"260": "Allein Gott in der Höh sei Ehr",
	"261": "Allein zu dir, Herr Jesu Christ",
	"262": "Alle Menschen müssen sterben",
	"263": "Alles ist an Gottes Segen",
	"264": "Als der gütige Gott",
	// 267 and 415-438, checked against bach-chorales.com on 19 Sep 2026.
	"267": "An Wasserflüssen Babylon",
	// 367-414 added 25 Oct 2026: 367-378 checked page by page against
	// bach-chorales.com/BWV0NNN.htm, 379-414 as in daily_chorale_tweet.py.
	"367": "In allen meinen Taten",
	"368": "In dulci jubilo",
	"369": "Keinen hat Gott verlassen",
	"370": "Komm, Gott Schöpfer, Heiliger Geist",
	"371": "Kyrie, Gott Vater in Ewigkeit",
	"372": "Lass, o Herr, dein Ohr sich neigen",
	"373": "Liebster Jesu, wir sind hier",
	"374": "Lobet den Herren, denn er ist sehr freundlich",
	"375": "Lobt Gott, ihr Christen, allzugleich",
	"376": "Lobt Gott, ihr Christen, allzugleich",
	"377": "Machs mit mir, Gott, nach deiner Güt",
	"378": "Mein Augen schließ ich jetzt",
	"379": "Meinen Jesum laß ich nicht, Jesus",
	"380": "Meinen Jesum laß ich nicht, weil",
	"381": "Meines Lebens letzte Zeit",
	"382": "Mit Fried und Freud ich fahr dahin",
	"383": "Mitten wir im Leben sind",
	"384": "Nicht so traurig, nicht so sehr",
	"385": "Nun bitten wir den Heiligen Geist",
	"386": "Nun danket alle Gott",
	"387": "Nun freut euch, Gottes Kinder all",
	"388": "Nun freut euch, lieben Christen g'mein",
	"389": "Nun lob, mein Seel, den Herren",
	"390": "Nun lob, mein Seel, den Herren",
	"391": "Nun preiset alle Gottes Barmherzigkeit",
	"392": "Nun ruhen alle Wälder",
	"393": "O Welt, sieh hier dein Leben",
	"394": "O Welt, sieh hier dein Leben",
	"395": "O Welt, sieh hier dein Leben",
	"396": "Nun sich der Tag geendet hat",
	"397": "O Ewigkeit, du Donnerwort",
	"398": "O Gott, du frommer Gott",
	"399": "O Gott, du frommer Gott",
	"400": "O Herzensangst, o Bangigkeit",
	"401": "O Lamm Gottes, unschuldig",
	"402": "O Mensch, bewein dein Sünde groß",
	"403": "O Mensch, schau Jesum Christum an",
	"404": "O Traurigkeit, o Herzeleid",
	"405": "O wie selig seid ihr doch, ihr Frommen",
	"406": "O wie selig seid ihr doch, ihr Frommen",
	"407": "O wir armen Sünder",
	"408": "Schaut, ihr Sünder",
	"409": "Seelenbräutigam",
	"410": "Sei gegrüßet, Jesu gütig",
	"411": "Singt dem Herrn ein neues Lied",
	"412": "So gibst du nun, mein Jesu, gute Nacht",
	"413": "Sollt ich meinem Gott nicht singen",
	"414": "Uns ist ein Kindlein heut geborn",
	"415": "Valet will ich dir geben",
	"416": "Vater unser im Himmelreich",
	"417": "Von Gott will ich nicht lassen",
	"418": "Von Gott will ich nicht lassen",
	"419": "Von Gott will ich nicht lassen",
	"420": "Warum betrübst du dich, mein Herz",
	"421": "Warum betrübst du dich, mein Herz",
	"422": "Warum sollt ich mich denn grämen",
	"423": "Was betrübst du dich, mein Herze",
	"424": "Was bist du doch, o Seele so betrübet",
	"425": "Was willst du dich, o meine Seele, kränken",
	"426": "Weltlich Ehr und zeitlich Gut",
	"427": "Wenn ich in Angst und Not",
	"428": "Wenn mein Stündlein vorhanden ist",
	"429": "Wenn mein Stündlein vorhanden ist",
	"430": "Wenn mein Stündlein vorhanden ist",
	"431": "Wenn wir in höchsten Nöten sein",
	"432": "Wenn wir in höchsten Nöten sein",
	"433": "Wer Gott vertraut, hat wohl gebaut",
	"434": "Wer nur den lieben Gott lässt walten",
	"435": "Wie bist du, Seele, in mir so gar betrübt",
	"436": "Wie schön leuchtet der Morgenstern",
	"437": "Wir glauben all an einen Gott",
	"438": "Wo Gott zum Haus nicht gibt sein Gunst",
};

/**
 * Two filename grammars, because this site serves albums published under both.
 *
 * CURRENT (renamed 24 Sep 2026) — `_ap`/`_lm`/`_r` moved to the tail so the
 * leading ~20 characters carry the chorale, variant, density, tolerance and
 * running time, which is all a phone or car display shows:
 *   b424f_df0_t3_d04_08_t092_ap4_lm19_r1.25.mp3
 *
 * LEGACY — every album published before that date, still live on R2 and linked
 * from tweets already posted, so it cannot be dropped:
 *   ball9-t53c_lm17_r1.12_df2_t1_d07_34_t106.mp3
 *
 * Common to both: `sf` (stability factor) and `sp` (spread) were dropped from
 * later renders, so both are optional; the detail token is `md` on the oldest
 * files and `df` on the rest, and they mean different things, so we capture
 * which; `_ap` (repeat pattern) is absent on --short_repeats renders.
 *
 * The two differ in field ORDER, not just prefix, so they are separate patterns
 * with separate capture orders rather than one alternation.
 */
const CURRENT_RE = new RegExp(
	"^b(\\d{3})(\\w?)_" + //             BWV number (always 3 digits) + variant
		"(md|df)(\\d+)" + //              md = max delta (cents) | df = density level
		"(?:c\\d+)?_" + //                chaconne copies' levels, one digit each (df4c3214)
		"t(\\d+)_" + //                   tolerance (cents)
		"d(\\d+)_(\\d+)_" + //            duration mm_ss
		"t(\\d+)" + //                    tempo (BPM)
		"(?:_ap(\\d+))?" + //             repeat pattern (absent on --short_repeats)
		"_lm(\\d+)" + //                  limit (tonality-diamond odd limit)
		"_r([\\d.]+)" + //                ratio factor
		"\\.mp3$",
);

const LEGACY_RE = new RegExp(
	"^ball9-t(\\d{2,3})(\\w?)_" + //     track number + variant letter
		"lm(\\d+)_" + //                  limit
		"r([\\d.]+)_" + //                ratio factor
		"(?:sf[\\d.]+_)?" + //            stability factor (legacy, optional)
		"(md|df)(\\d+)_" + //             detail
		"(?:sp\\d+_)?" + //               spread (legacy, optional)
		"t(\\d+)_" + //                   tolerance
		"d(\\d+)_(\\d+)_" + //            duration mm_ss
		"t(\\d+)" + //                    tempo
		"(?:_ap(\\d+))?" + //             repeat pattern (late legacy files only)
		"\\.mp3$",
);

/**
 * Keyboard works rendered whole rather than chorale by chorale. A third
 * grammar, because these renders carry none of the tuning-search knobs:
 *   b988-01a_vrwt_d01_03_t100.mp3   → BWV 988, Variation 1, VRWT, 1:03, 100 BPM
 *   b988-aa_vrwt_d01_48_t056.mp3    → the Aria
 *   b988qa_vrwt_d00_46_t096.mp3     → the Quodlibet (the dash is optional)
 * The temperament token (`vrwt`) is recorded but the album's `tuning` in
 * albums.json is still what places it on /listen.
 */
const WORK_RE = new RegExp(
	"^b(\\d{3})-?" + //                  BWV number
		"([0-9a-z]+?)_" + //              movement token: 01a, 16b, aa, qa
		"([a-z]+)_" + //                  temperament tag, e.g. vrwt
		"d(\\d+)_(\\d+)_" + //            duration mm_ss
		"t(\\d+)" + //                   tempo (BPM)
		"\\.mp3$",
);

/**
 * Spring-tuned renders (goldberg_diamond.sh, 20 Nov 2026). The movement comes
 * straight from the score name, then the tuning tag with no separator:
 *   b988-00d7h32_d01_48_t056.mp3    Aria (score bwv988-00)
 *   b988v16ad7h32_d01_10_t060.mp3   Variation 16, first part
 *   b988v32d7h32_d01_48_t056.mp3    Aria da capo
 * d7h32 = VRWT pulled toward the 7-limit tonality diamond at harmony 32.
 */
const SPRING_RE = new RegExp(
	"^b(\\d{3})" + //                    BWV number
		"(?:-|v)(\\d{2}[a-z]?)" + //        movement: -00, v01, v16a, -26
		"(d\\d+h\\d+)_" + //               spring tag: diamond, harmony
		"d(\\d+)_(\\d+)_" + //            duration mm_ss
		"t(\\d+)" + //                   tempo (BPM)
		"\\.mp3$",
);

/** BWV number → name of a multi-movement work. */
export const WORK_TITLES: Record<string, string> = {
	"988": "Goldberg Variations",
};

// Goldberg canons, by variation number.
const GOLDBERG_CANONS: Record<number, string> = {
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

/**
 * Title and running order for a movement token. `aa` is the Aria, `qa` the
 * Quodlibet (Variation 30), `NN` + letter a variation; Variation 16, the
 * Ouverture, is rendered as two files, 16a and 16b.
 */
function movementOf(bwv: string, token: string): { title: string; order: number } {
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

/**
 * The BWV number a track token refers to.
 *
 * Three digits carry it outright. Two-digit tokens predate 19 Sep 2026 and
 * dropped the hundreds: track 53 is BWV 253, but track 27 is BWV *4*27, not
 * 227. The tuned chorales are 253-267 and 415-438, whose last two digits never
 * collide, so the candidate that has a title is the right one. Mirrors the
 * same resolution in daily_chorale_tweet.py.
 */
function bwvFromTrack(track: string): string {
	if (track.length === 3) return track;
	return [`2${track}`, `4${track}`].find((c) => c in BWV_TITLES) ?? `2${track}`;
}

export type DetailKind = "density" | "maxDelta";

export interface ChoraleTrack {
	/** Original filename, as rendered. Shown to the reader. */
	file: string;
	/**
	 * R2 object key, "<album-dir>/<file>".
	 *
	 * The album has to be in the key. Filenames encode render parameters and
	 * nothing about which album they belong to, so two albums that render the
	 * same chorale with the same parameters produce byte-different files with
	 * identical names — at the bucket root the second upload silently replaces
	 * the first. Four such pairs exist across the published albums.
	 */
	key: string;
	/** e.g. "253" */
	bwv: string;
	/** e.g. "Ach bleib bei uns, Herr Jesu Christ" */
	title: string;
	/** Render variant letter, e.g. "c". Empty string if absent. */
	variant: string;
	/**
	 * Odd limit of the tonality diamond: 17, 19, 23. This and the three fields
	 * after it are chorale tuning-search settings, absent on whole-work renders
	 * (Goldberg Variations) whose filenames carry none of them.
	 */
	limit?: number;
	/** Ratio factor — weighting applied to interval ratios. */
	ratio?: number;
	/**
	 * `density` (df): higher is denser, 0–5.
	 * `maxDelta` (md): legacy, max cents a repeated pitch class may shift.
	 */
	detail?: { kind: DetailKind; value: number };
	/** Tolerance in cents from the ideal just-intonation ratio. */
	tolerance?: number;
	/** Whole-work renders only: temperament tag from the filename, e.g. "vrwt". */
	temperament?: string;
	/** Whole-work renders only: position in the work, for sorting (Aria = 0). */
	order?: number;
	/** Duration as "7:34". */
	duration: string;
	/** Duration in seconds, for sorting and schema.org metadata. */
	durationSeconds: number;
	/** Tempo in BPM. */
	tempo: number;
	/**
	 * Repeat pattern this render drew, from the `_ap` token: 4 is the even
	 * pattern (4,4,8,8,16,16), 1 the prime one (1,3,5,11,17,31), 3 the
	 * slow-floor one (3,3,6,6,9,9,18,18). Absent on --short_repeats renders and
	 * on files from before the tag existed, so it is optional.
	 */
	primes?: number;
}

/**
 * Parse a filename into structured track data.
 * Returns `null` when the name doesn't match — callers should skip, not crash,
 * since the album directories also hold playlists and stray files.
 */
export function parseChoraleFilename(file: string): ChoraleTrack | null {
	let track: string,
		variant: string,
		limit: string,
		ratio: string,
		detailKind: string,
		detailValue: string,
		tolerance: string,
		durMin: string,
		durSec: string,
		tempo: string,
		primes: string | undefined;

	const cur = CURRENT_RE.exec(file);
	if (cur) {
		[
			,
			track,
			variant,
			detailKind,
			detailValue,
			tolerance,
			durMin,
			durSec,
			tempo,
			primes,
			limit,
			ratio,
		] = cur;
	} else if (!LEGACY_RE.test(file)) {
		const work = WORK_RE.exec(file) ?? SPRING_RE.exec(file);
		if (!work) return null;
		const [, bwv, token, temperament, min, sec, bpm] = work;
		const { title, order } = movementOf(bwv, token);
		const minutes = Number(min);
		const seconds = Number(sec);
		return {
			file,
			key: file,
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
		[
			,
			track,
			variant,
			limit,
			ratio,
			detailKind,
			detailValue,
			tolerance,
			durMin,
			durSec,
			tempo,
			primes,
		] = old;
	}

	const bwv = bwvFromTrack(track);
	const minutes = Number(durMin);
	const seconds = Number(durSec);

	return {
		file,
		// A bare filename is its own key; build-catalog.mjs sets the real one.
		key: file,
		bwv,
		title: BWV_TITLES[bwv] ?? "Bach Chorale",
		variant,
		limit: Number(limit),
		ratio: Number(ratio),
		detail: {
			kind: detailKind === "df" ? "density" : "maxDelta",
			value: Number(detailValue),
		},
		tolerance: Number(tolerance),
		duration: `${minutes}:${String(seconds).padStart(2, "0")}`,
		durationSeconds: minutes * 60 + seconds,
		tempo: Number(tempo),
		...(primes === undefined ? {} : { primes: Number(primes) }),
	};
}

/** Human-readable label for the density/max-delta token. */
export function detailLabel(
	detail: NonNullable<ChoraleTrack["detail"]>,
): string {
	return detail.kind === "density"
		? `Density ${detail.value}`
		: `Max shift ${detail.value}¢`;
}

/**
 * The tuning parameters as label/value pairs, for rendering in a table.
 * Descriptions explain what each knob does, since the point of the site is to
 * make the process legible rather than to show off filenames.
 */
export function tuningParameters(
	track: ChoraleTrack,
): Array<{ label: string; value: string; note: string }> {
	const tempo = {
		label: "Tempo",
		value: `${track.tempo} BPM`,
		note: "Playback tempo of this render.",
	};
	// Whole-work renders carry no tuning-search settings.
	if (
		track.limit === undefined ||
		track.ratio === undefined ||
		track.detail === undefined ||
		track.tolerance === undefined
	)
		return [tempo];
	return [
		{
			label: "Limit",
			value: `${track.limit}-limit`,
			note: `Tonality diamond built from odd numbers up to ${track.limit}. Lower ratios sound more consonant.`,
		},
		{
			label: "Ratio factor",
			value: track.ratio.toFixed(2),
			note: "Weighting applied to interval ratios when scoring a chord's tuning.",
		},
		track.detail.kind === "density"
			? {
					label: "Density",
					value: String(track.detail.value),
					note: "How densely the orchestration is filled in — 0 is sparse, 5 is dense.",
				}
			: {
					label: "Max shift",
					value: `${track.detail.value}¢`,
					note: "Legacy setting: the largest shift, in cents, allowed for a repeated pitch class.",
				},
		{
			label: "Tolerance",
			value: `±${track.tolerance}¢`,
			note: "How far a pitch may sit from its ideal just-intonation ratio.",
		},
		tempo,
	];
}

/** The one-line summary under a track's title: only the fields it has. */
export function trackMeta(track: ChoraleTrack): string[] {
	return [
		track.limit !== undefined ? `${track.limit}-limit` : null,
		track.duration,
		`${track.tempo} BPM`,
		track.detail ? detailLabel(track.detail) : null,
		track.tolerance !== undefined ? `±${track.tolerance}¢` : null,
	].filter((x): x is string => x !== null);
}
