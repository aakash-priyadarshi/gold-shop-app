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
import { aiSalesApi } from "@/lib/api";
import {
  ArrowLeft, Bot, CheckCircle2, Loader2, Mic, MicOff,
  Phone, PhoneOff, Send, Volume2, XCircle, AlertTriangle,
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
  const chatEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // ── Phone call mode ──
  const [phoneNumber, setPhoneNumber] = useState("");
  const [callActive, setCallActive] = useState(false);
  const [callStatus, setCallStatus] = useState("");

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
    } catch (err: any) {
      setCallStatus("Failed to initiate call");
      toast.error(err?.response?.data?.message || "Call failed");
      setCallActive(false);
    }
  };

  const endPhoneCall = async () => {
    setCallActive(false);
    setCallStatus("Call ended");
  };

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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="diagnostics">Service Diagnostics</TabsTrigger>
          <TabsTrigger value="browser">Browser Chat & Voice</TabsTrigger>
          <TabsTrigger value="phone">Phone Call Test</TabsTrigger>
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
              <p className="text-xs text-muted-foreground">
                Type or use your microphone. Tests Google STT, Gemini/Claude, and ElevenLabs TTS — everything except Twilio.
              </p>
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
      </Tabs>
    </div>
  );
}
