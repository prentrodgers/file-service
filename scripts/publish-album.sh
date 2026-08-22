#!/usr/bin/env bash
# publish-album.sh — put an album's MP3s on R2 and refresh the site catalog.
#
# Usage:
#   ./scripts/publish-album.sh                      # newest c* album in Uploads
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
for arg in "$@"; do
	case "$arg" in
		--dry-run) DRY_RUN=1 ;;
		-*) echo "unknown option: $arg" >&2; exit 2 ;;
		*) ALBUM_DIR="$arg" ;;
	esac
done

# Default to the highest album directory holding ball9 MP3s, across both the
# c and d series.
#
# Version-sorted by NAME, which orders these correctly on both axes: the prefix
# letter first (c9 < d0, so the d series supersedes the c one) and then the
# number numerically (c9 < c10, where a plain lexical sort would disagree).
# This matches find_latest_album_dir() in daily_chorale_tweet.py, which sorts on
# (prefix letter, number) for the same reason. Neither uses mtime: Dropbox
# re-syncs directories in arbitrary order, so mtimes differ per node.
if [[ -z "$ALBUM_DIR" ]]; then
	ALBUM_DIR="$(find "$UPLOADS" -mindepth 1 -maxdepth 1 -type d -name '[cd][0-9]*' \
		-exec sh -c 'ls "$1"/ball9-*.mp3 >/dev/null 2>&1' _ {} \; -print \
		| sort -V | tail -1)"
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

mapfile -t FILES < <(find "$ALBUM_DIR" -maxdepth 1 -name 'ball9-*.mp3' | sort)
if [[ ${#FILES[@]} -eq 0 ]]; then
	echo "No ball9-*.mp3 files in $ALBUM_DIR" >&2
	exit 1
fi

echo "Album:  $ALBUM_DIR"
echo "Files:  ${#FILES[@]}"
echo "Bucket: $BUCKET"
[[ $DRY_RUN -eq 1 ]] && echo "(dry run — nothing will be uploaded)"
echo

uploaded=0
for f in "${FILES[@]}"; do
	key="$(basename "$f")"
	size="$(du -h "$f" | cut -f1)"
	if [[ $DRY_RUN -eq 1 ]]; then
		echo "  would upload $key ($size)"
		continue
	fi
	printf '  %s (%s) ... ' "$key" "$size"
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
