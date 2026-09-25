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
		"(md|df)(\\d+)_" + //             md = max delta (cents) | df = density level
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
	/** Odd limit of the tonality diamond: 17, 19, 23. */
	limit: number;
	/** Ratio factor — weighting applied to interval ratios. */
	ratio: number;
	/**
	 * `density` (df): higher is denser, 0–5.
	 * `maxDelta` (md): legacy, max cents a repeated pitch class may shift.
	 */
	detail: { kind: DetailKind; value: number };
	/** Tolerance in cents from the ideal just-intonation ratio. */
	tolerance: number;
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
export function detailLabel(detail: ChoraleTrack["detail"]): string {
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
		{
			label: "Tempo",
			value: `${track.tempo} BPM`,
			note: "Playback tempo of this render.",
		},
	];
}
