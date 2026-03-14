# Orivraa AI Sales Voice Agent

Pipecat-powered voice AI agent deployed on **Pipecat Cloud** with **Daily.co** WebRTC transport.

**Pipeline:** Google Cloud STT → Gemini 2.5 Flash → ElevenLabs TTS

## Setup & Deployment

### Prerequisites

- Python 3.10+
- [uv](https://docs.astral.sh/uv/getting-started/installation/) package manager
- Pipecat Cloud account ([sign up](https://pipecat.daily.co/sign-up))

### 1. Install dependencies

```bash
cd pipecat-agent
uv sync
```

### 2. Configure secrets on Pipecat Cloud

```bash
# Login to Pipecat Cloud
uv run pipecat cloud auth login

# Create .env from example
cp env.example .env
# Edit .env with your actual API keys

# Upload secrets to Pipecat Cloud
uv run pipecat cloud secrets set orivraa-secrets --file .env
```

### 3. Deploy to Pipecat Cloud

```bash
uv run pipecat cloud deploy
```

This builds the Docker image and deploys the `orivraa-sales` agent.

### 4. Test locally (optional)

```bash
cp env.example .env
# Edit .env with your API keys
uv run bot.py
# Open http://localhost:7860/client in your browser
```

## Pipecat Cloud Dashboard Secrets

Create a **secret set** named `orivraa-secrets` with these keys:

| Secret Key           | Description                    | Where to get it                                                  |
| -------------------- | ------------------------------ | ---------------------------------------------------------------- |
| `GOOGLE_API_KEY`     | Gemini API key for LLM         | [Google AI Studio](https://aistudio.google.com/)                 |
| `GOOGLE_STT_API_KEY` | GCP API key for Speech-to-Text | [GCP Console](https://console.cloud.google.com/apis/credentials) |
| `ELEVENLABS_API_KEY` | ElevenLabs API key for TTS     | [ElevenLabs Dashboard](https://elevenlabs.io/)                   |

> **Note:** Gemini and GCP Speech-to-Text use separate API keys. Same setup you use on teams.orivraa.com — no service account needed.

## How It Works

1. **NestJS backend** calls Pipecat Cloud API → `POST /v1/agents/orivraa-sales/start`
2. **Pipecat Cloud** spins up a bot instance, creates a Daily.co room
3. **Returns** `{ session_id, room_url, token }` to NestJS
4. **NestJS** stores session info and provides room URL to the frontend
5. **Frontend** connects to the Daily room using `@pipecat-ai/daily-transport`
6. **Bot** receives dynamic config (system prompt, voice, greeting) via `runner_args.body`

## Dynamic Configuration

The NestJS backend passes config at session start time:

```json
{
  "system_prompt": "You are a sales agent for...",
  "voice_id": "21m00Tcm4TlvDq8ikWAM",
  "greeting": "Hello! How can I help you today?",
  "lead_name": "John Doe",
  "agent_name": "Orivraa Sales",
  "language": "en-IN"
}
```

## Architecture

```
┌─────────────────┐     REST API      ┌──────────────────┐
│  NestJS Backend  │ ──────────────── │  Pipecat Cloud   │
│  (team-api)      │                   │  (managed infra) │
└────────┬────────┘                   └────────┬─────────┘
         │                                      │
         │ room_url + token                     │ runs bot.py
         │                                      │
┌────────▼────────┐    Daily WebRTC   ┌────────▼─────────┐
│  React Frontend  │ ◄──────────────► │  Pipecat Agent   │
│  (team-web)      │   audio/video    │  (Python bot)    │
└─────────────────┘                   └──────────────────┘
```

## Pricing

- **Pipecat Cloud:** $0.01/min per active agent (agent-1x profile)
- **Google STT:** ~$0.006/15s of audio
- **Gemini 2.5 Flash:** ~$0.15/1M input tokens
- **ElevenLabs:** Depends on plan (starter: $5/mo for 30k chars)
