"""
repair_audio.py — Fix the out-of-order segments 52–56 produced by dub.py.

Usage:
    python repair_audio.py --lang fr --correct-part-end 1390500

Where --correct-part-end is: 1387000 + duration_ms_of_seg_051 in that language.
The 5 misplaced segments are overlaid at their correct positions:
  seg052 → 1119000 ms
  seg053 → 1413000 ms
  seg054 → 1196000 ms
  seg055 → 1225000 ms
  seg056 → 1266000 ms
"""

import argparse
import os
from pydub import AudioSegment

VIDEO_MS = 1429171

CORRECT_POSITIONS = {
    52: 1119000,
    53: 1413000,
    54: 1196000,
    55: 1225000,
    56: 1266000,
}


def main():
    parser = argparse.ArgumentParser(description="Repair dub.py segment ordering bug for segs 52–56.")
    parser.add_argument("--lang", required=True, help="Language code, e.g. fr, de, ta")
    parser.add_argument(
        "--correct-part-end",
        type=int,
        required=True,
        help="Millisecond position marking the end of the correctly-ordered portion "
             "(= 1387000 + duration_of_seg_051_in_ms).",
    )
    args = parser.parse_args()

    lang = args.lang
    correct_part_end = args.correct_part_end

    audio_path = os.path.join("output", lang, "audio.mp3")
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Audio not found: {audio_path}")

    print(f"[{lang}] Loading audio from {audio_path} …")
    buggy = AudioSegment.from_mp3(audio_path)

    # Keep only the correctly-ordered portion (up to seg51)
    correct_part = buggy[:correct_part_end]
    print(f"[{lang}] Correct portion: 0 – {correct_part_end} ms")

    # Build a silent canvas for the full video duration
    repaired = AudioSegment.silent(duration=VIDEO_MS)

    # Overlay the correct portion
    repaired = repaired.overlay(correct_part, position=0)

    # Overlay each misplaced segment at its correct position
    for seg_num, position in CORRECT_POSITIONS.items():
        seg_path = os.path.join("output", lang, "segments", f"seg_{seg_num:03d}.mp3")
        if not os.path.exists(seg_path):
            print(f"  WARNING: {seg_path} not found — skipping seg {seg_num}")
            continue
        seg_audio = AudioSegment.from_mp3(seg_path)
        repaired = repaired.overlay(seg_audio, position=position)
        print(f"  Overlaid seg_{seg_num:03d}.mp3 at {position} ms")

    # Export repaired audio back to the same path
    repaired.export(audio_path, format="mp3", bitrate="192k")
    print(f"[{lang}] Repaired audio saved to {audio_path}")


if __name__ == "__main__":
    main()
