#
# Orivraa AI Sales Voice Agent
#
# Pipecat pipeline: Google STT (or Deepgram fallback) → Gemini 2.5 Flash → ElevenLabs TTS
# Deploys to Pipecat Cloud with Daily.co WebRTC transport.
#
# Dynamic config (system_prompt, voice_id, greeting) is passed via
# runner_args.body at session start time from the NestJS backend.
#

import json
import os
import tempfile

from dotenv import load_dotenv
from loguru import logger

print("🚀 Starting Orivraa AI Sales Agent...")
print("⏳ Loading models and imports (first run only)\n")

logger.info("Loading Silero VAD model...")
from pipecat.audio.vad.silero import SileroVADAnalyzer

logger.info("✅ Silero VAD model loaded")

from pipecat.frames.frames import LLMRunFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
)
from pipecat.runner.types import RunnerArguments
from pipecat.runner.utils import create_transport
from pipecat.services.elevenlabs.tts import ElevenLabsTTSService
from pipecat.services.google.llm import GoogleLLMService
from pipecat.transports.base_transport import BaseTransport, TransportParams
from pipecat.transports.daily.transport import DailyParams

logger.info("✅ All components loaded successfully!")

load_dotenv(override=True)

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
        "language": "en-IN"
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

    return {
        "system_prompt": body.get("system_prompt", DEFAULT_SYSTEM_PROMPT),
        "voice_id": body.get("voice_id", DEFAULT_VOICE_ID),
        "greeting": body.get(
            "greeting", "I'm calling from Orivraa. How are you today?"
        ),
        "lead_name": body.get("lead_name", ""),
        "agent_name": body.get("agent_name", "Orivraa Sales"),
        "language": body.get("language", "en-IN"),
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


async def run_bot(transport: BaseTransport, runner_args: RunnerArguments):
    config = get_config(runner_args)
    logger.info(
        f"Starting bot: agent={config['agent_name']}, lang={config['language']}"
    )

    # --- STT: Google (service account) or Deepgram (fallback) ---
    stt = create_stt_service(config["language"])

    # --- LLM: Google Gemini 2.5 Flash ---
    llm = GoogleLLMService(
        api_key=os.getenv("GOOGLE_API_KEY"),
        settings=GoogleLLMService.Settings(
            model="gemini-2.5-flash",
            system_instruction=config["system_prompt"],
            temperature=0.7,
            max_tokens=256,
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

    # Conversation context with Voice Activity Detection
    context = LLMContext()
    user_aggregator, assistant_aggregator = LLMContextAggregatorPair(
        context,
        user_params=LLMUserAggregatorParams(
            vad_analyzer=SileroVADAnalyzer(),
        ),
    )

    # Pipeline: Audio In → STT → LLM → TTS → Audio Out
    pipeline = Pipeline(
        [
            transport.input(),
            stt,
            user_aggregator,
            llm,
            tts,
            transport.output(),
            assistant_aggregator,
        ]
    )

    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
    )

    @transport.event_handler("on_client_connected")
    async def on_client_connected(transport, client):
        logger.info("Client connected — sending greeting")
        greeting = config["greeting"]
        if config["lead_name"]:
            greeting = f"Hello {config['lead_name']}! {greeting}"

        context.add_message(
            {"role": "user", "content": f"Say exactly: {greeting}"}
        )
        await task.queue_frames([LLMRunFrame()])

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        logger.info("Client disconnected — cleaning up")
        await task.cancel()

    runner = PipelineRunner(handle_sigint=runner_args.handle_sigint)
    await runner.run(task)


async def bot(runner_args: RunnerArguments):
    """Main bot entry point for Pipecat Cloud."""
    transport_params = {
        "daily": lambda: DailyParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
        ),
        "webrtc": lambda: TransportParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
        ),
    }

    transport = await create_transport(runner_args, transport_params)
    await run_bot(transport, runner_args)


if __name__ == "__main__":
    from pipecat.runner.run import main

    main()
