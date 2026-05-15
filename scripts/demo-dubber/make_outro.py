"""
Generate a branded outro card for the Orivraa demo video.

Creates:
  outro.mp4          — 10s branded end card (dark bg + logo text + CTA)
  source_extended.mp4 — original source video + outro appended

Usage:
  python make_outro.py
"""

import subprocess
import sys
from pathlib import Path

SCRIPT_DIR   = Path(__file__).parent
SOURCE_VIDEO = SCRIPT_DIR / "Untitled video (1).mp4"
OUTRO_VIDEO  = SCRIPT_DIR / "outro.mp4"
EXTENDED_SRC = SCRIPT_DIR / "source_extended.mp4"

# Match source video dimensions
WIDTH  = 1920
HEIGHT = 1080
FPS    = 30

# Outro duration in seconds
OUTRO_DURATION = 10

# Colors (hex → BGR for ffmpeg, but ffmpeg actually accepts #RRGGBB)
BG_COLOR    = "0x0D1117"   # near-black navy
GOLD_COLOR  = "0xD4AF37"   # classic gold
WHITE_COLOR = "0xF2F2F2"   # off-white
DIM_COLOR   = "0x8B92A5"   # muted gray

def make_outro():
    """Generate the 10s branded outro card."""
    if OUTRO_VIDEO.exists():
        OUTRO_VIDEO.unlink()

    # Font sizes
    logo_size  = 96
    tag_size   = 36
    url_size   = 48
    cta_size   = 30

    # Vertical positions (centered layout)
    logo_y  = "(h/2)-190"
    line_y1 = "(h/2)-70"
    line_y2 = "(h/2)+20"
    tag_y   = "(h/2)+90"
    url_y   = "(h/2)+170"
    cta_y   = "(h/2)+240"

    # Build drawtext filter chain
    # Each drawtext uses alpha to participate in fade-in / fade-out
    # fade_in: t<1.5 => 0→1, fade_out: t>7.5 => 1→0
    alpha_expr = "if(lt(t,1.5),t/1.5,if(gt(t,7.5),(10-t)/2.5,1))"

    def dt(text, y, size, color, box=False):
        base = (
            f"drawtext=text='{text}'"
            f":fontfile=C\\\\:/Windows/Fonts/segoeuib.ttf"
            f":fontsize={size}"
            f":fontcolor={color}@1"
            f":alpha='{alpha_expr}'"
            f":x=(w-text_w)/2"
            f":y={y}"
        )
        if box:
            base += f":box=1:boxcolor=0x1A1F2E@0.7:boxborderw=20"
        return base

    # Decoration: thin gold horizontal line above and below logo text
    gold_line_top    = f"drawbox=x=iw/2-200:y=(ih/2)-130:w=400:h=3:color={GOLD_COLOR}@1:t=fill,alpha='{alpha_expr}'"

    filters = ",".join([
        # Logo text "Orivraa"
        dt("Orivraa", logo_y, logo_size, WHITE_COLOR),
        # Gold accent line below logo
        f"drawbox=x=(iw-400)/2:y=(ih/2)-110:w=400:h=3:color={GOLD_COLOR}:t=fill",
        # Tagline
        dt("The all-in-one CRM \\& POS for jewellery shops", tag_y, tag_size, DIM_COLOR),
        # Website
        dt("orivraa.com", url_y, url_size, GOLD_COLOR),
        # CTA
        dt("Start your free 30-day trial", cta_size, cta_size, WHITE_COLOR),
    ])

    # Build full filter: dark background + text overlays + overall fade
    # Use lavfi color source as base
    vf = (
        f"fade=type=in:start_time=0:duration=1.5,"
        f"fade=type=out:start_time=7.5:duration=2.5,"
        # Orivraa (large)
        f"drawtext=text='Orivraa'"
        f":fontfile='C\\:/Windows/Fonts/segoeuib.ttf'"
        f":fontsize={logo_size}"
        f":fontcolor={WHITE_COLOR}"
        f":x=(w-text_w)/2:y=(h/2)-190,"
        # Thin gold accent line
        f"drawbox=x=(w-400)/2:y=(h/2)-100:w=400:h=3:color={GOLD_COLOR}:t=fill,"
        # Tagline
        f"drawtext=text='The all-in-one CRM & POS for jewellery shops'"
        f":fontfile='C\\:/Windows/Fonts/segoeui.ttf'"
        f":fontsize={tag_size}"
        f":fontcolor={DIM_COLOR}"
        f":x=(w-text_w)/2:y=(h/2)-50,"
        # Website URL (gold)
        f"drawtext=text='orivraa.com'"
        f":fontfile='C\\:/Windows/Fonts/segoeuib.ttf'"
        f":fontsize={url_size}"
        f":fontcolor={GOLD_COLOR}"
        f":x=(w-text_w)/2:y=(h/2)+60,"
        # CTA
        f"drawtext=text='Start your free 30-day trial'"
        f":fontfile='C\\:/Windows/Fonts/segoeui.ttf'"
        f":fontsize={cta_size}"
        f":fontcolor={WHITE_COLOR}@0.75"
        f":x=(w-text_w)/2:y=(h/2)+135"
    )

    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi",
        "-i", f"color=c=0x0D1117:size={WIDTH}x{HEIGHT}:rate={FPS}:d={OUTRO_DURATION}",
        "-vf", vf,
        "-an",
        "-c:v", "libx264", "-preset", "fast", "-crf", "18",
        "-pix_fmt", "yuv420p",
        str(OUTRO_VIDEO),
    ]

    print("Generating outro card ...")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print("ffmpeg stderr:", result.stderr[-3000:])
        sys.exit(1)
    print(f"[OK] outro.mp4 ({OUTRO_VIDEO.stat().st_size / 1_048_576:.1f} MB)")


def make_extended_source():
    """Concatenate source video + outro to create source_extended.mp4."""
    if not SOURCE_VIDEO.exists():
        print(f"ERROR: Source video not found: {SOURCE_VIDEO}")
        sys.exit(1)
    if not OUTRO_VIDEO.exists():
        print("ERROR: outro.mp4 not found. Run make_outro() first.")
        sys.exit(1)

    if EXTENDED_SRC.exists():
        EXTENDED_SRC.unlink()

    # Use filter_complex concat — more reliable than the concat demuxer
    # Re-encode to ensure uniform stream params across the join
    cmd = [
        "ffmpeg", "-y",
        "-i", str(SOURCE_VIDEO),
        "-i", str(OUTRO_VIDEO),
        "-filter_complex",
        "[0:v][1:v]concat=n=2:v=1:a=0[v]",
        "-map", "[v]",
        "-c:v", "libx264", "-preset", "fast", "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-an",
        str(EXTENDED_SRC),
    ]

    print("Concatenating source + outro (re-encoding video) ...")
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        print("ffmpeg stderr:", result.stderr[-3000:])
        sys.exit(1)

    dur = float(subprocess.check_output([
        "ffprobe", "-v", "quiet", "-show_entries", "format=duration",
        "-of", "csv=p=0", str(EXTENDED_SRC)
    ]).decode().strip())
    print(f"[OK] source_extended.mp4 — duration {dur/60:.1f} min ({dur:.1f}s)")


if __name__ == "__main__":
    make_outro()
    make_extended_source()
    print("\nDone. Now run:")
    print("  python assemble.py --lang en --merge-video")
    print("  python burn_subs.py --interval 15")
