"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { useShopCurrency } from "@/hooks/useShopCurrency";
import { useT } from "@/providers/translation-provider";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Phone,
  Plus,
  Search,
  Settings,
  Trash2,
  Wrench,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface RepairJob {
  id: string;
  ticketNumber: string;
  customerName: string;
  customerPhone: string;
  itemDescription: string;
  repairType: string;
  estimatedCost: string;
  actualCost: string;
  status: "RECEIVED" | "IN_PROGRESS" | "READY" | "DELIVERED" | "CANCELLED";
  receivedDate: string;
  expectedDate: string;
  completedDate: string;
  notes: string;
}

const REPAIR_TYPES = [
  "Ring Resizing",
  "Chain Repair",
  "Stone Setting",
  "Polish & Rhodium",
  "Clasp/Lock Repair",
  "Prong Retipping",
  "Soldering",
  "Engraving",
  "Cleaning",
  "Custom Modification",
  "Other",
];

const STATUS_CONFIG = {
  RECEIVED: {
    label: "Received",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    icon: Clock,
  },
  IN_PROGRESS: {
    label: "In Progress",
    color:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    icon: Settings,
  },
  READY: {
    label: "Ready",
    color:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    icon: CheckCircle,
  },
  DELIVERED: {
    label: "Delivered",
    color: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
    icon: CheckCircle,
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    icon: Trash2,
  },
};

const STORAGE_KEY = "goldshop_repair_jobs";

function loadJobs(): RepairJob[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}
function saveJobs(jobs: RepairJob[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
}

function generateTicket() {
  const d = new Date();
  const num = Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, "0");
  return `RPR-${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, "0")}${d.getDate().toString().padStart(2, "0")}-${num}`;
}

export default function RepairTrackingPage() {
  const t = useT();
  const router = useRouter();
  const { symbol: currencySymbol } = useShopCurrency();
  const [jobs, setJobs] = useState<RepairJob[]>(loadJobs);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [showForm, setShowForm] = useState(false);

  // Form
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [repairType, setRepairType] = useState(REPAIR_TYPES[0]);
  const [estimatedCost, setEstimatedCost] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");

  const addJob = () => {
    if (!customerName || !itemDescription) {
      toast({
        variant: "destructive",
        title: t("Customer name and item description are required"),
      });
      return;
    }
    const job: RepairJob = {
      id: Date.now().toString(),
      ticketNumber: generateTicket(),
      customerName,
      customerPhone,
      itemDescription,
      repairType,
      estimatedCost,
      actualCost: "",
      status: "RECEIVED",
      receivedDate: new Date().toISOString(),
      expectedDate: expectedDate || "",
      completedDate: "",
      notes,
    };
    const updated = [job, ...jobs];
    setJobs(updated);
    saveJobs(updated);
    setShowForm(false);
    resetForm();
    toast({
      title: `${t("Repair ticket")} ${job.ticketNumber} ${t("created")}`,
    });
  };

  const resetForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setItemDescription("");
    setRepairType(REPAIR_TYPES[0]);
    setEstimatedCost("");
    setExpectedDate("");
    setNotes("");
  };

  const updateStatus = (id: string, newStatus: RepairJob["status"]) => {
    const updated = jobs.map((j) => {
      if (j.id === id) {
        return {
          ...j,
          status: newStatus,
          completedDate:
            newStatus === "READY" || newStatus === "DELIVERED"
              ? new Date().toISOString()
              : j.completedDate,
        };
      }
      return j;
    });
    setJobs(updated);
    saveJobs(updated);
    toast({
      title: `${t("Status updated to")} ${t(STATUS_CONFIG[newStatus].label)}`,
    });
  };

  const deleteJob = (id: string) => {
    const updated = jobs.filter((j) => j.id !== id);
    setJobs(updated);
    saveJobs(updated);
  };

  const filtered = jobs.filter((j) => {
    const matchesSearch =
      j.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
      j.customerName.toLowerCase().includes(search.toLowerCase()) ||
      j.customerPhone.includes(search) ||
      j.itemDescription.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "ALL" || j.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const activeCount = jobs.filter(
    (j) => j.status === "RECEIVED" || j.status === "IN_PROGRESS",
  ).length;
  const readyCount = jobs.filter((j) => j.status === "READY").length;

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6 max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/dashboard/shop/tools")}
              >
                <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Wrench className="h-6 w-6 text-amber-500" />
                  <T>Repair Tracking</T>
                </h1>
                <p className="text-muted-foreground">
                  <T>Manage jewellery repair and alteration jobs</T>
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-amber-500 hover:bg-amber-600"
            >
              <Plus className="h-4 w-4 me-2" /> <T>New Repair Job</T>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{jobs.length}</p>
                <p className="text-xs text-muted-foreground">
                  <T>Total Jobs</T>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {activeCount}
                </p>
                <p className="text-xs text-muted-foreground">
                  <T>Active</T>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {readyCount}
                </p>
                <p className="text-xs text-muted-foreground">
                  <T>Ready for Pickup</T>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                  {jobs.filter((j) => j.status === "DELIVERED").length}
                </p>
                <p className="text-xs text-muted-foreground">
                  <T>Delivered</T>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* New Job Form */}
          {showForm && (
            <Card className="border-amber-200 dark:border-amber-800/50">
              <CardHeader>
                <CardTitle className="text-base">
                  <T>New Repair Job</T>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>
                      <T>Customer Name *</T>
                    </Label>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder={t("Name")}
                      dir="auto"
                    />
                  </div>
                  <div>
                    <Label>
                      <T>Phone</T>
                    </Label>
                    <Input
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder={t("Phone")}
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <Label>
                      <T>Item Description *</T>
                    </Label>
                    <Input
                      value={itemDescription}
                      onChange={(e) => setItemDescription(e.target.value)}
                      placeholder={t("e.g. Gold ring with diamond")}
                      dir="auto"
                    />
                  </div>
                  <div>
                    <Label>
                      <T>Repair Type</T>
                    </Label>
                    <select
                      value={repairType}
                      onChange={(e) => setRepairType(e.target.value)}
                      className="w-full h-10 px-3 border rounded-md bg-background"
                    >
                      {REPAIR_TYPES.map((t) => (
                        <option key={t} value={t}>
                          <T>{t}</T>
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>
                      <T>Estimated Cost</T> (<bdi>{currencySymbol}</bdi>)
                    </Label>
                    <Input
                      type="number"
                      value={estimatedCost}
                      onChange={(e) => setEstimatedCost(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>
                      <T>Expected Completion</T>
                    </Label>
                    <Input
                      type="date"
                      value={expectedDate}
                      onChange={(e) => setExpectedDate(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label>
                    <T>Notes</T>
                  </Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t("Special instructions...")}
                    dir="auto"
                    rows={2}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                  >
                    <T>Cancel</T>
                  </Button>
                  <Button
                    onClick={addJob}
                    className="bg-amber-500 hover:bg-amber-600"
                  >
                    <T>Create Ticket</T>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search & Filter */}
          <div className="flex gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Search ticket, customer, item...")}
                className="ps-10"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-10 px-3 border rounded-md bg-background text-sm"
            >
              <option value="ALL">
                <T>All Status</T>
              </option>
              {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                <option key={key} value={key}>
                  <T>{val.label}</T>
                </option>
              ))}
            </select>
          </div>

          {/* Jobs List */}
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12 text-center">
                <Wrench className="h-12 w-12 text-muted-foreground opacity-30 mb-4" />
                <p className="text-muted-foreground">
                  <T>No repair jobs found</T>
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((job) => {
                const cfg = STATUS_CONFIG[job.status];
                return (
                  <Card
                    key={job.id}
                    className="hover:shadow-sm transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-mono font-bold">
                              {job.ticketNumber}
                            </span>
                            <Badge className={cfg.color}>
                              <T>{cfg.label}</T>
                            </Badge>
                            <Badge variant="outline">
                              <T>{job.repairType}</T>
                            </Badge>
                          </div>
                          <p className="font-medium" dir="auto">
                            {job.itemDescription}
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span dir="auto">{job.customerName}</span>
                            {job.customerPhone && (
                              <span
                                className="flex items-center gap-1"
                                dir="ltr"
                              >
                                <Phone className="h-3 w-3" />{" "}
                                {job.customerPhone}
                              </span>
                            )}
                            {job.estimatedCost && (
                              <span>
                                <T>Est</T>:{" "}
                                <bdi>
                                  {currencySymbol}{" "}
                                  {parseInt(job.estimatedCost).toLocaleString()}
                                </bdi>
                              </span>
                            )}
                          </div>
                          {job.notes && (
                            <p
                              className="text-xs text-muted-foreground mt-1 italic"
                              dir="auto"
                            >
                              {job.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Status progression buttons */}
                          {job.status === "RECEIVED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateStatus(job.id, "IN_PROGRESS")
                              }
                            >
                              <T>Start Work</T>
                            </Button>
                          )}
                          {job.status === "IN_PROGRESS" && (
                            <Button
                              size="sm"
                              className="bg-green-500 hover:bg-green-600"
                              onClick={() => updateStatus(job.id, "READY")}
                            >
                              <T>Mark Ready</T>
                            </Button>
                          )}
                          {job.status === "READY" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus(job.id, "DELIVERED")}
                            >
                              <T>Delivered</T>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteJob(job.id)}
                            aria-label={t("Delete repair job")}
                          >
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>
                          <T>Received</T>:{" "}
                          <bdi>
                            {new Date(job.receivedDate).toLocaleDateString()}
                          </bdi>
                        </span>
                        {job.expectedDate && (
                          <span>
                            <T>Expected</T>:{" "}
                            <bdi>
                              {new Date(job.expectedDate).toLocaleDateString()}
                            </bdi>
                          </span>
                        )}
                        {job.completedDate && (
                          <span>
                            <T>Completed</T>:{" "}
                            <bdi>
                              {new Date(job.completedDate).toLocaleDateString()}
                            </bdi>
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
