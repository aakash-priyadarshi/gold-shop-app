#!/usr/bin/env python3
"""Sign Tauri updater artifacts with minisign after CI bundle step."""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
import tarfile
from pathlib import Path


def bundle_dirs(repo_root: Path, platform: str) -> list[Path]:
    if platform == "windows":
        rels = [
            "apps/desktop/src-tauri/target/release/bundle",
            "apps/desktop/target/release/bundle",
        ]
    else:
        rels = [
            "apps/desktop/src-tauri/target/universal-apple-darwin/release/bundle",
            "apps/desktop/target/universal-apple-darwin/release/bundle",
            "apps/desktop/src-tauri/target/release/bundle",
            "apps/desktop/target/release/bundle",
        ]
    return [repo_root / rel for rel in rels if (repo_root / rel).is_dir()]


def find_windows_installer(dirs: list[Path]) -> Path:
    for bundle in dirs:
        nsis = bundle / "nsis"
        if nsis.is_dir():
            exes = sorted(nsis.glob("*.exe"))
            if exes:
                return exes[0]
    raise FileNotFoundError("Windows NSIS installer not found")


def ensure_macos_tarball(dirs: list[Path]) -> Path:
    for bundle in dirs:
        macos_dir = bundle / "macos"
        if not macos_dir.is_dir():
            continue

        existing = sorted(macos_dir.glob("*.app.tar.gz"))
        if existing:
            return existing[0]

        apps = sorted(macos_dir.glob("*.app"))
        if not apps:
            continue

        app = apps[0]
        tar_path = macos_dir / f"{app.name}.tar.gz"
        with tarfile.open(tar_path, "w:gz") as tar:
            tar.add(app, arcname=app.name)
        return tar_path

    raise FileNotFoundError("macOS .app bundle not found for updater tarball")


def sign_file(repo_root: Path, artifact: Path) -> Path:
    if not os.environ.get("TAURI_SIGNING_PRIVATE_KEY"):
        raise EnvironmentError("TAURI_SIGNING_PRIVATE_KEY is not set")

    sig_path = artifact.parent / f"{artifact.name}.sig"
    if sig_path.is_file() and sig_path.read_text(encoding="utf-8").strip():
        print(f"Already signed: {artifact}")
        return sig_path

    desktop_dir = repo_root / "apps" / "desktop"
    cmd = ["npx", "tauri", "signer", "sign", str(artifact)]
    print(f"Signing: {artifact}")
    subprocess.run(cmd, cwd=desktop_dir, check=True)

    if not sig_path.is_file() or not sig_path.read_text(encoding="utf-8").strip():
        raise RuntimeError(f"Signing did not produce a valid signature: {sig_path}")

    print(f"Signed: {sig_path}")
    return sig_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Sign Tauri updater artifacts")
    parser.add_argument("--platform", choices=["windows", "macos"], required=True)
    parser.add_argument("--repo-root", default=".")
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve()
    dirs = bundle_dirs(repo_root, args.platform)
    if not dirs:
        print("ERROR: No bundle directories found", file=sys.stderr)
        return 1

    try:
        if args.platform == "windows":
            artifact = find_windows_installer(dirs)
        else:
            artifact = ensure_macos_tarball(dirs)
        sign_file(repo_root, artifact)
    except (FileNotFoundError, EnvironmentError, RuntimeError, subprocess.CalledProcessError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
