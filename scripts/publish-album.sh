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

# Default to the highest-numbered album directory holding ball9 MP3s.
#
# Deliberately version-sorted by NAME (c0 < c1 < ... < c9 < c10), not by mtime.
# daily_chorale_tweet.py's find_latest_album_dir() uses st_mtime, which is not
# stable here: Dropbox re-syncs directories in arbitrary order, so on this node
# c0 currently looks newer than c8. Sorting by name gives the same answer on
# every machine.
if [[ -z "$ALBUM_DIR" ]]; then
	ALBUM_DIR="$(find "$UPLOADS" -mindepth 1 -maxdepth 1 -type d -name 'c[0-9]*' \
		-exec sh -c 'ls "$1"/ball9-*.mp3 >/dev/null 2>&1' _ {} \; -print \
		| sort -V | tail -1)"
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
	npx wrangler r2 object put "$BUCKET/$key" \
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
