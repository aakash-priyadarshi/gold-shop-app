# AI Sales Agent — Master Project Context for GitHub Copilot

# File: .github/copilot-instructions.md

#

# This is the ROOT context file. Copilot reads this first for every file

# in this repository. It explains what this project is, why it exists,

# how every piece connects, and how Copilot should think when helping.

---

## WHAT THIS PROJECT IS

This is a **production-grade AI Sales Agent system** that makes real outbound
phone calls, speaks in a natural human voice, detects customer emotions in
real-time, handles sales objections intelligently, and books deals — autonomously.

It is NOT a chatbot. It is NOT a simple IVR. It is NOT a basic voice assistant.

It is a fully autonomous AI salesperson that:

- Dials real phone numbers via Twilio
- Speaks in a cloned human voice via ElevenLabs or Inworld AI
- Listens and understands speech via Deepgram (or Gemini Live natively)
- Thinks and responds via Gemini 2.5 Flash-Lite (live calls)
- Detects frustration, excitement, buying signals in real-time via Hume AI
- Remembers every customer interaction and adapts its approach accordingly
- Switches language mid-call instantly if the customer does
- Calls customers at their culturally appropriate local time
- Passes hot leads to human closers with a full emotional brief
- Logs everything to CRM automatically after every call

The closest analogy: imagine hiring a multilingual, emotionally intelligent,
never-tired SDR who costs $0.10/call instead of $200/day.

---

## THE CORE PROBLEM WE'RE SOLVING

Traditional outbound sales has three fatal flaws:

1. Human SDRs are expensive, inconsistent, and don't scale
2. Old robo-callers feel robotic — customers hang up in seconds
3. AI chatbots are text-only — phone is still the highest-converting channel

This system solves all three:

- Scales to 100,000 calls/month at ~$0.10/call all-in
- Sounds and feels human — customers often don't realise it's AI
- Works on real phone calls — the highest-trust, highest-conversion channel

---

## THE SINGLE MOST IMPORTANT ENGINEERING INSIGHT

**Customers can tell it's AI if silence exceeds 800ms.**

Everything in the audio pipeline exists to solve this one problem.

The solution is a two-track parallel system:

```
Customer finishes speaking
         ↓
TRACK A: Play pre-recorded filler audio INSTANTLY (0ms)
         "Hmm...", "Good question...", "I hear you..."

TRACK B: Send transcript to Gemini LLM (~400-700ms)
         LLM thinks, streams response to TTS

Track A buys time while Track B processes.
Customer hears natural human sounds — never silence.
When Track B is ready, crossfade from A to B seamlessly.
```

This is the architecture that makes everything else possible.
Every other feature builds on top of this foundation.

---

## FULL SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRE-CALL LAYER                           │
│                                                                 │
│  CRM Database ──→ PreCallBrainService (Claude Sonnet 4.6)      │
│                   • Reads lead history, browsing, past calls    │
│                   • Generates personalized emotional playbook   │
│                   • Writes Gemini system prompt for this person │
│                   • Runs once per call, ~30s before dial        │
└─────────────────────────────────┬───────────────────────────────┘
                                  │ system prompt
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                        LIVE CALL LAYER                          │
│                                                                 │
│  Twilio WebSocket                                               │
│  (real phone call)                                              │
│       │                                                         │
│       ▼                                                         │
│  DeepgramSTT ──────────────────────────────────────────────┐   │
│  (streaming STT,                                           │   │
│   <50ms utterance                                          │   │
│   detection)              EmotionEngine                    │   │
│       │                   • Hume AI (voice emotion)        │   │
│       │                   • Transcript sentiment           │   │
│       │                   • Voice metrics (speed/vol)      │   │
│       ▼                   • Frustration monitor            │   │
│  SentencePredictor        • Buying signal detector         │   │
│  (pre-warms LLM           • Tone adaptation engine         │   │
│   200ms early)                    │                        │   │
│       │                           │ ToneConfig             │   │
│       ▼                           ▼                        │   │
│  ┌─────────────────────────────────────────────────────┐  │   │
│  │         PARALLEL EXECUTION (the core trick)         │  │   │
│  │                                                     │  │   │
│  │  FillerAudioManager ──→ Twilio (0ms)                │  │   │
│  │  "Hmm...", "Good question..."                       │  │   │
│  │                                                     │  │   │
│  │  ThinkingBudgetManager                              │  │   │
│  │  • budget=0 for small talk (~350ms TTFT)            │  │   │
│  │  • budget=2000 for objections (~1s, filler covers)  │  │   │
│  │  • budget=5000 for technical questions              │  │   │
│  │         │                                           │  │   │
│  │         ▼                                           │  │   │
│  │  GeminiStreamingClient ──→ token stream             │  │   │
│  │  (Gemini 2.5 Flash-Lite)                            │  │   │
│  │         │                                           │  │   │
│  │         ▼                                           │  │   │
│  │  ModelRouter ──→ if buying signal > 75 + closing    │  │   │
│  │                  escalate → ClaudeSonnetClient      │  │   │
│  │         │                                           │  │   │
│  │         ▼                                           │  │   │
│  │  ElevenLabs/Inworld TTS streaming                   │  │   │
│  │  (first audio chunk ~200ms)                         │  │   │
│  │         │                                           │  │   │
│  │         ▼                                           │  │   │
│  │  CrossfadeManager ──→ Twilio                        │  │   │
│  │  (fades filler out, TTS in, 150ms transition)       │  │   │
│  └─────────────────────────────────────────────────────┘  │   │
│                                                            │   │
│  BackchannelEngine ◄───────────────────────────────────────┘   │
│  (plays "mhm", "right" WHILE customer speaks)                  │
│                                                                 │
│  WarmHandoffManager                                             │
│  (escalates to human rep with 2-sentence brief when needed)    │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                       POST-CALL LAYER                           │
│                                                                 │
│  PostCallProcessor (Gemini 2.5 Flash-Lite — cheapest model)    │
│  • Generates call summary and emotional arc report             │
│  • Updates lead score in CRM                                   │
│  • Saves zero-party data (personal details mentioned)          │
│  • Triggers next action (follow-up email, schedule callback)   │
│  • Calculates deal probability                                 │
│  • Notifies human rep if warm handoff needed                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## THE LLM STRATEGY (CRITICAL — READ THIS)

This system uses **three different LLMs for three different jobs**.
This is intentional — each model is used where it has maximum advantage.

```
┌─────────────────────────────────────────────────────────────────┐
│  WHEN         │  MODEL                  │  WHY                  │
├─────────────────────────────────────────────────────────────────┤
│  Pre-call     │  Claude Sonnet 4.6      │  Best emotional        │
│  (strategy)   │  $3/1M input            │  intelligence.         │
│               │  Runs ONCE per call     │  Most human writing.   │
│               │                         │  Generates the         │
│               │                         │  playbook Gemini       │
│               │                         │  executes.             │
├─────────────────────────────────────────────────────────────────┤
│  Live call    │  Gemini 2.5 Flash-Lite  │  Cheapest at scale.    │
│  (99% of      │  $0.07/1M input         │  Fast streaming.       │
│   turns)      │  $0.30/1M output        │  1M context window.    │
│               │  ~350ms TTFT            │  Thinking toggle.      │
│               │                         │  Native audio option.  │
│               │                         │  Multilingual depth.   │
├─────────────────────────────────────────────────────────────────┤
│  High-value   │  Claude Sonnet 4.6      │  Zero mistakes when    │
│  closing      │  (lazy init — only      │  money is on the       │
│  (1% of       │   if deal value >        │  table. Best           │
│   turns)      │   threshold)            │  objection handling.   │
├─────────────────────────────────────────────────────────────────┤
│  Post-call    │  Gemini 2.5 Flash-Lite  │  Near-free.            │
│  (logging)    │  ~$0.002/call           │  Latency irrelevant.   │
│               │                         │  Structured output.    │
└─────────────────────────────────────────────────────────────────┘

MENTAL MODEL: "Claude thinks. Gemini talks. Flash-Lite writes the report."
```

---

## THE EMOTION ENGINE — WHY IT EXISTS

The single biggest reason customers feel comfortable talking to this AI
is that it **responds to how they feel, not just what they say**.

```
Customer sounds frustrated?
→ AI drops volume 15%, slows down 20%, abandons pitch completely
→ Says: "I can hear this might be a lot right now. Let's step back."
→ Asks ONE simple question. Then listens.

Customer sounds excited?
→ AI matches energy, speaks slightly faster, uses enthusiastic language
→ Leans into what excited them, builds on it

Customer goes quiet after price reveal?
→ AI says NOTHING — silence is intentional, never filled
→ First person to speak after price reveal loses negotiating power

Customer asks a tough technical question?
→ Thinking budget jumps to 5000
→ Filler plays: "Great question, let me check that for you..."
→ Gemini reasons deeply, gives accurate answer
→ Customer thinks: "Wow, they actually know their stuff"
```

Every emotion maps to a specific adaptation config:
speed, volume, warmth, formality, response length, whether to sell or just listen.

---

## THE FILLER AUDIO SYSTEM — HOW IT WORKS

This is the most important latency trick in the system.

```
/assets/fillers/
├── thinking/          ← "Hmm...", "Let me think..."       (0.6-1.2s)
├── technical/         ← "Good question, let me check..."  (1.1-1.5s)
├── empathy/           ← "I completely understand..."      (0.6-1.2s)
├── buying_signal/     ← "Oh absolutely...", "Yes..."      (0.6-0.8s)
└── backchannel/       ← "Mhm", "Right", "I see"          (0.25-0.5s)

ALL files are:
- Pre-recorded with ElevenLabs using the agent's own voice
- Pre-encoded to mulaw 8kHz (matches Twilio format — zero re-encoding)
- Pre-loaded into memory at startup (zero disk I/O during calls)
- Selected based on emotional context, never randomly
- Never played twice in a row

Backchannel files play WHILE customer is speaking — every 8-15 seconds.
All other fillers play AFTER customer finishes — while LLM is thinking.
```

---

## THE THINKING BUDGET TOGGLE — GEMINI'S SECRET WEAPON

Gemini 2.5 Flash-Lite has a unique feature: a controllable reasoning budget.

```
thinkingBudget: 0     → No reasoning. Ultra-fast. ~350ms TTFT.
                         Use for: small talk, simple questions, rapport

thinkingBudget: 2000  → Light reasoning. ~600ms TTFT. Filler covers gap.
                         Use for: objections, hesitant customers

thinkingBudget: 5000  → Deep reasoning. ~1000ms TTFT. Longer filler plays.
                         Use for: technical questions, competitor comparisons

thinkingBudget: 8000  → Maximum reasoning. ~1500ms TTFT.
                         Use for: high-stakes objections, budget negotiations
```

ThinkingBudgetManager.calculate() decides the budget synchronously before
every LLM call. Higher budget = longer filler phrase automatically selected.
The customer always hears audio — they never hear the LLM thinking.

---

## CULTURAL INTELLIGENCE — WHY IT MATTERS

A script that works in the USA will fail in India. Fail in Germany.
Possibly offend in the UAE.

This system has cultural profiles for every market:

```
India:   Relationship first. Use "sir/ma'am". 2-3 min rapport before pitch.
         Festival calendar awareness. Indirect "no" = "I'll think about it."

UK:      Understatement. Self-deprecating humor builds trust. Don't oversell.
         Friday 4pm = "I'll keep this brief, nearly the weekend!"

USA:     Get to the point. First-name immediately. ROI closes deals.
         Enthusiasm expected. Confidence respected.

UAE:     Relationship is everything. Never pitch on first call.
         Arabic opener even in English call. Prayer time awareness.

Germany: Data over stories. Punctuality = respect. Don't use humor early.
         Directness respected. Have specs and contracts ready.
```

Language detection happens from phone country code + real-time transcript.
If customer switches language mid-sentence, AI switches instantly — same sentence.

---

## DATA FLOW FOR EVERY CALL

```
1. Lead enters CRM (scored cold/warm/hot)
         ↓
2. CallOrchestrator picks optimal call time
   (timezone + cultural hours + past pickup patterns)
         ↓
3. PreCallBrainService generates brief (Claude Sonnet, ~10s)
   Output: personalized system prompt for Gemini
         ↓
4. Twilio initiates outbound call
         ↓
5. Customer picks up → AudioPipeline initialises
   GeminiStreamingClient primed with brief
         ↓
6. Real-time loop (every customer utterance):
   a. Deepgram transcribes speech
   b. EmotionEngine analyses voice + words
   c. ThinkingBudgetManager sets budget
   d. FillerAudio plays (0ms)
   e. Gemini generates response (parallel)
   f. TTS streams audio back to customer
   g. BackchannelEngine fires during customer speech
         ↓
7. Escalation checks every turn:
   - ModelRouter: high-value close? → switch to Claude Sonnet
   - WarmHandoffManager: human needed? → transfer with brief
         ↓
8. Call ends
         ↓
9. PostCallProcessor runs (Gemini Flash-Lite):
   - Transcribe full call
   - Extract emotion arc, objections, buying signals
   - Update lead score
   - Save zero-party data
   - Generate next action
   - Trigger follow-up sequence
```

---

## CURRENT TECH STACK

```
TELEPHONY:        Twilio Programmable Voice (WebSocket media streams)
STT:              Deepgram Nova-2 streaming
                  OR Gemini Live API (native audio — set AUDIO_MODE=gemini_live)
LLM (live):       Gemini 2.5 Flash-Lite (model: gemini-2.5-flash-lite-preview-06-17)
LLM (pre-call):   Claude Sonnet 4.6 (model: claude-sonnet-4-20250514)
LLM (closing):    Claude Sonnet 4.6 (lazy — only if deal value > threshold)
LLM (post-call):  Gemini 2.5 Flash-Lite
TTS:              ElevenLabs Turbo v2.5 (default)
                  OR Inworld AI (set TTS_PROVIDER=inworld — currently benchmarking)
EMOTION:          Hume AI (voice emotion from audio stream)
LANGUAGE:         Deepgram language detection + custom switcher
DATABASE:         PostgreSQL (Supabase) + Redis (queues + session state)
QUEUE:            Bull (Node) for call scheduling
BACKEND:          Node.js TypeScript + FastAPI (Python microservices)
HOSTING:          AWS (main) / GCP optional for Gemini proximity
```

---

## REPOSITORY STRUCTURE

```
/src
  /audio              ← AudioPipeline, FillerAudioManager, CrossfadeManager
  /emotion            ← EmotionDetector, FrustrationMonitor, BuyingSignalDetector
  /llm                ← GeminiStreamingClient, ClaudeSonnetClient, ModelRouter
                         ThinkingBudgetManager, PreCallBrainService
  /tts                ← ElevenLabsStreamingClient, InworldTTSClient, TTSFactory
  /telephony          ← TwilioWebSocketHandler, CallOrchestrator
  /crm                ← CRMSyncEngine, LeadScoringEngine, PostCallProcessor
  /cultural           ← CulturalProfileManager, TimezoneEngine, LanguageDetector
  /handoff            ← WarmHandoffManager, HumanRepRouter
  /api                ← REST API endpoints (calls, leads, campaigns, analytics)
  /db                 ← Database schema, migrations, Prisma models
  /scheduler          ← CallScheduler, OptimalTimeCalculator
  /compliance         ← DNCChecker, ConsentValidator, CallHoursEnforcer

/assets
  /fillers            ← Pre-recorded filler MP3s (mulaw 8kHz)

/.github
  /instructions       ← All Copilot instruction files (this folder)
    copilot-instructions.md          ← THIS FILE (root context)
    audio-pipeline.instructions.md  ← Audio pipeline details
    emotion-engine.instructions.md  ← Emotion engine details
    migration-v2.instructions.md    ← What changed from v1 and why
```

---

## KEY DESIGN PRINCIPLES

### 1. Never Crash a Call

Any individual component can fail. The call must continue.
ElevenLabs down? → Fall back to pre-recorded responses.
Gemini timeout? → Play fallback audio, retry silently.
Deepgram glitch? → Buffer audio, reconnect, resume.
Nothing propagates to a dead call.

### 2. Stream Everything

Never wait for a full response before starting the next step.
LLM tokens stream → TTS starts on first sentence.
TTS chunks stream → Twilio plays first chunk immediately.
No component waits for any other to "finish."

### 3. Parallel Not Sequential

End of utterance triggers two things simultaneously:
filler audio AND LLM call. Always. No exceptions.
Sequential = latency death. Parallel = human-feeling conversation.

### 4. Emotion Drives Everything

Every response is shaped by the customer's emotional state.
Tone, speed, volume, length, content, silence duration —
all of it adapts in real-time to how the customer feels.
The sale is a byproduct of the customer feeling understood.

### 5. Cheap at Scale, Quality Where It Counts

Gemini Flash-Lite for 99% of turns (~$0.003/call for LLM).
Claude Sonnet only when closing a high-value deal.
Flash-Lite for all post-call processing.
Cost per call: ~$0.10 all-in (vs $200+/day human SDR).

### 6. Data Compounds Over Time

Every call makes the system smarter.
Objection responses are A/B tested and winners promoted.
Best call times per customer are learned and stored.
Personal details mentioned are saved and referenced next call.
The longer it runs, the better it converts.

---

## PERFORMANCE TARGETS (NEVER REGRESS)

```
End-of-utterance detection:    < 50ms
Filler audio start:            < 30ms
LLM first token (budget=0):    < 500ms
LLM first token (budget=5000): < 1200ms  (filler covers this)
TTS first audio chunk:         < 250ms
Total perceived latency:       < 400ms   (customer hears filler, not silence)
Language switch detection:     < 100ms
Backchannel injection:         < 20ms
Concurrent calls per instance: 50 (scale horizontally for more)
```

---

## WHAT COPILOT SHOULD ALWAYS DO IN THIS CODEBASE

- Read the specific module instruction file before editing that module
  (audio-pipeline, emotion-engine, migration-v2 all have detailed instructions)
- Keep all async operations non-blocking — especially audio feed handlers
- Always fire filler audio AND LLM call in parallel (Promise.all)
- Always stream — never buffer full LLM response before starting TTS
- Always fail soft — catch errors per component, never crash the call
- Always use mulaw 8kHz format end-to-end — never re-encode unnecessarily
- Always check ThinkingBudgetManager before calling GeminiStreamingClient
- Always log with callId + timestamp + component for every event
- Always check DNC list before initiating any outbound call
- Always handle language switch within 100ms of detection

## WHAT COPILOT SHOULD NEVER DO IN THIS CODEBASE

- Never await sequentially where Promise.all can be used
- Never buffer full LLM response before streaming to TTS
- Never let any error crash an active call — always catch + degrade
- Never re-encode audio format on the hot path
- Never use setTimeout for audio timing — use buffer duration math
- Never hardcode voice IDs, API keys, or model names — use config/env
- Never log raw audio buffers — metadata only
- Never make synchronous HTTP calls in audio feed handlers
- Never dial a number without DNC check
- Never store conversation history across calls — reset per call
- Never skip the filler audio system — silence > 800ms = detected as AI
- Never use a thinking budget > 0 without filler audio already playing
