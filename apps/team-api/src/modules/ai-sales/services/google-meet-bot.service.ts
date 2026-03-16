import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { exec, spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { Browser, Page } from "puppeteer";
import * as puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { promisify } from "util";
import { PrismaService } from "../../../prisma/prisma.service";
import { ConversationBrainService, ConversationContext } from "./conversation-brain.service";
import { GeminiStreamingClient } from "./gemini-streaming.service";
import { LeadInteractionService } from "./lead-interaction.service";
import { PreCallBrainService } from "./pre-call-brain.service";
import { STTRouterService } from "./stt-router.service";
puppeteer.default.use(StealthPlugin());

const execAsync = promisify(exec);

export interface MeetSession {
  id: string;
  meetUrl: string;
  agentId: string;
  agentName: string;
  leadId?: string;
  status: "joining" | "in-meeting" | "speaking" | "listening" | "error" | "ended";
  logs: { time: number; type: "info" | "stt" | "llm" | "tts" | "error"; message: string }[];
  transcript: { role: "user" | "assistant"; content: string; timestamp: number }[];
  context: ConversationContext;
  systemPrompt: string;
  browser?: Browser;
  page?: Page;
  startTime: number;
  isProcessing: boolean;
  isSpeaking: boolean;
  lastScreenshot?: string;
  parecProcess?: any;
  deepgramConnection?: any;
  ffmpegProcess?: any;
}

@Injectable()
export class GoogleMeetBotService {
  private readonly logger = new Logger(GoogleMeetBotService.name);
  private sessions = new Map<string, MeetSession>();
  private pulseAudioReady = false;
  private readonly profileDir: string;

  constructor(
    private config: ConfigService,
    private brain: ConversationBrainService,
    private gemini: GeminiStreamingClient,
    private sttRouter: STTRouterService,
    private preCallBrain: PreCallBrainService,
    private prisma: PrismaService,
    private interactions: LeadInteractionService,
  ) {
    // Persistent Chrome profile directory — survives restarts
    this.profileDir = path.resolve(process.cwd(), "google-meet-profile");
    if (!fs.existsSync(this.profileDir)) {
      fs.mkdirSync(this.profileDir, { recursive: true });
    }
  }

  /** Remove stale Chrome profile lock files so a new browser can launch */
  private cleanProfileLocks() {
    const lockFiles = ["SingletonLock", "SingletonSocket", "SingletonCookie"];
    for (const f of lockFiles) {
      const p = path.join(this.profileDir, f);
      try { fs.unlinkSync(p); } catch { /* doesn't exist — fine */ }
    }
  }

  /** Create a Google Meet via Calendar API — bot is organizer so guests join without knocking */
  async createMeeting(agentId: string, summary?: string): Promise<{ meetUrl: string; eventId: string }> {
    const settings = (await this.prisma.teamSettings.findUnique({ where: { id: "singleton" } })) as any;
    const refreshToken = settings?.googleMeetBotRefreshToken;
    if (!refreshToken) {
      throw new Error("No Google account connected. Connect one from Settings first.");
    }

    const clientId = this.config.get<string>("GOOGLE_CLIENT_ID");
    const clientSecret = this.config.get<string>("GOOGLE_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
    }

    const { google } = await import("googleapis");

    const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
    oauth2.setCredentials({ refresh_token: refreshToken });

    const calendar = google.calendar({ version: "v3", auth: oauth2 });

    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour

    const event = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1,
      requestBody: {
        summary: summary || "Orivraa AI Meeting",
        start: { dateTime: startTime.toISOString() },
        end: { dateTime: endTime.toISOString() },
        // Allow anyone with the link to join without knocking
        guestsCanModify: true,
        anyoneCanAddSelf: true,
        visibility: "public",
        conferenceData: {
          createRequest: {
            requestId: `orivraa-${Date.now()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      },
    });

    const meetUrl = event.data.conferenceData?.entryPoints?.find(
      (ep) => ep.entryPointType === "video",
    )?.uri;

    if (!meetUrl) {
      throw new Error("Calendar event created but no Meet URL was generated");
    }

    this.logger.log(`Created Google Meet: ${meetUrl}`);
    return { meetUrl, eventId: event.data.id! };
  }

  /** Start a Meet bot session — launches Puppeteer, joins the meeting */
  async startSession(meetUrl: string, agentId: string, leadId?: string): Promise<MeetSession> {
    if (!this.isValidMeetUrl(meetUrl)) {
      throw new Error("Invalid Google Meet URL. Expected format: https://meet.google.com/xxx-xxxx-xxx");
    }

    const agent = await this.prisma.agentVoice.findUnique({ where: { id: agentId } });
    if (!agent) throw new Error("Agent not found");

    const sessionId = `meet-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

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
      leadId,
      status: "joining",
      logs: [],
      transcript: [],
      context,
      systemPrompt,
      startTime: Date.now(),
      isProcessing: false,
      isSpeaking: false,
    };

    this.sessions.set(sessionId, session);
    this.addLog(session, "info", `Starting Meet bot for agent "${agent.name}"`);
    this.addLog(session, "info", `Meeting URL: ${meetUrl}`);

    this.launchAndJoin(session).catch((err) => {
      this.addLog(session, "error", `Failed to join: ${err.message}`);
      session.status = "error";
    });

    return session;
  }

  /** Stop a session — kill audio processes, close browser, save transcript */
  async stopSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    this.addLog(session, "info", "Stopping Meet bot...");
    session.status = "ended";

    // Kill parec process
    try {
      if (session.parecProcess && !session.parecProcess.killed) {
        session.parecProcess.kill();
      }
    } catch { /* ignore */ }
    session.parecProcess = undefined;

    // Close Deepgram connection
    try {
      if (session.deepgramConnection) {
        session.deepgramConnection.finish?.();
      }
    } catch { /* ignore */ }
    session.deepgramConnection = undefined;

    // Kill ffmpeg process
    try {
      if (session.ffmpegProcess && !session.ffmpegProcess.killed) {
        session.ffmpegProcess.kill();
      }
    } catch { /* ignore */ }
    session.ffmpegProcess = undefined;

    // Leave meeting and close browser
    try {
      if (session.page && !session.page.isClosed()) {
        await session.page.evaluate(() => {
          const leaveBtn = document.querySelector('[aria-label="Leave call"]') as HTMLElement;
          if (leaveBtn) leaveBtn.click();
        }).catch(() => {});
      }
      if (session.browser) {
        await session.browser.close().catch(() => {});
      }
    } catch { /* ignore */ }

    await this.saveMeetTranscript(session);

    session.browser = undefined;
    session.page = undefined;
    this.addLog(session, "info", "Meet bot stopped");
  }

  /** Save Meet transcript as a CallSession + LeadInteraction */
  private async saveMeetTranscript(session: MeetSession) {
    if (session.transcript.length === 0) return;

    const durationSeconds = Math.round((Date.now() - session.startTime) / 1000);
    const transcriptText = session.transcript
      .map((t) => `[${t.role === "assistant" ? session.agentName : "Customer"}]: ${t.content}`)
      .join("\n");

    try {
      const callSession = await this.prisma.callSession.create({
        data: {
          agentId: session.agentId,
          leadId: session.leadId,
          direction: "OUTBOUND",
          status: "COMPLETED",
          duration: durationSeconds,
          transcript: transcriptText,
          summary: `Google Meet session with ${session.agentName}. Duration: ${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s. ${session.transcript.length} exchanges.`,
          keyTopics: [],
          startedAt: new Date(session.startTime),
          endedAt: new Date(),
        },
      });
      this.addLog(session, "info", `Meet transcript saved as CallSession ${callSession.id}`);

      if (session.leadId) {
        await this.interactions.recordMeetInteraction({
          leadId: session.leadId,
          meetSessionId: callSession.id,
          summary: callSession.summary ?? undefined,
          durationSeconds,
          agentName: session.agentName,
          meetUrl: session.meetUrl,
        });
      }
    } catch (err: any) {
      this.logger.error(`Failed to save Meet transcript: ${err.message}`);
    }
  }

  /** Get session status and logs */
  getSession(sessionId: string): Omit<MeetSession, "browser" | "page" | "parecProcess" | "deepgramConnection" | "ffmpegProcess"> | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const { browser, page, parecProcess, deepgramConnection, ffmpegProcess, ...rest } = session;
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

  /** Take a screenshot of the current browser page for debugging */
  async getScreenshot(sessionId: string): Promise<string | null> {
    const session = this.sessions.get(sessionId);
    if (!session?.page || session.page.isClosed()) return session?.lastScreenshot || null;
    try {
      const buffer = await session.page.screenshot({ encoding: "base64", type: "png" });
      session.lastScreenshot = buffer as string;
      return session.lastScreenshot;
    } catch {
      return session.lastScreenshot || null;
    }
  }

  /** Get visible buttons/elements on the page for debugging */
  async getPageDebugInfo(sessionId: string): Promise<any> {
    const session = this.sessions.get(sessionId);
    if (!session?.page || session.page.isClosed()) return null;
    try {
      return await session.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button, [role='button']"));
        const inputs = Array.from(document.querySelectorAll("input"));
        return {
          url: window.location.href,
          title: document.title,
          bodyTextPreview: document.body.innerText?.substring(0, 500),
          buttons: buttons.map(b => ({
            text: b.textContent?.trim().substring(0, 80),
            ariaLabel: b.getAttribute("aria-label"),
            disabled: (b as HTMLButtonElement).disabled,
          })).filter(b => b.text || b.ariaLabel),
          inputs: inputs.map(i => ({
            type: i.type,
            ariaLabel: i.getAttribute("aria-label"),
            placeholder: i.placeholder,
            value: i.value ? "(has value)" : "(empty)",
          })),
        };
      });
    } catch (err: any) {
      return { error: err.message };
    }
  }

  /**
   * @deprecated Use processTranscript() instead — streaming STT via Deepgram now provides transcripts directly.
   */
  async processAudio(session: MeetSession, audioBase64: string): Promise<string | null> {
    if (session.isProcessing) return null;
    session.isProcessing = true;

    try {
      const audioBuffer = Buffer.from(audioBase64, "base64");

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

      if (sttResult.detectedLanguage && sttResult.detectedLanguage !== "unknown") {
        const newLang = sttResult.detectedLanguage;
        if (newLang !== session.context.language) {
          this.addLog(session, "info", `Language switch detected: ${session.context.language} → ${newLang}`);
          session.context.language = newLang;
          session.systemPrompt = this.brain.buildSystemPrompt(session.context);
        }
      }

      // Already has isProcessing=true, call inner method directly
      session.isProcessing = false;
      return await this.processTranscript(session, transcript);
    } catch (err: any) {
      this.addLog(session, "error", `Audio processing failed: ${err.message}`);
      session.isProcessing = false;
      session.status = "listening";
      return null;
    }
  }

  /** Process a transcript string through LLM → TTS pipeline (skips STT) */
  async processTranscript(session: MeetSession, transcript: string): Promise<string | null> {
    if (session.isProcessing) return null;
    session.isProcessing = true;

    try {
      this.addLog(session, "stt", `Heard: "${transcript}"`);

      if (this.isLeaveIntent(transcript)) {
        this.addLog(session, "info", `Leave intent detected: "${transcript}"`);
        const farewell = "Thanks everyone! It was great being part of this meeting. Goodbye!";
        session.transcript.push({ role: "user", content: transcript, timestamp: Date.now() });
        session.transcript.push({ role: "assistant", content: farewell, timestamp: Date.now() });
        await this.synthesizeAndPlayInMeet(session, farewell);
        session.isProcessing = false;
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
        1024,
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

      session.transcript.push({ role: "assistant", content: responseText, timestamp: Date.now() });
      session.context.conversationHistory.push({ role: "assistant", content: responseText });

      this.addLog(session, "tts", "Synthesizing speech...");
      await this.synthesizeAndPlayInMeet(session, responseText);

      session.status = "listening";
      session.isProcessing = false;
      return responseText;
    } catch (err: any) {
      this.addLog(session, "error", `Transcript processing failed: ${err.message}`);
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
    if (session.logs.length > 500) {
      session.logs = session.logs.slice(-300);
    }
  }

  /** Convert EditThisCookie / browser-exported cookies to Puppeteer-compatible format */
  private normalizeCookies(raw: any[]): any[] {
    return raw.map((c) => {
      const cookie: any = {
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path || "/",
      };
      // EditThisCookie uses "expirationDate" (seconds since epoch), Puppeteer uses "expires"
      if (c.expirationDate) {
        cookie.expires = c.expirationDate;
      } else if (c.expires) {
        // If already in Puppeteer format or the cookie has "expires" as a number
        cookie.expires = typeof c.expires === "number" ? c.expires : -1;
      }
      // Boolean flags
      if (c.httpOnly !== undefined) cookie.httpOnly = !!c.httpOnly;
      if (c.secure !== undefined) cookie.secure = !!c.secure;
      // sameSite: EditThisCookie uses lowercase ("lax", "strict", "no_restriction"/"none")
      // Puppeteer expects capitalized: "Strict", "Lax", "None"
      if (c.sameSite) {
        const ss = String(c.sameSite).toLowerCase();
        if (ss === "no_restriction" || ss === "none" || ss === "unspecified") {
          cookie.sameSite = "None";
        } else if (ss === "lax") {
          cookie.sameSite = "Lax";
        } else if (ss === "strict") {
          cookie.sameSite = "Strict";
        }
      }
      // Puppeteer requires secure=true when sameSite=None
      if (cookie.sameSite === "None") {
        cookie.secure = true;
      }
      return cookie;
    }).filter((c) => c.name && c.value && c.domain);
  }

  /** Check if the persistent profile is logged into Google */
  private async checkGoogleLoginStatus(page: Page, session?: MeetSession): Promise<boolean> {
    try {
      await page.goto("https://myaccount.google.com", { waitUntil: "networkidle2", timeout: 15000 });
      const url = page.url();
      const loggedIn = !url.includes("accounts.google.com/v3/signin") &&
                       !url.includes("ServiceLogin") &&
                       !url.includes("identifier");
      if (session) {
        this.addLog(session, "info", loggedIn ? "Google profile is authenticated ✓" : "Google profile is NOT authenticated");
      }
      return loggedIn;
    } catch {
      return false;
    }
  }

  /** 
   * Launch a browser with the persistent profile and establish a Google session.
   * Uses the existing OAuth connection (refresh token) to navigate through Google
   * and let the browser pick up session cookies naturally.
   */
  async loginAndSaveProfile(): Promise<{ success: boolean; message: string }> {
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

    // Get OAuth credentials and stored data
    const settings = (await this.prisma.teamSettings.findUnique({ where: { id: "singleton" } })) as any;
    const refreshToken = settings?.googleMeetBotRefreshToken;
    const botEmail = settings?.googleMeetBotAccountEmail;
    const clientId = this.config.get<string>("GOOGLE_CLIENT_ID");
    const clientSecret = this.config.get<string>("GOOGLE_CLIENT_SECRET");
    const storedCookies = settings?.googleMeetBotCookies;

    this.cleanProfileLocks();
    const browser = await puppeteer.default.launch({
      headless: true,
      executablePath,
      userDataDir: this.profileDir,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });

      // Strategy 1: If we have stored cookies, seed them first
      if (storedCookies && Array.isArray(storedCookies) && storedCookies.length > 0) {
        const puppeteerCookies = this.normalizeCookies(storedCookies);
        await page.setCookie(...puppeteerCookies);
        this.logger.log(`Seeded ${puppeteerCookies.length} cookies into profile`);
      }

      // Strategy 2: Use OAuth to navigate through Google's auth flow
      // This establishes the full browser session in the persistent profile
      if (refreshToken && clientId && clientSecret && botEmail) {
        this.logger.log("Attempting OAuth-based session establishment...");

        // Build OAuth consent URL — login_hint pre-fills the email,
        // and since the user already authorized this app, Google may auto-approve
        const redirectUri = `${this.config.get<string>("WEBHOOK_BASE_URL") || "http://localhost:3002"}/api/ai-sales/google/callback`;
        const scopes = "openid email profile https://www.googleapis.com/auth/calendar";
        const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${encodeURIComponent(clientId)}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&response_type=code` +
          `&scope=${encodeURIComponent(scopes)}` +
          `&access_type=offline` +
          `&login_hint=${encodeURIComponent(botEmail)}` +
          `&prompt=none`;

        // Navigate through OAuth — Google may set session cookies during this flow  
        await page.goto(oauthUrl, { waitUntil: "networkidle2", timeout: 25000 }).catch(() => {});
        await this.delay(3000);

        // Even if OAuth redirected to an error page, the browser may have picked up cookies
        // Now navigate across Google services to propagate the session
        const googleServices = [
          "https://accounts.google.com",
          "https://myaccount.google.com", 
          "https://meet.google.com",
        ];

        for (const url of googleServices) {
          await page.goto(url, { waitUntil: "networkidle2", timeout: 15000 }).catch(() => {});
          await this.delay(1500);
        }
      } else {
        // No OAuth — just navigate with whatever cookies we have
        const googleServices = [
          "https://accounts.google.com",
          "https://mail.google.com",
          "https://meet.google.com",
        ];
        for (const url of googleServices) {
          await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 }).catch(() => {});
          await this.delay(2000);
        }
      }

      // Final check: are we logged in?
      const isLoggedIn = await this.checkGoogleLoginStatus(page);

      // Also check Meet specifically
      await page.goto("https://meet.google.com", { waitUntil: "networkidle2", timeout: 15000 }).catch(() => {});
      const meetUrl = page.url();
      const meetAuthenticated = !meetUrl.includes("accounts.google.com") && !meetUrl.includes("ServiceLogin");

      await browser.close();

      if (isLoggedIn && meetAuthenticated) {
        return { success: true, message: "Google session saved! The bot will now join meetings as an authenticated user." };
      } else if (isLoggedIn && !meetAuthenticated) {
        return { 
          success: false, 
          message: "Google account works but Meet still requires sign-in. Your Workspace may have extra security policies. Try exporting cookies specifically from meet.google.com using Cookie-Editor Chrome extension."
        };
      } else {
        return { 
          success: false, 
          message: "Could not establish Google session. Make sure your Google account is connected via OAuth in Settings, and/or paste fresh cookies exported from meet.google.com."
        };
      }
    } catch (err: any) {
      await browser.close().catch(() => {});
      return { success: false, message: `Login failed: ${err.message}` };
    }
  }

  /** Set up PulseAudio virtual sink for bot microphone input */
  private async setupPulseAudio(): Promise<void> {
    if (this.pulseAudioReady) return;

    try {
      // Create virtual sink that Chrome will use as mic input
      await execAsync("pactl load-module module-null-sink sink_name=bot_mic sink_properties=device.description=BotMic");
      // Set the monitor of bot_mic as the default PulseAudio source so Chrome picks it up
      await execAsync("pactl set-default-source bot_mic.monitor");
      this.pulseAudioReady = true;
      this.logger.log("PulseAudio virtual sink 'bot_mic' created");
    } catch (err: any) {
      this.logger.warn(`PulseAudio setup failed (may not be available in dev): ${err.message}`);
    }
  }

  /** Launch Puppeteer, navigate to Meet, join as guest */
  private async launchAndJoin(session: MeetSession) {
    // Set up PulseAudio virtual sink before launching browser
    await this.setupPulseAudio();

    this.addLog(session, "info", "Launching browser...");

    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

    this.cleanProfileLocks();
    const browser = await puppeteer.default.launch({
      headless: true,
      executablePath,
      userDataDir: this.profileDir,       // ← Persist full Chrome profile (cookies, localStorage, IndexedDB)
      args: [
        "--use-fake-ui-for-media-stream",     // Auto-accept mic/camera permissions
        "--disable-notifications",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-web-security",
        "--autoplay-policy=no-user-gesture-required",
        "--enable-features=SharedArrayBuffer",
      ],
    });

    session.browser = browser;
    const page = await browser.newPage();
    session.page = page;

    await page.setViewport({ width: 1280, height: 720 });

    // ── Ensure the persistent profile is authenticated ──
    const isLoggedIn = await this.checkGoogleLoginStatus(page, session);

    if (!isLoggedIn) {
      // Profile not authenticated yet — try seeding it with stored cookies
      try {
        const settings = (await this.prisma.teamSettings.findUnique({ where: { id: "singleton" } })) as any;
        const storedCookies = settings?.googleMeetBotCookies;
        if (storedCookies && Array.isArray(storedCookies) && storedCookies.length > 0) {
          const puppeteerCookies = this.normalizeCookies(storedCookies);
          await page.setCookie(...puppeteerCookies);
          this.addLog(session, "info", `Seeded profile with ${puppeteerCookies.length} cookies — checking login...`);
          // Re-check after seeding
          const seededLogin = await this.checkGoogleLoginStatus(page, session);
          if (!seededLogin) {
            this.addLog(session, "error",
              "Profile not authenticated. Please run the Login Session from Settings to log the bot into Google once.");
          }
        } else {
          this.addLog(session, "info",
            "Profile not authenticated and no cookies stored. Use the Login Session button in Settings to authenticate the bot.");
        }
      } catch (err: any) {
        this.addLog(session, "info", `Cookie seeding failed: ${err.message}`);
      }
    }

    this.addLog(session, "info", "Navigating to Google Meet...");
    await page.goto(session.meetUrl, { waitUntil: "networkidle2", timeout: 30000 });

    await this.delay(3000);

    const meetPageTitle = await page.title();
    const meetPageUrl = page.url();
    this.addLog(session, "info", `Meet page loaded — Title: "${meetPageTitle}", URL: ${meetPageUrl}`);

    // Check for immediate rejection BEFORE trying to join
    const pageBlocked = await page.evaluate(() => {
      const text = document.body.innerText?.toLowerCase() || "";
      return text.includes("you can't join this video call") ||
        text.includes("you can\u2019t join this video call") ||
        text.includes("not allowed to join") ||
        text.includes("check with the meeting organiser");
    }).catch(() => false);

    if (pageBlocked) {
      this.addLog(session, "error",
        "Meeting blocked guest access. The bot is not signed into Google and cannot join. " +
        "Use the 'Create Meeting' feature instead — the bot creates a meeting via Calendar API as organizer, so no sign-in is needed.");
      session.status = "error";
      return;
    }

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

    if (session.status === "error") return; // waitForMeetingStart may have set error

    session.status = "listening";
    this.addLog(session, "info", "Successfully joined the meeting! Listening...");

    // Start PulseAudio-based audio capture with Deepgram streaming STT
    this.startAudioCapture(session);
  }

  private async dismissDialogs(page: Page, session: MeetSession) {
    try {
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

  private async enterGuestName(page: Page, session: MeetSession) {
    try {
      const nameSelectors = [
        'input[aria-label="Your name"]',
        'input[aria-label="Type your name"]',
        'input[placeholder="Your name"]',
        'input[type="text"]',
      ];

      for (const selector of nameSelectors) {
        const nameInput = await page.$(selector);
        if (nameInput) {
          await nameInput.click({ clickCount: 3 });
          await nameInput.type(`${session.agentName} (Orivraa AI)`, { delay: 30 });
          this.addLog(session, "info", `Set guest name via ${selector}: "${session.agentName} (Orivraa AI)"`);
          await this.delay(500);
          return;
        }
      }
      this.addLog(session, "info", "No name input found (may be signed in or UI different)");
    } catch (err: any) {
      this.addLog(session, "info", `Could not set guest name: ${err.message}`);
    }
  }

  private async configureMediaDevices(page: Page, session: MeetSession) {
    try {
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

  private async clickJoinButton(page: Page, session: MeetSession) {
    this.addLog(session, "info", "Looking for join button...");

    try {
      const debugInfo = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button, [role='button']"));
        return buttons.map(b => ({
          text: b.textContent?.trim().substring(0, 60),
          ariaLabel: b.getAttribute("aria-label"),
          tag: b.tagName,
        })).filter(b => b.text || b.ariaLabel);
      });
      this.addLog(session, "info", `Visible buttons: ${JSON.stringify(debugInfo.slice(0, 10))}`);
    } catch { /* ignore */ }

    try {
      const buffer = await page.screenshot({ encoding: "base64", type: "png" });
      session.lastScreenshot = buffer as string;
    } catch { /* ignore */ }

    const joinSelectors = [
      'button[aria-label="Ask to join"]',
      'button[aria-label="Join now"]',
      'button[jsname="Qx7uuf"]',
      '[data-idom-class*="join"] button',
      'span[jsname="V67aGc"]',  // Google Meet's "Ask to join" span — click its parent
    ];

    for (const selector of joinSelectors) {
      try {
        const el = await page.$(selector);
        if (el) {
          // If it's a span, click the closest button ancestor
          const tagName = await el.evaluate(e => e.tagName);
          if (tagName === "SPAN") {
            await el.evaluate(e => {
              const btn = e.closest("button") || e.parentElement;
              if (btn) (btn as HTMLElement).click();
              else (e as HTMLElement).click();
            });
          } else {
            await el.click();
          }
          this.addLog(session, "info", `Clicked join button via selector: ${selector}`);
          return;
        }
      } catch {
        // Try next selector
      }
    }

    // Broader fallback: find any element containing "Ask to join" or "Join now" text
    const clicked = await page.evaluate(() => {
      // Check buttons and role=button elements
      const buttons = Array.from(document.querySelectorAll("button, [role='button']"));
      for (const b of buttons) {
        const text = b.textContent?.trim().toLowerCase() || "";
        const ariaLabel = b.getAttribute("aria-label")?.toLowerCase() || "";
        if (
          text === "ask to join" ||
          text === "join now" ||
          ariaLabel === "ask to join" ||
          ariaLabel === "join now" ||
          text.includes("ask to join") ||
          text.includes("join now")
        ) {
          (b as HTMLElement).click();
          return `Clicked: "${b.textContent?.trim()}" (aria: ${b.getAttribute("aria-label")})`;
        }
      }
      // Also check spans that might be the visible button text
      const spans = Array.from(document.querySelectorAll("span"));
      for (const s of spans) {
        const text = s.textContent?.trim().toLowerCase() || "";
        if (text === "ask to join" || text === "join now") {
          const parent = s.closest("button") || s.parentElement;
          if (parent) (parent as HTMLElement).click();
          else (s as HTMLElement).click();
          return `Clicked span: "${s.textContent?.trim()}"`;
        }
      }
      return null;
    }).catch(() => null);

    if (clicked) {
      this.addLog(session, "info", `Join button (fallback): ${clicked}`);
    } else {
      this.addLog(session, "error", "Could not find join button — dumping page text for debugging");
      const pageText = await page.evaluate(() => document.body.innerText?.substring(0, 300)).catch(() => "N/A");
      this.addLog(session, "error", `Page text: ${pageText}`);
    }
  }

  private async waitForMeetingStart(page: Page, session: MeetSession) {
    this.addLog(session, "info", "Waiting to be admitted to meeting...");
    session.status = "joining";

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

    const maxWaitMs = 120_000;
    const start = Date.now();
    let consecutiveRejections = 0;

    while (Date.now() - start < maxWaitMs) {
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

      const rejected = await page.evaluate(() => {
        const body = document.body.textContent?.toLowerCase() || "";
        const rejectionPhrases = [
          "you can't join this meeting",
          "your request to join was denied",
          "you've been removed from the meeting",
          "this meeting has been locked",
        ];
        const mainContent = document.querySelector('[role="main"]')?.textContent?.toLowerCase()
          || document.querySelector('[data-view-id]')?.textContent?.toLowerCase()
          || "";
        return rejectionPhrases.some(p => mainContent.includes(p) || body.startsWith(p));
      }).catch(() => false);

      if (rejected) {
        consecutiveRejections++;
        if (consecutiveRejections >= 2) {
          this.addLog(session, "error", "Join request was denied or meeting is locked");
          session.status = "error";
          return;
        }
      } else {
        consecutiveRejections = 0;
      }

      const elapsed = Math.round((Date.now() - start) / 1000);
      if (elapsed % 10 === 0 && elapsed > 0) {
        this.addLog(session, "info", `Still waiting to be admitted... (${elapsed}s)`);
      }

      await this.delay(2000);
    }

    this.addLog(session, "error", "Timed out waiting to be admitted (120s). Ask someone in the meeting to admit the bot.");
    session.status = "error";
  }

  /**
   * Capture meeting audio via PulseAudio parec.
   * Primary STT: Google Cloud STT (REST batch, supports 15+ languages).
   * Fallback: Deepgram live streaming (if GOOGLE_STT_API_KEY is not set).
   */
  private async startAudioCapture(session: MeetSession) {
    const googleApiKey = this.config.get<string>("GOOGLE_STT_API_KEY");
    const deepgramApiKey = this.config.get<string>("DEEPGRAM_API_KEY");

    if (!googleApiKey && !deepgramApiKey) {
      this.addLog(session, "error", "No GOOGLE_STT_API_KEY or DEEPGRAM_API_KEY configured — cannot transcribe");
      session.status = "error";
      return;
    }

    const useGoogle = !!googleApiKey;
    this.addLog(session, "info", `Setting up PulseAudio audio capture with ${useGoogle ? "Google STT (primary)" : "Deepgram (fallback)"}...`);

    try {
      const parec = spawn("parec", [
        "--format=s16le",
        "--rate=16000",
        "--channels=1",
        "--latency-msec=200",
      ]);
      session.parecProcess = parec;

      parec.on("error", (err) => {
        this.addLog(session, "error", `parec error: ${err.message}`);
      });
      parec.on("exit", (code) => {
        if (session.status !== "ended") {
          this.addLog(session, "info", `parec exited with code ${code}`);
        }
      });

      if (useGoogle) {
        this.startGoogleSTTCapture(session, parec, googleApiKey!, deepgramApiKey);
      } else {
        this.startDeepgramCapture(session, parec, deepgramApiKey!);
      }
    } catch (err: any) {
      this.addLog(session, "error", `Audio capture setup failed: ${err.message}`);
      session.status = "error";
    }
  }

  /**
   * Google STT capture — buffers 4s audio chunks from parec, sends to
   * Google Cloud Speech-to-Text REST API (LINEAR16/16kHz).
   * Falls back to Deepgram for individual chunks if Google returns empty.
   */
  private startGoogleSTTCapture(
    session: MeetSession,
    parec: ReturnType<typeof spawn>,
    googleApiKey: string,
    deepgramApiKey?: string,
  ) {
    // 4 seconds of s16le/16kHz/mono = 128,000 bytes
    const CHUNK_DURATION_S = 4;
    const BYTES_PER_CHUNK = CHUNK_DURATION_S * 16000 * 2;
    let audioBuffer = Buffer.alloc(0);

    const processChunk = async (chunk: Buffer) => {
      if (session.status === "ended" || session.status === "error") return;
      if (session.isSpeaking) return; // Echo cancellation

      try {
        const result = await this.transcribeWithGoogleSTT(chunk, googleApiKey, session);

        if (result.transcript && result.transcript.trim().length >= 3) {
          // Track detected language
          if (result.detectedLanguage && result.detectedLanguage !== session.context.language) {
            this.addLog(session, "info", `Language detected: ${result.detectedLanguage}`);
            session.context.language = result.detectedLanguage.split("-")[0]; // e.g. "en-IN" → "en"
            session.systemPrompt = this.brain.buildSystemPrompt(session.context);
          }
          this.handleTranscript(session, result.transcript.trim());
          return;
        }

        // Google returned empty — try Deepgram fallback for this chunk
        if (deepgramApiKey) {
          const dgResult = await this.transcribeWithDeepgramBatch(chunk, deepgramApiKey);
          if (dgResult && dgResult.trim().length >= 3) {
            this.addLog(session, "info", `(Deepgram fallback) Heard: "${dgResult}"`);
            this.handleTranscript(session, dgResult.trim());
          }
        }
      } catch (err: any) {
        this.addLog(session, "error", `STT error: ${err.message}`);
      }
    };

    parec.stdout!.on("data", (data: Buffer) => {
      if (session.status === "ended") return;
      audioBuffer = Buffer.concat([audioBuffer, data]);

      // When we have enough audio for one chunk, process it
      while (audioBuffer.length >= BYTES_PER_CHUNK) {
        const chunk = audioBuffer.subarray(0, BYTES_PER_CHUNK);
        audioBuffer = audioBuffer.subarray(BYTES_PER_CHUNK);
        processChunk(Buffer.from(chunk)); // copy so buffer can be reused
      }
    });

    this.addLog(session, "info", "Audio capture active — Google STT (chunked, multi-language)");
  }

  /** Send a raw LINEAR16 audio buffer to Google Cloud STT REST API */
  private async transcribeWithGoogleSTT(
    audioBuffer: Buffer,
    apiKey: string,
    session: MeetSession,
  ): Promise<{ transcript: string; detectedLanguage?: string }> {
    const audioContent = audioBuffer.toString("base64");
    const primaryLang = this.getGoogleSTTLanguage(session.context.language || "en");

    const requestBody = {
      config: {
        encoding: "LINEAR16",
        sampleRateHertz: 16000,
        languageCode: primaryLang,
        alternativeLanguageCodes: [
          "hi-IN", "ta-IN", "te-IN", "bn-IN", "mr-IN",
          "gu-IN", "kn-IN", "ml-IN", "pa-IN", "ur-IN",
          "ne-NP", "ar-AE", "en-US", "en-IN",
        ].filter(l => l !== primaryLang),
        model: "latest_long",
        useEnhanced: true,
        enableAutomaticPunctuation: true,
      },
      audio: { content: audioContent },
    };

    const url = `https://speech.googleapis.com/v1/speech:recognize?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`Google STT HTTP ${response.status}: ${errText.substring(0, 200)}`);
    }

    const result = (await response.json()) as {
      results?: Array<{
        alternatives?: Array<{ transcript?: string; confidence?: number }>;
        languageCode?: string;
      }>;
    };

    const top = result.results?.[0]?.alternatives?.[0];
    return {
      transcript: top?.transcript || "",
      detectedLanguage: result.results?.[0]?.languageCode,
    };
  }

  /** Deepgram batch transcription for a single audio chunk (fallback) */
  private async transcribeWithDeepgramBatch(audioBuffer: Buffer, apiKey: string): Promise<string> {
    const response = await fetch("https://api.deepgram.com/v1/listen?model=nova-2&language=en&smart_format=true&detect_language=true", {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "audio/raw;encoding=linear16;sample_rate=16000;channels=1",
      },
      body: new Uint8Array(audioBuffer),
    });
    if (!response.ok) return "";
    const result = (await response.json()) as any;
    return result.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
  }

  /** Map session language to best Google STT BCP-47 code */
  private getGoogleSTTLanguage(lang: string): string {
    const map: Record<string, string> = {
      en: "en-IN", hi: "hi-IN", ta: "ta-IN", te: "te-IN",
      bn: "bn-IN", mr: "mr-IN", gu: "gu-IN", kn: "kn-IN",
      ml: "ml-IN", pa: "pa-IN", ur: "ur-IN", ne: "ne-NP",
      ar: "ar-AE",
    };
    // If already a BCP-47 code like "en-IN", use as-is
    if (lang.includes("-")) return lang;
    return map[lang] || "en-IN";
  }

  /** Deepgram live streaming capture — used when GOOGLE_STT_API_KEY is not configured */
  private async startDeepgramCapture(
    session: MeetSession,
    parec: ReturnType<typeof spawn>,
    deepgramApiKey: string,
  ) {
    const sdk = await import("@deepgram/sdk") as any;
    const createFn = sdk.createClient || sdk.default?.createClient;
    if (!createFn) {
      this.addLog(session, "error", "Could not find Deepgram createClient function");
      session.status = "error";
      return;
    }

    const deepgram = createFn(deepgramApiKey);
    const connection = deepgram.listen.live({
      model: "nova-2",
      language: "en-US",
      smart_format: true,
      interim_results: false,
      endpointing: 300,
      utterance_end_ms: 1000,
      encoding: "linear16",
      sample_rate: 16000,
      channels: 1,
    });

    session.deepgramConnection = connection;
    const transcriptEvent = (sdk as any).LiveTranscriptionEvents?.Transcript || "Results";

    connection.on(transcriptEvent, (data: any) => {
      const transcript = data.channel?.alternatives?.[0]?.transcript;
      if (transcript && data.is_final) {
        const trimmed = transcript.trim();
        if (trimmed.length < 3) return;
        if (session.isSpeaking) {
          this.addLog(session, "info", `Ignoring transcript during TTS: "${trimmed}"`);
          return;
        }
        this.handleTranscript(session, trimmed);
      }
    });

    connection.on("error", (err: any) => {
      this.addLog(session, "error", `Deepgram error: ${err.message || err}`);
    });
    connection.on("close", () => {
      if (session.status !== "ended") {
        this.addLog(session, "info", "Deepgram connection closed");
      }
    });

    parec.stdout!.on("data", (chunk: Buffer) => {
      if (session.status !== "ended") {
        try { connection.send(chunk); } catch { /* closing */ }
      }
    });

    this.addLog(session, "info", "Audio capture active — Deepgram live STT (fallback mode)");
  }

  /** Common handler for transcripts from either Google or Deepgram */
  private handleTranscript(session: MeetSession, transcript: string) {
    if (session.isSpeaking) return; // double-check echo cancellation
    this.processTranscript(session, transcript).catch((err) => {
      this.addLog(session, "error", `Transcript processing error: ${err.message}`);
    });
  }

  /** Synthesize TTS via ElevenLabs and play into Meet through PulseAudio bot_mic sink */
  private async synthesizeAndPlayInMeet(session: MeetSession, text: string) {
    const elevenLabsKey = this.config.get("ELEVENLABS_API_KEY");
    const voiceId = this.config.get("ELEVENLABS_VOICE_ID") || "21m00Tcm4TlvDq8ikWAM";

    if (!elevenLabsKey) {
      this.addLog(session, "error", "No ElevenLabs API key — cannot speak");
      return;
    }

    try {
      // Generate TTS audio via ElevenLabs
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
      const audioBuffer = Buffer.from(arrayBuffer);

      // Write to temp file
      const tempFile = path.join("/tmp", `tts_${session.id}_${Date.now()}.mp3`);
      fs.writeFileSync(tempFile, audioBuffer);

      // Set echo cancellation flag
      session.isSpeaking = true;
      session.status = "speaking";

      // Play audio to bot_mic PulseAudio sink via ffmpeg
      await new Promise<void>((resolve, reject) => {
        const ffmpeg = spawn("ffmpeg", [
          "-y",
          "-i", tempFile,
          "-f", "pulse",
          "-device", "bot_mic",
          "tts",
        ]);
        session.ffmpegProcess = ffmpeg;

        ffmpeg.on("error", (err) => {
          session.isSpeaking = false;
          session.ffmpegProcess = undefined;
          reject(err);
        });

        ffmpeg.on("exit", (code) => {
          session.isSpeaking = false;
          session.ffmpegProcess = undefined;
          // Clean up temp file
          try { fs.unlinkSync(tempFile); } catch { /* ignore */ }
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`ffmpeg exited with code ${code}`));
          }
        });
      });

      this.addLog(session, "tts", `Spoke: "${text.substring(0, 80)}${text.length > 80 ? "..." : ""}"`);
    } catch (err: any) {
      session.isSpeaking = false;
      this.addLog(session, "error", `TTS playback error: ${err.message}`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
