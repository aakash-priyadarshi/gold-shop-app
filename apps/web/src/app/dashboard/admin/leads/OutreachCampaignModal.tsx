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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  LeadItem,
  leadsAdminApi,
  OutreachTemplate,
} from "@/lib/api";
import {
  AlertCircle,
  Calendar,
  Loader2,
  Mail,
  Send,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLeads: LeadItem[];
  onSuccess: () => void;
}

export function OutreachCampaignModal({
  open,
  onOpenChange,
  selectedLeads,
  onSuccess,
}: Props) {
  const [templates, setTemplates] = useState<OutreachTemplate[]>([]);
  const [festivals, setFestivals] = useState<Array<{ name: string; date: string }>>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");

  const [campaignKey, setCampaignKey] = useState<string>("cold-outreach-" + new Date().toISOString().slice(0, 10));
  const [festivalName, setFestivalName] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [bodyTemplate, setBodyTemplate] = useState<string>("");
  const [trialDays, setTrialDays] = useState<number>(60);

  const [activeTab, setActiveTab] = useState<"compose" | "preview">("compose");
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewSubject, setPreviewSubject] = useState<string>("");
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);

  const primaryCountry = useMemo(() => {
    if (selectedLeads.length === 0) return "NP";
    const counts: Record<string, number> = {};
    for (const l of selectedLeads) {
      counts[l.country] = (counts[l.country] || 0) + 1;
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || "NP";
  }, [selectedLeads]);

  const eligibleLeads = useMemo(
    () => selectedLeads.filter((l) => l.email && l.email.includes("@")),
    [selectedLeads],
  );
  const leadsWithoutEmail = selectedLeads.length - eligibleLeads.length;

  useEffect(() => {
    if (!open) return;

    leadsAdminApi.getPresets().then((res) => {
      const list = res.data?.templates || [];
      setTemplates(list);
      const matched = list.find((t) => t.country === primaryCountry) || list[0];
      if (matched) {
        setSelectedPresetId(matched.id);
        setSubject(matched.subject);
        setBodyTemplate(matched.body);
        if (matched.festivalHint) {
          setFestivalName(matched.festivalHint);
        }
      }
    }).catch(() => {});

    leadsAdminApi.getFestivals(primaryCountry).then((res) => {
      setFestivals(res.data?.festivals || []);
    }).catch(() => {});
  }, [open, primaryCountry]);

  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    const tmpl = templates.find((t) => t.id === presetId);
    if (tmpl) {
      setSubject(tmpl.subject);
      setBodyTemplate(tmpl.body);
      if (tmpl.festivalHint) {
        setFestivalName(tmpl.festivalHint);
      }
    }
  };

  const handleLoadPreview = async () => {
    if (!subject || !bodyTemplate) return;
    setLoadingPreview(true);
    try {
      const sample = eligibleLeads[0];
      const res = await leadsAdminApi.previewOutreach({
        leadId: sample?.id,
        subject,
        bodyTemplate,
        festivalName,
        offerTrialDays: trialDays,
      });
      setPreviewSubject(res.data?.subject || subject);
      setPreviewHtml(res.data?.fullHtml || "");
    } catch (err: any) {
      toast({
        title: "Could not generate preview",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSend = async () => {
    if (eligibleLeads.length === 0) {
      toast({
        title: "No valid recipients",
        description: "None of the selected leads have a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const res = await leadsAdminApi.sendOutreach({
        leadIds: eligibleLeads.map((l) => l.id),
        campaignKey: campaignKey.trim(),
        subject,
        bodyTemplate,
        festivalName: festivalName.trim(),
        offerTrialDays: trialDays,
      });

      toast({
        title: "Campaign dispatched!",
        description: `Successfully sent to ${res.data?.sent} leads (${res.data?.skipped} skipped, ${res.data?.failed} failed).`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Campaign failed",
        description: err?.response?.data?.message || err?.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">
                Cold Outreach Campaign (60 Days Free Trial)
              </DialogTitle>
              <DialogDescription>
                Send regional, festival-tailored invitations via Resend with 1-click onboarding.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-lg flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-slate-500" />
            <span>
              <strong>{eligibleLeads.length}</strong> eligible recipients with email
            </span>
            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
              Market: {primaryCountry}
            </Badge>
          </div>
          {leadsWithoutEmail > 0 && (
            <div className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{leadsWithoutEmail} lead(s) without email will be skipped</span>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="compose">1. Compose &amp; Festival</TabsTrigger>
            <TabsTrigger
              value="preview"
              onClick={() => handleLoadPreview()}
            >
              2. Live Email Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="space-y-4 pt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">
                  Outreach Template Preset
                </Label>
                <Select value={selectedPresetId} onValueChange={handlePresetChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choose a preset..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">
                  Upcoming Festival (Hook)
                </Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={festivalName}
                    onChange={(e) => setFestivalName(e.target.value)}
                    placeholder="e.g. Dashain & Tihar, Dhanteras"
                  />
                  {festivals.length > 0 && (
                    <Select onValueChange={(val) => setFestivalName(val)}>
                      <SelectTrigger className="w-[140px]">
                        <Calendar className="h-3.5 w-3.5 mr-1" />
                        <span className="text-xs truncate">Calendar</span>
                      </SelectTrigger>
                      <SelectContent>
                        {festivals.map((f) => (
                          <SelectItem key={f.name} value={f.name}>
                            {f.name} ({f.date.slice(5)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Campaign Identifier
                </Label>
                <Input
                  className="mt-1"
                  value={campaignKey}
                  onChange={(e) => setCampaignKey(e.target.value)}
                  placeholder="e.g. dashain-2026-batch-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Free Trial Incentive
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number"
                    min={14}
                    max={90}
                    value={trialDays}
                    onChange={(e) => setTrialDays(parseInt(e.target.value, 10) || 60)}
                    className="w-24"
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    Days PRO access (No credit card needed)
                  </span>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Email Subject Line
              </Label>
              <Input
                className="mt-1 font-medium"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject with {{shopName}}..."
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Available tags: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{"{{shopName}}"}</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{"{{city}}"}</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{"{{festivalName}}"}</code>
              </p>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Email Pitch (HTML allowed)
              </Label>
              <Textarea
                rows={9}
                className="mt-1 font-mono text-xs leading-relaxed"
                value={bodyTemplate}
                onChange={(e) => setBodyTemplate(e.target.value)}
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Tags will be replaced per recipient: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{"{{shopName}}"}</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{"{{city}}"}</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{"{{festivalName}}"}</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{"{{trialDays}}"}</code>
              </p>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="pt-2">
            {loadingPreview ? (
              <div className="py-16 flex flex-col items-center justify-center text-slate-500">
                <Loader2 className="h-6 w-6 animate-spin mb-2" />
                <span>Rendering preview with sample lead...</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-slate-100 dark:bg-slate-900 border rounded-lg">
                  <div className="text-xs text-slate-500 uppercase">Subject:</div>
                  <div className="text-sm font-semibold">{previewSubject || subject}</div>
                </div>

                <div className="border rounded-lg overflow-hidden bg-white shadow-inner">
                  <iframe
                    title="Email Preview"
                    srcDoc={previewHtml}
                    className="w-full h-[400px] border-0"
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>

          <Button
            onClick={handleSend}
            disabled={sending || eligibleLeads.length === 0 || !subject.trim()}
            className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white gap-1.5"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending via Resend...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Outreach to {eligibleLeads.length} Lead(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
