#!/usr/bin/env python3
"""
Generate a Tauri updater latest.json manifest from built installer artifacts.

Searches common Cargo/Tauri output directories and fails if the minisign
signature is missing — an empty signature breaks in-app updates.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path


def find_bundle_dirs(repo_root: Path, platform: str) -> list[Path]:
    # Prefer src-tauri targets — tauri-action writes signed artifacts there.
    # Workspace-level apps/desktop/target may contain stale unsigned copies.
    if platform == "windows":
        rel_paths = [
            "apps/desktop/src-tauri/target/release/bundle",
            "apps/desktop/target/release/bundle",
        ]
    else:
        rel_paths = [
            "apps/desktop/src-tauri/target/universal-apple-darwin/release/bundle",
            "apps/desktop/target/universal-apple-darwin/release/bundle",
            "apps/desktop/src-tauri/target/release/bundle",
            "apps/desktop/target/release/bundle",
        ]

    return [repo_root / rel for rel in rel_paths if (repo_root / rel).is_dir()]


def _has_valid_signature(sig_path: Path) -> bool:
    return sig_path.is_file() and bool(sig_path.read_text(encoding="utf-8").strip())


def _pick_signed_installer(
    bundle_dirs: list[Path],
    subdirs: list[tuple[str, str]],
) -> tuple[Path, Path]:
    """Pick the first installer that has a non-empty minisign .sig alongside it."""
    for bundle_dir in bundle_dirs:
        for subdir_name, glob_pattern in subdirs:
            artifact_dir = bundle_dir / subdir_name
            if not artifact_dir.is_dir():
                continue
            for installer in sorted(artifact_dir.glob(glob_pattern)):
                sig_path = installer.parent / f"{installer.name}.sig"
                if _has_valid_signature(sig_path):
                    return installer, sig_path

    raise FileNotFoundError(
        "No signed installer found — expected installer + non-empty .sig under "
        "apps/desktop/src-tauri/target/**/bundle"
    )


def pick_windows_artifact(bundle_dirs: list[Path]) -> tuple[Path, Path]:
    return _pick_signed_installer(
        bundle_dirs,
        [("nsis", "*.exe"), ("msi", "*.msi")],
    )


def pick_macos_artifact(bundle_dirs: list[Path]) -> tuple[Path, Path]:
    # Tauri v2 updater uses signed .app.tar.gz (not DMG) in bundle/macos/
    return _pick_signed_installer(
        bundle_dirs,
        [("macos", "*.app.tar.gz"), ("dmg", "*.dmg")],
    )


def read_signature(sig_path: Path) -> str:
    if not sig_path.is_file():
        raise FileNotFoundError(f"Signature file not found: {sig_path}")

    signature = sig_path.read_text(encoding="utf-8").strip()
    if not signature:
        raise ValueError(f"Signature file is empty: {sig_path}")

    return signature


def build_manifest(
    version: str,
    platform: str,
    installer_name: str,
    signature: str,
    download_base: str,
) -> dict:
    pub_date = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    download_url = f"{download_base.rstrip('/')}/{installer_name}"

    if platform == "windows":
        platforms = {
            "windows-x86_64": {
                "signature": signature,
                "url": download_url,
            }
        }
    else:
        platforms = {
            "darwin-aarch64": {
                "signature": signature,
                "url": download_url,
            },
            "darwin-x86_64": {
                "signature": signature,
                "url": download_url,
            },
        }

    return {
        "version": version,
        "notes": f"Orivraa Desktop v{version}",
        "pub_date": pub_date,
        "platforms": platforms,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate Tauri updater latest.json")
    parser.add_argument("--version", required=True)
    parser.add_argument("--platform", choices=["windows", "macos"], required=True)
    parser.add_argument(
        "--download-base",
        default="https://releases.orivraa.com/desktop/latest",
        help="Base URL where the installer is hosted",
    )
    parser.add_argument("--repo-root", default=".")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve()
    bundle_dirs = find_bundle_dirs(repo_root, args.platform)
    if not bundle_dirs:
        print("ERROR: No bundle directories found", file=sys.stderr)
        return 1

    try:
        if args.platform == "windows":
            installer, sig_path = pick_windows_artifact(bundle_dirs)
        else:
            installer, sig_path = pick_macos_artifact(bundle_dirs)

        signature = read_signature(sig_path)
        manifest = build_manifest(
            args.version,
            args.platform,
            installer.name,
            signature,
            args.download_base,
        )
    except (FileNotFoundError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    output = Path(args.output)
    output.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    print(f"Installer: {installer}")
    print(f"Signature: {sig_path} ({len(signature)} chars)")
    print(f"Wrote manifest: {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
