#!/usr/bin/env bash
# publish-album.sh — put an album's MP3s on R2 and refresh the site catalog.
#
# Usage:
#   ./scripts/publish-album.sh                      # newest album dir in Uploads
#   ./scripts/publish-album.sh ~/Dropbox/Uploads/c8-08-03-26
#   ./scripts/publish-album.sh --dry-run <dir>
#
# The MP3s are NOT committed to git — at ~150 MB per album that would bloat the
# repo permanently. They live in the R2 bucket; only the generated catalog is
# committed. See src/consts.ts (AUDIO_BASE) for the public URL.
#
# After running this, remember that daily_chorale_tweet.py on fs7 picks the
# newest album directory on its own — so a newly published album enters the
# rotation automatically, but only if its files are actually on R2.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
BUCKET="microtonalnotes-audio"
UPLOADS="${UPLOADS:-$HOME/Dropbox/Uploads}"

DRY_RUN=0
ALBUM_DIR=""
AUTO_SELECTED=0
for arg in "$@"; do
	case "$arg" in
		--dry-run) DRY_RUN=1 ;;
		-*) echo "unknown option: $arg" >&2; exit 2 ;;
		*) ALBUM_DIR="$arg" ;;
	esac
done

# Default to the most recently modified directory in Uploads that actually holds
# chorale MP3s.
#
# No name pattern. The series has run c0-c9, d0-d9, dA, Db, Dc, and a filter that
# keeps pace with that is a filter that will eventually exclude the album you
# just rendered — `[cd][0-9]*` already did exactly that to Dc-09-25-26, and the
# failure was silent: it picked an older album instead of saying so.
#
# mtime, not name, since there is no longer a name to sort on meaningfully. The
# earlier version sorted by name and avoided mtime because Dropbox re-syncs
# directories in arbitrary order, so mtimes differ per node — a real cost: a
# re-synced OLD album can look newest here. Passing the directory explicitly is
# the answer when it matters, and is what the guard below protects.
#
# The "holds chorale MP3s" test is what keeps this off Dropbox's other folders.
# (daily_chorale_tweet.py does NOT share this logic — it picks its album from
# the R2 bucket listing, so the two have always been independent.)
if [[ -z "$ALBUM_DIR" ]]; then
	ALBUM_DIR="$(find "$UPLOADS" -mindepth 1 -maxdepth 1 -type d \
		-exec sh -c 'ls "$1"/b[0-9][0-9][0-9]*.mp3 >/dev/null 2>&1 \
		             || ls "$1"/ball9-t*.mp3 >/dev/null 2>&1' _ {} \; \
		-printf '%T@\t%p\n' \
		| sort -n | tail -1 | cut -f2-)"
	AUTO_SELECTED=1
fi

# Preflight. Both of these otherwise fail *silently*: the wrangler calls below
# send stdout to /dev/null, so npx's "Ok to proceed?" install prompt and
# wrangler's OAuth login URL are both invisible and the script just hangs.
WRANGLER="$REPO_ROOT/node_modules/.bin/wrangler"
if [[ $DRY_RUN -eq 0 ]]; then
	if [[ ! -x "$WRANGLER" ]]; then
		echo "wrangler not installed. Run: npm install" >&2
		exit 1
	fi
	if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]] && ! "$WRANGLER" whoami 2>&1 | grep -q "You are logged in"; then
		echo "Not authenticated to Cloudflare. Run: npx wrangler login" >&2
		echo "(or export CLOUDFLARE_API_TOKEN with Workers R2 Storage: Edit)" >&2
		exit 1
	fi
fi

if [[ -z "$ALBUM_DIR" || ! -d "$ALBUM_DIR" ]]; then
	echo "No album directory found. Pass one explicitly." >&2
	exit 1
fi

# Both naming schemes. Renders since 24 Sep 2026 are b<NNN><letter>_... ; every
# album before that is ball9-t... and is still live on R2, so both are published.
mapfile -t FILES < <(find "$ALBUM_DIR" -maxdepth 1 \
	\( -name 'b[0-9][0-9][0-9]*.mp3' -o -name 'ball9-t*.mp3' \) | sort)
if [[ ${#FILES[@]} -eq 0 ]]; then
	echo "No chorale MP3s in $ALBUM_DIR" >&2
	echo "(expected b<NNN><letter>_*.mp3, or ball9-t*.mp3 for albums before 24 Sep 2026)" >&2
	exit 1
fi

# Sanity guard, and only on the auto-selected path — an explicit directory is
# taken at its word. ~/Dropbox/Uploads also holds bulk collections: Archive/ and
# Musical Archive/ carry ~190 chorale MP3s each. Either would satisfy the "has
# chorale MP3s" test above, and if Dropbox ever re-synced one it would become the
# newest directory and this script would upload the whole lot to R2 as an album.
# Real albums are 12-13 tracks.
if [[ $AUTO_SELECTED -eq 1 && ${#FILES[@]} -gt 30 ]]; then
	echo "Refusing to auto-publish $ALBUM_DIR:" >&2
	echo "  ${#FILES[@]} MP3s looks like a bulk collection, not an album." >&2
	echo "  Pass the directory explicitly if that is really what you want." >&2
	exit 1
fi

echo "Album:  $ALBUM_DIR"
echo "Files:  ${#FILES[@]}"
echo "Bucket: $BUCKET"
[[ $DRY_RUN -eq 1 ]] && echo "(dry run — nothing will be uploaded)"
echo

# Objects are keyed "<album-dir>/<filename>", NOT by filename alone.
#
# The filenames encode render parameters and nothing about which album they
# belong to, so two albums that render the same chorale with the same settings
# produce byte-different files with identical names. Flat at the bucket root,
# the second upload silently replaced the first and both albums' links then
# served the same audio. Four such pairs accumulated before this was noticed.
#
# Objects uploaded flat before this change are deliberately left in place:
# already-posted tweets link to them at the root and would otherwise 404.
ALBUM="$(basename "$ALBUM_DIR")"

uploaded=0
for f in "${FILES[@]}"; do
	name="$(basename "$f")"
	key="$ALBUM/$name"
	size="$(du -h "$f" | cut -f1)"
	if [[ $DRY_RUN -eq 1 ]]; then
		echo "  would upload $key ($size)"
		continue
	fi
	printf '  %s (%s) ... ' "$name" "$size"
	# --remote targets the real bucket; without it wrangler writes to the local
	# simulator and the files never leave this machine.
	"$WRANGLER" r2 object put "$BUCKET/$key" \
		--file "$f" --content-type audio/mpeg --remote >/dev/null
	echo "ok"
	uploaded=$((uploaded + 1))
done

echo
echo "Refreshing catalog..."
node "$REPO_ROOT/scripts/build-catalog.mjs"

echo
if [[ $DRY_RUN -eq 1 ]]; then
	echo "Dry run complete."
else
	echo "Uploaded $uploaded file(s)."
	cat <<EOF

Next:
  1. If this is a new album, add an entry to src/data/albums.json
     (id, dir, title, date, tuning) and re-run scripts/build-catalog.mjs.
  2. git add src/data/catalog.json src/data/albums.json && git commit
  3. git push   (Cloudflare builds and deploys from main)
EOF
fi
