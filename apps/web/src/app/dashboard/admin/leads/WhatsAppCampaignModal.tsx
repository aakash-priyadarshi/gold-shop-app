"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { LeadItem, leadsAdminApi } from "@/lib/api";
import {
  AlertCircle,
  Clock,
  DollarSign,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLeads: LeadItem[];
  onSuccess: () => void;
}

const PRESET_TEMPLATES = [
  {
    id: "trial-60",
    name: "60-Day Free Pro Trial (Standard)",
    text: "Namaste {{shopName}}! We noticed your jewellery store in {{city}}. Orivraa is offering gold & jewellery shops an exclusive 60-day complimentary PRO trial — offline POS, automated karigar ledger, real-time gold rates, and instant digital estimates without credit card. Reply YES to start chatting or claim your shop account!",
  },
  {
    id: "festival-special",
    name: "Festival Season Special Offer",
    text: "Shubh Deepawali / Festive Greetings {{shopName}}! This festive season, modernize your gold billing with Orivraa. Enjoy 60 days complimentary PRO access including fast Dhanteras POS billing, automated gold loss tracking, and WhatsApp quotes. Reply to this message to claim your festive setup!",
  },
  {
    id: "karigar-ledger",
    name: "Karigar Ledger & Gold Loss Spotlight",
    text: "Hello {{shopName}}, tired of handwritten karigar khatas? Orivraa provides gold jewellery manufacturers with a complete digital workshop: track issue, return, wastage, and polish loss in pure grams automatically. Reply 'DEMO' to see how it works on your phone!",
  },
];

export function WhatsAppCampaignModal({
  open,
  onOpenChange,
  selectedLeads,
  onSuccess,
}: Props) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>("trial-60");
  const [templateText, setTemplateText] = useState<string>(PRESET_TEMPLATES[0].text);
  const [festivalName, setFestivalName] = useState<string>("");
  const [mediaUrl, setMediaUrl] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);

  // Filter leads with phone number and not opted out
  const eligibleLeads = useMemo(
    () => selectedLeads.filter((l) => l.phone && !l.whatsappOptOut),
    [selectedLeads],
  );
  const leadsWithoutPhone = selectedLeads.length - eligibleLeads.length;

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const found = PRESET_TEMPLATES.find((p) => p.id === presetId);
    if (found) {
      setTemplateText(found.text);
    }
  };

  const handleSend = async () => {
    if (eligibleLeads.length === 0) {
      toast({
        title: "No eligible leads",
        description: "None of the selected leads have valid phone numbers.",
        variant: "destructive",
      });
      return;
    }

    if (!templateText.trim()) {
      toast({
        title: "Message cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const res = await leadsAdminApi.sendWhatsAppCampaign({
        leadIds: eligibleLeads.map((l) => l.id),
        templateText: templateText.trim(),
        mediaUrl: mediaUrl.trim() || undefined,
        festivalName: festivalName.trim() || undefined,
      });

      const data = res.data;
      toast({
        title: "WhatsApp Campaign Dispatched",
        description: `Sent: ${data?.sent || 0} | Skipped: ${data?.skipped || 0} | Failed: ${data?.failed || 0}`,
      });

      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast({
        title: "Failed to dispatch campaign",
        description: err?.response?.data?.message || err?.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-lg">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                <T>Twilio WhatsApp Lead Outreach</T>
              </DialogTitle>
              <DialogDescription>
                <T>
                  Broadcast an initial WhatsApp invitation to selected jewellery shop leads.
                </T>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Target Audience Summary */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                <T>Target Audience:</T>
              </span>
              <Badge className="bg-emerald-600 text-white">
                {eligibleLeads.length} <T>Eligible (has phone)</T>
              </Badge>
              {leadsWithoutPhone > 0 && (
                <Badge variant="outline" className="text-amber-700 border-amber-300">
                  {leadsWithoutPhone} <T>skipped (no phone / opted out)</T>
                </Badge>
              )}
            </div>
            <div className="text-slate-500">
              {selectedLeads.length} <T>total selected</T>
            </div>
          </div>

          {/* Pricing & Customer Service Window Info Card */}
          <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-lg text-xs space-y-1.5 text-emerald-900 dark:text-emerald-200">
            <div className="font-semibold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
              <Sparkles className="h-4 w-4" />
              <T>Meta Customer Service Window &amp; Twilio Cost Advantage</T>
            </div>
            <p className="leading-relaxed text-[11px] text-emerald-800/90 dark:text-emerald-300/90">
              <T>
                Twilio fee is $0.005 per message. Once the jewellery merchant replies to this WhatsApp outreach, a 24-Hour Customer Service Window activates: all subsequent Gemini AI bot conversations and admin replies cost $0.00 Meta conversation fee!
              </T>
            </p>
          </div>

          {/* Template Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              <T>Choose Preset Template</T>
            </Label>
            <Select value={selectedPresetId} onValueChange={handleSelectPreset}>
              <SelectTrigger>
                <SelectValue placeholder="Select template..." />
              </SelectTrigger>
              <SelectContent>
                {PRESET_TEMPLATES.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Optional Festival Tag */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                <T>Festival Campaign Name (Optional)</T>
              </Label>
              <Input
                placeholder="e.g. Dhanteras 2026, Tihar 2083"
                value={festivalName}
                onChange={(e) => setFestivalName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <ImageIcon className="h-3.5 w-3.5 text-slate-400" />
                <T>Media Flyer URL (Optional)</T>
              </Label>
              <Input
                placeholder="https://images.orivraa.com/promo/..."
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
              />
            </div>
          </div>

          {/* Message Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">
                <T>WhatsApp Message Text</T>
              </Label>
              <span className="text-[11px] text-slate-400">
                <T>Available placeholders:</T> {"{{shopName}}"}, {"{{city}}"}
              </span>
            </div>
            <Textarea
              rows={5}
              value={templateText}
              onChange={(e) => setTemplateText(e.target.value)}
              className="font-sans text-sm"
              placeholder="Enter message text..."
            />
          </div>

          {/* Preview Card */}
          <div className="p-3 bg-slate-100 dark:bg-slate-900 border rounded-lg">
            <div className="text-[11px] font-semibold text-slate-500 uppercase mb-1.5 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span><T>Preview</T> ({eligibleLeads[0]?.shopName || "Example Jewellers"})</span>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-md text-xs border border-emerald-200 dark:border-emerald-800 text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans">
              {templateText
                .replace(/\{\{shopName\}\}/g, eligibleLeads[0]?.shopName || "Example Jewellers")
                .replace(/\{\{city\}\}/g, eligibleLeads[0]?.city || "Kathmandu")}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            <T>Cancel</T>
          </Button>
          <Button
            type="button"
            onClick={handleSend}
            disabled={sending || eligibleLeads.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                <T>Dispatching WhatsApps...</T>
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-1.5" />
                <T>Send WhatsApp Campaign</T> ({eligibleLeads.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
