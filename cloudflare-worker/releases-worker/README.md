# Orivraa Releases Worker

Serves desktop app installers from a Cloudflare R2 bucket (`orivraa-releases`) over `releases.orivraa.com`.

## Setup

### 1. Create the R2 bucket

```bash
npx wrangler r2 bucket create orivraa-releases
```

### 2. Deploy the worker

```bash
cd cloudflare-worker/releases-worker
npm install
npx wrangler deploy --env production
```

### 3. Bind the worker to `releases.orivraa.com`

In the Cloudflare dashboard:

1. Go to **Workers & Pages → orivraa-releases → Settings → Triggers → Custom Domains**
2. Add `releases.orivraa.com` as a custom domain.
3. Cloudflare will automatically provision the DNS record and TLS certificate.

Alternatively, add a route manually:

1. **DNS → Add record**: `releases` → CNAME → `orivraa-releases.<account>.workers.dev` (proxied)
2. **Workers → orivraa-releases → Triggers → Routes**: `releases.orivraa.com/*`

### 4. Create R2 API tokens for CI uploads

GitHub Actions needs credentials to upload installers to R2:

1. Go to **R2 → Manage R2 API Tokens → Create API Token**
2. Permissions: **Object Read & Write** on bucket `orivraa-releases`
3. Save the **Access Key ID** and **Secret Access Key**
4. Add them as GitHub repository secrets:
   - `R2_ACCOUNT_ID` = `c3219a748734c4ae628206c10c8b2c05`
   - `R2_ACCESS_KEY_ID` = (from step 3)
   - `R2_SECRET_ACCESS_KEY` = (from step 3)
   - `R2_BUCKET_NAME` = `orivraa-releases`

## Object Layout

R2 hosts **only the latest version** — older versions are served from GitHub Releases.

```
orivraa-releases/
├── desktop/
│   ├── latest/
│   │   ├── Orivraa_0.2.0_x64-setup.exe       (NSIS installer — latest)
│   │   ├── Orivraa_0.2.0_x64_en-us.msi        (MSI installer — latest)
│   │   ├── Orivraa_0.2.0_universal.dmg        (macOS DMG — latest)
│   │   └── Orivraa_0.2.0_x64-setup.exe.sig    (Tauri signature)
│   ├── latest.json                             (Tauri updater manifest — Windows)
│   └── latest-macos.json                       (Tauri updater manifest — macOS)
```

When a new version is released, CI:

1. Deletes old installers from `desktop/latest/`
2. Uploads the new version's installers to `desktop/latest/`
3. Updates `latest.json` with the new version info

**Older versions** are available exclusively on GitHub Releases:
`https://github.com/aakash-priyadarshi/gold-shop-app/releases/download/desktop-v{version}/{filename}`

## Endpoints

| Method | Path                         | Description                                  |
| ------ | ---------------------------- | -------------------------------------------- |
| `GET`  | `/desktop/latest/{file}`     | Download the latest installer                |
| `GET`  | `/desktop/latest.json`       | Tauri updater manifest (Windows, latest)     |
| `GET`  | `/desktop/latest-macos.json` | Tauri updater manifest (macOS, latest)       |
| `GET`  | `/latest.json`               | Convenience alias for `/desktop/latest.json` |
| `HEAD` | `/desktop/{path}`            | Metadata only (size, type)                   |
| `GET`  | `/health`                    | Health check                                 |

## Features

- **Range requests**: Supported for resumable downloads.
- **Content-Disposition**: Installers force `attachment` download; JSON manifests are served inline.
- **Caching**: Installers cached for 1 hour (immutable); manifests cached for 5 minutes.
- **CORS**: Configured for `orivraa.com`, `www.orivraa.com`, `api.orivraa.com`, `localhost:3000`.
- **No directory listing**: Bucket contents are not enumerable.
