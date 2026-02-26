# Grafana Cloud + Prometheus Setup Guide

## Overview

Your NestJS API now exposes a `/api/metrics` endpoint in Prometheus text format. This guide explains how to connect it to Grafana Cloud for historical dashboards, alerting, and visualization.

## Architecture

```
┌──────────────┐        ┌───────────────┐        ┌───────────────┐
│  NestJS API  │──────▶ │  Grafana      │──────▶ │  Grafana      │
│  /api/metrics│  scrape│  Alloy Agent  │  push  │  Cloud        │
│  (Railway)   │        │  (or Prom)    │        │  (Dashboards) │
└──────────────┘        └───────────────┘        └───────────────┘
       │
       ▼
┌──────────────┐
│  Admin Page  │ ─── GET /api/metrics/summary ─── Real-time cards
│  /dashboard/ │
│  admin/perf  │
└──────────────┘
```

## Option A: Grafana Cloud Free Tier (Recommended)

Grafana Cloud includes a free Prometheus remote-write endpoint. Use the **Grafana Alloy** agent to scrape your Railway API and push metrics.

### Step 1: Get your Grafana Cloud credentials

1. Log in to [grafana.com](https://grafana.com)
2. Go to **My Account** → **Grafana Cloud** stack
3. Click **Prometheus** (or Mimir) → **Details**
4. Note down:
   - **Remote Write Endpoint**: `https://prometheus-prod-XX-prod-XX.grafana.net/api/prom/push`
   - **Username** (numeric ID)
   - **Password** (API key — generate one under API Keys with `MetricsPublisher` role)

### Step 2: Install Grafana Alloy on Railway (Sidecar) or locally

For development/testing, run Alloy locally. For production, deploy as a separate Railway service.

#### Local setup (Windows):

```powershell
# Download Alloy
winget install Grafana.GrafanaAlloy

# Or via Docker
docker run -d --name alloy \
  -v ./alloy-config.river:/etc/alloy/config.river \
  grafana/alloy:latest \
  run /etc/alloy/config.river
```

#### Create `alloy-config.river`:

```hcl
prometheus.scrape "orivraa_api" {
  targets = [{
    __address__ = "your-api.railway.app",
    __scheme__  = "https",
    __metrics_path__ = "/api/metrics",
  }]
  scrape_interval = "30s"
  forward_to      = [prometheus.remote_write.grafana_cloud.receiver]
}

prometheus.remote_write "grafana_cloud" {
  endpoint {
    url = "https://prometheus-prod-XX-prod-XX.grafana.net/api/prom/push"
    basic_auth {
      username = "YOUR_NUMERIC_ID"
      password = "YOUR_API_KEY"
    }
  }
}
```

### Step 3: Import Dashboards in Grafana

1. In Grafana Cloud → **Dashboards** → **Import**
2. Use these dashboard IDs:
   - **`11159`** — Node.js Application Dashboard (heap, event loop, GC)
   - **`14830`** — NestJS Metrics Dashboard
   - **`18795`** — HTTP Request Dashboard
3. Select your Prometheus data source

### Step 4: Create Alerts

Go to **Alerting** → **Alert rules** → **New alert rule**:

| Alert | Expression | Threshold |
|---|---|---|
| High Error Rate | `rate(orivraa_http_requests_total{status_code=~"5.."}[5m]) / rate(orivraa_http_requests_total[5m])` | > 0.05 (5%) |
| Slow Responses | `histogram_quantile(0.95, rate(orivraa_http_request_duration_seconds_bucket[5m]))` | > 2 (2s) |
| High Memory | `orivraa_process_resident_memory_bytes` | > 400MB |
| High CPU | `rate(orivraa_process_cpu_seconds_total[5m])` | > 0.8 (80%) |

---

## Option B: Self-Hosted Prometheus (Alternative)

If you prefer running Prometheus yourself:

### `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'orivraa-api'
    scheme: https
    metrics_path: /api/metrics
    static_configs:
      - targets: ['your-api.railway.app']
    scrape_interval: 30s
```

Run with Docker:
```bash
docker run -d -p 9090:9090 \
  -v ./prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

Then add Prometheus as a data source in Grafana Cloud:
- **URL**: `http://localhost:9090` (or your hosted Prometheus URL)

---

## Available Metrics

### HTTP Metrics
| Metric | Type | Description |
|---|---|---|
| `orivraa_http_requests_total` | Counter | Total HTTP requests (method, route, status_code) |
| `orivraa_http_request_duration_seconds` | Histogram | Request latency in seconds |
| `orivraa_http_requests_in_flight` | Gauge | Currently processing requests |

### Business Metrics
| Metric | Type | Description |
|---|---|---|
| `orivraa_rfq_created_total` | Counter | Total RFQs created (by country) |
| `orivraa_orders_created_total` | Counter | Total orders created (by payment method) |
| `orivraa_offers_received_total` | Counter | Total offers from sellers |
| `orivraa_active_users` | Gauge | Active users by role |

### Infrastructure Metrics
| Metric | Type | Description |
|---|---|---|
| `orivraa_db_query_duration_seconds` | Histogram | Database query latency |
| `orivraa_cache_hit_total` | Counter | Cache hits |
| `orivraa_cache_miss_total` | Counter | Cache misses |
| `orivraa_websocket_connections` | Gauge | Active WebSocket connections |

### Node.js Default Metrics (auto-collected)
| Metric | Type | Description |
|---|---|---|
| `orivraa_process_cpu_seconds_total` | Counter | CPU usage |
| `orivraa_process_resident_memory_bytes` | Gauge | Memory (RSS) |
| `orivraa_nodejs_heap_size_total_bytes` | Gauge | V8 heap total |
| `orivraa_nodejs_heap_size_used_bytes` | Gauge | V8 heap used |
| `orivraa_nodejs_eventloop_lag_seconds` | Gauge | Event loop lag |
| `orivraa_nodejs_active_handles_total` | Gauge | Active handles |
| `orivraa_nodejs_gc_duration_seconds` | Histogram | GC pause durations |

---

## k6 Load Testing + Grafana

To send k6 results directly to Grafana Cloud:

```powershell
# Set cloud token
$env:K6_CLOUD_TOKEN = "your-grafana-cloud-k6-token"

# Run and stream to Grafana Cloud
k6 cloud k6/load.js

# Or run locally and output to Prometheus
# (requires Prometheus remote write or pushgateway)
k6 run --out experimental-prometheus-rw k6/load.js
```

Get your k6 cloud token from: Grafana Cloud → k6 → Settings → API Token

---

## Admin Dashboard

Your admin performance page is at: `/dashboard/admin/performance`

It shows real-time metrics from the `/api/metrics/summary` endpoint with:
- System status (healthy/degraded/unhealthy)
- Request count, error rate, avg latency, p95/p99
- Memory and CPU usage
- WebSocket connections
- Business metrics (RFQs, orders)
- Auto-refresh every 10 seconds
