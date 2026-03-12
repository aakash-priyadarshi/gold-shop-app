import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as puppeteer from "puppeteer";
import { ConversationBrainService, ConversationContext } from "./conversation-brain.service";
import { GeminiStreamingClient } from "./gemini-streaming.service";
import { STTRouterService } from "./stt-router.service";
import { PreCallBrainService } from "./pre-call-brain.service";
import { PrismaService } from "../../../prisma/prisma.service";

export interface MeetSession {
  id: string;
  meetUrl: string;
  agentId: string;
  agentName: string;
  status: "joining" | "in-meeting" | "speaking" | "listening" | "error" | "ended";
  logs: { time: number; type: "info" | "stt" | "llm" | "tts" | "error"; message: string }[];
  transcript: { role: "user" | "assistant"; content: string; timestamp: number }[];
  context: ConversationContext;
  systemPrompt: string;
  browser?: puppeteer.Browser;
  page?: puppeteer.Page;
  startTime: number;
  isProcessing: boolean;
}

@Injectable()
export class GoogleMeetBotService {
  private readonly logger = new Logger(GoogleMeetBotService.name);
  private sessions = new Map<string, MeetSession>();

  constructor(
    private config: ConfigService,
    private brain: ConversationBrainService,
    private gemini: GeminiStreamingClient,
    private sttRouter: STTRouterService,
    private preCallBrain: PreCallBrainService,
    private prisma: PrismaService,
  ) {}

  /** Start a Meet bot session — launches Puppeteer, joins the meeting */
  async startSession(meetUrl: string, agentId: string): Promise<MeetSession> {
    // Validate Google Meet URL
    if (!this.isValidMeetUrl(meetUrl)) {
      throw new Error("Invalid Google Meet URL. Expected format: https://meet.google.com/xxx-xxxx-xxx");
    }

    const agent = await this.prisma.agentVoice.findUnique({ where: { id: agentId } });
    if (!agent) throw new Error("Agent not found");

    const sessionId = `meet-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Build conversation context
    const context: ConversationContext = {
      agentName: agent.name,
      agentPersonality: agent.personalityDescription ?? undefined,
      language: "en",
      conversationHistory: [],
      currentPhase: "WARM_OPEN",
    };

    const systemPrompt = this.brain.buildSystemPrompt(context);

    const session: MeetSession = {
      id: sessionId,
      meetUrl,
      agentId,
      agentName: agent.name,
      status: "joining",
      logs: [],
      transcript: [],
      context,
      systemPrompt,
      startTime: Date.now(),
      isProcessing: false,
    };

    this.sessions.set(sessionId, session);
    this.addLog(session, "info", `Starting Meet bot for agent "${agent.name}"`);
    this.addLog(session, "info", `Meeting URL: ${meetUrl}`);

    // Launch browser and join meet in background
    this.launchAndJoin(session).catch((err) => {
      this.addLog(session, "error", `Failed to join: ${err.message}`);
      session.status = "error";
    });

    return session;
  }

  /** Stop a session — close browser and clean up */
  async stopSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    this.addLog(session, "info", "Stopping Meet bot...");
    session.status = "ended";

    try {
      if (session.page && !session.page.isClosed()) {
        // Leave the meeting first
        await session.page.evaluate(() => {
          // Click the "Leave call" button
          const leaveBtn = document.querySelector('[aria-label="Leave call"]') as HTMLElement;
          if (leaveBtn) leaveBtn.click();
        }).catch(() => {});
      }
      if (session.browser) {
        await session.browser.close().catch(() => {});
      }
    } catch {
      // Ignore cleanup errors
    }

    session.browser = undefined;
    session.page = undefined;
    this.addLog(session, "info", "Meet bot stopped");
  }

  /** Get session status and logs */
  getSession(sessionId: string): Omit<MeetSession, "browser" | "page"> | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Return without browser/page references (non-serializable)
    const { browser, page, ...rest } = session;
    return rest;
  }

  /** List all active sessions */
  getActiveSessions(): { id: string; agentName: string; status: string; meetUrl: string; startTime: number }[] {
    return Array.from(this.sessions.values())
      .filter((s) => s.status !== "ended")
      .map((s) => ({
        id: s.id,
        agentName: s.agentName,
        status: s.status,
        meetUrl: s.meetUrl,
        startTime: s.startTime,
      }));
  }

  /** Process incoming audio from the Meet — STT → LLM → TTS (called from page context) */
  async processAudio(session: MeetSession, audioBase64: string): Promise<string | null> {
    if (session.isProcessing) return null;
    session.isProcessing = true;

    try {
      const audioBuffer = Buffer.from(audioBase64, "base64");

      // STT: transcribe the audio
      this.addLog(session, "stt", "Transcribing audio...");
      const sttResult = await this.sttRouter.transcribeBrowserAudio(
        audioBuffer,
        session.id,
        session.context.language || "en",
        "auto",
      );

      const transcript = sttResult.transcript;
      if (!transcript || transcript.trim().length < 3) {
        session.isProcessing = false;
        return null;
      }

      this.addLog(session, "stt", `Heard: "${transcript}" (${sttResult.provider})`);

      // Track detected language — if customer switches language, follow them
      if (sttResult.detectedLanguage && sttResult.detectedLanguage !== "unknown") {
        const newLang = sttResult.detectedLanguage;
        if (newLang !== session.context.language) {
          this.addLog(session, "info", `Language switch detected: ${session.context.language} → ${newLang}`);
          session.context.language = newLang;
          // Rebuild system prompt with new language so LLM responds consistently
          session.systemPrompt = this.brain.buildSystemPrompt(session.context);
        }
      }

      // Check if someone asked the bot to leave
      if (this.isLeaveIntent(transcript)) {
        this.addLog(session, "info", `Leave intent detected: "${transcript}"`);
        // Say goodbye, then leave
        const farewell = "Thanks everyone! It was great being part of this meeting. Goodbye!";
        session.transcript.push({ role: "user", content: transcript, timestamp: Date.now() });
        session.transcript.push({ role: "assistant", content: farewell, timestamp: Date.now() });
        await this.synthesizeAndPlayInMeet(session, farewell);
        session.isProcessing = false;
        // Auto-leave after farewell
        await this.stopSession(session.id);
        return farewell;
      }

      // Update context
      session.transcript.push({ role: "user", content: transcript, timestamp: Date.now() });
      session.context.conversationHistory.push({ role: "user", content: transcript });
      session.status = "speaking";

      // LLM: generate response
      this.addLog(session, "llm", "Generating response...");
      let responseText = "";
      const stream = this.gemini.streamResponse(
        transcript,
        session.systemPrompt,
        1024, // thinking budget for meet
      );

      for await (const chunk of stream) {
        responseText += chunk;
      }

      responseText = responseText.trim();
      if (!responseText) {
        session.isProcessing = false;
        session.status = "listening";
        return null;
      }

      this.addLog(session, "llm", `Response: "${responseText.substring(0, 100)}${responseText.length > 100 ? "..." : ""}"`);

      // Record assistant response
      session.transcript.push({ role: "assistant", content: responseText, timestamp: Date.now() });
      session.context.conversationHistory.push({ role: "assistant", content: responseText });

      // TTS: synthesize speech and play in meeting
      this.addLog(session, "tts", "Synthesizing speech...");
      await this.synthesizeAndPlayInMeet(session, responseText);

      session.status = "listening";
      session.isProcessing = false;
      return responseText;
    } catch (err: any) {
      this.addLog(session, "error", `Audio processing failed: ${err.message}`);
      session.isProcessing = false;
      session.status = "listening";
      return null;
    }
  }

  // ── Private methods ──

  private isValidMeetUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.hostname === "meet.google.com" && /^\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(parsed.pathname);
    } catch {
      return false;
    }
  }

  /** Detect if someone is asking the bot to leave the meeting */
  private isLeaveIntent(transcript: string): boolean {
    const t = transcript.toLowerCase().trim();
    const leavePatterns = [
      /\byou can leave\b/,
      /\bplease leave\b/,
      /\bleave the (call|meet|meeting)\b/,
      /\byou('re| are) dismissed\b/,
      /\bdisconnect (now|please|yourself)\b/,
      /\bbye\b.*\b(bot|ai|agent|orivraa)\b/,
      /\b(bot|ai|agent|orivraa)\b.*\bbye\b/,
      /\bthanks.*you can go\b/,
      /\bplease go\b/,
      /\bstop listening\b/,
      /\bend (the )?(session|call|meeting)\b/,
      /\bleave now\b/,
      /\bwe('re| are) done\b.*\b(leave|go|bye)\b/,
      // Hindi
      /\bja sakte h(o|ain)\b/,
      /\bnikal(o| jao)\b/,
      /\bband kar(o| do)\b/,
    ];
    return leavePatterns.some((p) => p.test(t));
  }

  private addLog(session: MeetSession, type: MeetSession["logs"][0]["type"], message: string) {
    session.logs.push({ time: Date.now(), type, message });
    this.logger.log(`[Meet:${session.id}] [${type}] ${message}`);
    // Keep logs bounded
    if (session.logs.length > 500) {
      session.logs = session.logs.slice(-300);
    }
  }

  /** Launch Puppeteer, navigate to Meet, join as guest */
  private async launchAndJoin(session: MeetSession) {
    this.addLog(session, "info", "Launching browser...");

    // Use system Chromium if available (Docker), otherwise Puppeteer's bundled one
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

    const browser = await puppeteer.launch({
      headless: true, // Puppeteer v22+ uses new headless by default (supports WebRTC)
      executablePath,
      args: [
        "--use-fake-ui-for-media-stream",     // Auto-accept mic/camera permissions
        "--use-fake-device-for-media-stream",  // Use fake device if no real one
        "--disable-notifications",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",             // Avoid /dev/shm issues in Docker
        "--disable-gpu",
        "--disable-web-security",
        "--autoplay-policy=no-user-gesture-required",
        "--enable-features=SharedArrayBuffer",
      ],
    });

    session.browser = browser;
    const page = await browser.newPage();
    session.page = page;

    // Set a reasonable viewport
    await page.setViewport({ width: 1280, height: 720 });

    this.addLog(session, "info", "Navigating to Google Meet...");
    await page.goto(session.meetUrl, { waitUntil: "networkidle2", timeout: 30000 });

    // Wait for the page to load
    await this.delay(3000);

    // Try to dismiss any "Got it" or consent dialogs
    await this.dismissDialogs(page, session);

    // Enter guest name
    await this.enterGuestName(page, session);

    // Turn off camera, keep mic on
    await this.configureMediaDevices(page, session);

    // Click "Ask to join" or "Join now"
    await this.clickJoinButton(page, session);

    // Wait for meeting to start
    await this.waitForMeetingStart(page, session);

    session.status = "listening";
    this.addLog(session, "info", "Successfully joined the meeting! Listening...");

    // Start the audio capture loop
    this.startAudioCapture(page, session);
  }

  private async dismissDialogs(page: puppeteer.Page, session: MeetSession) {
    try {
      // Dismiss "Before you join" / "Got it" / cookie banners
      const dismissSelectors = [
        'button[aria-label="Got it"]',
        'button[aria-label="Dismiss"]',
        '[data-mdc-dialog-action="accept"]',
        'button:has-text("Got it")',
        'button:has-text("Accept")',
      ];

      for (const selector of dismissSelectors) {
        try {
          const btn = await page.$(selector);
          if (btn) {
            await btn.click();
            this.addLog(session, "info", "Dismissed dialog");
            await this.delay(500);
          }
        } catch {
          // selector not found, continue
        }
      }
    } catch {
      // Ignore dialog dismissal errors
    }
  }

  private async enterGuestName(page: puppeteer.Page, session: MeetSession) {
    try {
      // Look for the "Your name" input field (guest join)
      const nameInput = await page.$('input[aria-label="Your name"]');
      if (nameInput) {
        await nameInput.click({ clickCount: 3 }); // Select all
        await nameInput.type(`${session.agentName} (Orivraa AI)`, { delay: 50 });
        this.addLog(session, "info", `Set guest name: "${session.agentName} (Orivraa AI)"`);
        await this.delay(500);
      }
    } catch (err: any) {
      this.addLog(session, "info", "Could not set guest name (may need Google login)");
    }
  }

  private async configureMediaDevices(page: puppeteer.Page, session: MeetSession) {
    try {
      // Turn off camera
      const cameraButton = await page.$('[aria-label*="camera" i]');
      if (cameraButton) {
        const isOn = await page.evaluate((el) => {
          return el?.getAttribute("data-is-muted") === "false";
        }, cameraButton);
        if (isOn) {
          await cameraButton.click();
          this.addLog(session, "info", "Camera turned off");
        }
      }

      // Ensure mic is on
      const micButton = await page.$('[aria-label*="microphone" i]');
      if (micButton) {
        const isMuted = await page.evaluate((el) => {
          return el?.getAttribute("data-is-muted") === "true";
        }, micButton);
        if (isMuted) {
          await micButton.click();
          this.addLog(session, "info", "Microphone turned on");
        }
      }
    } catch (err: any) {
      this.addLog(session, "info", "Media device configuration skipped");
    }
  }

  private async clickJoinButton(page: puppeteer.Page, session: MeetSession) {
    this.addLog(session, "info", "Looking for join button...");

    // Try multiple selectors for join button
    const joinSelectors = [
      'button[aria-label="Ask to join"]',
      'button[aria-label="Join now"]',
      '[data-idom-class*="join"] button',
      'button:has(span:text("Ask to join"))',
      'button:has(span:text("Join now"))',
    ];

    for (const selector of joinSelectors) {
      try {
        const btn = await page.$(selector);
        if (btn) {
          await btn.click();
          this.addLog(session, "info", "Clicked join button");
          return;
        }
      } catch {
        // Try next selector
      }
    }

    // Fallback: try to find by text content
    try {
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button, [role='button']"));
        const joinBtn = buttons.find((b) => {
          const text = b.textContent?.toLowerCase() || "";
          return text.includes("ask to join") || text.includes("join now");
        });
        if (joinBtn) (joinBtn as HTMLElement).click();
      });
      this.addLog(session, "info", "Clicked join button (fallback)");
    } catch (err: any) {
      this.addLog(session, "error", "Could not find join button — you may need to admit the bot manually");
    }
  }

  private async waitForMeetingStart(page: puppeteer.Page, session: MeetSession) {
    this.addLog(session, "info", "Waiting to be admitted to meeting...");
    session.status = "joining";

    // Check if Google sign-in is required
    const needsSignIn = await page.evaluate(() => {
      const body = document.body.textContent?.toLowerCase() || "";
      return body.includes("sign in") && (body.includes("to join") || body.includes("use your google account"));
    }).catch(() => false);

    if (needsSignIn) {
      this.addLog(session, "error",
        "This meeting requires a Google account to join. " +
        "Either sign into Google on the server, or change the meeting settings to allow guests without Google accounts.");
      session.status = "error";
      return;
    }

    // Wait up to 120s to be admitted
    const maxWaitMs = 120_000;
    const start = Date.now();
    let consecutiveRejections = 0;

    while (Date.now() - start < maxWaitMs) {
      // Check if we're in the meeting (look for call controls)
      const inMeeting = await page.evaluate(() => {
        return !!(
          document.querySelector('[aria-label="Leave call"]') ||
          document.querySelector('[data-call-button="hangup"]') ||
          document.querySelector('[aria-label*="presentation" i]')
        );
      }).catch(() => false);

      if (inMeeting) {
        this.addLog(session, "info", "Admitted to meeting!");
        return;
      }

      // Check for explicit rejection — use specific selectors, not full body text
      // (full body text causes false positives from help text on the page)
      const rejected = await page.evaluate(() => {
        // Look for specific rejection UI elements
        const body = document.body.textContent?.toLowerCase() || "";
        // Only check for very specific rejection phrases that appear in prominent UI
        const rejectionPhrases = [
          "you can't join this meeting",
          "your request to join was denied",
          "you've been removed from the meeting",
          "this meeting has been locked",
        ];
        // Check for a banner/dialog with the rejection text — exclude footer/help text
        const mainContent = document.querySelector('[role="main"]')?.textContent?.toLowerCase()
          || document.querySelector('[data-view-id]')?.textContent?.toLowerCase()
          || "";
        return rejectionPhrases.some(p => mainContent.includes(p) || body.startsWith(p));
      }).catch(() => false);

      if (rejected) {
        consecutiveRejections++;
        // Require 2 consecutive checks to avoid false positives
        if (consecutiveRejections >= 2) {
          this.addLog(session, "error", "Join request was denied or meeting is locked");
          session.status = "error";
          return;
        }
      } else {
        consecutiveRejections = 0;
      }

      // Log progress every 10s
      const elapsed = Math.round((Date.now() - start) / 1000);
      if (elapsed % 10 === 0 && elapsed > 0) {
        this.addLog(session, "info", `Still waiting to be admitted... (${elapsed}s)`);
      }

      await this.delay(2000);
    }

    this.addLog(session, "error", "Timed out waiting to be admitted (120s). Ask someone in the meeting to admit the bot.");
    session.status = "error";
  }

  /** Inject audio capture script into the Meet page */
  private async startAudioCapture(page: puppeteer.Page, session: MeetSession) {
    this.addLog(session, "info", "Setting up audio capture from meeting...");

    try {
      // Inject audio capture via Web Audio API
      await page.evaluate(() => {
        // Capture all audio output from the meeting using AudioContext
        const audioContext = new AudioContext({ sampleRate: 16000 });
        const dest = audioContext.createMediaStreamDestination();

        // Capture audio elements in the page
        const captureAudioElements = () => {
          document.querySelectorAll("audio, video").forEach((el: any) => {
            if (!el._captured) {
              try {
                const source = audioContext.createMediaElementSource(el);
                source.connect(dest);
                source.connect(audioContext.destination); // keep playback
                el._captured = true;
              } catch {
                // Element may already be captured
              }
            }
          });
        };

        captureAudioElements();
        // Re-check periodically for new audio elements (new participants)
        setInterval(captureAudioElements, 3000);

        // Record audio in 4-second chunks
        const recorder = new MediaRecorder(dest.stream, { mimeType: "audio/webm;codecs=opus" });
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = async () => {
          if (chunks.length === 0) return;
          const blob = new Blob(chunks, { type: "audio/webm" });
          chunks.length = 0;

          // Convert to base64 and expose to Puppeteer
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string)?.split(",")[1];
            if (base64) {
              (window as any).__meetAudioChunk = base64;
              (window as any).__meetAudioReady = true;
            }
          };
          reader.readAsDataURL(blob);
        };

        // Record in 4-second intervals
        const startRecording = () => {
          if (recorder.state === "inactive") {
            recorder.start();
            setTimeout(() => {
              if (recorder.state === "recording") {
                recorder.stop();
                // Restart after a small gap
                setTimeout(startRecording, 200);
              }
            }, 4000);
          }
        };

        startRecording();
        (window as any).__meetAudioCapture = true;
      });

      this.addLog(session, "info", "Audio capture active — listening for speech");

      // Poll for captured audio chunks and process them
      this.pollAudioChunks(page, session);
    } catch (err: any) {
      this.addLog(session, "error", `Audio capture setup failed: ${err.message}`);
      session.status = "error";
    }
  }

  /** Poll the page for captured audio and process through pipeline */
  private async pollAudioChunks(page: puppeteer.Page, session: MeetSession) {
    while (session.status !== "ended" && session.status !== "error") {
      try {
        if (page.isClosed()) {
          session.status = "ended";
          break;
        }

        // Check if a new audio chunk is ready
        const audioBase64 = await page.evaluate(() => {
          if ((window as any).__meetAudioReady) {
            (window as any).__meetAudioReady = false;
            const data = (window as any).__meetAudioChunk;
            (window as any).__meetAudioChunk = null;
            return data;
          }
          return null;
        }).catch(() => null);

        if (audioBase64 && typeof audioBase64 === "string") {
          await this.processAudio(session, audioBase64);
        }
      } catch (err: any) {
        if (!page.isClosed()) {
          this.addLog(session, "error", `Audio poll error: ${err.message}`);
        }
      }

      await this.delay(1000);
    }
  }

  /** Synthesize TTS and play audio back into the Meet via page audio context */
  private async synthesizeAndPlayInMeet(session: MeetSession, text: string) {
    if (!session.page || session.page.isClosed()) return;

    const elevenLabsKey = this.config.get("ELEVENLABS_API_KEY");
    const voiceId = this.config.get("ELEVENLABS_VOICE_ID") || "21m00Tcm4TlvDq8ikWAM";

    if (!elevenLabsKey) {
      this.addLog(session, "error", "No ElevenLabs API key — cannot speak");
      return;
    }

    try {
      // Generate TTS audio via ElevenLabs (mp3 for browser playback)
      const ttsResponse = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            "xi-api-key": elevenLabsKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_turbo_v2_5",
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        },
      );

      if (!ttsResponse.ok) {
        this.addLog(session, "error", `TTS failed: ${ttsResponse.status}`);
        return;
      }

      const arrayBuffer = await ttsResponse.arrayBuffer();
      const audioBase64 = Buffer.from(arrayBuffer).toString("base64");

      // Play the audio in the browser page (audible to meeting participants)
      await session.page.evaluate(async (b64: string) => {
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: "audio/mp3" });
        const url = URL.createObjectURL(blob);

        return new Promise<void>((resolve) => {
          const audio = new Audio(url);
          audio.onended = () => {
            URL.revokeObjectURL(url);
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            resolve();
          };
          audio.play().catch(() => resolve());
        });
      }, audioBase64);

      this.addLog(session, "tts", `Spoke: "${text.substring(0, 80)}${text.length > 80 ? "..." : ""}"`);
    } catch (err: any) {
      this.addLog(session, "error", `TTS playback error: ${err.message}`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
