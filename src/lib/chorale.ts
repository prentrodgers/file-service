/**
 * Parses the MP3 filenames produced by the tuning pipeline.
 *
 * Ported from `daily_chorale_tweet.py` (FILENAME_RE / BWV_TITLES) in
 * prentrodgers/One-footed-bride-tuning. Keep the two in sync — that script
 * builds the URLs posted to X, this builds the pages those URLs point at.
 *
 * Example:
 *   ball9-t53c_lm17_r1.12_df2_t1_d07_34_t106.mp3
 *   → BWV 253, 17-limit, ratio 1.12, density 2, ±1¢, 7:34, 106 BPM
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
};

/**
 * Filename grammar. `sf` (stability factor) and `sp` (spread) were dropped from
 * newer renders, so both are optional. The detail token is `md` on legacy files
 * and `df` on current ones — they mean different things, so we capture which.
 */
const FILENAME_RE = new RegExp(
	"^ball9-t(\\d{2,3})(\\w?)_" + //     track number + variant letter
		"lm(\\d+)_" + //                  limit (tonality-diamond odd limit)
		"r([\\d.]+)_" + //                ratio factor
		"(?:sf[\\d.]+_)?" + //            stability factor (legacy, optional)
		"(md|df)(\\d+)_" + //             md = max delta (cents) | df = density level
		"(?:sp\\d+_)?" + //               spread (legacy, optional)
		"t(\\d+)_" + //                   tolerance (cents)
		"d(\\d+)_(\\d+)_" + //            duration mm_ss
		"t(\\d+)" + //                    tempo (BPM)
		"\\.mp3$",
);

export type DetailKind = "density" | "maxDelta";

export interface ChoraleTrack {
	/** Original filename, also the R2 object key. */
	file: string;
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
}

/**
 * Parse a filename into structured track data.
 * Returns `null` when the name doesn't match — callers should skip, not crash,
 * since the album directories also hold playlists and stray files.
 */
export function parseChoraleFilename(file: string): ChoraleTrack | null {
	const m = FILENAME_RE.exec(file);
	if (!m) return null;

	const [
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
	] = m;

	// Track 53 → BWV 253, matching the Python `bwv = f"2{track}"`.
	const bwv = `2${track}`;
	const minutes = Number(durMin);
	const seconds = Number(durSec);

	return {
		file,
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
