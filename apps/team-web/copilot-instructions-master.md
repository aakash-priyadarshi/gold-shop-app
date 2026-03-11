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
  /inbound            ← InboundCallHandler, InboundCallBrain
  /whatsapp           ← WhatsAppConversationHandler, WhatsAppResponseGenerator
                         WhatsAppThreadManager, WhatsAppBuyingSignalDetector
  /messaging          ← InCallMessagingService, MessageBuilder
                         ChannelPreferenceManager, MessagingTriggerDetector
  /intelligence       ← BusinessIntelligenceLoader, ReactionEngine,
                         CentralBrainService, WinningPatternsService,
                         LostDealAnalyser, ConversationLibrary,
                         ReEngagementEngine, MoodCalendarService,
                         CompetitorTracker, TimingIntelligence
  /personas           ← PersonaRegistry, PersonaSelector,
                         PersonaSwitchDetector, PersonaSwitchManager,
                         PersonaIntelligenceEngine, PersonaTTSFactory
  /leads              ← LeadProfileService, CallRemarkGenerator,
                         LeadScoringEngine, OpenLoopTracker
  /crm                ← CRMSyncEngine, LeadScoringEngine, PostCallProcessor
  /cultural           ← CulturalProfileManager, TimezoneEngine, LanguageDetector
  /handoff            ← WarmHandoffManager, HumanRepRouter
  /api                ← REST API endpoints (calls, leads, campaigns, analytics)
  /webhooks           ← TwilioInboundWebhook, WhatsAppInboundWebhook
  /admin              ← Admin panel API (company profile, intelligence, products)
  /db                 ← Database schema, migrations, Prisma models
  /scheduler          ← CallScheduler, OptimalTimeCalculator
  /compliance         ← DNCChecker, ConsentValidator, CallHoursEnforcer

/assets
  /fillers            ← Pre-recorded filler MP3s (mulaw 8kHz)

/.github
  /instructions       ← All Copilot instruction files (this folder)
    copilot-instructions.md               ← THIS FILE (root context)
    audio-pipeline.instructions.md        ← Audio pipeline details
    emotion-engine.instructions.md        ← Emotion engine details
    migration-v2.instructions.md          ← What changed from v1 and why
    messaging.instructions.md             ← In-call WhatsApp/SMS messaging
    inbound-whatsapp.instructions.md      ← Inbound calls + WhatsApp AI replies
    config-and-intelligence.instructions.md ← Env vars + Business Intelligence DB
    lead-manager.instructions.md              ← Lead profile, remarks, scoring
    central-brain.instructions.md             ← Learning brain, patterns, autopsies
    voice-personas.instructions.md            ← Personas, selection, switching
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
- Never put phone numbers in .env — always in company_profile table
- Never put URLs in .env — always in company_profile or products table
- Never hardcode any phone number, URL, or business name in source code
- Never read phone numbers or URLs from process.env at call time
- Never put API keys or auth tokens in the database
- Never commit .env to git — must be in .gitignore

---

## NUMBER STACK — HOW THE THREE NUMBERS WORK TOGETHER

```
+19843685289 (Twilio US number) — THE INFRASTRUCTURE NUMBER
  → Voice infrastructure for all outbound AI calls
  → Inbound call receiver (when customers call back)
  → WhatsApp Business sender (messages arrive FROM this number)
  → SMS to US/UK customers
  → Cannot be replaced by an Indian number
  → $1.15/month

+91XXXXXXXXXX (Jio) — THE CALLER ID NUMBER
  → Verified Caller ID in Twilio only
  → Customers SEE this when the AI calls them (higher answer rate)
  → Never receives calls in this system
  → Never handles WhatsApp
  → Stays on your phone, untouched

Airtel +91XXXXXXXXXX — PERSONAL USE ONLY
  → WhatsApp Business app on your phone for manual chats
  → Not used in this system at all
  → Leave completely alone

CALL FLOW:
  AI dials customer → Twilio US routes the call
                    → Customer sees Jio number on their screen
                    → AI has conversation
                    → WhatsApp message sent FROM Twilio US number
                    → Customer replies on WhatsApp → AI responds 24/7
```

---

## POST-CALL WHATSAPP CHANNEL

After every call ends, customers can message the WhatsApp number any time.
AI responds 24/7 with full context from the previous call.
This is a separate async system from the live voice pipeline.

```
Customer messages at 10pm → AI responds in <10 seconds
Customer says "let's go" → AI sends booking link + notifies human rep
Human rep gets alert → follows up within 30 minutes
Deal closes with zero human involvement at odd hours
```

See: inbound-whatsapp.instructions.md for full implementation.

---

## IN-CALL MESSAGING CHANNEL

During active calls, AI asks: "Do you use WhatsApp on this number?"
→ Yes: sends rich formatted WhatsApp (bold, emoji, tables, images)
→ No: sends short SMS link (under 160 chars)
→ Preference saved to CRM — never asks same customer twice
→ Fires completely non-blocking — zero impact on voice call

See: messaging.instructions.md for full implementation.

---

## CONFIGURATION ARCHITECTURE — CRITICAL RULE

Everything in this system falls into one of two categories.
**Copilot must always respect this separation.**

```
┌─────────────────────────────────────────────────────────┐
│  CATEGORY 1 — .env FILE (secrets + technical switches)  │
│                                                         │
│  ✅ Goes here:                                          │
│     API keys, account SIDs, auth tokens                 │
│     Feature flags (AUDIO_MODE, TTS_PROVIDER)            │
│     Technical thresholds (CLAUDE_ESCALATION_THRESHOLD)  │
│     Server config (PORT, DATABASE_URL, WEBHOOK_BASE_URL)│
│                                                         │
│  Rules:                                                 │
│  → Secret — never commit to git                         │
│  → Stable — changes only when switching providers       │
│  → Requires server restart to take effect               │
│  → Same value regardless of region/customer/campaign    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  CATEGORY 2 — DATABASE + ADMIN PANEL (business data)    │
│                                                         │
│  ✅ Goes here:                                          │
│     Phone numbers (Twilio number, WhatsApp, Caller ID)  │
│     All URLs (pricing, calendar, case study, contract)  │
│     Company info, agent name, tagline                   │
│     Regional behaviour rules (dos/donts per country)    │
│     Customer reaction intelligence                      │
│     Competitor intelligence, story bank                 │
│     AI behaviour profiles per campaign/region           │
│                                                         │
│  Rules:                                                 │
│  → Not secret — safe in database                        │
│  → Changes frequently — no server restart needed        │
│  → Manageable by non-developers via admin panel         │
│  → May vary by region, campaign, product, gender        │
└─────────────────────────────────────────────────────────┘
```

**Why this matters:**

```
SCENARIO: You buy a new Twilio phone number
  ❌ Old way (env var): Update .env → restart server → downtime
  ✅ New way (DB):      Admin panel → update number → live instantly

SCENARIO: Pricing page URL changes
  ❌ Old way (env var): Update .env → restart server
  ✅ New way (DB):      Admin panel → update URL → next call uses it

SCENARIO: New objection pattern from Indian customers emerges
  ❌ Old way: Developer updates code → PR → deploy
  ✅ New way: Admin panel → add reaction → AI uses it immediately
```

---

## THE COMPLETE .env FILE

```bash
# ============================================================
# AI SALES AGENT — ENVIRONMENT VARIABLES
# ============================================================
# RULES:
# → Never commit this file (.gitignore must include .env)
# → Never put phone numbers, URLs, or business content here
# → Never put customer data here
# → Restart server after any change here
# ============================================================

# ── LLM PROVIDERS ──────────────────────────────────────────

# Anthropic — Claude Sonnet for pre-call briefs + high-value closing
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxx

# Google — Gemini 2.5 Flash-Lite for live calls + post-call processing
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxx

# ── VOICE & AUDIO ───────────────────────────────────────────

# Deepgram — Speech to text (streaming)
DEEPGRAM_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxx

# ElevenLabs — Text to speech (primary)
ELEVENLABS_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxx
ELEVENLABS_VOICE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx

# Inworld AI — TTS alternative (set TTS_PROVIDER=inworld to use)
INWORLD_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxx

# Hume AI — voice emotion analysis
HUME_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxx

# ── TELEPHONY ───────────────────────────────────────────────

# Twilio — voice infrastructure, SMS, WhatsApp
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxx

# ── SERVER ──────────────────────────────────────────────────

# Public HTTPS URL — Twilio webhooks require HTTPS
WEBHOOK_BASE_URL=https://yourdomain.com
PORT=3000

# ── DATABASE ────────────────────────────────────────────────

DATABASE_URL=postgresql://user:password@host:5432/salesagent
REDIS_URL=redis://localhost:6379

# ── FEATURE FLAGS ───────────────────────────────────────────

# 'deepgram' (default) or 'gemini_live' (Gemini handles STT natively)
AUDIO_MODE=deepgram

# 'elevenlabs' (default) or 'inworld' (benchmarking alternative)
TTS_PROVIDER=elevenlabs

# Deal value ($) above which live call escalates to Claude Sonnet
CLAUDE_ESCALATION_THRESHOLD=500

NODE_ENV=development

# ── WHAT IS NOT IN .env ─────────────────────────────────────
# TWILIO_PHONE_NUMBER    → company_profile.primary_phone (DB)
# WHATSAPP_NUMBER        → company_profile.whatsapp_number (DB)
# VERIFIED_CALLER_ID     → company_profile.verified_caller_id (DB)
# PRICING_URL            → products.pricing_url (DB)
# CALENDAR_URL           → company_profile.calendar_url (DB)
# COMPARISON_URL         → products.comparison_url (DB)
# CASE_STUDY_URL         → products.case_study_url (DB)
# CONTRACT_URL           → company_profile.contract_url (DB)
# SUMMARY_URL            → company_profile.summary_url (DB)
# AGENT_NAME             → company_profile.agent_name (DB)
# COMPANY_NAME           → company_profile.company_name (DB)
```

---

## BUSINESS INTELLIGENCE DATABASE SCHEMA

```sql
-- ============================================================
-- COMPANY PROFILE
-- Everything about who we are — read by AI before every call.
-- Updated via admin panel, no server restart needed.
-- ============================================================

CREATE TABLE company_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  company_name VARCHAR(255) NOT NULL,
  agent_name VARCHAR(100) NOT NULL,
  tagline TEXT,
  description TEXT,

  -- Phone numbers (NOT in .env — update here instead)
  primary_phone VARCHAR(20),            -- Twilio US number (+19843685289)
  whatsapp_number VARCHAR(20),          -- WhatsApp sender (same US number)
  verified_caller_id VARCHAR(20),       -- Jio number shown to customers
  support_email VARCHAR(255),

  -- URLs (NOT in .env — update here instead)
  pricing_url TEXT,
  calendar_url TEXT,
  comparison_url TEXT,
  case_study_url TEXT,
  contract_url TEXT,
  summary_url TEXT,
  website_url TEXT,

  -- Business context
  industry VARCHAR(100),
  registered_country VARCHAR(100),      -- 'GB' (UK)
  primary_markets TEXT[],               -- ['IN', 'GB', 'AE', 'US']

  -- AI behaviour defaults
  default_tone VARCHAR(20) DEFAULT 'warm_professional',

  is_active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_company_profile_active
  ON company_profile(is_active) WHERE is_active = TRUE;


-- ============================================================
-- PRODUCT CATALOGUE
-- ============================================================

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  tagline TEXT,
  description TEXT,
  pricing JSONB NOT NULL DEFAULT '{}',
  -- {"starter": {"price": 99, "per": "month", "users": 5}, ...}
  key_benefits TEXT[],
  pain_points_solved TEXT[],
  ideal_customer_profile TEXT,
  -- Product-specific URL overrides (fall back to company_profile if null)
  pricing_url TEXT,
  demo_url TEXT,
  case_study_url TEXT,
  comparison_url TEXT,
  pricing_image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- REGIONAL BEHAVIOUR INTELLIGENCE
-- How the AI behaves differently per country.
-- Updated by sales team from real call observations.
-- ============================================================

CREATE TABLE regional_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code CHAR(2) NOT NULL UNIQUE,   -- 'IN', 'GB', 'AE', 'DE', 'US'
  country_name VARCHAR(100) NOT NULL,

  -- Timing
  call_start_hour INTEGER NOT NULL,        -- Local hour (0-23)
  call_end_hour INTEGER NOT NULL,
  best_days TEXT[],
  avoid_days TEXT[],
  public_holidays JSONB DEFAULT '[]',

  -- Cultural approach
  rapport_minutes INTEGER DEFAULT 2,
  pitch_style VARCHAR(30),
  -- 'relationship_first'|'value_first'|'data_first'|'direct'
  formality_level VARCHAR(20),
  -- 'formal'|'semi_formal'|'casual'
  decision_style VARCHAR(30),
  -- 'individual'|'committee'|'hierarchical'

  -- Language
  primary_language VARCHAR(10),
  secondary_languages TEXT[],
  switch_language_if_detected BOOLEAN DEFAULT TRUE,

  -- Rules the AI follows (written as plain English instructions)
  dos TEXT[],
  donts TEXT[],

  -- What actually works (updated from real call outcomes)
  proven_openers TEXT[],
  proven_closers TEXT[],
  proven_objection_responses JSONB DEFAULT '{}',

  -- Sensitivities
  avoid_topics TEXT[],
  religious_awareness TEXT,

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data for your primary markets
INSERT INTO regional_intelligence
  (country_code, country_name, call_start_hour, call_end_hour,
   best_days, rapport_minutes, pitch_style, formality_level,
   dos, donts, religious_awareness)
VALUES
  ('IN', 'India', 10, 19,
   ARRAY['tuesday','wednesday','thursday'],
   3, 'relationship_first', 'semi_formal',
   ARRAY['Use sir/ma''am naturally',
         'Ask about team and company before pitching',
         'Reference festival seasons positively',
         'Indirect no (I''ll think about it) = soft rejection, handle gently'],
   ARRAY['Never rush to price on first call',
         'Don''t use sarcasm',
         'Avoid confrontational language',
         'Never make them feel pressured'],
   'Diwali/Eid/Holi — avoid calls day of, acknowledge warmly if near'),

  ('GB', 'United Kingdom', 9, 17,
   ARRAY['tuesday','wednesday','thursday'],
   1, 'value_first', 'semi_formal',
   ARRAY['Understatement builds trust more than enthusiasm',
         'Self-deprecating light humour is fine after rapport',
         'Acknowledge Friday afternoon ("I''ll keep this brief")'],
   ARRAY['Never oversell or use excessive enthusiasm',
         'Don''t use American sales clichés',
         'Avoid pushiness — they will disengage silently'],
   NULL),

  ('AE', 'UAE', 9, 17,
   ARRAY['sunday','monday','tuesday','wednesday'],
   5, 'relationship_first', 'formal',
   ARRAY['Open with Arabic greeting even in English call',
         'Relationship must be established before any pitch',
         'Use formal titles until told otherwise'],
   ARRAY['Never pitch on first call',
         'Never schedule calls during prayer times',
         'Avoid Friday calls (weekend)'],
   'Prayer times — avoid 12:00-13:00, 15:30-16:00, 18:00-18:30');


-- ============================================================
-- GENDER BEHAVIOUR INTELLIGENCE
-- Soft guidance based on real call outcome data.
-- All fields are suggestions, never hard rules.
-- ============================================================

CREATE TABLE gender_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gender VARCHAR(20) NOT NULL UNIQUE,
  -- 'male'|'female'|'unknown'|'non_binary'
  preferred_tone TEXT,
  communication_style TEXT,
  effective_value_props TEXT[],
  effective_closes TEXT[],
  avoid_phrases TEXT[],
  avg_conversion_rate DECIMAL(5,2),
  best_performing_opener TEXT,
  best_performing_close TEXT,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- CUSTOMER REACTION INTELLIGENCE
-- What customers say → what the AI should do in response.
-- Built from real call outcomes — improves every call.
-- This is how the system gets smarter over time.
-- ============================================================

CREATE TABLE customer_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type VARCHAR(30) NOT NULL,
  -- 'objection'|'question'|'buying_signal'|'frustration'|'confusion'|'enthusiasm'

  trigger_phrases TEXT[] NOT NULL,

  -- Filters (null = applies to all)
  applicable_regions TEXT[],
  applicable_genders TEXT[],
  applicable_lead_temps TEXT[],
  applicable_call_phases TEXT[],

  -- What the AI should do
  recommended_response_strategy VARCHAR(30),
  -- 'soften'|'pivot'|'validate'|'close'|'ask_question'|'tell_story'|'give_data'

  response_variants JSONB NOT NULL,
  -- [{
  --   "id": "v1",
  --   "text": "I completely hear you...",
  --   "times_used": 145,
  --   "conversion_rate": 0.34,
  --   "avg_sentiment_after": 0.6
  -- }]

  total_uses INTEGER DEFAULT 0,
  overall_conversion_rate DECIMAL(5,2),
  avg_sentiment_improvement DECIMAL(4,2),
  manually_approved BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reactions_trigger_type
  ON customer_reactions(trigger_type) WHERE is_active = TRUE;


-- ============================================================
-- COMPETITOR INTELLIGENCE
-- ============================================================

CREATE TABLE competitor_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_name VARCHAR(255) NOT NULL UNIQUE,
  their_strengths TEXT[],
  their_weaknesses TEXT[],
  we_win_on TEXT[],
  price_comparison TEXT,
  reframe_script TEXT,
  effective_responses TEXT[],
  phrases_to_avoid TEXT[],
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- STORY BANK
-- Real success stories tagged for contextual use during calls.
-- ============================================================

CREATE TABLE story_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_company VARCHAR(255),
  industry VARCHAR(100),
  company_size VARCHAR(50),
  region VARCHAR(10),
  headline TEXT NOT NULL,
  short_story TEXT NOT NULL,          -- 2-3 sentences for live call use
  quote TEXT,
  result_1 TEXT,
  result_2 TEXT,
  result_3 TEXT,
  use_when_concern TEXT[],
  use_when_industry TEXT[],
  case_study_url TEXT,
  case_study_image_url TEXT,
  times_used INTEGER DEFAULT 0,
  conversion_rate_when_used DECIMAL(5,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- AI BEHAVIOUR PROFILES
-- Named personality profiles — different per campaign/region.
-- ============================================================

CREATE TABLE ai_behaviour_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_name VARCHAR(100) NOT NULL UNIQUE,
  -- 'default'|'india_enterprise'|'uk_smb'|'uae_relationship'
  agent_name VARCHAR(100),             -- Override company default
  personality_description TEXT,
  elevenlabs_voice_id VARCHAR(100),
  tts_stability DECIMAL(3,2),
  tts_style DECIMAL(3,2),
  speaking_speed DECIMAL(3,2),
  max_response_words INTEGER DEFAULT 100,
  rapport_style TEXT,
  pitch_style TEXT,
  closing_style TEXT,
  signature_phrases TEXT[],
  banned_phrases TEXT[],
  warm_open_duration INTEGER DEFAULT 45,
  discovery_min_duration INTEGER DEFAULT 60,
  pitch_start_after INTEGER DEFAULT 120,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_behaviour_profiles_default
  ON ai_behaviour_profiles(is_default) WHERE is_default = TRUE;


-- ============================================================
-- WHATSAPP THREADS (from inbound-whatsapp module)
-- ============================================================

CREATE TABLE whatsapp_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL UNIQUE,
  lead_id UUID REFERENCES leads(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES whatsapp_threads(id),
  role VARCHAR(10) CHECK (role IN ('customer', 'ai')) NOT NULL,
  content TEXT NOT NULL,
  media_urls TEXT[] DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_threads_phone ON whatsapp_threads(phone);
CREATE INDEX idx_whatsapp_messages_thread ON whatsapp_messages(thread_id);


-- ============================================================
-- IN-CALL MESSAGES LOG (from messaging module)
-- ============================================================

CREATE TABLE call_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID REFERENCES calls(id),
  lead_id UUID REFERENCES leads(id),
  message_type VARCHAR(30) NOT NULL,
  channel VARCHAR(10) CHECK (channel IN ('whatsapp', 'sms')) NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  preview VARCHAR(100)
);

CREATE INDEX idx_call_messages_call_id ON call_messages(call_id);


-- ============================================================
-- ALTER EXISTING TABLES
-- ============================================================

-- leads table additions
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS messaging_preference VARCHAR(10)
    CHECK (messaging_preference IN ('whatsapp', 'sms')),
  ADD COLUMN IF NOT EXISTS messaging_preference_detected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_whatsapp_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS buying_signal_detected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS buying_signal_channel VARCHAR(20);

-- calls table additions
ALTER TABLE calls
  ADD COLUMN IF NOT EXISTS direction VARCHAR(10)
    CHECK (direction IN ('outbound', 'inbound')) DEFAULT 'outbound',
  ADD COLUMN IF NOT EXISTS inbound_type VARCHAR(20)
    CHECK (inbound_type IN ('callback', 'cold_inbound'));
```

---

## HOW THE AI RESOLVES CONFIG AT CALL TIME

```typescript
// ✅ CORRECT — API keys from env, business data from DB

// API keys — always from process.env
const geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const twilioClient = new Twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!,
);

// Load business data from DB via BusinessIntelligenceLoader
const intel = await biLoader.loadForCall(lead, campaign);

// Phone numbers — always from DB
const primaryPhone = intel.phones.primary; // +19843685289 from DB
const whatsappFrom = intel.phones.whatsapp; // +19843685289 from DB
const callerIdShow = intel.phones.callerId; // Jio number from DB

// URLs — always from DB
const pricingUrl = intel.urls.pricing;
const calendarUrl = intel.urls.calendar;
const caseStudyUrl = intel.urls.caseStudy;

// ❌ WRONG — never do this
const callerIdShow = process.env.VERIFIED_CALLER_ID; // WRONG
const pricingUrl = process.env.PRICING_URL; // WRONG
const phone = "+19843685289"; // WRONG — hardcoded
```

---

## HOW REACTION INTELLIGENCE BUILDS OVER TIME

```
Every call outcome → PostCallProcessor analyses transcript
  → For each AI response:
     - What triggered it?
     - Which response variant was used?
     - Sentiment before vs after?
     - Did the call convert?
  → Updates response_variants JSONB with new performance data
  → Best variants rise to top (highest conversion_rate)
  → Regional patterns emerge (X works in IN, not in GB)
  → New objections auto-detected → flagged for human review

After 1,000 calls:
  → System knows exactly what to say when Indian male CTO says
    "your pricing is too high compared to competitor X"
  → It has 5 variants with real conversion rates per variant
  → It picks the best one automatically
  → Human can always override via admin panel
```

---

## ADMIN PANEL SECTIONS

```
/admin/company        → Edit name, agent name, ALL phone numbers, ALL URLs
/admin/products       → Add/edit products, pricing tiers, product URLs
/admin/regional       → Edit rules per country, calling hours, dos/donts
/admin/reactions      → View/edit objection responses, see conversion rates
/admin/competitors    → Add competitors, update comparison scripts
/admin/stories        → Add success stories, tag by industry/region/concern
/admin/profiles       → AI behaviour profiles per campaign/region
```

---

## LEAD MANAGER — THE LIVING PROFILE

Every lead has a profile that grows richer after every interaction.

```
SECTIONS:
  1. Identity          → name, role, company, location, source
  2. Contact           → phones, channel preference, call timing
  3. AI-Observed       → communication style, pace, what works/frustrates
  4. Zero-Party Data   → personal details mentioned voluntarily
                         (family, hobbies, goals, frustrations)
                         "You mentioned your team of 8 last time..."
  5. Sales Intelligence → stage, objections, buying signals, competitors,
                          budget, urgency, decision influencers
  6. Scores            → lead score, buying intent, engagement,
                          relationship score, risk flags

THE REMARK SYSTEM (most important):
  After every call → AI writes a structured remark
  Before next call → AI reads the remark
  Remark contains:
    → Mood this call ("started guarded, warmed after case study")
    → What worked ("ROI framing 'saves 2 hires' resonated")
    → What to avoid ("gets impatient when you recap")
    → Personal details captured ("team of 8, recently lost one person")
    → Open loops ("promised to send API integration doc")
    → Next call strategy ("open by asking if CTO spoken to")
    → Predicted next objection

See: lead-manager.instructions.md for full implementation.
```

---

## CENTRAL INTELLIGENCE BRAIN — THE LEARNING SYSTEM

Watches ALL calls. Learns what works across ALL leads.

```
FIVE LEARNING SYSTEMS:

1. WINNING PATTERNS LIBRARY
   Lead profile + approach → outcome
   "Indian SaaS founders respond 71% better to team-size pain
    framing than product feature framing"

2. LOST DEAL AUTOPSY BANK
   What preceded every loss → what to do instead
   "Revealing price before establishing team-size pain =
    63% drop in conversion for IN/SMB segment"

3. CONVERSATION MOMENT LIBRARY
   Exact phrases that changed calls stored + ranked by outcome
   "I want to push back on that slightly" → +0.34 sentiment lift
   after price objection, 58% conversion rate when used

4. PERSONA PERFORMANCE INTELLIGENCE
   Which voice persona converts which segment at what rate
   Connected to persona selection before every call

5. TIMING & BEHAVIOURAL INTELLIGENCE
   Best time/day to call each country segment
   Re-engagement windows for dormant leads
   Seasonal patterns (Diwali, budget cycles, holidays)

All five systems update after every call.
All five are read before every call via PreCallBrainService.
See: central-brain.instructions.md for full implementation.
```

---

## VOICE PERSONAS — THE IDENTITY SYSTEM

Named voice characters — more than just ElevenLabs voice IDs.

```
EACH PERSONA HAS:
  Name (customer-facing — "Can I speak to James?")
  ElevenLabs voice ID + voice parameters
  Language capabilities with quality ratings
  Personality description (AI reads to "become" the persona)
  Speciality (rapport / technical / closing / enterprise / cultural)
  Emotion-specific voice parameter overrides
  Handoff phrases (what they say switching in/out)
  Performance data from central brain

SELECTION — 5 LAYERS:
  1. Stored customer preference (always honoured)
  2. Language match (who speaks their language best?)
  3. Segment performance (who converts this profile best?)
  4. Regional default (which persona for this country?)
  5. System default (absolute fallback)

MID-CALL SWITCHING — 5 TRIGGERS:
  1. Customer explicitly asks for a different voice
  2. Customer switches language (need capable persona)
  3. Frustration detected (switch to calmer persona)
  4. Technical question (switch to analytical persona)
  5. Central brain pattern match

THE SEAMLESS SWITCH:
  Current persona → natural handoff line ("let me bring in James")
  Filler audio plays (covers gap — same CrossfadeManager)
  New persona pre-warmed during above
  Crossfade to new voice (150ms)
  New persona acknowledges context ("James here — so on that question...")
  Customer hears: "a colleague was brought in" — not a glitch

CENTRAL BRAIN CONNECTION:
  After every call:
    Which persona was used?
    Which segment was this lead?
    What was the outcome?
    Did any switches happen? Did they help?
  Brain learns: Priya converts IN/SaaS/founder at 48% vs Sarah at 31%
  Brain recommends: assign Priya before the call even starts

See: voice-personas.instructions.md for full implementation.
```
