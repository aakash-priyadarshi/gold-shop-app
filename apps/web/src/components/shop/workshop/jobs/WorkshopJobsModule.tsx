"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { T } from "@/components/ui/T";
import { useT } from "@/providers/translation-provider";
import { workshopApi, type WorkshopJob } from "@/lib/workshop-api";
import { supplyChainHref } from "@/lib/workshop-route";
import Link from "next/link";
import {
  Boxes,
  CheckCircle2,
  Clock,
  Coins,
  Cpu,
  Eye,
  GitBranch,
  Hammer,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { WorkshopJobDetailView } from "./WorkshopJobDetailView";
import { WorkshopPageHeader } from "../shared/WorkshopPageHeader";
import { WorkshopCreateJobDialog } from "./WorkshopCreateJobDialog";

export function WorkshopJobsModule({ initialJobId }: { initialJobId?: string | null }) {
  const t = useT();
  const [jobs, setJobs] = useState<WorkshopJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(initialJobId || null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await workshopApi.jobs();
      setJobs(res.data || []);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    const handleJobUpdated = () => {
      loadJobs();
    };
    window.addEventListener("workshop-jobs-updated", handleJobUpdated);
    return () => {
      window.removeEventListener("workshop-jobs-updated", handleJobUpdated);
    };
  }, [loadJobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesSearch =
        !search.trim() ||
        job.product.toLowerCase().includes(search.toLowerCase()) ||
        job.artisan.toLowerCase().includes(search.toLowerCase()) ||
        job.id.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "OPEN" && !["Completed", "CANCELLED", "REJECTED"].includes(job.status)) ||
        job.status.toUpperCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [jobs, search, statusFilter]);

  if (selectedJobId) {
    return (
      <WorkshopJobDetailView
        jobId={selectedJobId}
        onBack={() => setSelectedJobId(null)}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <WorkshopPageHeader
        heading="Jobs"
        description="Create and manage manufacturing work orders."
        badge={jobs.length}
        icon={Hammer}
        dataTour="workshop-jobs-header"
        primaryAction={
          <Button
            size="sm"
            data-tour="workshop-jobs-create"
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            <T>Create Job</T>
          </Button>
        }
        secondaryActions={
          <Button variant="outline" size="sm" onClick={loadJobs} className="text-xs h-8">
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            <T>Refresh</T>
          </Button>
        }
      />

      {/* Top Filter & Search Bar */}
      <div
        data-tour="workshop-jobs-filters"
        className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("Search by product, artisan, or job ID…")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex rounded-lg border bg-muted/40 p-1 text-xs">
            {["ALL", "OPEN", "QC", "Completed"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === st
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <T>{st === "ALL" ? "All Jobs" : st === "OPEN" ? "Active" : st}</T>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Jobs Table */}
      <Card data-tour="workshop-jobs-list" className="border-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
              <T>Loading manufacturing work orders…</T>
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground space-y-3">
              <div className="h-10 w-10 mx-auto rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
                <Hammer className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground text-sm">
                  <T>No manufacturing jobs yet.</T>
                </p>
                <p className="max-w-md mx-auto">
                  <T>Create your first job to start a traceable production workflow.</T>
                </p>
              </div>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                <T>Create Job</T>
              </Button>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
              <p><T>No manufacturing jobs match the current filter.</T></p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground uppercase font-medium border-b text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4"><T>Job / Product</T></th>
                    <th className="py-3 px-3"><T>Artisan</T></th>
                    <th className="py-3 px-3"><T>Metal Purity</T></th>
                    <th className="py-3 px-3"><T>Quantity</T></th>
                    <th className="py-3 px-3"><T>Process Runs</T></th>
                    <th className="py-3 px-3"><T>Status</T></th>
                    <th className="py-3 px-4 text-right"><T>Action</T></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono">
                  {filteredJobs.map((job) => {
                    const openRuns = (job.workshopProcessRuns || []).filter((r) => r.status === "OPEN");
                    const isDone = job.status === "Completed";
                    const isQc = job.status === "QC";

                    return (
                      <tr
                        key={job.id}
                        className="hover:bg-muted/30 transition-colors group cursor-pointer"
                        onClick={() => setSelectedJobId(job.id)}
                      >
                        <td className="py-3 px-4 font-sans font-semibold text-foreground">
                          <div>{job.product}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            #{job.id.slice(0, 8)}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-sans text-muted-foreground">{job.artisan}</td>
                        <td className="py-3 px-3 text-foreground">{job.metalKey || "goldGrains995"}</td>
                        <td className="py-3 px-3 text-foreground font-semibold">{job.qty}</td>
                        <td className="py-3 px-3">
                          {openRuns.length > 0 ? (
                            <Badge variant="outline" className="border-amber-300 text-amber-700 dark:text-amber-300 text-[10px]">
                              {openRuns.length} <T>active run</T>
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <Badge
                            variant={isDone ? "default" : isQc ? "secondary" : "outline"}
                            className="text-[10px] capitalize font-mono"
                          >
                            <T>{job.status}</T>
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-amber-600 hover:text-amber-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedJobId(job.id);
                            }}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            <T>View Details</T>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Job Dialog */}
      <WorkshopCreateJobDialog
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onJobCreated={(newJob) => {
          if (newJob?.id) {
            setSelectedJobId(newJob.id);
          }
        }}
      />
    </div>
  );
}
