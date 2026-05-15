"""
Fixes timing misalignment between dubbed audio and video.

Problem: Our manually estimated sub-timestamps don't account for the actual
TTS duration, so later segments overflow their slots and the audio lags behind.

Fix:
  1. Measure actual MP3 duration of every segment via ffprobe.
  2. Map each segment to its section (using original transcript boundaries).
  3. Within each section, place segments sequentially at actual duration,
     with a short breath-gap between them.
  4. If segments exceed the section's time budget, compress proportionally.
  5. Write improved_fixed.txt with corrected timestamps.
  6. Re-generate subtitles.srt with corrected timing.

Usage:
  python fix_timing.py              # writes improved_fixed.txt, shows report
  python fix_timing.py --apply      # also overwrites improved.txt in place
"""

import argparse
import json
import re
import shutil
import subprocess
from pathlib import Path

SCRIPT_DIR  = Path(__file__).parent
IMPROVED    = SCRIPT_DIR / "improved.txt"
SEGMENTS_EN = SCRIPT_DIR / "output" / "en" / "segments"
SRT_OUT     = SCRIPT_DIR / "output" / "en" / "subtitles.srt"

# Original transcript section start times (seconds), from transcript.txt
# These are the HARD anchors — the video DEFINITELY shows this content at this moment.
SECTION_ANCHORS = [
    (  0.0, "Introduction / website"),
    ( 65.9, "Login"),
    (124.3, "Dashboard + Products"),
    (244.6, "Inventory + Orders + Invoicing"),
    (855.0, "Bill Settings + Tax + Plans"),
    (1217.7, "Language + AI + Catalog"),
    (1419.1, "END"),          # video end
]

GAP_S = 0.5          # silence gap between segments (seconds)
MIN_COMPRESS = 0.65  # never compress below 65% of natural pace


# ── helpers ─────────────────────────────────────────────────────────────────

def ts_to_s(ts: str) -> float:
    """Convert [MM:SS] or [H:MM:SS] to seconds."""
    ts = ts.strip("[]")
    parts = ts.split(":")
    if len(parts) == 2:
        return int(parts[0]) * 60 + int(parts[1])
    return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])

def s_to_ts(s: float) -> str:
    """Convert seconds to [MM:SS]."""
    m, sec = divmod(int(round(s)), 60)
    return f"[{m:02d}:{sec:02d}]"

def s_to_srt_ts(s: float) -> str:
    """Convert seconds to SRT HH:MM:SS,mmm format."""
    ms = int(round(s * 1000))
    h, rem = divmod(ms, 3_600_000)
    m, rem = divmod(rem, 60_000)
    sec, ms = divmod(rem, 1000)
    return f"{h:02d}:{m:02d}:{sec:02d},{ms:03d}"

def get_mp3_duration(path: Path) -> float:
    """Return duration in seconds via ffprobe."""
    cmd = [
        "ffprobe", "-v", "quiet", "-print_format", "json",
        "-show_streams", str(path)
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    data = json.loads(result.stdout)
    for stream in data.get("streams", []):
        if "duration" in stream:
            return float(stream["duration"])
    # fallback via format
    cmd2 = ["ffprobe", "-v", "quiet", "-print_format", "json",
            "-show_format", str(path)]
    result2 = subprocess.run(cmd2, capture_output=True, text=True)
    data2 = json.loads(result2.stdout)
    return float(data2["format"]["duration"])


# ── parse improved.txt ───────────────────────────────────────────────────────

def parse_improved(path: Path):
    """Return list of (start_s, text) tuples."""
    segments = []
    ts_re = re.compile(r"^(\[\d{1,2}:\d{2}(?::\d{2})?\])\s*(.*)")
    for line in path.read_text(encoding="utf-8").splitlines():
        m = ts_re.match(line.strip())
        if m:
            segments.append((ts_to_s(m.group(1)), m.group(2)))
    return segments


# ── main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true",
                        help="Overwrite improved.txt with corrected timestamps")
    parser.add_argument("--segments-dir", default=str(SEGMENTS_EN),
                        help="Directory containing seg_001.mp3 … seg_053.mp3")
    args = parser.parse_args()

    seg_dir = Path(args.segments_dir)
    seg_files = sorted(seg_dir.glob("seg_*.mp3"))
    if not seg_files:
        print(f"ERROR: No seg_*.mp3 files found in {seg_dir}")
        return

    segments = parse_improved(IMPROVED)
    n = len(segments)

    if len(seg_files) != n:
        print(f"WARNING: {n} segments in improved.txt but {len(seg_files)} MP3s found — using min.")
        n = min(n, len(seg_files))
        segments = segments[:n]
        seg_files = seg_files[:n]

    # Measure actual durations
    print(f"\nMeasuring actual TTS duration of {n} MP3 segments…")
    durations = []
    for i, f in enumerate(seg_files):
        d = get_mp3_duration(f)
        durations.append(d)
        print(f"  seg {i+1:02d}: {d:.1f}s  (assigned start: {s_to_ts(segments[i][0])})", end="")
        # Check overflow into next segment's slot
        if i + 1 < n:
            gap = segments[i+1][0] - segments[i][0] - d
            if gap < 0:
                print(f"  ⚠ OVERFLOW by {-gap:.1f}s", end="")
        print()

    # Group segments by section
    # For each segment, find which section it belongs to based on original start_s
    section_starts = [a[0] for a in SECTION_ANCHORS]

    sections = []   # list of lists of segment indices
    for _ in SECTION_ANCHORS[:-1]:
        sections.append([])

    for i, (start_s, _) in enumerate(segments):
        sec_idx = 0
        for j in range(len(section_starts) - 1):
            if start_s >= section_starts[j]:
                sec_idx = j
        sections[sec_idx].append(i)

    # Compute corrected timestamps
    # Strategy:
    #   - For OVERFLOW sections: scale relative timings proportionally so nothing overflows
    #   - For FITTING sections: preserve original relative timing (don't repack tightly),
    #     just anchor the first segment to the section start so drift doesn't compound
    corrected_starts = [0.0] * n

    print("\n── Section timing analysis ──")
    for sec_idx, seg_indices in enumerate(sections):
        if not seg_indices:
            continue
        sec_start = section_starts[sec_idx]
        sec_end   = section_starts[sec_idx + 1]
        budget    = sec_end - sec_start

        total_audio = sum(durations[i] for i in seg_indices)
        total_gaps  = GAP_S * (len(seg_indices) - 1)
        total_needed = total_audio + total_gaps

        name = SECTION_ANCHORS[sec_idx][1]
        overflows = total_needed > budget

        if overflows:
            # OVERFLOW: scale relative timings proportionally to fit within budget
            compress = budget / total_needed
            compress = max(compress, MIN_COMPRESS)
            status = f"OVERFLOW by {total_needed - budget:.1f}s → compress {compress:.2f}x"
            print(f"\n  [{s_to_ts(sec_start)} – {s_to_ts(sec_end)}] {name}")
            print(f"    {len(seg_indices)} segs | audio={total_audio:.1f}s | budget={budget:.0f}s | {status}")
            cursor = sec_start
            for i in seg_indices:
                corrected_starts[i] = cursor
                cursor += durations[i] * compress + GAP_S
        else:
            # FITTING: preserve the ORIGINAL relative spacing between segments,
            # but shift the whole block so the first segment anchors to sec_start.
            # This keeps the user's intended on-screen timing ratios intact.
            first_orig = segments[seg_indices[0]][0]
            anchor_shift = sec_start - first_orig   # how much to shift all segs in this section

            # Check if any individual segment overflows into the next segment's slot
            for idx, i in enumerate(seg_indices):
                orig_s = segments[i][0]
                corrected_starts[i] = orig_s + anchor_shift

            # Secondary pass: if any segment still overflows its slot, nudge forward
            for idx in range(len(seg_indices) - 1):
                i = seg_indices[idx]
                j = seg_indices[idx + 1]
                end_of_i = corrected_starts[i] + durations[i] + GAP_S
                if end_of_i > corrected_starts[j]:
                    # push j forward by the overflow amount
                    push = end_of_i - corrected_starts[j]
                    for k in seg_indices[idx + 1:]:
                        corrected_starts[k] += push

            print(f"\n  [{s_to_ts(sec_start)} – {s_to_ts(sec_end)}] {name}")
            print(f"    {len(seg_indices)} segs | audio={total_audio:.1f}s | budget={budget:.0f}s | fits ✓ (relative spacing preserved)")

    # Print diff summary
    print("\n── Timestamp corrections ──")
    for i, (orig_s, text) in enumerate(segments):
        new_s = corrected_starts[i]
        delta = new_s - orig_s
        if abs(delta) > 2:
            print(f"  seg {i+1:02d}: {s_to_ts(orig_s)} → {s_to_ts(new_s)}  (Δ{delta:+.0f}s)  {text[:60]}…")

    # Write improved_fixed.txt
    fixed_path = SCRIPT_DIR / "improved_fixed.txt"
    lines = []
    for i, (_, text) in enumerate(segments):
        lines.append(f"{s_to_ts(corrected_starts[i])} {text}\n")
    fixed_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"\nWritten: {fixed_path}")

    # Write corrected SRT
    srt_lines = []
    for i, (_, text) in enumerate(segments):
        start_s = corrected_starts[i]
        end_s   = corrected_starts[i+1] if i + 1 < n else start_s + durations[i]
        end_s   = min(end_s, start_s + durations[i] + 0.3)  # don't bleed into next segment
        srt_lines.append(str(i + 1))
        srt_lines.append(f"{s_to_srt_ts(start_s)} --> {s_to_srt_ts(end_s)}")
        srt_lines.append(text)
        srt_lines.append("")
    fixed_srt = SCRIPT_DIR / "output" / "en" / "subtitles_fixed.srt"
    fixed_srt.write_text("\n".join(srt_lines), encoding="utf-8")
    print(f"Written: {fixed_srt}")

    if args.apply:
        shutil.copy(fixed_path, IMPROVED)
        shutil.copy(fixed_srt, SRT_OUT)
        print(f"\nimproved.txt and subtitles.srt updated in place.")
        print("Re-run assemble.py to rebuild audio.mp3 with corrected timing.")


if __name__ == "__main__":
    main()
