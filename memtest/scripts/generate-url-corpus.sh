#!/bin/bash
# Generate URL corpus from Hive API for realistic crawler simulation
# Produces /tmp/urls-all.txt with unique post, profile, and community URLs

set -e

OUTFILE="${1:-/tmp/urls-all.txt}"
> "$OUTFILE"

echo "Fetching recent posts from Hive API..."

# Fetch posts in batches using different sort methods to get unique URLs
for sort in created trending hot; do
  RESPONSE=$(curl -s 'https://api.hive.blog' \
    -d "{\"jsonrpc\":\"2.0\",\"method\":\"bridge.get_ranked_posts\",\"params\":{\"sort\":\"${sort}\",\"limit\":100,\"start_author\":\"\",\"start_permlink\":\"\",\"observer\":\"\"},\"id\":1}")

  echo "$RESPONSE" | jq -r '.result[]? | "/@\(.author)/\(.permlink)"' >> "$OUTFILE" 2>/dev/null
done

# Fetch more posts with pagination
for sort in created trending; do
  # Get first batch to find last author/permlink for pagination
  FIRST=$(curl -s 'https://api.hive.blog' \
    -d "{\"jsonrpc\":\"2.0\",\"method\":\"bridge.get_ranked_posts\",\"params\":{\"sort\":\"${sort}\",\"limit\":100,\"start_author\":\"\",\"start_permlink\":\"\",\"observer\":\"\"},\"id\":1}")

  LAST_AUTHOR=$(echo "$FIRST" | jq -r '.result[-1].author // empty')
  LAST_PERMLINK=$(echo "$FIRST" | jq -r '.result[-1].permlink // empty')

  if [ -n "$LAST_AUTHOR" ] && [ -n "$LAST_PERMLINK" ]; then
    for i in $(seq 1 4); do
      RESPONSE=$(curl -s 'https://api.hive.blog' \
        -d "{\"jsonrpc\":\"2.0\",\"method\":\"bridge.get_ranked_posts\",\"params\":{\"sort\":\"${sort}\",\"limit\":100,\"start_author\":\"${LAST_AUTHOR}\",\"start_permlink\":\"${LAST_PERMLINK}\",\"observer\":\"\"},\"id\":1}")

      echo "$RESPONSE" | jq -r '.result[]? | "/@\(.author)/\(.permlink)"' >> "$OUTFILE" 2>/dev/null

      LAST_AUTHOR=$(echo "$RESPONSE" | jq -r '.result[-1].author // empty')
      LAST_PERMLINK=$(echo "$RESPONSE" | jq -r '.result[-1].permlink // empty')

      [ -z "$LAST_AUTHOR" ] && break
    done
  fi
done

# Add profile pages
for user in blocktrades hiveio acidyo dalz arcange theycallmedan good-karma; do
  echo "/@${user}" >> "$OUTFILE"
done

# Add community pages
for community in hive-167922 hive-110011 hive-174578 hive-148441 hive-196708; do
  echo "/trending/${community}" >> "$OUTFILE"
  echo "/hot/${community}" >> "$OUTFILE"
done

# Deduplicate
sort -u "$OUTFILE" -o "$OUTFILE"

COUNT=$(wc -l < "$OUTFILE")
echo "Generated ${COUNT} unique URLs in ${OUTFILE}"
