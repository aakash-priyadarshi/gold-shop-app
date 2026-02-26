# k6 Load Testing for Orivraa

## Prerequisites

Install k6: https://k6.io/docs/get-started/installation/

```powershell
# Windows (winget)
winget install k6 --source winget

# Or via Chocolatey
choco install k6
```

## Running Tests

```powershell
# Smoke test (1 user, 30s) — verify nothing breaks
k6 run k6/smoke.js

# Load test (ramp to 100 users over 5 minutes)
k6 run k6/load.js

# Stress test (ramp to 500 users)
k6 run k6/stress.js

# Full user journey
k6 run k6/user-journey.js

# Output results to JSON for Grafana import
k6 run --out json=results.json k6/load.js

# Send results to Grafana Cloud k6
# (requires K6_CLOUD_TOKEN env variable)
k6 cloud k6/load.js
```

## Environment Variables

Set these before running:

```powershell
$env:API_BASE_URL = "https://your-api.railway.app/api"
$env:WEB_BASE_URL = "https://orivraa.com"
$env:TEST_USER_EMAIL = "test@example.com"
$env:TEST_USER_PASSWORD = "testpassword"
```

## Test Descriptions

| Script | Purpose | VUs | Duration |
|---|---|---|---|
| smoke.js | Sanity check | 1-3 | 30s |
| load.js | Normal traffic | 10→100→10 | 5min |
| stress.js | Peak/overload | 10→500→0 | 10min |
| user-journey.js | Real user flows | 20→200→20 | 8min |
