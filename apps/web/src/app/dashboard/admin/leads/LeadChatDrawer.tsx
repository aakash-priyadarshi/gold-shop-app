"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { T } from "@/components/ui/T";
import { useT } from "@/providers/translation-provider";
import {
  leadsAdminApi,
  LeadMessage,
  LeadMessagesResponse,
} from "@/lib/api";
import {
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ClockIcon,
  PaperAirplaneIcon,
  PhotoIcon,
  SparklesIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface LeadChatDrawerProps {
  leadId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onLeadUpdated?: () => void;
}

export function LeadChatDrawer({
  leadId,
  isOpen,
  onClose,
  onLeadUpdated,
}: LeadChatDrawerProps) {
  const t = useT();
  const [data, setData] = useState<LeadMessagesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [togglingAi, setTogglingAi] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeLeadIdRef = useRef<string | null>(null);
  activeLeadIdRef.current = leadId;

  const fetchMessages = useCallback(async () => {
    if (!leadId) return;
    const requestedId = leadId;
    try {
      setLoading(true);
      const res = await leadsAdminApi.getMessages(leadId);
      if (activeLeadIdRef.current === requestedId) {
        setData(res.data);
      }
    } catch (err: any) {
      if (activeLeadIdRef.current === requestedId) {
        console.error("Failed loading chat messages:", err);
      }
    } finally {
      if (activeLeadIdRef.current === requestedId) {
        setLoading(false);
      }
    }
  }, [leadId]);

  useEffect(() => {
    if (isOpen && leadId) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 8000); // Live poll for replies
      return () => clearInterval(interval);
    } else {
      setData(null);
      setInputText("");
      setMediaUrl("");
    }
  }, [isOpen, leadId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages]);

  // Calculate remaining time in 24h Customer Service Window
  useEffect(() => {
    if (!data?.lead.customerServiceWindowExpiresAt) {
      setTimeRemaining(null);
      return;
    }
    const updateCountdown = () => {
      const expiry = new Date(data.lead.customerServiceWindowExpiresAt!).getTime();
      const now = Date.now();
      const diff = expiry - now;
      if (diff <= 0) {
        setTimeRemaining(null);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeRemaining(`${hours}h ${minutes}m`);
      }
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 60000);
    return () => clearInterval(timer);
  }, [data?.lead.customerServiceWindowExpiresAt]);

  const isWindowActive = Boolean(
    data?.lead.customerServiceWindowExpiresAt &&
    new Date(data.lead.customerServiceWindowExpiresAt).getTime() > Date.now()
  );

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!leadId || !inputText.trim()) return;

    if (!isWindowActive) {
      alert(t("WhatsApp Business policy requires an active 24-hour customer service window or an approved template message."));
      return;
    }

    try {
      setSending(true);
      await leadsAdminApi.sendWhatsAppMessage(leadId, {
        body: inputText.trim(),
        mediaUrl: mediaUrl.trim() || undefined,
      });
      setInputText("");
      setMediaUrl("");
      setShowMediaInput(false);
      await fetchMessages();
      onLeadUpdated?.();
    } catch (err: any) {
      alert(`Could not send WhatsApp message: ${err?.message || "Unknown error"}`);
    } finally {
      setSending(false);
    }
  };

  const handleToggleAi = async () => {
    if (!leadId || !data?.lead) return;
    try {
      setTogglingAi(true);
      const newPausedState = !data.lead.aiBotPaused;
      await leadsAdminApi.toggleAiBot(leadId, newPausedState);
      setData((prev) =>
        prev
          ? {
              ...prev,
              lead: { ...prev.lead, aiBotPaused: newPausedState },
            }
          : prev
      );
      onLeadUpdated?.();
    } catch (err: any) {
      alert(`Could not toggle AI bot: ${err?.message}`);
    } finally {
      setTogglingAi(false);
    }
  };

  if (!isOpen) return null;

  const lead = data?.lead;
  const messages = data?.messages || [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl h-full bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ChatBubbleLeftRightIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-foreground flex items-center gap-2">
                <span>{lead?.shopName || <T>Loading lead...</T>}</span>
                {lead?.country && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted border border-border">
                    {lead.country}
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {lead?.phone || <T>No phone number</T>}
                {lead?.city ? ` • ${lead.city}` : ""}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* 24h Window & AI Bot Status Banner */}
        <div className="p-3 bg-muted/20 border-b border-border flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            {isWindowActive ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                <ClockIcon className="h-3.5 w-3.5" />
                <T>24h Free Window Active</T> ({timeRemaining})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                <ClockIcon className="h-3.5 w-3.5" />
                <T>Window Inactive (Meta Template Required)</T>
              </span>
            )}
          </div>

          <button
            onClick={handleToggleAi}
            disabled={togglingAi || !lead}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-medium transition-colors border ${
              lead?.aiBotPaused
                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/20"
                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
            }`}
          >
            <SparklesIcon className="h-3.5 w-3.5" />
            {lead?.aiBotPaused ? (
              <T>AI Bot Paused (Human Takeover)</T>
            ) : (
              <T>AI Bot Active (Auto-Reply)</T>
            )}
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              <T>Loading conversation history...</T>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <ChatBubbleLeftRightIcon className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-foreground">
                <T>No WhatsApp Messages Yet</T>
              </p>
              <p className="text-xs mt-1 max-w-xs">
                <T>
                  Send an outreach template or manual message below to begin
                  the conversation with this jeweller.
                </T>
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isInbound = msg.direction === "INBOUND";
              const isAi = msg.sender === "AI_BOT";
              const isAdmin = msg.sender === "ADMIN";

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    isInbound ? "items-start" : "items-end"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                      {isInbound ? (
                        lead?.shopName || "Customer"
                      ) : isAi ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <SparklesIcon className="h-2.5 w-2.5" /> Orivraa AI
                        </span>
                      ) : isAdmin ? (
                        <span className="text-blue-600 dark:text-blue-400">
                          Admin
                        </span>
                      ) : (
                        "System"
                      )}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                      isInbound
                        ? "bg-muted text-foreground rounded-tl-sm"
                        : isAi
                        ? "bg-emerald-600 text-white rounded-tr-sm"
                        : "bg-blue-600 text-white rounded-tr-sm"
                    }`}
                  >
                    {msg.mediaUrl && (
                      <div className="mb-2 rounded-lg overflow-hidden border border-white/20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={msg.mediaUrl}
                          alt="Attachment"
                          className="max-h-48 w-full object-cover"
                        />
                      </div>
                    )}
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {msg.body}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 bg-muted/20 border-t border-border flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-[10px] uppercase font-semibold text-muted-foreground shrink-0">
            <T>Quick Insert</T>:
          </span>
          <button
            type="button"
            onClick={() =>
              setInputText(
                (prev) =>
                  `${prev} Claim your 60-day complimentary PRO access here: https://www.orivraa.com/auth/register?ref=lead_whatsapp&leadId=${lead?.id}`
              )
            }
            className="px-2.5 py-1 rounded-full bg-background border border-border hover:bg-muted text-foreground text-xs whitespace-nowrap shrink-0"
          >
            🎁 <T>60-Day Trial Link</T>
          </button>
          <button
            type="button"
            onClick={() => {
              setMediaUrl("https://www.orivraa.com/luxury-gold-ring-box.png");
              setShowMediaInput(true);
            }}
            className="px-2.5 py-1 rounded-full bg-background border border-border hover:bg-muted text-foreground text-xs whitespace-nowrap shrink-0"
          >
            🖼️ <T>Attach Promo Card</T>
          </button>
          <button
            type="button"
            onClick={() =>
              setInputText(
                (prev) =>
                  `${prev} Would you like a brief 10-minute demo of our jewellery billing and karigar tracking?`
              )
            }
            className="px-2.5 py-1 rounded-full bg-background border border-border hover:bg-muted text-foreground text-xs whitespace-nowrap shrink-0"
          >
            📞 <T>Offer Demo Call</T>
          </button>
        </div>

        {/* Media URL Input row (collapsible) */}
        {showMediaInput && (
          <div className="px-4 py-2 bg-muted/40 border-t border-border flex items-center gap-2 animate-in fade-in duration-150">
            <PhotoIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="url"
              placeholder="https://... (Image or Flyer URL)"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              className="flex-1 bg-background border border-border rounded px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => {
                setMediaUrl("");
                setShowMediaInput(false);
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Customer Service Window Expired Notice */}
        {!isWindowActive && !lead?.whatsappOptOut && (
          <div className="px-3 py-2 bg-amber-500/10 border-t border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
            <ClockIcon className="h-4 w-4 shrink-0" />
            <span>
              <T>
                24-Hour Customer Service Window is closed. Free-form WhatsApp messages require customer activity or an approved template campaign.
              </T>
            </span>
          </div>
        )}

        {/* Message Input Form */}
        <form
          onSubmit={handleSendMessage}
          className="p-3 border-t border-border bg-card flex items-center gap-2"
        >
          <button
            type="button"
            onClick={() => setShowMediaInput(!showMediaInput)}
            title={t("Attach Media URL")}
            disabled={!isWindowActive || lead?.whatsappOptOut}
            className={`p-2 rounded-lg border transition-colors ${
              mediaUrl
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <PhotoIcon className="h-5 w-5" />
          </button>

          <input
            type="text"
            placeholder={
              lead?.whatsappOptOut
                ? t("Lead opted out of WhatsApp messages")
                : !isWindowActive
                ? t("Service window closed — waiting for merchant message or template")
                : t("Type message via Twilio WhatsApp...")
            }
            disabled={sending || lead?.whatsappOptOut || !isWindowActive}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
          />

          <button
            type="submit"
            disabled={sending || !inputText.trim() || lead?.whatsappOptOut || !isWindowActive}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 flex items-center gap-1.5 text-sm font-medium transition-colors shrink-0"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
            <T>Send</T>
          </button>
        </form>
      </div>
    </div>
  );
}
