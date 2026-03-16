#
# Orivraa AI Sales Voice Agent
#
# Pipecat pipeline: Google STT (or Deepgram fallback) → Gemini 2.5 Flash → ElevenLabs TTS
# Deploys to Pipecat Cloud with Daily.co WebRTC transport.
#
# Dynamic config (system_prompt, voice_id, greeting) is passed via
# runner_args.body at session start time from the NestJS backend.
#

import asyncio
import json
import os
import tempfile
import time

import aiohttp
from dotenv import load_dotenv
from loguru import logger

print("🚀 Starting Orivraa AI Sales Agent...")
print("⏳ Loading models and imports (first run only)\n")

logger.info("Loading Silero VAD model...")
from pipecat.audio.vad.silero import SileroVADAnalyzer

logger.info("✅ Silero VAD model loaded")

from pipecat.frames.frames import (
    EndFrame,
    Frame,
    TranscriptionFrame,
    TTSSpeakFrame,
)
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
)
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.runner.types import RunnerArguments
from pipecat.runner.utils import create_transport
from pipecat.services.elevenlabs.tts import ElevenLabsTTSService
from pipecat.services.google.llm import GoogleLLMService
from pipecat.transports.base_transport import BaseTransport, TransportParams
from pipecat.transports.daily.transport import DailyParams

logger.info("✅ All components loaded successfully!")

load_dotenv(override=True)

# Max conversation turns to keep in context before summarizing
MAX_CONTEXT_MESSAGES = 30
# How many recent messages to preserve after summarization
KEEP_RECENT_MESSAGES = 8

# Default system prompt for AI sales agent
DEFAULT_SYSTEM_PROMPT = """You are an AI sales assistant for Orivraa, a premium jewellery marketplace \
connecting customers with verified local jewellers across Nepal, India, Dubai, USA & UK.

Your role:
- Build rapport with potential customers and jewellers
- Understand their needs (buying/selling/custom orders)
- Explain Orivraa's value proposition (verified sellers, secure escrow, custom manufacturing)
- Handle objections professionally
- Guide them towards signing up or scheduling a follow-up

Communication style:
- Warm, professional, and knowledgeable about jewellery
- Ask open-ended questions to understand needs
- Listen actively and reference what the customer says
- Keep responses concise and conversational (2-3 sentences max)
- Use the customer's name when known

Important: You are on a voice call. Speak naturally and conversationally.
Do not use markdown, bullet points, or any text formatting in your responses."""

DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"  # ElevenLabs Rachel


def get_config(runner_args: RunnerArguments) -> dict:
    """Extract dynamic configuration from runner_args.body.

    The NestJS backend passes config when starting a session:
    {
        "system_prompt": "...",
        "voice_id": "...",
        "greeting": "...",
        "lead_name": "...",
        "agent_name": "...",
        "language": "en-IN",
        "available_agents": [{ "name": "...", "voice_id": "...", ... }]
    }
    """
    body = {}
    if hasattr(runner_args, "body") and runner_args.body:
        if isinstance(runner_args.body, str):
            try:
                body = json.loads(runner_args.body)
            except json.JSONDecodeError:
                body = {}
        elif isinstance(runner_args.body, dict):
            body = runner_args.body

    # Extract Pipecat session_id from runner_args (set by Pipecat Cloud)
    session_id = getattr(runner_args, "session_id", "") or ""

    return {
        "system_prompt": body.get("system_prompt", DEFAULT_SYSTEM_PROMPT),
        "voice_id": body.get("voice_id", DEFAULT_VOICE_ID),
        "greeting": body.get(
            "greeting", "I'm calling from Orivraa. How are you today?"
        ),
        "lead_name": body.get("lead_name", ""),
        "agent_name": body.get("agent_name", "Orivraa Sales"),
        "language": body.get("language", "en-IN"),
        "webhook_url": body.get("webhook_url", ""),
        "session_id": session_id,
        "available_agents": body.get("available_agents", []),
    }


def _write_google_creds_to_tempfile() -> str | None:
    """Write GOOGLE_CREDENTIALS_JSON env var to a temp file, return path."""
    creds_json = os.getenv("GOOGLE_CREDENTIALS_JSON")
    if not creds_json:
        return None
    try:
        # Validate it's real JSON
        json.loads(creds_json)
        fd, path = tempfile.mkstemp(suffix=".json", prefix="gcp_creds_")
        with os.fdopen(fd, "w") as f:
            f.write(creds_json)
        logger.info(f"Wrote Google credentials to {path}")
        return path
    except (json.JSONDecodeError, OSError) as e:
        logger.warning(f"Failed to write Google credentials: {e}")
        return None


def create_stt_service(language: str):
    """Create STT service — Google service account (primary), Deepgram (fallback).

    Google STT gRPC streaming requires service account credentials, NOT a plain API key.
    If no service account is available, falls back to Deepgram.
    """
    # --- Primary: Google STT with service account ---
    creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if not creds_path:
        creds_path = _write_google_creds_to_tempfile()

    if creds_path and os.path.exists(creds_path):
        try:
            from pipecat.services.google.stt import GoogleSTTService

            logger.info("Using Google STT (service account credentials)")
            return GoogleSTTService(
                credentials_path=creds_path,
                settings=GoogleSTTService.Settings(
                    languages=[language],
                    model="latest_long",
                    enable_automatic_punctuation=True,
                    enable_interim_results=True,
                ),
            )
        except Exception as e:
            logger.warning(f"Google STT init failed: {e}, falling back to Deepgram")

    # --- Fallback: Deepgram STT (plain API key) ---
    deepgram_key = os.getenv("DEEPGRAM_API_KEY")
    if deepgram_key:
        try:
            from pipecat.services.deepgram.stt import DeepgramSTTService

            logger.info("Using Deepgram STT (fallback)")
            return DeepgramSTTService(
                api_key=deepgram_key,
                settings=DeepgramSTTService.Settings(
                    language=language,
                    model="nova-3",
                ),
            )
        except Exception as e:
            logger.error(f"Deepgram STT init also failed: {e}")

    raise RuntimeError(
        "No STT provider available. Set GOOGLE_CREDENTIALS_JSON (service account) "
        "or DEEPGRAM_API_KEY as a fallback."
    )


class TranscriptCollector(FrameProcessor):
    """Collects user STT transcriptions for the webhook transcript.
    
    Assistant text is extracted from the LLM context at the end of the call
    to ensure we capture exactly what the LLM generated (not just what reached TTS).
    """

    def __init__(self):
        super().__init__()
        self.user_turns: list[dict] = []

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        # Capture user speech (finalized STT transcriptions)
        if isinstance(frame, TranscriptionFrame) and frame.text.strip():
            self.user_turns.append(
                {"role": "user", "text": frame.text.strip(), "ts": time.time()}
            )

        await self.push_frame(frame, direction)

    def build_transcript(self, context: LLMContext) -> str:
        """Build full transcript by merging user STT with LLM context messages."""
        messages = context.get_messages() if context else []
        lines = []
        for msg in messages:
            role = msg.get("role", "")
            content = msg.get("content", "")
            if isinstance(content, list):
                content = " ".join(
                    p.get("text", "") for p in content if isinstance(p, dict)
                )
            if not content or role == "system":
                continue
            label = "Customer" if role == "user" else "Agent"
            lines.append(f"{label}: {content}")
        return "\n".join(lines)


class PersonaSwitchDetector(FrameProcessor):
    """Detects agent handoff requests in user speech and switches TTS voice.

    When the user asks to speak to a different agent (e.g., "let me talk to Raj"),
    this processor:
    1. Detects the requested agent name from transcription
    2. Switches the TTS voice to match the new agent
    3. Injects a transfer context message into the LLM context
    """

    def __init__(
        self,
        available_agents: list[dict],
        tts: ElevenLabsTTSService,
        context: LLMContext,
        current_agent_name: str,
        task=None,
    ):
        super().__init__()
        self.available_agents = {a["name"].lower(): a for a in available_agents}
        self.agent_names = [a["name"] for a in available_agents]
        self.tts = tts
        self.context = context
        self.current_agent = current_agent_name
        self.task = task  # PipelineTask reference to queue frames
        self._switch_cooldown = 0.0

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        # Check user speech (TranscriptionFrame from STT) for explicit handoff requests
        if isinstance(frame, TranscriptionFrame) and frame.text.strip():
            text_lower = frame.text.strip().lower()
            if self._is_handoff_request(text_lower) and time.time() > self._switch_cooldown:
                requested = self._find_requested_agent(text_lower)
                if requested and requested["name"].lower() != self.current_agent.lower():
                    await self._switch_persona(requested)

        await self.push_frame(frame, direction)

    def _is_handoff_request(self, text: str) -> bool:
        """Check if the user is requesting a different agent."""
        handoff_phrases = [
            "talk to", "speak to", "speak with", "connect me to",
            "transfer me to", "switch to", "let me talk to",
            "can i talk to", "i want to talk to", "put me through to",
            "i'd like to speak with", "can you transfer me", "switch me to",
            "get me", "i need to speak with", "put me through",
        ]
        return any(phrase in text for phrase in handoff_phrases)

    def _find_requested_agent(self, text: str) -> dict | None:
        """Find the agent name mentioned in the text."""
        for name_lower, agent in self.available_agents.items():
            if name_lower in text:
                return agent
            # Also check first name only
            first_name = name_lower.split()[0] if " " in name_lower else name_lower
            if first_name in text and len(first_name) > 2:
                return agent
        return None

    async def _switch_persona(self, new_agent: dict):
        """Switch to a new agent persona (voice + context + immediate LLM re-trigger)."""
        old_name = self.current_agent
        new_name = new_agent["name"]
        new_voice = new_agent.get("voice_id", "")
        new_greeting = new_agent.get("greeting", "")

        logger.info(f"🔄 Persona switch: {old_name} → {new_name} (voice: {new_voice})")

        # 1. Switch TTS voice using the proper public API
        if new_voice:
            try:
                await self.tts.set_voice(new_voice)
                logger.info(f"✅ TTS voice switched to {new_voice} ({new_name})")
            except Exception as e:
                logger.warning(f"set_voice() failed, trying direct property: {e}")
                # Fallback: some pipecat versions use _voice_id directly
                try:
                    self.tts._voice_id = new_voice
                    logger.info(f"✅ TTS voice set via _voice_id ({new_name})")
                except Exception as e2:
                    logger.error(f"Could not switch TTS voice: {e2}")

        # 2. Update current agent
        self.current_agent = new_name
        # Cooldown: don't switch again for 15 seconds
        self._switch_cooldown = time.time() + 15

        # 3. If we have a task reference, speak the greeting as the new persona immediately
        #    This bypasses the LLM entirely for an instant, clean handoff
        if self.task:
            intro = (
                new_greeting
                or f"Hi! I'm {new_name}. {old_name} told me you wanted to speak with me. How can I help you?"
            )
            logger.info(f"Speaking handoff greeting as {new_name}: {intro}")
            await self.task.queue_frames([TTSSpeakFrame(text=intro)])

        # 4. Inject system context so FUTURE LLM turns use the new persona identity
        transfer_msg = (
            f"[HANDOFF COMPLETE: You are now {new_name}. The customer was transferred from {old_name}. "
            f"Continue the conversation as {new_name}. Do NOT mention {old_name} again unless asked.]"
        )
        self.context.add_message({"role": "system", "content": transfer_msg})


def build_persona_aware_prompt(system_prompt: str, available_agents: list[dict], current_agent: str) -> str:
    """Enhance system prompt with persona switch awareness."""
    if not available_agents or len(available_agents) <= 1:
        return system_prompt

    agent_names = [a["name"] for a in available_agents if a["name"] != current_agent]
    if not agent_names:
        return system_prompt

    persona_section = (
        f"\n\nYou are currently {current_agent}. Your team members are: {', '.join(agent_names)}. "
        f"If the customer asks to speak with another team member BY NAME, say something like "
        f"'I'll connect you to {agent_names[0]} right now!' — then STOP talking immediately. "
        f"The system handles the transfer instantly. Do NOT say 'give me a minute' or make the customer wait."
    )
    return system_prompt + persona_section


async def send_transcript_webhook(webhook_url: str, transcript: str, config: dict):
    """POST transcript to the NestJS backend when the call ends."""
    if not webhook_url or not transcript:
        logger.info("No webhook URL or transcript — skipping POST")
        return
    payload = {
        "event": "session.ended",
        "session_id": config.get("session_id", ""),
        "transcript": transcript,
        "agent_name": config.get("agent_name", ""),
        "lead_name": config.get("lead_name", ""),
    }
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                webhook_url,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=15),
            ) as resp:
                logger.info(f"Webhook POST {resp.status} → {webhook_url}")
    except Exception as e:
        logger.error(f"Webhook POST failed: {e}")


async def summarize_context(context: LLMContext, llm: GoogleLLMService):
    """Summarize older messages when context grows too large."""
    messages = context.get_messages()
    if len(messages) <= MAX_CONTEXT_MESSAGES:
        return

    # Keep system message (index 0) + last N messages
    old_messages = messages[1:-KEEP_RECENT_MESSAGES]
    if not old_messages:
        return

    conversation_text = ""
    for msg in old_messages:
        role = msg.get("role", "unknown")
        content = msg.get("content", "")
        if isinstance(content, list):
            content = " ".join(
                p.get("text", "") for p in content if isinstance(p, dict)
            )
        conversation_text += f"{role}: {content}\n"

    summary_prompt = (
        "Summarize this conversation concisely, preserving key facts, "
        "customer preferences, objections raised, and agreements made:\n\n"
        + conversation_text[:4000]
    )

    try:
        # Use Gemini directly for summarization
        import google.generativeai as genai_lib
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            return
        genai_lib.configure(api_key=api_key)
        model = genai_lib.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(summary_prompt)
        summary_text = response.text

        # Rebuild context: system + summary + recent
        system_msg = messages[0]
        recent = messages[-KEEP_RECENT_MESSAGES:]
        new_messages = [
            system_msg,
            {"role": "user", "content": f"[Previous conversation summary: {summary_text}]"},
            {"role": "assistant", "content": "Understood, I have the context from our earlier discussion."},
            *recent,
        ]
        context.set_messages(new_messages)
        logger.info(
            f"Context summarized: {len(messages)} → {len(new_messages)} messages"
        )
    except Exception as e:
        logger.warning(f"Context summarization failed: {e}")


async def run_bot(transport: BaseTransport, runner_args: RunnerArguments):
    config = get_config(runner_args)
    logger.info(
        f"Starting bot: agent={config['agent_name']}, lang={config['language']}"
    )

    available_agents = config.get("available_agents", [])

    # Enhance system prompt with persona switch awareness
    system_prompt = build_persona_aware_prompt(
        config["system_prompt"], available_agents, config["agent_name"]
    )

    # --- STT: Google (service account) or Deepgram (fallback) ---
    stt = create_stt_service(config["language"])

    # --- LLM: Google Gemini 2.5 Flash ---
    llm = GoogleLLMService(
        api_key=os.getenv("GOOGLE_API_KEY"),
        settings=GoogleLLMService.Settings(
            model="gemini-2.5-flash",
            system_instruction=system_prompt,
            temperature=0.7,
            max_tokens=1024,
        ),
    )

    # --- TTS: ElevenLabs ---
    tts = ElevenLabsTTSService(
        api_key=os.getenv("ELEVENLABS_API_KEY"),
        settings=ElevenLabsTTSService.Settings(
            voice=config["voice_id"],
            model="eleven_turbo_v2_5",
            stability=0.5,
            similarity_boost=0.75,
        ),
    )

    # Transcript collector for webhook POST
    transcript_collector = TranscriptCollector()

    # Persona switch detector (active only if multiple agents available)
    persona_detector = None

    # Conversation context with Voice Activity Detection
    context = LLMContext()
    user_aggregator, assistant_aggregator = LLMContextAggregatorPair(
        context,
        user_params=LLMUserAggregatorParams(
            vad_analyzer=SileroVADAnalyzer(),
        ),
    )

    # Build pipeline processors list
    processors = [
        transport.input(),
        stt,
        transcript_collector,
    ]

    # Add persona switch detector if multiple agents available
    # task=None for now; we set it after PipelineTask is created below
    if len(available_agents) > 1:
        persona_detector = PersonaSwitchDetector(
            available_agents=available_agents,
            tts=tts,
            context=context,
            current_agent_name=config["agent_name"],
            task=None,  # will be set after task creation
        )
        processors.append(persona_detector)
        logger.info(f"Persona switch enabled: {[a['name'] for a in available_agents]}")

    processors.extend([
        user_aggregator,
        llm,
        tts,
        transport.output(),
        assistant_aggregator,
    ])

    # Pipeline: Audio In → STT → Transcript Capture → [Persona Switch] → LLM → TTS → Audio Out
    pipeline = Pipeline(processors)

    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
    )

    # Wire task into persona detector now that it's been created
    if persona_detector is not None:
        persona_detector.task = task


    @transport.event_handler("on_client_connected")
    async def on_client_connected(transport, client):
        logger.info("Client connected — sending greeting via TTSSpeakFrame")
        greeting = config["greeting"]
        if config["lead_name"]:
            greeting = f"Hello {config['lead_name']}! {greeting}"

        # Use TTSSpeakFrame for clean greeting (doesn't pollute LLM context)
        await task.queue_frames([TTSSpeakFrame(text=greeting)])

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        logger.info("Client disconnected — sending transcript and cleaning up")

        # Build transcript from LLM context (user + assistant messages)
        transcript_text = transcript_collector.build_transcript(context)
        if transcript_text:
            logger.info(
                f"Collected transcript: {len(transcript_text)} chars"
            )
            await send_transcript_webhook(
                config["webhook_url"], transcript_text, config
            )
        else:
            logger.warning("No transcript collected during session")

        await task.queue_frames([EndFrame()])

    # Periodically check if context needs summarization
    async def context_maintenance():
        while True:
            await asyncio.sleep(60)
            try:
                await summarize_context(context, llm)
            except Exception as e:
                logger.warning(f"Context maintenance error: {e}")

    asyncio.create_task(context_maintenance())

    runner = PipelineRunner(handle_sigint=runner_args.handle_sigint)
    await runner.run(task)


async def bot(runner_args: RunnerArguments):
    """Main bot entry point for Pipecat Cloud."""
    config = get_config(runner_args)
    # Be flexible with naming and force Orivraa if it defaults to pipecat
    agent_name = config.get("agent_name") or config.get("agentName") or "Orivraa Sales"
    if "pipecat" in agent_name.lower():
        agent_name = "Orivraa Sales"
    
    logger.info(f"Setting participant name to: {agent_name}")

    transport_params = {
        "daily": lambda: DailyParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            audio_in_sample_rate=16000,
            audio_out_sample_rate=24000,
            participant_name=agent_name,
        ),
        "webrtc": lambda: TransportParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            audio_in_sample_rate=16000,
            audio_out_sample_rate=24000,
            participant_name=agent_name,
        ),
    }

    transport = await create_transport(runner_args, transport_params)
    await run_bot(transport, runner_args)


if __name__ == "__main__":
    from pipecat.runner.run import main

    main()

# Force rebuild for image push - v2 (2026-03-16 14:15:00)
