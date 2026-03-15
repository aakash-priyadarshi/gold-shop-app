"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { aiSalesApi, googleBotApi } from "@/lib/api";
import {
    AlertTriangle,
    ArrowDown,
    ArrowLeft, Bot, CalendarPlus, CheckCircle2,
    ChevronDown, ChevronUp,
    Loader2,
    Mail, MessageSquare,
    Mic, MicOff,
    Phone, PhoneOff,
    Plus,
    Send,
    Sparkles,
    Trash2,
    Video, Volume2, XCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ── Status indicator ──
type ServiceStatus = "idle" | "testing" | "pass" | "fail";

interface ServiceCheck {
  name: string;
  description: string;
  status: ServiceStatus;
  latency?: number;
  error?: string;
}

function StatusIcon({ status }: { status: ServiceStatus }) {
  switch (status) {
    case "pass": return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case "fail": return <XCircle className="h-4 w-4 text-red-500" />;
    case "testing": return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    default: return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />;
  }
}

// ── Chat message type ──
interface ChatMessage {
  role: "user" | "agent" | "system";
  text: string;
  timestamp: Date;
  meta?: {
    sttProvider?: string;
    sttLatency?: number;
    llmProvider?: string;
    llmLatency?: number;
    ttsProvider?: string;
    ttsLatency?: number;
    emotion?: string;
  };
}

export default function PlaygroundPage() {
  // ── Agent selection ──
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [loading, setLoading] = useState(true);

  // ── Service diagnostics ──
  const [services, setServices] = useState<ServiceCheck[]>([
    { name: "Google STT", description: "Speech-to-Text recognition", status: "idle" },
    { name: "Sarvam STT", description: "Speech-to-Text (Indian languages)", status: "idle" },
    { name: "ElevenLabs TTS", description: "Text-to-Speech synthesis", status: "idle" },
    { name: "Gemini Flash", description: "Conversation LLM (live turns)", status: "idle" },
    { name: "Claude Sonnet", description: "Strategy LLM (pre-call brain)", status: "idle" },
    { name: "Database", description: "Prisma / Neon connection", status: "idle" },
  ]);
  const [diagRunning, setDiagRunning] = useState(false);

  // ── Browser chat mode ──
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [textInput, setTextInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [sttProvider, setSttProvider] = useState("auto");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // ── Phone call mode ──
  const [phoneNumber, setPhoneNumber] = useState("");
  const [callActive, setCallActive] = useState(false);
  const [callStatus, setCallStatus] = useState("");

  // ── Google Meet mode ──
  const [meetUrl, setMeetUrl] = useState("");
  const [meetSessionId, setMeetSessionId] = useState("");
  const [meetActive, setMeetActive] = useState(false);
  const [meetStatus, setMeetStatus] = useState("");
  const [meetLogs, setMeetLogs] = useState<{ time: number; type: string; message: string }[]>([]);
  const [meetTranscript, setMeetTranscript] = useState<{ role: string; content: string; timestamp: number }[]>([]);
  const meetLogsEndRef = useRef<HTMLDivElement>(null);
  const [isCreatingMeet, setIsCreatingMeet] = useState(false);

  // ── Daily.co + Pipecat meeting mode ──
  const [dailyRoomUrl, setDailyRoomUrl] = useState("");
  const [dailyMeetingId, setDailyMeetingId] = useState("");
  const [dailyActive, setDailyActive] = useState(false);
  const [dailyStatus, setDailyStatus] = useState("");
  const [dailyCreating, setDailyCreating] = useState(false);

  // ── Email mode ──
  const [emailPurpose, setEmailPurpose] = useState("");
  const [emailDraft, setEmailDraft] = useState<any>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailTo, setEmailTo] = useState("");

  // -- Interaction Chain Simulator --
  type ChainNodeType = "call" | "email" | "sms" | "gmeet";
  interface ChainNode {
    id: string;
    type: ChainNodeType;
    transcript: string;
    goal: string;
    aiResult: any | null;
    loading: boolean;
    expanded: boolean;
  }
  const [chainNodes, setChainNodes] = useState<ChainNode[]>([]);
  const [chainOverallGoal, setChainOverallGoal] = useState("");

  // ── Load agents ──
  useEffect(() => {
    aiSalesApi.listAgents().then((res) => {
      const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setAgents(list);
      if (list.length > 0) setSelectedAgentId(list[0].id);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // ── Auto-scroll chat ──
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectedAgent = agents.find((a: any) => a.id === selectedAgentId);

  // ── Run service diagnostics ──
  const runDiagnostics = async () => {
    if (!selectedAgentId) {
      toast.error("Select an agent first");
      return;
    }
    setDiagRunning(true);

    // Reset all to testing
    setServices((prev) => prev.map((s) => ({ ...s, status: "testing" as ServiceStatus, latency: undefined, error: undefined })));

    try {
      const res = await aiSalesApi.testServices(selectedAgentId);
      const results = res.data as any;

      setServices([
        {
          name: "Google STT",
          description: "Speech-to-Text recognition",
          status: results.googleSTT?.ok ? "pass" : "fail",
          latency: results.googleSTT?.latencyMs,
          error: results.googleSTT?.error,
        },
        {
          name: "Sarvam STT",
          description: "Speech-to-Text (Indian languages)",
          status: results.sarvamSTT?.ok ? "pass" : "fail",
          latency: results.sarvamSTT?.latencyMs,
          error: results.sarvamSTT?.error,
        },
        {
          name: "ElevenLabs TTS",
          description: "Text-to-Speech synthesis",
          status: results.elevenLabsTTS?.ok ? "pass" : "fail",
          latency: results.elevenLabsTTS?.latencyMs,
          error: results.elevenLabsTTS?.error,
        },
        {
          name: "Gemini Flash",
          description: "Conversation LLM (live turns)",
          status: results.gemini?.ok ? "pass" : "fail",
          latency: results.gemini?.latencyMs,
          error: results.gemini?.error,
        },
        {
          name: "Claude Sonnet",
          description: "Strategy LLM (pre-call brain)",
          status: results.claude?.ok ? "pass" : "fail",
          latency: results.claude?.latencyMs,
          error: results.claude?.error,
        },
        {
          name: "Database",
          description: "Prisma / Neon connection",
          status: results.database?.ok ? "pass" : "fail",
          latency: results.database?.latencyMs,
          error: results.database?.error,
        },
      ]);
    } catch (err: any) {
      setServices((prev) => prev.map((s) => ({ ...s, status: "fail", error: "Request failed" })));
      toast.error("Diagnostics request failed");
    }
    setDiagRunning(false);
  };

  // ── Send text message in chat ──
  const sendTextMessage = useCallback(async () => {
    if (!textInput.trim() || !selectedAgentId) return;
    const userMsg: ChatMessage = { role: "user", text: textInput.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setTextInput("");
    setChatLoading(true);

    try {
      const res = await aiSalesApi.playgroundChat({
        agentId: selectedAgentId,
        message: userMsg.text,
        history: messages.map((m) => ({ role: m.role, text: m.text })),
      });
      const data = res.data as any;

      // Handle agent handoff
      if (data.switchedAgentId) {
        setSelectedAgentId(data.switchedAgentId);
        setMessages((prev) => [...prev, {
          role: "system",
          text: `Switched to ${data.switchedAgentName || "new agent"}`,
          timestamp: new Date(),
        }]);
      }

      const agentMsg: ChatMessage = {
        role: "agent",
        text: data.reply || "...",
        timestamp: new Date(),
        meta: {
          llmProvider: data.llmProvider,
          llmLatency: data.llmLatencyMs,
          ttsProvider: data.ttsProvider,
          ttsLatency: data.ttsLatencyMs,
          emotion: data.detectedEmotion,
        },
      };
      setMessages((prev) => [...prev, agentMsg]);

      // Play TTS audio if returned
      if (data.audioBase64) {
        setAudioPlaying(true);
        const mime = data.ttsProvider === "sarvam" ? "audio/wav" : "audio/mp3";
        const audio = new Audio(`data:${mime};base64,${data.audioBase64}`);
        audio.onended = () => setAudioPlaying(false);
        audio.onerror = () => setAudioPlaying(false);
        audio.play().catch(() => setAudioPlaying(false));
      }
    } catch {
      setMessages((prev) => [...prev, { role: "system", text: "Failed to get response from agent.", timestamp: new Date() }]);
    }
    setChatLoading(false);
  }, [textInput, selectedAgentId, messages]);

  // ── Microphone recording (browser STT test) ──
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });

        // Send audio to backend for STT
        setChatLoading(true);
        try {
          const formData = new FormData();
          formData.append("audio", blob, "recording.webm");
          formData.append("agentId", selectedAgentId);
          formData.append("history", JSON.stringify(messages.map((m) => ({ role: m.role, text: m.text }))));
          formData.append("sttProvider", sttProvider);

          const res = await aiSalesApi.playgroundVoice(formData);
          const data = res.data as any;

          // Add the transcribed user message
          if (data.transcript) {
            setMessages((prev) => [...prev, {
              role: "user",
              text: data.transcript,
              timestamp: new Date(),
              meta: { sttProvider: data.sttProvider, sttLatency: data.sttLatencyMs },
            }]);
          }

          // Handle agent handoff
          if (data.switchedAgentId) {
            setSelectedAgentId(data.switchedAgentId);
            setMessages((prev) => [...prev, {
              role: "system",
              text: `Switched to ${data.switchedAgentName || "new agent"}`,
              timestamp: new Date(),
            }]);
          }

          // Add agent reply
          if (data.reply) {
            setMessages((prev) => [...prev, {
              role: "agent",
              text: data.reply,
              timestamp: new Date(),
              meta: {
                llmProvider: data.llmProvider,
                llmLatency: data.llmLatencyMs,
                ttsProvider: data.ttsProvider,
                ttsLatency: data.ttsLatencyMs,
              },
            }]);

            if (data.audioBase64) {
              setAudioPlaying(true);
              const mime = data.ttsProvider === "sarvam" ? "audio/wav" : "audio/mp3";
              const audio = new Audio(`data:${mime};base64,${data.audioBase64}`);
              audio.onended = () => setAudioPlaying(false);
              audio.onerror = () => setAudioPlaying(false);
              audio.play().catch(() => setAudioPlaying(false));
            }
          }
        } catch {
          setMessages((prev) => [...prev, { role: "system", text: "Voice processing failed.", timestamp: new Date() }]);
        }
        setChatLoading(false);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      toast.error("Microphone access denied");
    }
  }, [selectedAgentId, messages]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  // ── Initiate real phone call ──
  const callPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopCallPolling = useCallback(() => {
    if (callPollRef.current) {
      clearInterval(callPollRef.current);
      callPollRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopCallPolling();
  }, [stopCallPolling]);

  const startPhoneCall = async () => {
    if (!phoneNumber.trim() || !selectedAgentId) {
      toast.error("Enter a phone number and select an agent");
      return;
    }
    setCallActive(true);
    setCallStatus("Initiating call...");
    try {
      const res = await aiSalesApi.playgroundCall({
        agentId: selectedAgentId,
        phoneNumber: phoneNumber.trim(),
      });
      const data = res.data as any;
      setCallStatus(data.message || "Call initiated! Check your phone.");
      toast.success("Call initiated — check your phone!");

      // Poll call status to detect when call ends on Twilio's side
      if (data.sessionId) {
        stopCallPolling();
        callPollRef.current = setInterval(async () => {
          try {
            const statusRes = await aiSalesApi.playgroundCallStatus(data.sessionId);
            const s = (statusRes.data as any).status;
            if (s === "COMPLETED" || s === "FAILED" || s === "NO_ANSWER" || s === "BUSY") {
              setCallActive(false);
              setCallStatus(`Call ${s.toLowerCase()}`);
              stopCallPolling();
            }
          } catch {
            // ignore polling errors
          }
        }, 4000);
      }
    } catch (err: any) {
      setCallStatus("Failed to initiate call");
      toast.error(err?.response?.data?.message || "Call failed");
      setCallActive(false);
    }
  };

  const endPhoneCall = async () => {
    stopCallPolling();
    setCallActive(false);
    setCallStatus("Call ended");
  };

  // ── Google Meet status polling ──
  const meetPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopMeetPolling = useCallback(() => {
    if (meetPollRef.current) {
      clearInterval(meetPollRef.current);
      meetPollRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopMeetPolling();
  }, [stopMeetPolling]);

  // Start polling when meetSessionId is set and meetActive is true
  useEffect(() => {
    if (!meetSessionId || !meetActive) return;
    stopMeetPolling();
    meetPollRef.current = setInterval(async () => {
      try {
        const res = await aiSalesApi.playgroundMeetStatus(meetSessionId);
        const data = res.data as any;
        if (data.status === "NOT_FOUND") return;
        setMeetStatus(data.status);
        if (data.logs) setMeetLogs(data.logs);
        if (data.transcript) setMeetTranscript(data.transcript);
        if (data.status === "ended" || data.status === "error") {
          setMeetActive(false);
          stopMeetPolling();
        }
      } catch {
        // ignore polling errors
      }
    }, 3000);
    return () => stopMeetPolling();
  }, [meetSessionId, meetActive, stopMeetPolling]);

  // Auto-scroll meet logs
  useEffect(() => {
    meetLogsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [meetLogs]);

  const passCount = services.filter((s) => s.status === "pass").length;
  const failCount = services.filter((s) => s.status === "fail").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/ai-sales"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI Playground</h1>
            <p className="text-muted-foreground">Test your AI agents — browser chat, voice, and live phone calls</p>
          </div>
        </div>
      </div>

      {/* Agent Selector */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1 block">Select Agent</Label>
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger><SelectValue placeholder="Choose an agent..." /></SelectTrigger>
                <SelectContent>
                  {agents.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${a.isActive ? "bg-emerald-500" : "bg-gray-300"}`} />
                        {a.name} — {(a.languages?.[0]?.split("-")[0] || "en").toUpperCase()}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedAgent && (
              <div className="text-sm space-y-0.5">
                <p className="font-medium">{selectedAgent.name}</p>
                <p className="text-xs text-muted-foreground">{selectedAgent.personalityDescription || "Default Personality"}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="diagnostics" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-7 h-auto min-h-10">
          <TabsTrigger value="diagnostics">Service Diagnostics</TabsTrigger>
          <TabsTrigger value="browser">Browser Chat & Voice</TabsTrigger>
          <TabsTrigger value="phone">Phone Call Test</TabsTrigger>
          <TabsTrigger value="meet" className="gap-1">
            <Bot className="h-3 w-3" /> AI Meeting Bot
          </TabsTrigger>
          <TabsTrigger value="video-meeting" className="gap-1">
            <Video className="h-3 w-3" /> Orivraa Video
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-1">
            <Mail className="h-3 w-3" /> Email
          </TabsTrigger>
          <TabsTrigger value="simulator" className="gap-1">
            <MessageSquare className="h-3 w-3" /> Simulator
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: Service Diagnostics ── */}
        <TabsContent value="diagnostics" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Service Health Check</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Test that Google STT, Sarvam STT, ElevenLabs, Gemini, Claude, and the database are all working
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {passCount + failCount > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="success">{passCount} passed</Badge>
                      {failCount > 0 && <Badge variant="destructive">{failCount} failed</Badge>}
                    </div>
                  )}
                  <Button onClick={runDiagnostics} disabled={diagRunning || !selectedAgentId}>
                    {diagRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                    {diagRunning ? "Testing..." : "Run All Tests"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {services.map((svc) => (
                  <div key={svc.name} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <StatusIcon status={svc.status} />
                      <div>
                        <p className="text-sm font-medium">{svc.name}</p>
                        <p className="text-xs text-muted-foreground">{svc.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      {svc.latency != null && (
                        <span className={`font-mono text-xs ${svc.latency < 500 ? "text-emerald-500" : svc.latency < 2000 ? "text-orange-500" : "text-red-500"}`}>
                          {svc.latency}ms
                        </span>
                      )}
                      {svc.error && (
                        <span className="text-xs text-red-500 max-w-[200px] truncate" title={svc.error}>
                          {svc.error}
                        </span>
                      )}
                      <Badge variant={svc.status === "pass" ? "success" : svc.status === "fail" ? "destructive" : "secondary"}>
                        {svc.status === "idle" ? "Not tested" : svc.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 2: Browser Chat & Voice ── */}
        <TabsContent value="browser" className="space-y-4">
          <Card className="flex flex-col" style={{ height: "600px" }}>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Conversation</CardTitle>
                <div className="flex items-center gap-2">
                  {audioPlaying && (
                    <Badge variant="outline" className="gap-1">
                      <Volume2 className="h-3 w-3 animate-pulse" /> Speaking...
                    </Badge>
                  )}
                  {messages.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setMessages([])}>
                      Clear
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-xs text-muted-foreground flex-1">
                  Type or use your microphone. Tests STT, Gemini/Claude, and ElevenLabs TTS — everything except Twilio.
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <Label className="text-xs whitespace-nowrap">STT Engine</Label>
                  <Select value={sttProvider} onValueChange={setSttProvider}>
                    <SelectTrigger className="w-[180px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto (Sarvam → Google)</SelectItem>
                      <SelectItem value="google_primary">Google Primary</SelectItem>
                      <SelectItem value="sarvam_primary">Sarvam Primary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  <div className="text-center space-y-2">
                    <Bot className="h-10 w-10 mx-auto opacity-30" />
                    <p>Start a conversation with {selectedAgent?.name || "the AI agent"}</p>
                    <p className="text-xs">Type a message or click the microphone to speak</p>
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-xl px-4 py-2.5 ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : msg.role === "system"
                        ? "bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300"
                        : "bg-muted"
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                    {msg.meta && (
                      <div className="flex flex-wrap gap-1.5 mt-2 pt-1.5 border-t border-black/10 dark:border-white/10">
                        {msg.meta.sttProvider && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10">
                            STT: {msg.meta.sttProvider} {msg.meta.sttLatency ? `(${msg.meta.sttLatency}ms)` : ""}
                          </span>
                        )}
                        {msg.meta.llmProvider && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10">
                            LLM: {msg.meta.llmProvider} {msg.meta.llmLatency ? `(${msg.meta.llmLatency}ms)` : ""}
                          </span>
                        )}
                        {msg.meta.ttsProvider && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10">
                            TTS: {msg.meta.ttsProvider} {msg.meta.ttsLatency ? `(${msg.meta.ttsLatency}ms)` : ""}
                          </span>
                        )}
                        {msg.meta.emotion && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10">
                            Emotion: {msg.meta.emotion}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-xl px-4 py-2.5">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input bar */}
            <div className="border-t p-3">
              <div className="flex items-center gap-2">
                <Button
                  variant={isRecording ? "destructive" : "outline"}
                  size="icon"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={chatLoading || !selectedAgentId}
                  title={isRecording ? "Stop recording" : "Start voice recording"}
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Input
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendTextMessage()}
                  placeholder={isRecording ? "Recording... click mic to stop" : "Type your message..."}
                  disabled={chatLoading || isRecording || !selectedAgentId}
                  className="flex-1"
                />
                <Button
                  onClick={sendTextMessage}
                  disabled={chatLoading || !textInput.trim() || !selectedAgentId}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              {isRecording && (
                <div className="flex items-center gap-2 mt-2 text-xs text-red-500">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  Recording... speak now, then click the mic button to stop
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* ── TAB 3: Phone Call Test ── */}
        <TabsContent value="phone" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Live Phone Call Test</CardTitle>
              <p className="text-sm text-muted-foreground">
                Test the complete flow — Twilio dials your phone, AI agent speaks via ElevenLabs,
                listens via Google STT, and thinks via Gemini/Claude. This is the real deal.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-sm text-amber-800 dark:text-amber-300 space-y-1">
                    <p className="font-medium">Before testing:</p>
                    <ul className="list-disc ml-4 text-xs space-y-0.5">
                      <li>Twilio account must be configured with TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER</li>
                      <li>WEBHOOK_BASE_URL must point to your production API (e.g. https://team-api.orivraa.com)</li>
                      <li>Each call costs approximately $0.10-0.15 (Twilio charges)</li>
                      <li>Enter your phone number with country code (e.g. +91 98765 43210)</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Your Phone Number</Label>
                  <Input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                    disabled={callActive}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Include country code</p>
                </div>
                <div>
                  <Label>Selected Agent</Label>
                  <Input value={selectedAgent?.name || "No agent selected"} disabled />
                  <p className="text-xs text-muted-foreground mt-1">{selectedAgent?.personalityDescription || ""}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {!callActive ? (
                  <Button
                    onClick={startPhoneCall}
                    disabled={!phoneNumber.trim() || !selectedAgentId}
                    className="gap-2"
                    size="lg"
                  >
                    <Phone className="h-4 w-4" />
                    Call My Phone
                  </Button>
                ) : (
                  <Button
                    onClick={endPhoneCall}
                    variant="destructive"
                    className="gap-2"
                    size="lg"
                  >
                    <PhoneOff className="h-4 w-4" />
                    End Call
                  </Button>
                )}

                {callStatus && (
                  <Badge variant={callActive ? "success" : "secondary"} className="text-sm py-1">
                    {callStatus}
                  </Badge>
                )}
              </div>

              {/* Pipeline visualization */}
              <div>
                <p className="text-sm font-medium mb-3">Full Pipeline Flow</p>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {[
                    { label: "Twilio", desc: "Dials your phone" },
                    { label: "→" },
                    { label: "Google STT", desc: "Your voice → text" },
                    { label: "→" },
                    { label: "Gemini Flash", desc: "Thinks & responds" },
                    { label: "→" },
                    { label: "ElevenLabs", desc: "Text → AI voice" },
                    { label: "→" },
                    { label: "Twilio", desc: "Plays audio to you" },
                  ].map((step, i) =>
                    step.desc ? (
                      <div key={i} className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg border bg-card">
                        <span className="font-medium">{step.label}</span>
                        <span className="text-[10px] text-muted-foreground">{step.desc}</span>
                      </div>
                    ) : (
                      <span key={i} className="text-muted-foreground font-bold">{step.label}</span>
                    ),
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 4: AI Meeting Bot (replaces Google Meet) ── */}
        <TabsContent value="meet" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Video className="h-5 w-5 text-amber-500" /> Orivraa AI Meeting Bot
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Create branded Orivraa meetings or invite the AI bot to any external meeting link.
                The bot joins as your sales AI agent and handles the conversation.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Branding info */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold">O</div>
                  <div>
                    <p className="font-medium text-sm">Orivraa Branded Meetings</p>
                    <p className="text-xs text-muted-foreground">Gold theme • Custom logo • Professional experience</p>
                  </div>
                </div>
                <ul className="list-disc ml-4 text-xs text-amber-800 dark:text-amber-300 space-y-0.5 mt-2">
                  <li>Meetings open to all — no approval needed to join</li>
                  <li>AI agent uses sales persona from central intelligence</li>
                  <li>Transcripts saved automatically to lead timeline</li>
                  <li>Post-meeting strategy generated by AI</li>
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Option 1: Create Branded Meeting */}
                <Card className="border-amber-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-1">
                      <Plus className="h-4 w-4" /> Create Orivraa Meeting
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs">Agent</Label>
                      <Input value={selectedAgent?.name || "Select agent above"} disabled className="text-sm" />
                    </div>
                    <Button
                      onClick={async () => {
                        if (!selectedAgentId) { toast.error("Select an agent first"); return; }
                        try {
                          setDailyCreating(true);
                          setDailyStatus("creating room...");
                          const res = await aiSalesApi.scheduleMeeting({
                            agentId: selectedAgentId,
                            scheduledAt: new Date().toISOString(),
                            title: "Playground Test — Orivraa AI",
                            type: "daily",
                          });
                          const data = res.data as any;
                          setDailyRoomUrl(data.roomUrl);
                          setDailyMeetingId(data.meetingId);
                          setDailyStatus("room created");
                          toast.success("Orivraa meeting created! Launch the AI agent to start.");
                        } catch (err: any) {
                          toast.error(err?.response?.data?.message || "Failed to create meeting");
                          setDailyStatus("error");
                        } finally {
                          setDailyCreating(false);
                        }
                      }}
                      disabled={dailyCreating || !selectedAgentId}
                      className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
                    >
                      {dailyCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Create Meeting
                    </Button>
                    {dailyRoomUrl && (
                      <div className="space-y-2">
                        <Input value={dailyRoomUrl} disabled className="text-xs" />
                        <div className="flex gap-2">
                          <Button
                            size="sm" variant="outline"
                            onClick={async () => {
                              if (!dailyMeetingId) return;
                              try {
                                setDailyActive(true);
                                setDailyStatus("launching agent...");
                                await aiSalesApi.launchMeeting(dailyMeetingId);
                                setDailyStatus("agent active");
                                toast.success("AI agent deployed! Join to talk.");
                              } catch (err: any) {
                                toast.error(err?.response?.data?.message || "Failed to launch agent");
                                setDailyActive(false);
                                setDailyStatus("error");
                              }
                            }}
                            disabled={dailyActive}
                            className="flex-1 gap-1"
                          >
                            <Sparkles className="h-3 w-3" /> Launch Agent
                          </Button>
                          <a href={dailyRoomUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                            <Button size="sm" className="w-full gap-1 bg-emerald-600 hover:bg-emerald-700">
                              <Video className="h-3 w-3" /> Join Room
                            </Button>
                          </a>
                        </div>
                        {dailyActive && (
                          <Button
                            size="sm" variant="destructive" className="w-full gap-1"
                            onClick={async () => {
                              try { await aiSalesApi.cancelMeeting(dailyMeetingId); } catch {}
                              setDailyActive(false);
                              setDailyStatus("ended");
                              setDailyRoomUrl("");
                              setDailyMeetingId("");
                              toast.info("Meeting ended");
                            }}
                          >
                            <PhoneOff className="h-3 w-3" /> End Meeting
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Option 2: Invite Bot to External Meeting */}
                <Card className="border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-1">
                      <Bot className="h-4 w-4" /> Invite Bot to Meeting
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs">Meeting URL</Label>
                      <Input
                        value={meetUrl}
                        onChange={(e) => setMeetUrl(e.target.value)}
                        placeholder="https://meet.google.com/abc-defg-hij"
                        disabled={meetActive}
                        className="text-sm"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Google Meet, Zoom, or Teams</p>
                    </div>
                    {!meetActive ? (
                      <div className="flex gap-2">
                        <Button
                          onClick={async () => {
                            if (!selectedAgentId) return;
                            try {
                              setIsCreatingMeet(true);
                              const res = await googleBotApi.createMeeting(selectedAgentId, "Orivraa AI Testing");
                              const data = res.data as any;
                              setMeetUrl(data.meetUrl);
                              toast.success("Google Calendar meeting created!");
                            } catch (err: any) {
                              toast.error(err?.response?.data?.message || "Failed — is Google Calendar connected in Settings?");
                            } finally {
                              setIsCreatingMeet(false);
                            }
                          }}
                          disabled={isCreatingMeet || !selectedAgentId}
                          variant="outline"
                          className="flex-1 gap-1"
                          size="sm"
                        >
                          {isCreatingMeet ? <Loader2 className="h-3 w-3 animate-spin" /> : <CalendarPlus className="h-3 w-3" />}
                          Schedule via Calendar
                        </Button>
                        <Button
                          onClick={async () => {
                            if (!meetUrl.trim() || !selectedAgentId) return;
                            try {
                              setMeetActive(true);
                              setMeetStatus("joining");
                              setMeetLogs([]);
                              setMeetTranscript([]);
                              const res = await aiSalesApi.playgroundMeetJoin({
                                agentId: selectedAgentId,
                                meetUrl: meetUrl.trim(),
                              });
                              const data = res.data as any;
                              setMeetSessionId(data.sessionId);
                              setMeetStatus(data.status);
                              toast.success(`Bot joining as ${data.agentName}...`);
                            } catch (err: any) {
                              toast.error(err?.response?.data?.message || "Failed to join meeting");
                              setMeetActive(false);
                              setMeetStatus("error");
                            }
                          }}
                          disabled={!meetUrl.trim() || !selectedAgentId}
                          className="flex-1 gap-1"
                          size="sm"
                        >
                          <Video className="h-3 w-3" /> Join Meeting
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm" variant="destructive" className="w-full gap-1"
                        onClick={async () => {
                          try { await aiSalesApi.playgroundMeetStop({ sessionId: meetSessionId }); } catch {}
                          setMeetActive(false);
                          setMeetStatus("ended");
                          toast.info("Bot left the meeting");
                        }}
                      >
                        <PhoneOff className="h-3 w-3" /> Leave Meeting
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Status row */}
              {(dailyStatus || meetStatus) && (
                <div className="flex items-center gap-3">
                  {dailyStatus && (
                    <Badge
                      variant={dailyStatus === "agent active" ? "default" : dailyStatus === "error" || dailyStatus === "ended" ? "destructive" : "secondary"}
                      className={`text-xs py-0.5 ${dailyStatus === "agent active" ? "bg-emerald-600" : ""}`}
                    >
                      {(dailyStatus === "creating room..." || dailyStatus === "launching agent...") && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                      Meeting: {dailyStatus}
                    </Badge>
                  )}
                  {meetStatus && (
                    <Badge
                      variant={meetStatus === "in-meeting" || meetStatus === "listening" ? "default" : meetStatus === "error" || meetStatus === "ended" ? "destructive" : "secondary"}
                      className={`text-xs py-0.5 ${meetStatus === "in-meeting" || meetStatus === "listening" ? "bg-emerald-600" : ""}`}
                    >
                      {meetStatus === "joining" && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                      Bot: {meetStatus}
                    </Badge>
                  )}
                </div>
              )}

              {/* Live logs + transcript (only shown when external bot active) */}
              {(meetActive || meetLogs.length > 0) && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Live Logs</p>
                    <div className="h-64 overflow-y-auto rounded-lg border bg-black/5 dark:bg-white/5 p-3 font-mono text-xs space-y-1">
                      {meetLogs.length === 0 && <p className="text-muted-foreground">Waiting for logs...</p>}
                      {meetLogs.map((log, i) => (
                        <div key={i} className={`flex gap-2 ${
                          log.type === "error" ? "text-red-500" :
                          log.type === "stt" ? "text-blue-500" :
                          log.type === "llm" ? "text-purple-500" :
                          log.type === "tts" ? "text-emerald-500" :
                          "text-muted-foreground"
                        }`}>
                          <span className="opacity-50 shrink-0">{new Date(log.time).toLocaleTimeString()}</span>
                          <span className="uppercase font-bold w-8 shrink-0">{log.type}</span>
                          <span>{log.message}</span>
                        </div>
                      ))}
                      <div ref={meetLogsEndRef} />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Conversation</p>
                    <div className="h-64 overflow-y-auto rounded-lg border bg-black/5 dark:bg-white/5 p-3 text-sm space-y-3">
                      {meetTranscript.length === 0 && <p className="text-xs text-muted-foreground">No conversation yet...</p>}
                      {meetTranscript.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
                          <div className={`max-w-[85%] rounded-lg px-3 py-2 ${
                            msg.role === "user"
                              ? "bg-gray-200 dark:bg-gray-700"
                              : "bg-amber-600 text-white"
                          }`}>
                            <p className="text-[10px] opacity-60 mb-0.5">
                              {msg.role === "user" ? "Participant" : selectedAgent?.name || "Agent"}
                            </p>
                            <p className="text-xs">{msg.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Pipeline */}
              <div>
                <p className="text-sm font-medium mb-3">AI Meeting Pipeline</p>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {[
                    { label: "Video Room", desc: "Daily.co / GMeet" },
                    { label: "→" },
                    { label: "Google STT", desc: "Speech → text" },
                    { label: "→" },
                    { label: "Gemini Flash", desc: "Sales AI brain" },
                    { label: "→" },
                    { label: "ElevenLabs", desc: "Natural voice" },
                    { label: "→" },
                    { label: "Participant", desc: "Hears response" },
                  ].map((step, i) =>
                    step.desc ? (
                      <div key={i} className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg border bg-card">
                        <span className="font-medium">{step.label}</span>
                        <span className="text-[10px] text-muted-foreground">{step.desc}</span>
                      </div>
                    ) : (
                      <span key={i} className="text-muted-foreground font-bold">{step.label}</span>
                    ),
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB: Daily.co + Pipecat Video Meeting (Branded) ── */}
        <TabsContent value="video-meeting" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Video className="h-5 w-5 text-amber-500" /> Orivraa Video Meeting
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Create a branded Daily.co video room and deploy a Pipecat AI sales agent.
                The agent uses a sales persona powered by central intelligence — not a support bot.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="text-sm text-amber-800 dark:text-amber-300 space-y-1">
                  <p className="font-medium flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-[10px] font-bold">O</div>
                    Orivraa Branded Experience
                  </p>
                  <ul className="list-disc ml-4 text-xs space-y-0.5">
                    <li>Room open to all — no knocking or approval needed</li>
                    <li>Pipecat Cloud deploys voice AI into the room ($0.01/min)</li>
                    <li>AI uses sales persona: asks about their day, builds rapport, closes deals</li>
                    <li>Goals set by central intelligence, transcript saved on end</li>
                    <li>Post-meeting: AI generates strategy and updates lead score</li>
                  </ul>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Selected Agent</Label>
                  <Input value={selectedAgent?.name || "No agent selected"} disabled />
                  <p className="text-xs text-muted-foreground mt-1">{selectedAgent?.personalityDescription || "Select an agent above"}</p>
                </div>
                <div>
                  <Label>Room URL</Label>
                  <Input value={dailyRoomUrl || "Not created yet"} disabled />
                  <p className="text-xs text-muted-foreground mt-1">
                    {dailyRoomUrl ? "Share this link with anyone to join" : "Click Create to generate a room"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {!dailyActive ? (
                  <>
                    <Button
                      onClick={async () => {
                        if (!selectedAgentId) {
                          toast.error("Select an agent first");
                          return;
                        }
                        try {
                          setDailyCreating(true);
                          setDailyStatus("creating room...");
                          const res = await aiSalesApi.scheduleMeeting({
                            agentId: selectedAgentId,
                            scheduledAt: new Date().toISOString(),
                            title: "Playground Test — Orivraa AI",
                            type: "daily",
                          });
                          const data = res.data as any;
                          setDailyRoomUrl(data.roomUrl);
                          setDailyMeetingId(data.meetingId);
                          setDailyStatus("room created");
                          toast.success("Orivraa meeting room created! Click Launch Agent to deploy the AI.");
                        } catch (err: any) {
                          toast.error(err?.response?.data?.message || "Failed to create room. Check Daily.co API key in Settings.");
                          setDailyStatus("error");
                        } finally {
                          setDailyCreating(false);
                        }
                      }}
                      disabled={dailyCreating || !selectedAgentId}
                      className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
                      size="lg"
                    >
                      {dailyCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Create Orivraa Room
                    </Button>
                    <Button
                      onClick={async () => {
                        if (!dailyMeetingId) {
                          toast.error("Create a room first");
                          return;
                        }
                        try {
                          setDailyActive(true);
                          setDailyStatus("launching agent...");
                          await aiSalesApi.launchMeeting(dailyMeetingId);
                          setDailyStatus("agent active");
                          toast.success("Pipecat agent deployed! Join the room to talk to it.");
                        } catch (err: any) {
                          toast.error(err?.response?.data?.message || "Failed to launch agent. Check Pipecat Cloud API key.");
                          setDailyActive(false);
                          setDailyStatus("error");
                        }
                      }}
                      disabled={!dailyMeetingId || dailyActive}
                      className="gap-2"
                      size="lg"
                    >
                      <Sparkles className="h-4 w-4" />
                      Launch Agent
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={async () => {
                      try {
                        await aiSalesApi.cancelMeeting(dailyMeetingId);
                        toast.info("Meeting ended, agent stopped");
                      } catch {
                        // ignore
                      }
                      setDailyActive(false);
                      setDailyStatus("ended");
                      setDailyRoomUrl("");
                      setDailyMeetingId("");
                    }}
                    variant="destructive"
                    className="gap-2"
                    size="lg"
                  >
                    <PhoneOff className="h-4 w-4" />
                    End Meeting
                  </Button>
                )}

                {dailyRoomUrl && !dailyActive && dailyStatus === "room created" && (
                  <a href={dailyRoomUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="lg" className="gap-2">
                      <Video className="h-4 w-4" />
                      Open Room
                    </Button>
                  </a>
                )}

                {dailyRoomUrl && dailyActive && (
                  <a href={dailyRoomUrl} target="_blank" rel="noopener noreferrer">
                    <Button size="lg" className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                      <Video className="h-4 w-4" />
                      Join & Talk to Agent
                    </Button>
                  </a>
                )}

                {dailyStatus && (
                  <Badge
                    variant={
                      dailyStatus === "agent active" ? "success"
                        : dailyStatus === "error" || dailyStatus === "ended" ? "destructive"
                        : "secondary"
                    }
                    className="text-sm py-1"
                  >
                    {(dailyStatus === "creating room..." || dailyStatus === "launching agent...") && (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    )}
                    {dailyStatus}
                  </Badge>
                )}
              </div>

              {/* Pipeline visualization */}
              <div>
                <p className="text-sm font-medium mb-3">Orivraa Sales AI Pipeline</p>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {[
                    { label: "Orivraa Room", desc: "Branded video" },
                    { label: "→" },
                    { label: "Google STT", desc: "Speech → text" },
                    { label: "→" },
                    { label: "Pre-Call Brain", desc: "Strategy + goals" },
                    { label: "→" },
                    { label: "Gemini Flash", desc: "Sales AI persona" },
                    { label: "→" },
                    { label: "ElevenLabs", desc: "Natural voice" },
                    { label: "→" },
                    { label: "Central Brain", desc: "Learning + scoring" },
                  ].map((step, i) =>
                    step.desc ? (
                      <div key={i} className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg border bg-card">
                        <span className="font-medium">{step.label}</span>
                        <span className="text-[10px] text-muted-foreground">{step.desc}</span>
                      </div>
                    ) : (
                      <span key={i} className="text-muted-foreground font-bold">{step.label}</span>
                    ),
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  Hosted on Pipecat Cloud (agent-1x: 0.5 vCPU, 1GB RAM) • $0.01/min active • Orivraa branded
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* -- TAB 5: AI Email & Drafting -- */}
        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="h-5 w-5" /> AI Email Agent
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Test the AI email drafting (Gemini Flash-Lite) and sending (Resend API) pipeline.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <Label>Email Purpose</Label>
                    <Input
                      value={emailPurpose}
                      onChange={(e) => setEmailPurpose(e.target.value)}
                      placeholder="e.g. Follow up on the latest sales call"
                      disabled={emailLoading}
                    />
                    <p className="text-xs text-muted-foreground mt-1">What should the AI write about?</p>
                  </div>
                  <Button
                    onClick={async () => {
                      if (!emailPurpose.trim()) return;
                      setEmailLoading(true);
                      setEmailDraft(null);
                      try {
                        const res = await aiSalesApi.playgroundEmailDraft({
                          purpose: emailPurpose,
                          includeMeetLink: true,
                        });
                        setEmailDraft(res.data);
                        toast.success("Draft generated!");
                      } catch (err: any) {
                        toast.error(err?.response?.data?.message || "Failed to generate draft");
                      }
                      setEmailLoading(false);
                    }}
                    disabled={!emailPurpose.trim() || emailLoading}
                    className="w-full gap-2"
                  >
                    {emailLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                    Generate Draft
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {emailDraft ? (
                    <div className="rounded-lg border bg-black/5 dark:bg-white/5 p-4 space-y-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Subject</Label>
                        <p className="text-sm font-medium">{emailDraft.subject}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Body</Label>
                        <p className="text-sm whitespace-pre-wrap">{emailDraft.body}</p>
                      </div>
                      
                      <div className="pt-4 border-t mt-4">
                        <Label>Send to Email Address (uses Resend API)</Label>
                        <div className="flex gap-2 mt-2">
                          <Input
                            type="email"
                            value={emailTo}
                            onChange={(e) => setEmailTo(e.target.value)}
                            placeholder="you@example.com"
                          />
                          <Button
                            onClick={async () => {
                              if (!emailTo.trim()) return;
                              setEmailLoading(true);
                              try {
                                const res = await aiSalesApi.playgroundEmailSend({
                                  to: emailTo,
                                  subject: emailDraft.subject,
                                  body: emailDraft.body,
                                });
                                toast.success(`Email sent! Resend ID: ${res.data?.resendId || "OK"}`);
                              } catch (err: any) {
                                toast.error(err?.response?.data?.message || "Failed to send email — check RESEND_API_KEY");
                              }
                              setEmailLoading(false);
                            }}
                            disabled={!emailTo.trim() || emailLoading}
                          >
                            <Send className="h-3 w-3 mr-1" /> Send
                          </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Requires RESEND_API_KEY in env and a verified domain in Resend dashboard.
                        </p>
                      </div>
                    </div>
                  ) : (
                     <div className="h-full min-h-[200px] flex items-center justify-center text-sm text-muted-foreground border border-dashed rounded-lg">
                       Submit a purpose to see the AI draft here.
                     </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* -- TAB 6: Interaction Chain Simulator -- */}
        <TabsContent value="simulator" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" /> Interaction Chain Simulator
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Build a chain of interactions to test how the AI understands the lead across calls, emails, SMS, and GMeets.
                    Each node is analyzed in context of all previous interactions.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {chainNodes.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setChainNodes([])}>Reset Chain</Button>
                  )}
                  <Badge variant="secondary">
                    <Sparkles className="h-3 w-3 mr-1" /> Gemini 2.5 Flash
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Overall goal */}
              <div>
                <Label>Overall Sales Goal (applies to all interactions)</Label>
                <Input
                  value={chainOverallGoal}
                  onChange={(e) => setChainOverallGoal(e.target.value)}
                  placeholder="e.g. Close a $10k gold purchase deal"
                />
              </div>

              {/* Chain timeline */}
              <div className="space-y-0">
                {chainNodes.map((node, idx) => {
                  const typeColors: Record<string, string> = {
                    call: "bg-blue-500",
                    email: "bg-purple-500",
                    sms: "bg-emerald-500",
                    gmeet: "bg-orange-500",
                  };
                  const typeIcons: Record<string, React.ReactNode> = {
                    call: <Phone className="h-3 w-3" />,
                    email: <Mail className="h-3 w-3" />,
                    sms: <Send className="h-3 w-3" />,
                    gmeet: <Video className="h-3 w-3" />,
                  };
                  return (
                    <div key={node.id}>
                      {/* Connector line */}
                      {idx > 0 && (
                        <div className="flex justify-center py-1">
                          <div className="flex flex-col items-center">
                            <div className="w-0.5 h-4 bg-muted-foreground/30" />
                            <ArrowDown className="h-3 w-3 text-muted-foreground/50" />
                          </div>
                        </div>
                      )}
                      {/* Node card */}
                      <div className={`relative rounded-xl border-2 p-4 transition-all ${
                        node.aiResult
                          ? "border-emerald-500/40 bg-emerald-500/5"
                          : node.loading
                            ? "border-blue-500/40 bg-blue-500/5"
                            : "border-muted-foreground/20"
                      }`}>
                        {/* Node header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`${typeColors[node.type]} text-white rounded-full p-1.5 flex items-center justify-center`}>
                              {typeIcons[node.type]}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              Interaction #{idx + 1}
                            </Badge>
                            <Select value={node.type} onValueChange={(v) => {
                              setChainNodes((prev) => prev.map((n) => n.id === node.id ? { ...n, type: v as ChainNodeType } : n));
                            }}>
                              <SelectTrigger className="w-[120px] h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="call">Phone Call</SelectItem>
                                <SelectItem value="email">Email</SelectItem>
                                <SelectItem value="sms">SMS</SelectItem>
                                <SelectItem value="gmeet">Google Meet</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-1">
                            {node.aiResult && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                setChainNodes((prev) => prev.map((n) => n.id === node.id ? { ...n, expanded: !n.expanded } : n));
                              }}>
                                {node.expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => {
                              setChainNodes((prev) => prev.filter((n) => n.id !== node.id));
                            }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Transcript input */}
                        <div className="space-y-2">
                          <div>
                            <Label className="text-xs">Goal for this interaction</Label>
                            <Input
                              className="h-8 text-xs"
                              value={node.goal}
                              onChange={(e) => setChainNodes((prev) => prev.map((n) => n.id === node.id ? { ...n, goal: e.target.value } : n))}
                              placeholder={chainOverallGoal || "e.g. Qualify budget"}
                              disabled={node.loading}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Transcript / Content</Label>
                            <Textarea
                              className="min-h-[80px] text-xs mt-1"
                              value={node.transcript}
                              onChange={(e) => setChainNodes((prev) => prev.map((n) => n.id === node.id ? { ...n, transcript: e.target.value } : n))}
                              placeholder={node.type === "email"
                                ? "Subject: Follow-up...\nBody: Hi Rahul, I wanted to..."
                                : node.type === "sms"
                                  ? "Hi Rahul, just checking in..."
                                  : "Agent: Good afternoon!\nCustomer: Hi, so about the pricing..."}
                              disabled={node.loading}
                            />
                          </div>

                          {/* Action button */}
                          <Button
                            onClick={async () => {
                              if (!node.transcript.trim()) return;
                              setChainNodes((prev) => prev.map((n) => n.id === node.id ? { ...n, loading: true, aiResult: null } : n));
                              try {
                                const res = await aiSalesApi.playgroundSimulateChain({
                                  chain: chainNodes.map((n) => ({
                                    type: n.type,
                                    transcript: n.transcript,
                                    goal: n.goal || chainOverallGoal,
                                    aiResult: n.aiResult,
                                  })),
                                  currentIndex: idx,
                                });
                                setChainNodes((prev) => prev.map((n) => n.id === node.id ? { ...n, aiResult: res.data, loading: false, expanded: true } : n));
                                toast.success(`Interaction #${idx + 1} analyzed!`);
                              } catch {
                                toast.error("Analysis failed");
                                setChainNodes((prev) => prev.map((n) => n.id === node.id ? { ...n, loading: false } : n));
                              }
                            }}
                            disabled={!node.transcript.trim() || node.loading}
                            size="sm"
                            className="w-full gap-2"
                          >
                            {node.loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                            {node.loading ? "Analyzing..." : node.aiResult ? "Re-Analyze" : "Analyze with AI"}
                          </Button>
                        </div>

                        {/* AI Results (expandable) */}
                        {node.aiResult && node.expanded && (
                          <div className="mt-4 pt-4 border-t space-y-3">
                            {/* Report summary */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="rounded-lg bg-black/5 dark:bg-white/5 p-3">
                                <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">Summary</p>
                                <p className="text-xs">{node.aiResult.report?.summary}</p>
                              </div>
                              <div className="rounded-lg bg-black/5 dark:bg-white/5 p-3">
                                <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">Goal Achieved?</p>
                                <div className="flex items-center gap-2">
                                  {node.aiResult.goalEval?.achieved
                                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    : <XCircle className="h-4 w-4 text-red-500" />
                                  }
                                  <p className="text-xs">{node.aiResult.goalEval?.notes}</p>
                                </div>
                              </div>
                            </div>

                            {/* Key metrics row */}
                            <div className="flex gap-2 flex-wrap">
                              <Badge variant={node.aiResult.report?.outcome === "positive" ? "success" : node.aiResult.report?.outcome === "negative" ? "destructive" : "secondary"}>
                                {node.aiResult.report?.outcome}
                              </Badge>
                              <Badge variant="outline">Deal: {Math.round((node.aiResult.report?.dealProbability || 0) * 100)}%</Badge>
                              <Badge variant="outline">Quality: {node.aiResult.report?.callQualityScore}/10</Badge>
                              {node.aiResult.insights?.communicationStyle && (
                                <Badge variant="outline">Style: {node.aiResult.insights.communicationStyle}</Badge>
                              )}
                              {node.aiResult.insights?.urgency && (
                                <Badge variant="outline">Urgency: {node.aiResult.insights.urgency}</Badge>
                              )}
                            </div>

                            {/* Objections & buying signals */}
                            {(node.aiResult.report?.objectionsRaised?.length > 0 || node.aiResult.report?.buyingSignals?.length > 0) && (
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">Objections</p>
                                  <div className="flex flex-wrap gap-1">
                                    {(node.aiResult.report?.objectionsRaised || []).map((o: string, i: number) => (
                                      <Badge key={i} variant="destructive" className="text-[10px]">{o}</Badge>
                                    ))}
                                    {(!node.aiResult.report?.objectionsRaised?.length) && <span className="text-[10px] text-muted-foreground">None detected</span>}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">Buying Signals</p>
                                  <div className="flex flex-wrap gap-1">
                                    {(node.aiResult.report?.buyingSignals || []).map((s: string, i: number) => (
                                      <Badge key={i} variant="success" className="text-[10px]">{s}</Badge>
                                    ))}
                                    {(!node.aiResult.report?.buyingSignals?.length) && <span className="text-[10px] text-muted-foreground">None detected</span>}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* AI Next Action Recommendation */}
                            {node.aiResult.nextAction && (
                              <div className="rounded-xl border-2 border-dashed border-blue-500/40 bg-blue-500/5 p-4">
                                <p className="text-xs font-semibold flex items-center gap-1 mb-2">
                                  <Sparkles className="h-3.5 w-3.5 text-blue-500" /> AI Recommended Next Action
                                </p>
                                <div className="grid grid-cols-3 gap-3 mb-2">
                                  <div>
                                    <p className="text-[10px] text-muted-foreground">Type</p>
                                    <Badge className="mt-0.5">{node.aiResult.nextAction.recommendedType?.toUpperCase()}</Badge>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-muted-foreground">Urgency</p>
                                    <Badge variant={node.aiResult.nextAction.urgency === "immediate" ? "destructive" : "secondary"} className="mt-0.5">
                                      {node.aiResult.nextAction.urgency}
                                    </Badge>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-muted-foreground">Lead Temp</p>
                                    <Badge variant={
                                      node.aiResult.nextAction.leadTemperature === "hot" ? "destructive"
                                        : node.aiResult.nextAction.leadTemperature === "warm" ? "success"
                                          : "secondary"
                                    } className="mt-0.5">
                                      {node.aiResult.nextAction.leadTemperature}
                                    </Badge>
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground mb-1">{node.aiResult.nextAction.reasoning}</p>
                                <div className="rounded-lg bg-black/5 dark:bg-white/5 p-2 mt-2">
                                  <p className="text-[10px] font-semibold text-muted-foreground">Suggested Content</p>
                                  <p className="text-xs mt-0.5">{node.aiResult.nextAction.suggestedContent}</p>
                                </div>
                                {node.aiResult.nextAction.overallProgress && (
                                  <p className="text-[10px] text-muted-foreground mt-2 italic">
                                    {node.aiResult.nextAction.overallProgress}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Collapsed AI summary */}
                        {node.aiResult && !node.expanded && (
                          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            Analyzed &mdash; {node.aiResult.report?.outcome} | Deal: {Math.round((node.aiResult.report?.dealProbability || 0) * 100)}%
                            {node.aiResult.nextAction && <> | Next: <Badge variant="outline" className="text-[10px]">{node.aiResult.nextAction.recommendedType}</Badge></>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add node button */}
              {chainNodes.length > 0 && (
                <div className="flex justify-center">
                  <div className="flex flex-col items-center">
                    <div className="w-0.5 h-4 bg-muted-foreground/20" />
                    <ArrowDown className="h-3 w-3 text-muted-foreground/30 mb-2" />
                  </div>
                </div>
              )}
              <Button
                variant="outline"
                className="w-full border-dashed gap-2 h-12"
                onClick={() => {
                  const prevNode = chainNodes[chainNodes.length - 1];
                  const suggestedType = prevNode?.aiResult?.nextAction?.recommendedType || "call";
                  setChainNodes((prev) => [...prev, {
                    id: `node-${Date.now()}`,
                    type: suggestedType as ChainNodeType,
                    transcript: "",
                    goal: chainOverallGoal,
                    aiResult: null,
                    loading: false,
                    expanded: true,
                  }]);
                }}
              >
                <Plus className="h-4 w-4" />
                Add Interaction #{chainNodes.length + 1}
                {chainNodes.length > 0 && chainNodes[chainNodes.length - 1]?.aiResult?.nextAction && (
                  <Badge variant="secondary" className="ml-2 text-[10px]">
                    AI suggests: {chainNodes[chainNodes.length - 1].aiResult.nextAction.recommendedType}
                  </Badge>
                )}
              </Button>

              {/* Empty state */}
              {chainNodes.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mx-auto opacity-30 mb-3" />
                  <p className="text-sm">Click &quot;Add Interaction #1&quot; to start building a chain.</p>
                  <p className="text-xs mt-1">Each interaction builds on the previous ones &mdash; the AI considers the full history.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
