# Demo Video Pipeline — Status & How-To

## Current Status (as of May 2026)

### ✅ Completed Languages

| Lang         | Status  | R2 File              |
| ------------ | ------- | -------------------- |
| English (en) | ✅ Live | `demo_voiced_en.mp4` |
| Hindi (hi)   | ✅ Live | `demo_voiced_hi.mp4` |
| Nepali (ne)  | ✅ Live | `demo_voiced_ne.mp4` |
| Spanish (es) | ✅ Live | `demo_voiced_es.mp4` |
| Arabic (ar)  | ✅ Live | `demo_voiced_ar.mp4` |

### ❌ Pending (ElevenLabs quota exhausted — wait for billing reset)

| Lang          | Script Ready                       | Notes                                                  |
| ------------- | ---------------------------------- | ------------------------------------------------------ |
| French (fr)   | ✅ `fr.txt`                        | TTS ran 54/56 segs then quota hit. Full re-run needed. |
| German (de)   | ✅ `de.txt`                        | Not started.                                           |
| Tamil (ta)    | ✅ `ta.txt`                        | Not started.                                           |
| Gujarati (gu) | auto-translate from `improved.txt` | Not started.                                           |
| Marathi (mr)  | auto-translate from `improved.txt` | Not started.                                           |
| Telugu (te)   | auto-translate from `improved.txt` | Not started.                                           |
| Kannada (kn)  | auto-translate from `improved.txt` | Not started.                                           |

**The UI shows "Coming Soon" for all 7 pending languages** in both the DemoModal (homepage) and the seller help/tutorial page.  
To remove "Coming Soon" after a language is uploaded: delete the lang code from `COMING_SOON_LANGS` in:

- `apps/web/src/components/home/DemoModal.tsx`
- `apps/web/src/app/dashboard/shop/help/page.tsx`

---

## File Locations

```
scripts/demo-dubber/
  dub.py              ← Main TTS + translation script
  repair_audio.py     ← Fixes audio lag bug for segs 52–56
  assemble.py         ← Merges audio with video
  finalize.py         ← Burns subtitles / strips them (--no-subs)
  improved.txt        ← Polished English script (used for auto-translate langs)
  fr.txt              ← Pre-written French script
  de.txt              ← Pre-written German script
  ta.txt              ← Pre-written Tamil script
  output/             ← TTS output (gitignored)
    {lang}/
      audio.mp3
      subtitles.srt
      segments/
        seg_000.mp3 … seg_056.mp3   ← individual TTS segments (needed by repair_audio.py)
  transcripts/        ← raw Loom transcripts from original recording
  source_extended.mp4 ← source video file (the Orivraa product demo)
```

---

## ElevenLabs Credentials

```
API Key:  sk_a2d41e9f1e65560c8bd9abacd8e254f0d137e55e5a94f856
Voice ID: VG7gYikNQ71LJ52W9fAD
Model:    eleven_multilingual_v2
```

Python venv: `pipecat-agent\.venv\Scripts\python.exe`

---

## How to Run TTS (when quota resets)

Run all commands from: `scripts/demo-dubber/`

```powershell
$env:ELEVENLABS_API_KEY = "sk_a2d41e9f1e65560c8bd9abacd8e254f0d137e55e5a94f856"
$python = "c:\Users\aakas\OneDrive\project-bussiness\gold-shop-app\pipecat-agent\.venv\Scripts\python.exe"
Push-Location "c:\Users\aakas\OneDrive\project-bussiness\gold-shop-app\scripts\demo-dubber"

# Pre-written scripts (use --no-translate so it reads fr.txt/de.txt/ta.txt directly)
& $python dub.py fr.txt --langs fr --voice-id VG7gYikNQ71LJ52W9fAD --improved-script fr.txt --no-translate
& $python dub.py de.txt --langs de --voice-id VG7gYikNQ71LJ52W9fAD --improved-script de.txt --no-translate
& $python dub.py ta.txt --langs ta --voice-id VG7gYikNQ71LJ52W9fAD --improved-script ta.txt --no-translate

# Auto-translate from improved English script
& $python dub.py improved.txt --langs gu --voice-id VG7gYikNQ71LJ52W9fAD
& $python dub.py improved.txt --langs mr --voice-id VG7gYikNQ71LJ52W9fAD
& $python dub.py improved.txt --langs te --voice-id VG7gYikNQ71LJ52W9fAD
& $python dub.py improved.txt --langs kn --voice-id VG7gYikNQ71LJ52W9fAD

Pop-Location
```

---

## Audio Lag / Out-of-Sync Fix (The Segment Bug)

### What the problem is

Segments 52–56 of the original video come out of order due to a timing bug in `dub.py`. The assembled `audio.mp3` has these 5 segments placed at wrong timestamps, causing the audio to lag or overlap in the final video.

This was first discovered and fixed for Hindi, then applied to all subsequent languages.

### The fix: `repair_audio.py`

After `dub.py` finishes for a language, **before** running `assemble.py`, run:

```powershell
& $python repair_audio.py --lang fr --correct-part-end <1387000 + dur_seg051_ms>
```

**How to get `--correct-part-end`**:

```powershell
# Get duration of seg_051 in milliseconds for your language:
& $python -c "
from pydub import AudioSegment
a = AudioSegment.from_mp3('output/fr/segments/seg_051.mp3')
print(int(len(a)))
"
# Example: if output is 3500, then --correct-part-end = 1387000 + 3500 = 1390500
```

**What repair_audio.py does**:

1. Loads `output/{lang}/audio.mp3`
2. Keeps only the correctly-ordered first portion (up to seg 051)
3. Builds a silent canvas for the full video duration (1,429,171 ms)
4. Overlays the correct audio at position 0
5. Overlays the 5 misplaced segments at their correct positions:
   - seg052 → 1,119,000 ms
   - seg053 → 1,413,000 ms
   - seg054 → 1,196,000 ms
   - seg055 → 1,225,000 ms
   - seg056 → 1,266,000 ms
6. Saves repaired audio back to `output/{lang}/audio.mp3`

**dub.py patch** (already applied): `dub.py` now always saves individual segment files to `output/{lang}/segments/seg_NNN.mp3` after TTS — not just on errors. This is required for `repair_audio.py` to work.

---

## Full Pipeline per Language (after TTS finishes)

```powershell
$lang = "fr"   # change per language

# 1. Get seg_051 duration
$dur = & $python -c "from pydub import AudioSegment; a = AudioSegment.from_mp3('output/$lang/segments/seg_051.mp3'); print(int(len(a)))"
$correctPartEnd = 1387000 + [int]$dur

# 2. Fix segment ordering bug
& $python repair_audio.py --lang $lang --correct-part-end $correctPartEnd

# 3. Merge audio + video
& $python assemble.py --lang $lang --merge-video

# 4. Finalize (no burned-in subtitles, clean output)
& $python finalize.py --lang $lang --no-subs

# 5. Upload to Cloudflare R2
Push-Location "c:\Users\aakas\OneDrive\project-bussiness\gold-shop-app\cloudflare-worker"
$env:CLOUDFLARE_API_TOKEN = "your_token_here"
$env:CLOUDFLARE_ACCOUNT_ID = "c3219a748734c4ae628206c10c8b2c05"
npx wrangler r2 object put orivraa-demos/demo_voiced_$lang.mp4 `
  --file "..\scripts\demo-dubber\output\$lang\orivraa-demo-$lang-final.mp4" `
  --content-type video/mp4
Pop-Location

# 6. Remove lang from COMING_SOON_LANGS in:
#    apps/web/src/components/home/DemoModal.tsx
#    apps/web/src/app/dashboard/shop/help/page.tsx
```

---

## Cloudflare R2 Credentials

```
Bucket:      orivraa-demos
Worker URL:  https://images.orivraa.com
API Token:   your_token_here
Account ID:  c3219a748734c4ae628206c10c8b2c05
```
