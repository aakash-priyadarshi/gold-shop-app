#!/bin/sh
set -eu

core_dir=apps/api/src/modules/core
sha=$(tr -d '[:space:]' < /tmp/core-submodule.sha)
if [ -z "$sha" ]; then
  echo 'ERROR: apps/api/core-submodule.sha is empty' >&2
  exit 1
fi

if [ -n "${SUBMODULE_PAT:-}" ]; then
  rm -rf "$core_dir"
  git clone --quiet "https://x-access-token:${SUBMODULE_PAT}@github.com/aakash-priyadarshi/gold-shop-core.git" "$core_dir"
  git -C "$core_dir" checkout --quiet "$sha"
elif [ ! -f "$core_dir/subscriptions/subscription-plans.module.ts" ]; then
  echo 'ERROR: gold-shop-core submodule missing and SUBMODULE_PAT not set' >&2
  exit 1
fi

if [ ! -d "$core_dir/.git" ]; then
  echo "ERROR: gold-shop-core checkout has no git metadata to verify $sha" >&2
  exit 1
fi
current=$(git -C "$core_dir" rev-parse HEAD)
if [ "$current" != "$sha" ]; then
  echo "ERROR: gold-shop-core HEAD $current does not match recorded $sha" >&2
  exit 1
fi

rm -rf "$core_dir/.git"
