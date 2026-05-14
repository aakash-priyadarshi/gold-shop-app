#!/usr/bin/env python3
"""
Orivraa Demo Video Multilingual Dubber
=======================================
Workflow:
  1. Record demo with Loom or Google Video — speak naturally
  2. Export the auto-generated transcript (copy as plain text, timestamps included)
  3. Paste raw transcript to Copilot → get improved English script back
  4. Run this script → MP3 + SRT per language in ./output/

Quick start:
  export ELEVENLABS_API_KEY="your_key_here"
  python dub.py transcript.txt --voice-id VG7gYikNQ71LJ52W9fAD

With a pre-improved script (paste from Copilot into improved.txt first):
  python dub.py transcript.txt --improved-script improved.txt --voice-id VG7gYikNQ71LJ52W9fAD

Dry run (translations only, no audio API calls):
  python dub.py transcript.txt --dry-run --voice-id VG7gYikNQ71LJ52W9fAD

Only specific languages:
  python dub.py transcript.txt --langs en hi ar fr de --voice-id VG7gYikNQ71LJ52W9fAD

Only officially ElevenLabs-supported languages (skip experimental):
  python dub.py transcript.txt --skip-unofficial --voice-id VG7gYikNQ71LJ52W9fAD

Required env:
  ELEVENLABS_API_KEY

Output:
  output/
    transcript_cleaned.txt     ← improved English (review before sending)
    en/audio.mp3  en/subtitles.srt
    hi/audio.mp3  hi/subtitles.srt
    fr/audio.mp3  fr/subtitles.srt
    ... (one folder per language)
    summary.json

Supported transcript formats (from Loom, Google Meet, Otter, etc.):
  - "00:05 Some text"            ← inline timestamp
  - "[00:05] Some text"          ← bracket timestamp
  - "00:00 - 00:05\\nSome text"  ← Loom range
  - "00:00:05,000 --> 00:00:12,000\\nText"  ← SRT/VTT
  - "0:00:05\\nSpeaker\\nText"   ← Google Meet
"""

import os
import sys
import re
import json
import time
import argparse
import logging
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

log = logging.getLogger("dubber")

# ── Language config — mirrors apps/web/src/data/about-i18n.ts ────────────────
#
# officially_supported = True  →  ElevenLabs eleven_multilingual_v2 covers this
#                                 language natively (good quality)
# officially_supported = False →  ElevenLabs will still try (multilingual model
#                                 is flexible) but quality may vary
#
LANGUAGES: dict[str, dict] = {
    "en": {"name": "English",   "eleven_code": "en", "gt_code": "en",  "officially_supported": True},
    "fr": {"name": "French",    "eleven_code": "fr", "gt_code": "fr",  "officially_supported": True},
    "de": {"name": "German",    "eleven_code": "de", "gt_code": "de",  "officially_supported": True},
    "hi": {"name": "Hindi",     "eleven_code": "hi", "gt_code": "hi",  "officially_supported": True},
    "es": {"name": "Spanish",   "eleven_code": "es", "gt_code": "es",  "officially_supported": True},
    "ar": {"name": "Arabic",    "eleven_code": "ar", "gt_code": "ar",  "officially_supported": True},
    "ta": {"name": "Tamil",     "eleven_code": "ta", "gt_code": "ta",  "officially_supported": True},
    "ne": {"name": "Nepali",    "eleven_code": "ne", "gt_code": "ne",  "officially_supported": False},
    "gu": {"name": "Gujarati",  "eleven_code": "gu", "gt_code": "gu",  "officially_supported": False},
    "mr": {"name": "Marathi",   "eleven_code": "mr", "gt_code": "mr",  "officially_supported": False},
    "te": {"name": "Telugu",    "eleven_code": "te", "gt_code": "te",  "officially_supported": False},
    "kn": {"name": "Kannada",   "eleven_code": "kn", "gt_code": "kn",  "officially_supported": False},
}

ALL_LANGS = list(LANGUAGES.keys())
ELEVENLABS_MODEL = "eleven_multilingual_v2"

# ── Data model ────────────────────────────────────────────────────────────────

@dataclass
class Segment:
    index: int
    start_ms: int
    end_ms: int
    text: str

# ── Helpers ───────────────────────────────────────────────────────────────────

def ms_to_srt_time(ms: int) -> str:
    """1234567 → '00:20:34,567'"""
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1_000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def parse_timestamp(ts: str) -> int:
    """Parse any common timestamp string to milliseconds."""
    ts = ts.strip().lstrip("[").rstrip("]").strip()
    # HH:MM:SS,mmm  or  HH:MM:SS.mmm
    m = re.match(r"(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})$", ts)
    if m:
        h, mi, s, frac = int(m.group(1)), int(m.group(2)), int(m.group(3)), m.group(4)
        return (h * 3600 + mi * 60 + s) * 1000 + int(frac.ljust(3, "0"))
    # HH:MM:SS
    m = re.match(r"(\d{1,2}):(\d{2}):(\d{2})$", ts)
    if m:
        return (int(m.group(1)) * 3600 + int(m.group(2)) * 60 + int(m.group(3))) * 1000
    # MM:SS  or  M:SS
    m = re.match(r"(\d{1,2}):(\d{2})$", ts)
    if m:
        return (int(m.group(1)) * 60 + int(m.group(2))) * 1000
    raise ValueError(f"Cannot parse timestamp: '{ts}'")

# ── Transcript parsing ────────────────────────────────────────────────────────

def parse_transcript(raw: str) -> list[Segment]:
    """
    Parse multiple transcript export formats into a list of timed segments.
    Supports: SRT, VTT, Loom, Google Meet, Otter.ai, plain inline timestamps.
    """
    lines = raw.strip().splitlines()
    segments: list[Segment] = []
    idx = 1
    i = 0

    srt_arrow   = re.compile(r"(\d{1,2}:\d{2}:\d{2}[,\.]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,\.]\d{1,3})")
    loom_range  = re.compile(r"(\d{1,2}:\d{2}(?::\d{2})?)\s*-\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*$")
    inline_ts   = re.compile(r"^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s+(.+)$")
    standalone  = re.compile(r"^(\d{1,2}:\d{2}:\d{2})$")

    def collect_text(start_i: int, stop_patterns: list) -> tuple[str, int]:
        """Collect text lines until a stop pattern matches."""
        parts = []
        j = start_i
        while j < len(lines):
            l = lines[j].strip()
            if not l or l.isdigit():
                j += 1
                continue
            if any(p.match(l) for p in stop_patterns):
                break
            parts.append(l)
            j += 1
        return " ".join(parts), j

    while i < len(lines):
        line = lines[i].strip()

        if not line or line.isdigit():
            i += 1
            continue

        # ── SRT / VTT arrow ───────────────────────────────────────────────
        m = srt_arrow.match(line)
        if m:
            start_ms = parse_timestamp(m.group(1))
            end_ms   = parse_timestamp(m.group(2))
            i += 1
            text, i = collect_text(i, [srt_arrow, loom_range])
            if text:
                segments.append(Segment(idx, start_ms, end_ms, text))
                idx += 1
            continue

        # ── Loom range  "00:05 - 00:12" ──────────────────────────────────
        m = loom_range.match(line)
        if m:
            start_ms = parse_timestamp(m.group(1))
            end_ms   = parse_timestamp(m.group(2))
            i += 1
            text, i = collect_text(i, [loom_range, srt_arrow, inline_ts])
            if text:
                segments.append(Segment(idx, start_ms, end_ms, text))
                idx += 1
            continue

        # ── Inline  "[00:05] Some text"  or  "00:05 Some text" ───────────
        m = inline_ts.match(line)
        if m:
            start_ms = parse_timestamp(m.group(1))
            text_rest = m.group(2).strip()
            # Collect continuation lines until next timestamp
            i += 1
            while i < len(lines):
                next_l = lines[i].strip()
                if not next_l:
                    i += 1
                    break
                if inline_ts.match(next_l) or loom_range.match(next_l) or srt_arrow.match(next_l):
                    break
                text_rest += " " + next_l
                i += 1
            end_ms = start_ms + 5000  # will be fixed in post-pass
            if text_rest.strip():
                segments.append(Segment(idx, start_ms, end_ms, text_rest.strip()))
                idx += 1
            continue

        # ── Google Meet  "0:00:05\nSpeaker Name\nText" ───────────────────
        m = standalone.match(line)
        if m:
            try:
                start_ms = parse_timestamp(line)
            except ValueError:
                i += 1
                continue
            i += 1
            # Skip speaker name (line with no digits, usually short)
            if i < len(lines) and lines[i].strip() and not re.search(r"\d", lines[i]):
                i += 1
            text, i = collect_text(i, [standalone, srt_arrow])
            if text:
                end_ms = start_ms + 5000
                segments.append(Segment(idx, start_ms, end_ms, text))
                idx += 1
            continue

        i += 1

    if not segments:
        return segments

    # ── Post-pass: fix end times so each segment ends where next begins ───
    for j in range(len(segments) - 1):
        if segments[j].end_ms <= segments[j].start_ms:
            segments[j].end_ms = segments[j + 1].start_ms
    # Last segment: keep existing or add a generous 6s tail
    if segments[-1].end_ms <= segments[-1].start_ms:
        segments[-1].end_ms = segments[-1].start_ms + 6000

    return segments

# ── English cleanup ───────────────────────────────────────────────────────────

FILLER_RE = re.compile(
    r"\b(um+|uh+|er+|ah+|you know|like I said|basically|literally|"
    r"so yeah|kind of|sort of|right\?|okay so|I mean|actually|"
    r"at the end of the day|to be honest)\b",
    re.IGNORECASE,
)

def clean_english(segments: list[Segment]) -> list[Segment]:
    """Remove filler words, fix double-spaces, ensure sentences end with punctuation."""
    cleaned = []
    for seg in segments:
        text = FILLER_RE.sub("", seg.text)
        text = re.sub(r"\s{2,}", " ", text).strip()
        text = re.sub(r"\s+([,.])", r"\1", text)  # fix "word ." → "word."
        # Ensure terminal punctuation
        if text and text[-1] not in ".!?":
            text += "."
        if len(text) > 3:
            cleaned.append(Segment(seg.index, seg.start_ms, seg.end_ms, text))
    return cleaned

# ── Translation ───────────────────────────────────────────────────────────────

def translate_segments(segments: list[Segment], target_lang_code: str) -> list[Segment]:
    """Translate segment texts using Google Translate (via deep-translator)."""
    if target_lang_code == "en":
        return segments

    from deep_translator import GoogleTranslator

    translator = GoogleTranslator(source="en", target=target_lang_code)
    translated: list[Segment] = []

    for seg in segments:
        try:
            result = translator.translate(seg.text)
            translated.append(Segment(seg.index, seg.start_ms, seg.end_ms, result or seg.text))
            time.sleep(0.15)  # stay under free-tier rate limit
        except Exception as exc:
            log.warning(f"    Translation error (segment {seg.index}): {exc}. Using English.")
            translated.append(Segment(seg.index, seg.start_ms, seg.end_ms, seg.text))

    return translated

# ── ElevenLabs TTS ────────────────────────────────────────────────────────────

def generate_tts(
    segments: list[Segment],
    voice_id: str,
    lang_code: str,
    api_key: str,
) -> list[tuple[Segment, bytes]]:
    """Call ElevenLabs for each segment, return (segment, mp3_bytes) pairs."""
    from elevenlabs import ElevenLabs, VoiceSettings

    client = ElevenLabs(api_key=api_key)
    lang_info = LANGUAGES[lang_code]
    results: list[tuple[Segment, bytes]] = []

    for seg in segments:
        preview = seg.text[:60].replace("\n", " ")
        log.info(f"    [{lang_code}] seg {seg.index}/{len(segments)}: {preview}…")
        try:
            # Only pass language_code when officially supported — prevents
            # ElevenLabs from rejecting unknown codes for experimental languages
            kwargs: dict = dict(
                voice_id=voice_id,
                text=seg.text,
                model_id=ELEVENLABS_MODEL,
                voice_settings=VoiceSettings(
                    stability=0.55,
                    similarity_boost=0.75,
                    style=0.0,
                    use_speaker_boost=True,
                ),
            )
            if lang_info["officially_supported"]:
                kwargs["language_code"] = lang_info["eleven_code"]

            audio_bytes = b"".join(client.text_to_speech.convert(**kwargs))
            results.append((seg, audio_bytes))
            time.sleep(0.35)  # ~3 req/s — well within ElevenLabs limits
        except Exception as exc:
            log.error(f"    TTS failed (segment {seg.index}): {exc}")
            results.append((seg, b""))

    return results

# ── Audio assembly ────────────────────────────────────────────────────────────

def assemble_audio(
    tts_results: list[tuple[Segment, bytes]],
    total_ms: int,
) -> "AudioSegment":  # type: ignore[name-defined]
    """
    Stitch per-segment MP3s into a single audio file that matches the original
    video timeline:
      - Silence is inserted before each segment to land it on the right timestamp
      - If TTS is shorter than the slot → pad end with silence
      - If TTS is longer than the slot → let it run (no truncation keeps speech intelligible)
    """
    from pydub import AudioSegment

    timeline = AudioSegment.silent(duration=0)
    cursor_ms = 0

    for seg, audio_bytes in tts_results:
        # ── Gap before this segment ───────────────────────────────────────
        gap_ms = seg.start_ms - cursor_ms
        if gap_ms > 0:
            timeline += AudioSegment.silent(duration=gap_ms)
            cursor_ms += gap_ms
        elif gap_ms < 0:
            log.warning(
                f"  Segment {seg.index}: cursor is {-gap_ms}ms past start "
                f"(previous TTS overflowed). Placing immediately."
            )

        if not audio_bytes:
            # Failed TTS: fill the slot with silence so timing downstream is preserved
            slot_ms = max(seg.end_ms - seg.start_ms, 500)
            timeline += AudioSegment.silent(duration=slot_ms)
            cursor_ms += slot_ms
            continue

        # ── Place segment audio ───────────────────────────────────────────
        seg_audio = AudioSegment.from_mp3(BytesIO(audio_bytes))
        slot_ms   = seg.end_ms - seg.start_ms
        tts_ms    = len(seg_audio)

        if tts_ms <= slot_ms:
            # Pad tail so we stay on schedule
            timeline += seg_audio + AudioSegment.silent(duration=slot_ms - tts_ms)
            cursor_ms += slot_ms
        else:
            # TTS ran long — let it overflow; log the overshoot
            overflow = tts_ms - slot_ms
            log.warning(
                f"  Segment {seg.index}: TTS ({tts_ms}ms) > slot ({slot_ms}ms) "
                f"by {overflow}ms — audio will overflow into next gap."
            )
            timeline += seg_audio
            cursor_ms += tts_ms

    # ── Pad to match original video length ───────────────────────────────────
    if len(timeline) < total_ms:
        timeline += AudioSegment.silent(duration=total_ms - len(timeline))

    return timeline

# ── SRT writer ────────────────────────────────────────────────────────────────

def write_srt(segments: list[Segment], path: Path) -> None:
    """Write a valid SRT subtitle file from segments."""
    blocks: list[str] = []
    for seg in segments:
        blocks.append(
            f"{seg.index}\n"
            f"{ms_to_srt_time(seg.start_ms)} --> {ms_to_srt_time(seg.end_ms)}\n"
            f"{seg.text}\n"
        )
    path.write_text("\n".join(blocks), encoding="utf-8")

# ── CLI entry point ───────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Orivraa Demo Video Multilingual Dubber",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("transcript", help="Transcript .txt from Loom / Google Video")
    parser.add_argument(
        "--voice-id",
        default=os.environ.get("ELEVENLABS_VOICE_ID", "VG7gYikNQ71LJ52W9fAD"),
        help="ElevenLabs voice ID (default: your cloned voice)",
    )
    parser.add_argument(
        "--improved-script",
        metavar="FILE",
        help="Pre-improved English script (from Copilot). Replaces transcript text while keeping timestamps.",
    )
    parser.add_argument(
        "--langs",
        nargs="+",
        default=ALL_LANGS,
        metavar="LANG",
        help=f"Language codes to generate. Default: all 12 ({' '.join(ALL_LANGS)})",
    )
    parser.add_argument(
        "--output",
        default="output",
        help="Output directory (default: ./output)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Translate and print only — no ElevenLabs API calls",
    )
    parser.add_argument(
        "--skip-unofficial",
        action="store_true",
        help="Only process languages officially supported by ElevenLabs eleven_multilingual_v2",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(levelname)-8s %(message)s",
        stream=sys.stdout,
    )

    # ── Validate env ──────────────────────────────────────────────────────────
    api_key = os.environ.get("ELEVENLABS_API_KEY", "")
    if not api_key and not args.dry_run:
        log.error("ELEVENLABS_API_KEY is not set. Export it or use --dry-run.")
        sys.exit(1)

    if not args.voice_id and not args.dry_run:
        log.error("Voice ID required. Pass --voice-id or set ELEVENLABS_VOICE_ID.")
        sys.exit(1)

    # ── Parse transcript ──────────────────────────────────────────────────────
    transcript_path = Path(args.transcript)
    if not transcript_path.exists():
        log.error(f"Transcript file not found: {transcript_path}")
        sys.exit(1)

    raw = transcript_path.read_text(encoding="utf-8")
    segments = parse_transcript(raw)

    if not segments:
        log.error(
            "No segments could be parsed from the transcript. "
            "Check the format — see the script header for supported formats."
        )
        sys.exit(1)

    log.info(f"Parsed {len(segments)} segments  (total: {segments[-1].end_ms / 1000:.1f}s)")

    # ── Apply improved script (if given) ─────────────────────────────────────
    if args.improved_script:
        improved_path = Path(args.improved_script)
        if not improved_path.exists():
            log.error(f"Improved script not found: {improved_path}")
            sys.exit(1)
        improved_raw = improved_path.read_text(encoding="utf-8")
        improved_segs = parse_transcript(improved_raw)

        if improved_segs and len(improved_segs) == len(segments):
            for orig, imp in zip(segments, improved_segs):
                orig.text = imp.text
            log.info("Applied improved script (segment-for-segment).")
        else:
            # Fallback: redistribute improved text over original timestamps
            log.warning(
                f"Improved script has {len(improved_segs)} segments "
                f"but transcript has {len(segments)}. Redistributing text."
            )
            all_words = " ".join(s.text for s in (improved_segs or [Segment(1, 0, 1000, improved_raw)])).split()
            per_seg = max(1, len(all_words) // len(segments))
            for k, seg in enumerate(segments):
                chunk = all_words[k * per_seg : (k + 1) * per_seg]
                seg.text = " ".join(chunk)

    # ── Clean English ─────────────────────────────────────────────────────────
    segments = clean_english(segments)
    log.info(f"After cleanup: {len(segments)} segments.")
    total_ms = segments[-1].end_ms

    # ── Set up output directory ───────────────────────────────────────────────
    out_dir = Path(args.output)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Save cleaned English for review
    cleaned_path = out_dir / "transcript_cleaned.txt"
    cleaned_path.write_text(
        "\n\n".join(f"[{ms_to_srt_time(s.start_ms)}]\n{s.text}" for s in segments),
        encoding="utf-8",
    )
    log.info(f"Cleaned English saved → {cleaned_path}")

    # ── Determine languages ───────────────────────────────────────────────────
    langs_to_run = [l for l in args.langs if l in LANGUAGES]
    if args.skip_unofficial:
        langs_to_run = [l for l in langs_to_run if LANGUAGES[l]["officially_supported"]]

    if not langs_to_run:
        log.error("No valid languages to process.")
        sys.exit(1)

    log.info(f"Languages to process: {langs_to_run}\n")

    summary: dict[str, dict] = {}

    # ── Main language loop ────────────────────────────────────────────────────
    for lang_code in langs_to_run:
        info = LANGUAGES[lang_code]
        quality_note = "✓ officially supported" if info["officially_supported"] else "⚠ experimental"
        log.info(f"── {info['name']} ({lang_code})  {quality_note} ──")

        # Translate
        log.info(f"  Translating {len(segments)} segments…")
        translated = translate_segments(segments, info["gt_code"])

        # Output directory for this language
        lang_dir = out_dir / lang_code
        lang_dir.mkdir(exist_ok=True)

        # SRT — always written even in dry-run
        srt_path = lang_dir / "subtitles.srt"
        write_srt(translated, srt_path)
        log.info(f"  SRT → {srt_path}")

        if args.dry_run:
            first = translated[0].text[:80] if translated else ""
            log.info(f"  [DRY RUN] First segment: {first}")
            summary[lang_code] = {
                "status": "dry_run",
                "segments": len(translated),
                "officially_supported": info["officially_supported"],
                "sample": first,
            }
            log.info("")
            continue

        # TTS
        log.info(f"  Generating TTS ({len(translated)} segments)…")
        tts_results = generate_tts(translated, args.voice_id, lang_code, api_key)
        success = sum(1 for _, b in tts_results if b)
        log.info(f"  TTS complete: {success}/{len(tts_results)} segments OK")

        # Assemble audio
        try:
            audio = assemble_audio(tts_results, total_ms)
            mp3_path = lang_dir / "audio.mp3"
            audio.export(str(mp3_path), format="mp3", bitrate="192k")
            duration_s = len(audio) / 1000
            log.info(f"  MP3 ({duration_s:.1f}s) → {mp3_path}")
            summary[lang_code] = {
                "status": "ok",
                "segments": len(translated),
                "tts_success": success,
                "audio_duration_s": round(duration_s, 2),
                "officially_supported": info["officially_supported"],
            }
        except ImportError:
            # pydub not installed — fall back to saving raw per-segment MP3s
            log.warning("  pydub not installed — saving raw segment MP3s (no timing sync).")
            raw_dir = lang_dir / "segments"
            raw_dir.mkdir(exist_ok=True)
            for seg, audio_bytes in tts_results:
                if audio_bytes:
                    (raw_dir / f"seg_{seg.index:03d}.mp3").write_bytes(audio_bytes)
            summary[lang_code] = {
                "status": "raw_segments_only",
                "segments": len(tts_results),
                "tts_success": success,
                "officially_supported": info["officially_supported"],
                "note": "Install pydub + ffmpeg for assembled audio",
            }

        log.info("")

    # ── Summary ───────────────────────────────────────────────────────────────
    summary_path = out_dir / "summary.json"
    summary_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")

    log.info("━" * 60)
    log.info(f"Done.  Output directory: {out_dir.resolve()}")
    log.info(f"Summary: {summary_path}")

    ok_count = sum(1 for v in summary.values() if v.get("status") in ("ok", "dry_run"))
    log.info(f"Languages processed: {ok_count}/{len(langs_to_run)}")
    if any(not LANGUAGES[l]["officially_supported"] for l in langs_to_run if l in summary):
        log.info(
            "Note: Gujarati, Marathi, Telugu, Kannada, Nepali are experimental on "
            "eleven_multilingual_v2. Review those audio files before publishing."
        )


if __name__ == "__main__":
    main()
