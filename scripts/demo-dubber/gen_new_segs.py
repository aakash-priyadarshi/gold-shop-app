"""Generate seg_054, seg_055, seg_056 for the AI chatbot demo narration."""
import os
import time

from elevenlabs import ElevenLabs, VoiceSettings

api_key  = "sk_a2d41e9f1e65560c8bd9abacd8e254f0d137e55e5a94f856"
voice_id = "VG7gYikNQ71LJ52W9fAD"
model    = "eleven_multilingual_v2"
out_dir  = os.path.join(os.path.dirname(__file__), "output", "en", "segments")

segs = [
    ("seg_054.mp3",
     "Watch how the AI handles a real Hinglish query. The shopkeeper asks "
     "in a natural mix of Hindi and English what the total sales for this "
     "month are. The AI responds instantly in Hinglish as well, pulling live "
     "data directly from the shop."),
    ("seg_055.mp3",
     "Now the shopkeeper switches to English and asks how to file taxes. "
     "The AI immediately provides a clear step-by-step guide: go to Tax "
     "Reports in the sidebar, navigate to the India tab, and download your "
     "GSTR1, GSTR3B, or HSN Summary. No support call needed — just ask the AI."),
    ("seg_056.mp3",
     "The shopkeeper follows the AI instructions and navigates directly to "
     "Tax Filing Reports. The page shows ready-to-download reports for India: "
     "GSTR1, GSTR3B, HSN Summary, and Tally XML, all fully compliant. This "
     "is the AI's core value — it does not just answer questions, it actively "
     "guides you through the platform step by step."),
]

client = ElevenLabs(api_key=api_key)
vs = VoiceSettings(stability=0.55, similarity_boost=0.75, style=0.0, use_speaker_boost=True)

for fname, text in segs:
    path = os.path.join(out_dir, fname)
    print(f"Generating {fname}...")
    audio = b"".join(client.text_to_speech.convert(
        voice_id=voice_id, text=text, model_id=model,
        voice_settings=vs, language_code="en",
    ))
    with open(path, "wb") as f:
        f.write(audio)
    size_kb = len(audio) // 1024
    print(f"  Saved {size_kb} KB -> {path}")
    time.sleep(0.5)

print("All 3 segments generated.")
