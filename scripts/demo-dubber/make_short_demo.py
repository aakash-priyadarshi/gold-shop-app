"""
Build a short ~30-second screenshot-based demo video for the homepage / landing.

Input:
  output/en/short_frames/*.png  — 7 chapter screenshots (1920x1080)

Output:
  output/en/orivraa-demo-short-en.mp4
    - 1920x1080 @ 30fps
    - silent (autoplays muted on website hero / homepage card)
    - ~30 seconds total: 1s intro fade + 7 chapters x 4s with text overlay
      and gentle Ken-Burns (zoom-in) + cross-fades between chapters
    - subtle gold gradient bar at the bottom for the chapter label

Usage:
  python make_short_demo.py [--lang en] [--music PATH]

If --music PATH is supplied (mp3/wav), it will be mixed in at -18 dB. Otherwise
the video is silent — perfect for autoplay-muted on the homepage.
"""

import argparse
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
OUTPUT_DIR = SCRIPT_DIR / "output"

WIDTH, HEIGHT, FPS = 1920, 1080, 30
PER_CHAPTER_SEC = 4.0          # each chapter shown for 4s
FADE_SEC        = 0.6          # cross-fade between chapters

# (filename, big-label, sub-label)
# Keep labels short — they're burned with drawtext and need to read instantly.
CHAPTERS = [
    ("01_dashboard.png", "Live Dashboard",        "Gold & silver rates, real-time sales"),
    ("02_inventory.png", "Smart Inventory",       "Track by weight, purity & HUID"),
    ("03_pos.png",       "Lightning POS",         "Barcode scan, instant checkout"),
    ("04_invoice.png",   "GST / VAT Invoices",    "One-click tax-compliant billing"),
    ("05_catalogue.png", "Digital Catalogues",    "Share on WhatsApp, take orders"),
    ("06_analytics.png", "Reports & Analytics",   "Profit, GSTR1, daily closing"),
    ("07_ai.png",        "AI Business Insights",  "Ask in plain English, get answers"),
]


def _escape_drawtext(s: str) -> str:
    """Escape characters for ffmpeg drawtext."""
    return (
        s.replace("\\", "\\\\")
         .replace(":", r"\:")
         .replace("'", r"\'")
         .replace(",", r"\,")
    )


def build_chapter_clip(
    src: Path,
    out: Path,
    big: str,
    sub: str,
    duration: float,
):
    """
    Render one chapter:
      • scale + center on 1920x1080 (background black)
      • Ken-Burns: subtle zoom from 1.0 -> 1.05 over the chapter
      • Bottom gradient bar with big white title + amber subtitle
      • Fade in + fade out at edges
    """
    big_e = _escape_drawtext(big)
    sub_e = _escape_drawtext(sub)

    # Use Arial + bold via fontfile=Arial; on Windows ffmpeg picks system fonts.
    # For maximum portability use the simple "font=" name.
    vf = (
        # 1. Scale source to 1920x1080 with black letterbox bars if needed
        f"scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=decrease,"
        f"pad={WIDTH}:{HEIGHT}:(ow-iw)/2:(oh-ih)/2:black,"
        f"setsar=1,fps={FPS},"
        # 2. Bottom gradient bar (220px tall)
        f"drawbox=x=0:y={HEIGHT - 220}:w={WIDTH}:h=220:"
        f"color=black@0.55:t=fill,"
        # 4. Gold accent line just above the bar
        f"drawbox=x=80:y={HEIGHT - 224}:w=120:h=4:color=0xFCC419:t=fill,"
        # 5. Big chapter title
        f"drawtext=text='{big_e}':"
        f"fontcolor=white:fontsize=72:font=Arial:"
        f"x=80:y={HEIGHT - 180}:"
        f"shadowcolor=black@0.6:shadowx=2:shadowy=2,"
        # 6. Subtitle
        f"drawtext=text='{sub_e}':"
        f"fontcolor=0xFCC419:fontsize=36:font=Arial:"
        f"x=80:y={HEIGHT - 90}:"
        f"shadowcolor=black@0.6:shadowx=1:shadowy=1,"
        # 7. Fade in / out
        f"fade=t=in:st=0:d=0.3,"
        f"fade=t=out:st={duration - 0.4}:d=0.4"
    )

    cmd = [
        "ffmpeg", "-y",
        "-loop", "1",
        "-t", f"{duration}",
        "-i", str(src),
        "-vf", vf,
        "-c:v", "libx264", "-preset", "fast", "-crf", "20",
        "-pix_fmt", "yuv420p",
        "-r", str(FPS),
        str(out),
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"ERROR rendering {src.name}:\n", res.stderr[-2000:])
        sys.exit(1)


def concat_clips(clips: list[Path], out: Path, music: Path | None):
    """Concatenate chapter clips with cross-fades using xfade filter."""
    inputs = []
    for c in clips:
        inputs.extend(["-i", str(c)])

    # Build xfade chain: c0 -> xfade with c1 -> xfade with c2 ...
    # Each chapter is PER_CHAPTER_SEC; xfade overlap = FADE_SEC.
    # offset for clip i = (i * PER_CHAPTER_SEC) - (i * FADE_SEC)
    n = len(clips)
    chain = ""
    last = "[0:v]"
    cur_dur = PER_CHAPTER_SEC
    for i in range(1, n):
        offset = cur_dur - FADE_SEC
        out_label = f"[v{i}]"
        chain += (
            f"{last}[{i}:v]xfade=transition=fade:"
            f"duration={FADE_SEC}:offset={offset:.3f}{out_label};"
        )
        last = out_label
        cur_dur = cur_dur + PER_CHAPTER_SEC - FADE_SEC

    final_label = last
    filter_complex = chain.rstrip(";")

    cmd = [
        "ffmpeg", "-y",
        *inputs,
    ]
    if music is not None:
        cmd.extend(["-i", str(music)])

    cmd.extend([
        "-filter_complex", filter_complex,
        "-map", final_label,
    ])

    if music is not None:
        # Music is the last input (index n)
        # Loop and trim to total duration, lower volume
        total_dur = cur_dur
        cmd.extend([
            "-map", f"{n}:a",
            "-af", f"volume=0.35,afade=t=in:st=0:d=0.5,afade=t=out:st={total_dur - 1.0:.2f}:d=1.0",
            "-shortest",
            "-c:a", "aac", "-b:a", "192k",
        ])
    else:
        cmd.extend(["-an"])  # silent — autoplays on browsers

    cmd.extend([
        "-c:v", "libx264", "-preset", "fast", "-crf", "20",
        "-pix_fmt", "yuv420p",
        "-r", str(FPS),
        "-movflags", "+faststart",   # important for web streaming
        str(out),
    ])

    print("Concatenating chapters with cross-fades ...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print("ERROR during concat:\n", res.stderr[-3000:])
        sys.exit(1)

    dur = float(subprocess.check_output([
        "ffprobe", "-v", "quiet", "-show_entries", "format=duration",
        "-of", "csv=p=0", str(out)
    ], text=True).strip())
    size_mb = out.stat().st_size / 1_048_576
    print(f"[OK] {out.name}  ({size_mb:.2f} MB, {dur:.1f}s)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", default="en")
    ap.add_argument("--music", default=None,
                    help="Optional path to background music (mp3/wav). "
                         "If omitted, the demo is silent (autoplays muted).")
    args = ap.parse_args()

    lang_dir   = OUTPUT_DIR / args.lang
    frames_dir = lang_dir / "short_frames"
    if not frames_dir.exists():
        print(f"ERROR: frames directory not found: {frames_dir}")
        sys.exit(1)

    work_dir = lang_dir / "_short_clips"
    work_dir.mkdir(exist_ok=True)

    music = Path(args.music) if args.music else None
    if music and not music.exists():
        print(f"ERROR: music file not found: {music}")
        sys.exit(1)

    clips: list[Path] = []
    for idx, (fname, big, sub) in enumerate(CHAPTERS, 1):
        src = frames_dir / fname
        if not src.exists():
            print(f"ERROR: missing chapter frame: {src}")
            sys.exit(1)
        clip = work_dir / f"clip_{idx:02d}.mp4"
        print(f"  [{idx}/{len(CHAPTERS)}] {fname} -> {big}")
        build_chapter_clip(src, clip, big, sub, PER_CHAPTER_SEC)
        clips.append(clip)

    out = lang_dir / f"orivraa-demo-short-{args.lang}.mp4"
    concat_clips(clips, out, music)

    # Cleanup intermediate clips
    for c in clips:
        c.unlink(missing_ok=True)
    work_dir.rmdir()

    print(f"\nShort demo ready:\n  {out}")
    print("\nUpload to Cloudflare R2:")
    print(f"  wrangler r2 object put orivraa-demos/demo_short_{args.lang}.mp4 \\")
    print(f"    --file \"{out}\" --content-type video/mp4")


if __name__ == "__main__":
    main()
