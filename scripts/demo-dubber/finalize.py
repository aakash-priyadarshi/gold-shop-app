"""
Finalize the demo video by prepending the branded intro clip.

Input:
  INTRO_VIDEO         — the "solving chaos" intro clip (any resolution/fps)
  orivraa-demo-en-sub.mp4  — subtitled demo (already has outro baked in)

Output:
  output/en/orivraa-demo-en-final.mp4

The intro is scaled + frame-rate-matched to 1920x1080 @ 30fps before concat.
Since subtitles are hard-burned, they remain perfectly synced after prepend.

Usage:
  python finalize.py [--intro path/to/intro.mp4] [--lang en]
"""

import argparse
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR   = Path(__file__).parent
OUTPUT_DIR   = SCRIPT_DIR / "output"

DEFAULT_INTRO = Path(r"C:\Users\aakas\Downloads\solving_chaos_finalmp_.mp4")
WIDTH, HEIGHT, FPS = 1920, 1080, 30


def scale_intro(intro_src: Path, scaled: Path):
    """Re-encode intro to 1920x1080 @ 30fps with silent audio."""
    if scaled.exists():
        scaled.unlink()

    cmd = [
        "ffmpeg", "-y",
        "-i", str(intro_src),
        "-vf", f"scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=decrease,"
               f"pad={WIDTH}:{HEIGHT}:(ow-iw)/2:(oh-ih)/2:black,"
               f"fps={FPS}",
        "-c:v", "libx264", "-preset", "fast", "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-an",          # drop original audio (intro is SFX/music, no narration)
        str(scaled),
    ]
    print(f"Scaling intro to {WIDTH}x{HEIGHT} @ {FPS}fps ...")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print("ERROR scaling intro:\n", result.stderr[-2000:])
        sys.exit(1)
    dur = _duration(scaled)
    print(f"[OK] intro scaled ({dur:.1f}s)")
    return dur


def concat_videos(intro: Path, demo: Path, output: Path):
    """Concatenate scaled intro (video-only) + demo (video+audio)."""
    if output.exists():
        output.unlink()

    # intro has no audio; demo has audio from narration.
    # We pad the intro with silence so amix works correctly.
    # Filter graph:
    #   [0:v] intro video
    #   [1:v][1:a] demo video+audio
    #   concat n=2, produces [v][a]
    #   For input 0 audio: anullsrc (silent track, same duration as intro)
    intro_dur = _duration(intro)

    cmd = [
        "ffmpeg", "-y",
        "-i", str(intro),
        "-i", str(demo),
        "-filter_complex",
        (
            # Pad intro with silent audio
            f"anullsrc=r=44100:cl=stereo:d={intro_dur:.3f}[a0];"
            # concat video streams
            "[0:v][1:v]concat=n=2:v=1:a=0[v];"
            # concat audio streams (silent intro + demo audio)
            f"[a0][1:a]concat=n=2:v=0:a=1[a]"
        ),
        "-map", "[v]",
        "-map", "[a]",
        "-c:v", "libx264", "-preset", "fast", "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k",
        str(output),
    ]

    print("Concatenating intro + demo ...")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print("ERROR during concat:\n", result.stderr[-3000:])
        sys.exit(1)

    total = _duration(output)
    size_mb = output.stat().st_size / 1_048_576
    print(f"[OK] {output.name}  ({size_mb:.1f} MB, {total/60:.1f} min)")


def _duration(path: Path) -> float:
    out = subprocess.check_output([
        "ffprobe", "-v", "quiet", "-show_entries", "format=duration",
        "-of", "csv=p=0", str(path)
    ], text=True)
    return float(out.strip())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--intro", default=str(DEFAULT_INTRO),
                    help="Path to intro clip (default: solving_chaos_finalmp_.mp4)")
    ap.add_argument("--lang", default="en",
                    help="Language code (default: en)")
    ap.add_argument("--no-subs", action="store_true",
                    help="Use the no-subtitle version (orivraa-demo-{lang}.mp4) instead of the subtitled one")
    args = ap.parse_args()

    intro_src = Path(args.intro)
    if not intro_src.exists():
        print(f"ERROR: Intro video not found: {intro_src}")
        sys.exit(1)

    lang_dir = OUTPUT_DIR / args.lang
    # Prefer the subtitled version unless --no-subs is set or -sub.mp4 doesn't exist
    demo_src_sub    = lang_dir / f"orivraa-demo-{args.lang}-sub.mp4"
    demo_src_nosub  = lang_dir / f"orivraa-demo-{args.lang}.mp4"
    if args.no_subs or not demo_src_sub.exists():
        demo_src = demo_src_nosub
    else:
        demo_src = demo_src_sub
    if not demo_src.exists():
        print(f"ERROR: Demo video not found: {demo_src}")
        sys.exit(1)
    print(f"Using demo: {demo_src.name}")

    scaled_intro = SCRIPT_DIR / "_intro_scaled.mp4"
    final_out    = lang_dir / f"orivraa-demo-{args.lang}-final.mp4"

    scale_intro(intro_src, scaled_intro)
    concat_videos(scaled_intro, demo_src, final_out)
    scaled_intro.unlink(missing_ok=True)

    print(f"\nFinal video ready:\n  {final_out}")
    print("\nUpload to Cloudflare R2:")
    print(f"  wrangler r2 object put orivraa-demos/demo_voiced_{args.lang}.mp4 \\")
    print(f"    --file \"{final_out}\" --content-type video/mp4")


if __name__ == "__main__":
    main()
