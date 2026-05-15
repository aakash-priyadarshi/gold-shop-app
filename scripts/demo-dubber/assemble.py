"""
Assemble per-segment MP3 files into a single timed audio track using ffmpeg.
Uses adelay + amix to place each segment at its exact timestamp.

Usage:
  python assemble.py                        # assembles output/en/
  python assemble.py --lang hi              # assembles output/hi/
  python assemble.py --lang en hi fr de     # multiple languages
  python assemble.py --all                  # all languages in output/
  python assemble.py --merge-video          # also mux with the original video
"""

import argparse
import logging
import re
import subprocess
import sys
from pathlib import Path

log = logging.getLogger("assembler")
logging.basicConfig(level=logging.INFO, format="%(levelname)-8s %(message)s")

SCRIPT_DIR = Path(__file__).parent
IMPROVED_TXT = SCRIPT_DIR / "improved.txt"
OUTPUT_DIR   = SCRIPT_DIR / "output"
# Use source_extended.mp4 (source + branded outro card) when available,
# otherwise fall back to the raw source recording.
VIDEO_FILE   = SCRIPT_DIR / "source_extended.mp4"
VIDEO_FILE_FALLBACK = SCRIPT_DIR / "Untitled video (1).mp4"

# ── Parse [MM:SS] or [H:MM:SS] timestamps from improved.txt ──────────────────

def load_timestamps(txt_path: Path) -> list[int]:
    """Return list of start times in ms, one per segment, in order."""
    ts_re = re.compile(r"^\[(\d{1,2}:\d{2}(?::\d{2})?)\]")
    times: list[int] = []
    for line in txt_path.read_text(encoding="utf-8").splitlines():
        m = ts_re.match(line.strip())
        if m:
            parts = m.group(1).split(":")
            if len(parts) == 2:
                ms = int(parts[0]) * 60_000 + int(parts[1]) * 1_000
            else:
                ms = int(parts[0]) * 3_600_000 + int(parts[1]) * 60_000 + int(parts[2]) * 1_000
            times.append(ms)
    return times


# ── ffmpeg assembly ───────────────────────────────────────────────────────────

def assemble_language(lang_dir: Path, timestamps: list[int], total_ms: int) -> Path:
    segs_dir = lang_dir / "segments"
    if not segs_dir.exists():
        # Already assembled (audio.mp3 present from previous run)
        assembled = lang_dir / "audio.mp3"
        if assembled.exists():
            log.info(f"  [{lang_dir.name}] audio.mp3 already exists, skipping assembly.")
            return assembled
        raise FileNotFoundError(f"No segments dir and no audio.mp3 in {lang_dir}")

    seg_files = sorted(segs_dir.glob("seg_*.mp3"))
    n = len(seg_files)
    if n == 0:
        raise FileNotFoundError(f"No segment files found in {segs_dir}")

    log.info(f"  [{lang_dir.name}] Assembling {n} segments into timed audio track…")

    # Build a long silence base track then use adelay on each segment and amix
    # Format: -filter_complex "[0]adelay=T|T[s0];[1]adelay=T|T[s1];...;[s0][s1]...amix=inputs=N:normalize=0[out]"
    # We also add a silent "anchor" input so the total duration is always right

    total_s = total_ms / 1000.0

    # Input 0: base silence for full video duration
    ffmpeg_inputs = [
        "-f", "lavfi",
        "-i", f"anullsrc=r=44100:cl=stereo:d={total_s:.3f}",
    ]
    filter_parts = [f"[0]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[base]"]

    for i, seg_file in enumerate(seg_files):
        ffmpeg_inputs += ["-i", str(seg_file)]
        idx = i + 1  # input index (0 is the silence base)
        delay_ms = timestamps[i] if i < len(timestamps) else 0
        filter_parts.append(
            f"[{idx}]adelay={delay_ms}|{delay_ms},"
            f"apad=pad_dur={max(0, total_s - delay_ms/1000)}"
            f"[s{i}]"
        )

    # Mix: base + all segments
    mix_inputs = "[base]" + "".join(f"[s{i}]" for i in range(n))
    filter_parts.append(
        f"{mix_inputs}amix=inputs={n+1}:duration=first:normalize=0[out]"
    )

    out_path = lang_dir / "audio.mp3"
    cmd = (
        ["ffmpeg", "-y"]
        + ffmpeg_inputs
        + ["-filter_complex", ";".join(filter_parts)]
        + ["-map", "[out]", "-b:a", "192k", str(out_path)]
    )

    log.info(f"  Running ffmpeg (this may take 1-2 min for a 24-min track)…")
    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
        size_mb = out_path.stat().st_size / 1_048_576
        log.info(f"  [{lang_dir.name}] ✓ audio.mp3 ({size_mb:.1f} MB) → {out_path}")
        return out_path
    except subprocess.CalledProcessError as e:
        log.error(f"  ffmpeg failed:\n{e.stderr[-2000:]}")
        raise


# ── Video mux ────────────────────────────────────────────────────────────────

def merge_with_video(lang_dir: Path, video_file: Path) -> Path:
    audio_path = lang_dir / "audio.mp3"
    if not audio_path.exists():
        raise FileNotFoundError(f"audio.mp3 not found in {lang_dir}")

    out_video = lang_dir / f"orivraa-demo-{lang_dir.name}.mp4"
    cmd = [
        "ffmpeg", "-y",
        "-i", str(video_file),
        "-i", str(audio_path),
        "-c:v", "copy",       # keep original video stream unchanged
        "-map", "0:v:0",      # video from original
        "-map", "1:a:0",      # audio from new dubbed track
        # No -shortest: audio must play to completion (incl. narration over outro card)
        str(out_video),
    ]
    log.info(f"  [{lang_dir.name}] Muxing video + dubbed audio…")
    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
        size_mb = out_video.stat().st_size / 1_048_576
        log.info(f"  [{lang_dir.name}] ✓ {out_video.name} ({size_mb:.1f} MB)")
        return out_video
    except subprocess.CalledProcessError as e:
        log.error(f"  ffmpeg merge failed:\n{e.stderr[-2000:]}")
        raise


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Assemble dubbed segments into timed audio")
    parser.add_argument("--lang", nargs="+", metavar="LANG", help="Language code(s) to assemble (e.g. en hi fr)")
    parser.add_argument("--all", action="store_true", help="Assemble all languages in output/")
    parser.add_argument("--merge-video", action="store_true", help="Also mux assembled audio with the original video")
    parser.add_argument("--output", default=str(OUTPUT_DIR), help="Output directory (default: ./output)")
    args = parser.parse_args()

    out_dir = Path(args.output)
    timestamps = load_timestamps(IMPROVED_TXT)
    log.info(f"Loaded {len(timestamps)} segment timestamps from {IMPROVED_TXT.name}")

    # Total video duration: max timestamp + generous tail (use max not last,
    # since segments may be appended out of chronological order)
    total_ms = max(timestamps) + 15_000  # last seg + 15s tail

    if args.all:
        lang_dirs = [d for d in out_dir.iterdir() if d.is_dir() and d.name not in ("segments",)]
    elif args.lang:
        lang_dirs = [out_dir / l for l in args.lang]
    else:
        # Default: just English
        lang_dirs = [out_dir / "en"]

    if VIDEO_FILE.exists():
        video_file = VIDEO_FILE
    elif VIDEO_FILE_FALLBACK.exists():
        video_file = VIDEO_FILE_FALLBACK
        log.warning("source_extended.mp4 not found — using raw source. Run make_outro.py first for proper outro card.")
    else:
        video_file = None
    if args.merge_video and not video_file:
        log.warning(f"Video file not found at {VIDEO_FILE}. Skipping video merge.")
        args.merge_video = False

    for lang_dir in lang_dirs:
        if not lang_dir.exists():
            log.warning(f"Language directory not found: {lang_dir}, skipping.")
            continue
        log.info(f"\n── {lang_dir.name} ──")
        try:
            assemble_language(lang_dir, timestamps, total_ms)
            if args.merge_video:
                merge_with_video(lang_dir, video_file)
        except Exception as exc:
            log.error(f"  Failed: {exc}")

    log.info("\nDone.")


if __name__ == "__main__":
    main()
