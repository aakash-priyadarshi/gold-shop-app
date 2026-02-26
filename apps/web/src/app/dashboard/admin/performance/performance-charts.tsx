"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { HistoryPoint } from "./page";

interface Props {
  data: HistoryPoint[];
}

export default function PerformanceCharts({ data }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Request Rate & Errors */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Request Rate</CardTitle>
          <CardDescription className="text-xs">
            Total requests &amp; errors per snapshot (5-min intervals)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="errGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                labelStyle={{ fontWeight: 600 }}
              />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Area
                type="monotone"
                dataKey="requests"
                name="Requests"
                stroke="#3b82f6"
                fill="url(#reqGrad)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="errors"
                name="Errors"
                stroke="#ef4444"
                fill="url(#errGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Latency */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Latency (ms)</CardTitle>
          <CardDescription className="text-xs">
            Average, p95, and p99 response time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 10 }} unit="ms" />
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                labelStyle={{ fontWeight: 600 }}
                formatter={(value: number | undefined) =>
                  value != null ? `${value.toFixed(1)}ms` : "-"
                }
              />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="avgLatency"
                name="Avg"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="p95Latency"
                name="p95"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="p99Latency"
                name="p99"
                stroke="#ef4444"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Memory Usage */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Memory Usage (MB)</CardTitle>
          <CardDescription className="text-xs">
            RSS memory consumption over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 10 }} unit="MB" />
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                labelStyle={{ fontWeight: 600 }}
                formatter={(value: number | undefined) =>
                  value != null ? `${value.toFixed(1)} MB` : "-"
                }
              />
              <Area
                type="monotone"
                dataKey="memoryMB"
                name="Memory"
                stroke="#8b5cf6"
                fill="url(#memGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Business Metrics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Business Metrics</CardTitle>
          <CardDescription className="text-xs">
            RFQs created, orders, &amp; WebSocket connections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                labelStyle={{ fontWeight: 600 }}
              />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="rfqsCreated"
                name="RFQs"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="ordersCreated"
                name="Orders"
                stroke="#f97316"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="wsConnections"
                name="WebSockets"
                stroke="#64748b"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
