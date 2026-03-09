"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { useT } from "@/providers/translation-provider";
import {
  ArrowLeft,
  CheckCircle,
  Hash,
  Plus,
  Search,
  Shield,
  Trash2,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface HallmarkEntry {
  id: string;
  huid: string; // HUID - Hallmark Unique Identification
  purity: string;
  weight: string;
  itemDesc: string;
  customerName: string;
  date: string;
  verified: boolean;
}

// This is a local-storage-based tracker for BIS hallmark entries
const STORAGE_KEY = "goldshop_hallmark_entries";

function loadEntries(): HallmarkEntry[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveEntries(entries: HallmarkEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export default function HallmarkTrackerPage() {
  const router = useRouter();
  const t = useT();
  const [entries, setEntries] = useState<HallmarkEntry[]>(loadEntries);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [huid, setHuid] = useState("");
  const [purity, setPurity] = useState("22K");
  const [weight, setWeight] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [customerName, setCustomerName] = useState("");

  const addEntry = () => {
    if (!huid.trim()) {
      toast({ variant: "destructive", title: "HUID is required" });
      return;
    }
    const newEntry: HallmarkEntry = {
      id: Date.now().toString(),
      huid: huid.trim().toUpperCase(),
      purity,
      weight: weight || "N/A",
      itemDesc: itemDesc || "Gold Item",
      customerName: customerName || "Walk-in",
      date: new Date().toISOString(),
      verified: false,
    };

    const updated = [newEntry, ...entries];
    setEntries(updated);
    saveEntries(updated);

    // Reset form
    setHuid("");
    setWeight("");
    setItemDesc("");
    setCustomerName("");
    setShowForm(false);
    toast({ title: "Hallmark entry recorded" });
  };

  const toggleVerified = (id: string) => {
    const updated = entries.map((e) =>
      e.id === id ? { ...e, verified: !e.verified } : e,
    );
    setEntries(updated);
    saveEntries(updated);
  };

  const deleteEntry = (id: string) => {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    saveEntries(updated);
    toast({ title: "Entry deleted" });
  };

  const filtered = entries.filter(
    (e) =>
      e.huid.toLowerCase().includes(search.toLowerCase()) ||
      e.customerName.toLowerCase().includes(search.toLowerCase()) ||
      e.itemDesc.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/dashboard/shop/tools")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Shield className="h-6 w-6 text-amber-500" />
                  <T>Hallmark Tracker</T>
                </h1>
                <p className="text-muted-foreground">
                  <T>Track BIS Hallmark & HUID entries for items sold</T>
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowForm(!showForm)}
              className="bg-amber-500 hover:bg-amber-600"
            >
              <Plus className="h-4 w-4 mr-2" /> <T>Add Entry</T>
            </Button>
          </div>

          {/* Add Entry Form */}
          {showForm && (
            <Card className="border-amber-200 dark:border-amber-800/50">
              <CardHeader>
                <CardTitle className="text-base"><T>New Hallmark Entry</T></CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label><T>HUID (6-digit code)</T> *</Label>
                    <Input
                      value={huid}
                      onChange={(e) => setHuid(e.target.value)}
                      placeholder="e.g. ABC123"
                      maxLength={6}
                      className="font-mono uppercase"
                    />
                  </div>
                  <div>
                    <Label><T>Purity</T></Label>
                    <select
                      value={purity}
                      onChange={(e) => setPurity(e.target.value)}
                      className="w-full h-10 px-3 border rounded-md bg-background"
                    >
                      <option value="24K">24K (999)</option>
                      <option value="22K">22K (916)</option>
                      <option value="18K">18K (750)</option>
                      <option value="14K">14K (585)</option>
                    </select>
                  </div>
                  <div>
                    <Label><T>Weight (grams)</T></Label>
                    <Input
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="e.g. 8.5"
                      type="number"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <Label><T>Item Description</T></Label>
                    <Input
                      value={itemDesc}
                      onChange={(e) => setItemDesc(e.target.value)}
                      placeholder="e.g. Chain Necklace"
                    />
                  </div>
                  <div>
                    <Label><T>Customer Name</T></Label>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Customer name"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowForm(false)}>
                    <T>Cancel</T>
                  </Button>
                  <Button
                    onClick={addEntry}
                    className="bg-amber-500 hover:bg-amber-600"
                  >
                    <T>Save Entry</T>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by HUID, customer, or item..."
              className="pl-10"
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{entries.length}</p>
                <p className="text-sm text-muted-foreground"><T>Total Entries</T></p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {entries.filter((e) => e.verified).length}
                </p>
                <p className="text-sm text-muted-foreground"><T>Verified</T></p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {entries.filter((e) => !e.verified).length}
                </p>
                <p className="text-sm text-muted-foreground"><T>Pending</T></p>
              </CardContent>
            </Card>
          </div>

          {/* Entries List */}
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12 text-center">
                <Hash className="h-12 w-12 text-muted-foreground opacity-30 mb-4" />
                <p className="text-muted-foreground"><T>No hallmark entries</T></p>
                <p className="text-sm text-muted-foreground">
                  <T>Add entries when you sell hallmarked items</T>
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map((entry) => (
                <Card
                  key={entry.id}
                  className="hover:shadow-sm transition-shadow"
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => toggleVerified(entry.id)}
                        className="flex-shrink-0"
                      >
                        {entry.verified ? (
                          <CheckCircle className="h-6 w-6 text-green-500" />
                        ) : (
                          <XCircle className="h-6 w-6 text-yellow-400" />
                        )}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-lg">
                            {entry.huid}
                          </span>
                          <Badge variant="outline">{entry.purity}</Badge>
                          {entry.verified && (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                              Verified
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {entry.itemDesc} — {entry.weight}g —{" "}
                          {entry.customerName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.date).toLocaleDateString()}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteEntry(entry.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
