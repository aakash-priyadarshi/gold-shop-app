#!/usr/bin/env python3
"""Merge platform-specific updater manifests into a single latest.json."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from urllib.request import urlopen


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def merge_manifests(base: dict, patch: dict, version: str) -> dict:
    merged = {
        "version": version,
        "notes": patch.get("notes") or base.get("notes") or f"Orivraa Desktop v{version}",
        "pub_date": patch.get("pub_date") or base.get("pub_date"),
        "platforms": {},
    }

    for source in (base, patch):
        platforms = source.get("platforms") or {}
        if isinstance(platforms, dict):
            merged["platforms"].update(platforms)

    if not merged["platforms"]:
        raise ValueError("Merged manifest has no platforms")

    return merged


def main() -> int:
    parser = argparse.ArgumentParser(description="Merge updater manifests")
    parser.add_argument("--version", required=True)
    parser.add_argument("--base-file")
    parser.add_argument("--base-url")
    parser.add_argument("--patch", required=True, help="Platform manifest to merge in")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    if args.base_file:
        base = load_json(Path(args.base_file))
    elif args.base_url:
        try:
            with urlopen(args.base_url, timeout=20) as response:
                base = json.loads(response.read().decode("utf-8"))
        except Exception as exc:
            print(f"WARN: Could not fetch base manifest ({exc}); starting fresh", file=sys.stderr)
            base = {"platforms": {}}
    else:
        base = {"platforms": {}}

    patch = load_json(Path(args.patch))
    merged = merge_manifests(base, patch, args.version)

    output = Path(args.output)
    output.write_text(json.dumps(merged, indent=2) + "\n", encoding="utf-8")
    print(f"Merged manifest written to {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
