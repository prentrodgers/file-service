// Global site data, imported anywhere with `import { ... } from '../consts'`.

export const SITE_TITLE = "Microtonal Notes";
export const SITE_DESCRIPTION =
	"Bach chorales retuned in just intonation — where every chord is tuned to whole-number ratios, found by simulated annealing and threaded together with Viterbi optimisation.";

/**
 * Where the MP3s live. This is a Cloudflare R2 bucket attached to its own
 * subdomain, because R2 custom domains bind at the hostname level and cannot be
 * mounted at a path like /listen/.
 *
 * The daily posting script (daily_chorale_tweet.py in
 * prentrodgers/One-footed-bride-tuning) must use this same base URL — X rewrites
 * every outbound link to https://, so the host has to have a real certificate.
 */
export const AUDIO_BASE = "https://audio.microtonalnotes.net";

/** Full URL for a chorale MP3, given its filename / R2 object key. */
export function audioUrl(file: string): string {
	return `${AUDIO_BASE}/${encodeURIComponent(file)}`;
}

export const SOCIAL = {
	x: "https://x.com/prentrodgers",
	github: "https://github.com/prentrodgers/One-footed-bride-tuning",
	youtube: "https://youtu.be/0h6--rnJmmw",
	substack: "https://microtonalnotes.substack.com",
};

export const AUTHOR = "Prent Rodgers";
