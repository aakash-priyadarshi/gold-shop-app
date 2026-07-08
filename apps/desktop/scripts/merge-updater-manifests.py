#!/usr/bin/env python3
"""Merge platform-specific updater manifests into a single latest.json."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def merge_manifests(inputs: list[Path], version: str) -> dict:
    merged_platforms: dict[str, dict] = {}
    notes: str | None = None
    pub_date: str | None = None

    for path in inputs:
        data = load_json(path)
        notes = notes or data.get("notes")
        pub_date = pub_date or data.get("pub_date")

        platforms = data.get("platforms") or {}
        if not isinstance(platforms, dict):
            raise ValueError(f"Invalid platforms object in {path}")

        for key in sorted(platforms.keys()):
            if key in merged_platforms:
                raise ValueError(f"Duplicate platform entry '{key}' while merging {path}")
            merged_platforms[key] = platforms[key]

    if not merged_platforms:
        raise ValueError("Merged manifest has no platforms")

    return {
        "version": version,
        "notes": notes or f"Orivraa Desktop v{version}",
        "pub_date": pub_date,
        "platforms": merged_platforms,
    }


def validate_manifest(manifest: dict, required_platforms: list[str]) -> None:
    platforms = manifest.get("platforms") or {}
    if not isinstance(platforms, dict):
        raise ValueError("Manifest platforms must be an object")

    for platform in required_platforms:
        if platform not in platforms:
            raise ValueError(f"Missing required platform: {platform}")

        entry = platforms[platform]
        signature = (entry.get("signature") or "").strip()
        url = (entry.get("url") or "").strip()

        if not signature:
            raise ValueError(f"Empty signature for platform: {platform}")
        if not url:
            raise ValueError(f"Empty download URL for platform: {platform}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Merge updater manifests")
    parser.add_argument("--version", required=True)
    parser.add_argument(
        "--inputs",
        nargs="+",
        required=True,
        help="Platform manifest files in deterministic merge order",
    )
    parser.add_argument("--output", required=True)
    parser.add_argument(
        "--validate-platforms",
        default="",
        help="Comma-separated platform keys that must be present with non-empty signature/url",
    )
    args = parser.parse_args()

    input_paths = [Path(p) for p in args.inputs]
    for path in input_paths:
        if not path.is_file():
            print(f"ERROR: Manifest not found: {path}", file=sys.stderr)
            return 1

    try:
        merged = merge_manifests(input_paths, args.version)
        required = [p.strip() for p in args.validate_platforms.split(",") if p.strip()]
        if required:
            validate_manifest(merged, required)
    except ValueError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    output = Path(args.output)
    output.write_text(json.dumps(merged, indent=2) + "\n", encoding="utf-8")
    print(f"Merged manifest written to {output}")
    print(f"Platforms: {', '.join(sorted(merged['platforms'].keys()))}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
