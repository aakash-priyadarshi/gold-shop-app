"""
verify_frames.py  —  Screenshot-based timing verification
Extracts a frame every INTERVAL seconds from the dubbed video, then overlays
a text label showing:
  • the timestamp
  • which segment is actively speaking at that moment
  • the first ~80 chars of that segment's text

Usage:
    python verify_frames.py [--interval 30] [--video output/en/orivraa-demo-en.mp4]
Output:
    verify_frames/  — folder of labelled JPEG frames
    verify_report.txt  — text summary of every frame
"""
import argparse
import re
import subprocess
import sys
import textwrap
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent

def load_segments(txt_path: Path):
    """Return list of (start_s, end_s, text) — end_s is start of next seg (or +9999)."""
    segs = []
    for line in txt_path.read_text(encoding="utf-8").splitlines():
        m = re.match(r"\[(\d+):(\d+)\]\s+(.*)", line.strip())
        if m:
            mm, ss, text = int(m.group(1)), int(m.group(2)), m.group(3).strip()
            segs.append([mm * 60 + ss, text])
    result = []
    for i, (start, text) in enumerate(segs):
        end = segs[i + 1][0] if i + 1 < len(segs) else start + 9999
        result.append((start, end, text))
    return result


def seg_at(segs, t):
    """Return the segment whose window contains time t (looks back up to 60s)."""
    active = None
    for start, end, text in segs:
        if start <= t:
            active = (start, end, text)
        elif start > t:
            break
    return active


def video_duration(video: Path) -> float:
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(video)],
        stderr=subprocess.DEVNULL,
    )
    return float(out.strip())


def ts(s: float) -> str:
    m, sec = divmod(int(s), 60)
    return f"{m:02d}:{sec:02d}"


def extract_frames(video: Path, segs, interval: int, out_dir: Path):
    out_dir.mkdir(exist_ok=True)
    duration = video_duration(video)
    times = list(range(0, int(duration), interval))

    report_lines = []
    frames_info = []

    for t in times:
        seg = seg_at(segs, t)
        if seg:
            start, end, text = seg
            snippet = textwrap.shorten(text, 80, placeholder="…")
            label = f"[{ts(t)}]  SEG starts {ts(start)}  |  {snippet}"
            status = "SPEAKING" if t < end else f"gap (next seg: {ts(end)})"
        else:
            label = f"[{ts(t)}]  (before first segment)"
            status = "pre-roll"

        report_lines.append(f"{ts(t)}  →  {status}  |  {label}")
        frames_info.append((t, label))

    # Extract frames with ffmpeg in one pass using select filter
    frame_paths = []
    for t, label in frames_info:
        out_path = out_dir / f"frame_{t:05d}.jpg"
        frame_paths.append((t, label, out_path))
        # Draw label on frame using drawtext
        safe_label = label.replace("'", "\\'").replace(":", "\\:").replace("[", "\\[").replace("]", "\\]")
        cmd = [
            "ffmpeg", "-y", "-ss", str(t), "-i", str(video),
            "-vframes", "1",
            "-vf", (
                f"scale=960:-1,"
                f"drawtext=fontsize=18:fontcolor=white:box=1:boxcolor=black@0.65:boxborderw=6:"
                f"x=10:y=10:text='{safe_label}'"
            ),
            "-q:v", "3",
            str(out_path),
        ]
        result = subprocess.run(cmd, capture_output=True)
        if result.returncode != 0:
            print(f"  ffmpeg error at {ts(t)}: {result.stderr[-200:].decode(errors='replace')}")
        else:
            print(f"  frame {ts(t)}  ✓")

    report_path = SCRIPT_DIR / "verify_report.txt"
    report_path.write_text("\n".join(report_lines), encoding="utf-8")
    print(f"\nReport: {report_path}")
    print(f"Frames: {out_dir}  ({len(frame_paths)} files)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--interval", type=int, default=30)
    ap.add_argument("--video", default="output/en/orivraa-demo-en.mp4")
    ap.add_argument("--script", default="improved.txt")
    args = ap.parse_args()

    video = SCRIPT_DIR / args.video
    script = SCRIPT_DIR / args.script
    out_dir = SCRIPT_DIR / "verify_frames"

    if not video.exists():
        sys.exit(f"Video not found: {video}")
    if not script.exists():
        sys.exit(f"Script not found: {script}")

    segs = load_segments(script)
    print(f"Loaded {len(segs)} segments from {script.name}")
    print(f"Video: {video.name}  |  interval: {args.interval}s")
    extract_frames(video, segs, args.interval, out_dir)


if __name__ == "__main__":
    main()
