"use client";

import { AdminGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { AlertCircle, FileText, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface Report {
  id: string;
  type: string;
  status: "OPEN" | "RESOLVED" | "CLOSED";
  description: string;
  createdAt: string;
  reporter: {
    id: string;
    name: string;
    email: string;
  };
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/admin/reports");
      let arr = response.data.reports || response.data || [];
      if (!Array.isArray(arr)) arr = [];
      setReports(arr);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to load reports",
        description: "Could not fetch reports",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">User Reports</h1>
          <Card>
            <CardHeader>
              <CardTitle>Recent Reports</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No reports found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reporter</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.type}</TableCell>
                        <TableCell>{r.description}</TableCell>
                        <TableCell>
                          {r.status === "OPEN" ? (
                            <span className="text-amber-700 dark:text-amber-300 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" /> Open
                            </span>
                          ) : r.status === "RESOLVED" ? (
                            <span className="text-green-700 dark:text-green-300">
                              Resolved
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              Closed
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span>
                            {r.reporter.name} ({r.reporter.email})
                          </span>
                        </TableCell>
                        <TableCell>
                          {new Date(r.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
