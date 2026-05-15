#!/usr/bin/env python3
"""
Burn English subtitles into the dubbed video, then extract verification frames.
Usage:
    python burn_subs.py                  # burn + extract every 15s
    python burn_subs.py --interval 30    # 30-second frames
    python burn_subs.py --skip-burn      # re-extract frames only (reuse existing subtitled video)
"""
import argparse
import os
import re
import subprocess
import textwrap

DUBBER_DIR = os.path.dirname(os.path.abspath(__file__))
SCRIPT_FILE = os.path.join(DUBBER_DIR, "improved.txt")
VIDEO_IN    = os.path.join(DUBBER_DIR, "output", "en", "orivraa-demo-en.mp4")
SRT_FILE    = os.path.join(DUBBER_DIR, "output", "en", "subs.srt")
VIDEO_OUT   = os.path.join(DUBBER_DIR, "output", "en", "orivraa-demo-en-sub.mp4")
FRAMES_DIR  = os.path.join(DUBBER_DIR, "verify_frames_15s")
# VIDEO_END: probe the actual input video duration (handles source_extended.mp4 with outro)
def _get_video_dur(path):
    try:
        out = subprocess.check_output(
            ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
             "-of", "csv=p=0", path], text=True
        )
        return float(out.strip())
    except Exception:
        return 1419.1  # fallback: original source duration
VIDEO_END = _get_video_dur(VIDEO_IN)


def parse_segments(path):
    segs = []
    for line in open(path, encoding="utf-8"):
        m = re.match(r'^\[(\d{2}):(\d{2})\]\s*(.+)', line.strip())
        if m:
            t = int(m[1]) * 60 + int(m[2])
            segs.append((t, m[3].strip()))
    return segs


def srt_ts(s):
    s = float(s)
    h, rem = divmod(int(s), 3600)
    m, sec = divmod(rem, 60)
    ms = int(round((s - int(s)) * 1000))
    return f"{h:02d}:{m:02d}:{sec:02d},{ms:03d}"


def write_srt(segs, out_path, seg_dir=None):
    """Write SRT file. seg_dir: directory containing seg_NNN.mp3 files (to
    compute actual audio duration and avoid over-long subtitles in silence gaps)."""
    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    # Pre-compute audio durations if MP3 files are available
    audio_durs = {}
    if seg_dir and os.path.isdir(seg_dir):
        for idx in range(len(segs)):
            mp3 = os.path.join(seg_dir, f"seg_{idx + 1:03d}.mp3")
            if os.path.exists(mp3):
                try:
                    r = subprocess.run(
                        ["ffprobe", "-v", "quiet", "-show_entries",
                         "format=duration", "-of", "csv=p=0", mp3],
                        capture_output=True, text=True
                    )
                    audio_durs[idx] = float(r.stdout.strip())
                except Exception:
                    pass

    # Sort by timestamp for valid SRT ordering, preserving original file index
    # for correct audio duration lookup (file index maps to seg_NNN.mp3)
    indexed_segs = sorted(enumerate(segs), key=lambda x: x[1][0])

    entries = []
    for new_i, (orig_idx, (start, text)) in enumerate(indexed_segs):
        if new_i + 1 < len(indexed_segs):
            next_start = indexed_segs[new_i + 1][1][0]
            natural_end = next_start - 0.3
        else:
            natural_end = VIDEO_END
        if orig_idx in audio_durs:
            # Cap subtitle to audio duration + 1s buffer so it clears before silence
            audio_end = start + audio_durs[orig_idx] + 1.0
            end = min(natural_end, audio_end)
        else:
            end = natural_end
        wrapped = "\n".join(textwrap.wrap(text, width=72))
        entries.append(f"{new_i + 1}\n{srt_ts(start)} --> {srt_ts(end)}\n{wrapped}\n")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(entries))
    print(f"[OK] SRT: {out_path} ({len(segs)} subtitles)")


def burn_subtitles(video_in, srt_path, video_out):
    """Burn subtitles into video. Runs ffmpeg from the SRT directory so the
    Windows drive-letter colon doesn't confuse the subtitles filter."""
    srt_dir  = os.path.dirname(os.path.abspath(srt_path))
    srt_name = os.path.basename(srt_path)

    style = (
        "FontName=Arial,FontSize=18,"
        "PrimaryColour=&H00FFFFFF,"   # white text
        "OutlineColour=&H00000000,"   # black outline
        "BorderStyle=3,"              # opaque box
        "BackColour=&H80000000,"      # semi-transparent black box
        "Outline=1,Shadow=0,"
        "Alignment=2,MarginV=30"      # bottom-center, 30px margin
    )
    vf = f"subtitles='{srt_name}':force_style='{style}'"

    cmd = [
        "ffmpeg", "-y",
        "-i", video_in,
        "-vf", vf,
        "-c:v", "libx264", "-crf", "22", "-preset", "fast",
        "-c:a", "copy",
        video_out
    ]
    print("Burning subtitles into video (re-encoding video track, ~5-8 min) ...")
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=srt_dir)
    if result.returncode != 0:
        print("=== ffmpeg STDERR (last 3000 chars) ===")
        print(result.stderr[-3000:])
        raise RuntimeError("ffmpeg subtitle burn failed — see above")
    mb = os.path.getsize(video_out) / 1_048_576
    print(f"[OK] {os.path.basename(video_out)} ({mb:.1f} MB)")


def extract_frames(video, frames_dir, interval):
    os.makedirs(frames_dir, exist_ok=True)

    # Get video duration via ffprobe
    probe = subprocess.run(
        ["ffprobe", "-v", "error",
         "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1",
         video],
        capture_output=True, text=True
    )
    dur = float(probe.stdout.strip())
    timestamps = list(range(0, int(dur), interval))

    print(f"Extracting {len(timestamps)} frames every {interval}s from subtitled video ...")
    for t in timestamps:
        out = os.path.join(frames_dir, f"frame_{t:05d}.jpg")
        subprocess.run([
            "ffmpeg", "-y",
            "-ss", str(t),
            "-i", video,
            "-frames:v", "1",
            "-q:v", "3",
            out
        ], capture_output=True)

    count = sum(1 for f in os.listdir(frames_dir) if f.endswith(".jpg"))
    print(f"[OK] {count} frames saved -> {frames_dir}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--interval", type=int, default=15,
                    help="Screenshot every N seconds (default: 15)")
    ap.add_argument("--skip-burn", action="store_true",
                    help="Skip subtitle burning; reuse existing subtitled video")
    args = ap.parse_args()

    segs = parse_segments(SCRIPT_FILE)
    print(f"Loaded {len(segs)} segments from improved.txt")

    seg_dir = os.path.join(DUBBER_DIR, "output", "en", "segments")
    write_srt(segs, SRT_FILE, seg_dir=seg_dir)

    if not args.skip_burn:
        burn_subtitles(VIDEO_IN, SRT_FILE, VIDEO_OUT)
    else:
        if not os.path.exists(VIDEO_OUT):
            raise FileNotFoundError(f"Subtitled video not found: {VIDEO_OUT}\nRun without --skip-burn first.")
        print(f"Skipping burn — using existing {os.path.basename(VIDEO_OUT)}")

    extract_frames(VIDEO_OUT, FRAMES_DIR, args.interval)
    print(f"\nAll done. Review frames in:\n  {FRAMES_DIR}")
