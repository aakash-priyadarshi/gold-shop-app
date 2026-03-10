"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Award, ShieldCheck, ShieldX, QrCode } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { certificateApi } from "@/lib/api";
import { toast } from "sonner";

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showIssue, setShowIssue] = useState(false);
  const [form, setForm] = useState({ templateId: "", employeeId: "", title: "", data: "{}" });

  const load = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (search) params.search = search;
    Promise.all([certificateApi.list(params), certificateApi.listTemplates()])
      .then(([certRes, tplRes]) => {
        setCertificates(Array.isArray(certRes.data) ? certRes.data : certRes.data?.data ?? []);
        setTemplates(Array.isArray(tplRes.data) ? tplRes.data : tplRes.data?.data ?? []);
      })
      .catch(() => toast.error("Failed to load certificates"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search]);

  const handleIssue = async () => {
    try {
      let parsedData = {};
      try { parsedData = JSON.parse(form.data); } catch {}
      await certificateApi.issue({ ...form, data: parsedData });
      toast.success("Certificate issued");
      setShowIssue(false);
      setForm({ templateId: "", employeeId: "", title: "", data: "{}" });
      load();
    } catch { toast.error("Failed to issue certificate"); }
  };

  const handleRevoke = async (id: string) => {
    const reason = prompt("Reason for revocation:");
    if (!reason) return;
    try {
      await certificateApi.revoke(id, reason);
      toast.success("Certificate revoked");
      load();
    } catch { toast.error("Failed to revoke certificate"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Certificates</h1>
          <p className="text-muted-foreground">Issue and manage certificates with QR verification</p>
        </div>
        <Dialog open={showIssue} onOpenChange={setShowIssue}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Issue Certificate</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Issue Certificate</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <Label>Template</Label>
                <Select value={form.templateId} onValueChange={(v) => setForm({ ...form, templateId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                  <SelectContent>
                    {templates.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Employee ID</Label><Input value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} /></div>
              <Button onClick={handleIssue}>Issue Certificate</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="certificates">
        <TabsList>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="verify">Verify</TabsTrigger>
        </TabsList>

        <TabsContent value="certificates" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search certificates..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => <Card key={i}><CardContent className="p-6"><div className="h-24 animate-pulse rounded bg-muted" /></CardContent></Card>)}
            </div>
          ) : certificates.length === 0 ? (
            <Card><CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <Award className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No certificates issued</h3>
              <p className="text-muted-foreground mt-1">Issue your first certificate to get started.</p>
            </CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {certificates.map((cert: any) => (
                <Card key={cert.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-gold-500" />
                        <div>
                          <p className="font-semibold text-sm">{cert.title ?? cert.certificateNo}</p>
                          <p className="text-xs text-muted-foreground">{cert.certificateNo}</p>
                        </div>
                      </div>
                      <Badge variant={cert.status === "ACTIVE" ? "success" : cert.status === "REVOKED" ? "destructive" : "secondary"}>
                        {cert.status}
                      </Badge>
                    </div>
                    {cert.template && <p className="text-xs text-muted-foreground mt-2">Template: {cert.template.name}</p>}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-muted-foreground">
                        Issued: {new Date(cert.issuedAt ?? cert.createdAt).toLocaleDateString()}
                      </span>
                      <div className="flex gap-1">
                        {cert.qrToken && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            <QrCode className="h-3 w-3 mr-1" />QR
                          </Button>
                        )}
                        {cert.status === "ACTIVE" && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => handleRevoke(cert.id)}>
                            <ShieldX className="h-3 w-3 mr-1" />Revoke
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          {templates.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No templates created</CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((tpl: any) => (
                <Card key={tpl.id}>
                  <CardContent className="p-4">
                    <p className="font-semibold">{tpl.name}</p>
                    {tpl.description && <p className="text-sm text-muted-foreground mt-1">{tpl.description}</p>}
                    <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                      <span>Category: {tpl.category ?? "General"}</span>
                      <Badge variant={tpl.isActive !== false ? "success" : "secondary"}>
                        {tpl.isActive !== false ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="verify">
          <VerifyTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function VerifyTab() {
  const [token, setToken] = useState("");
  const [result, setResult] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  const verify = async () => {
    if (!token.trim()) return;
    setChecking(true);
    try {
      const res = await certificateApi.verify(token.trim());
      setResult(res.data);
    } catch {
      setResult({ valid: false, error: "Certificate not found or invalid" });
    } finally {
      setChecking(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Verify Certificate</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input placeholder="Enter QR token or certificate number..." value={token} onChange={(e) => setToken(e.target.value)} />
          <Button onClick={verify} disabled={checking}>{checking ? "Checking..." : "Verify"}</Button>
        </div>
        {result && (
          <div className={`p-4 rounded-lg border ${result.valid !== false ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950" : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"}`}>
            <div className="flex items-center gap-2">
              {result.valid !== false ? (
                <><ShieldCheck className="h-5 w-5 text-emerald-500" /><span className="font-semibold text-emerald-700 dark:text-emerald-300">Valid Certificate</span></>
              ) : (
                <><ShieldX className="h-5 w-5 text-red-500" /><span className="font-semibold text-red-700 dark:text-red-300">Invalid Certificate</span></>
              )}
            </div>
            {result.certificate && (
              <div className="mt-2 text-sm space-y-1">
                <p>Certificate: {result.certificate.certificateNo}</p>
                <p>Title: {result.certificate.title}</p>
                <p>Issued: {new Date(result.certificate.issuedAt ?? result.certificate.createdAt).toLocaleDateString()}</p>
              </div>
            )}
            {result.error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{result.error}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
