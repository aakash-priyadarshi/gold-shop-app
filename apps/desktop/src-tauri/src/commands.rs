// ═══════════════════════════════════════════════════════════
// Orivraa Desktop — Tauri IPC Commands
// Exposed to the frontend via @tauri-apps/api invoke()
// ═══════════════════════════════════════════════════════════

use crate::db::Database;
use crate::sync::SyncEngine;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex as AsyncMutex;

/// Managed state for sync engine
pub struct SyncState(pub Arc<AsyncMutex<Option<Arc<SyncEngine>>>>);

/// Managed state for auth tokens received from browser OAuth callback
pub struct AuthTokenReceiver(pub Arc<AsyncMutex<Option<AuthTokenPayload>>>);

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
pub struct AuthTokenPayload {
    pub access_token: String,
    pub refresh_token: String,
    pub user_json: Option<String>,
}

// ─── Connectivity ────────────────────────────────────────

#[tauri::command]
pub async fn check_connectivity(
    db: State<'_, Arc<Database>>,
) -> Result<bool, String> {
    let engine = SyncEngine::new(db.inner().clone());
    Ok(engine.check_connectivity().await)
}

#[tauri::command]
pub fn is_desktop() -> bool {
    true
}

// ─── Auth ────────────────────────────────────────────────

#[tauri::command]
pub fn save_auth_token(
    db: State<'_, Arc<Database>>,
    token: String,
    refresh_token: Option<String>,
    user_json: String,
) -> Result<(), String> {
    db.set_auth("access_token", &token, None)
        .map_err(|e| e.to_string())?;
    if let Some(rt) = refresh_token {
        db.set_auth("refresh_token", &rt, None)
            .map_err(|e| e.to_string())?;
    }
    db.set_auth("user", &user_json, None)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_auth_token(db: State<'_, Arc<Database>>) -> Result<Option<String>, String> {
    db.get_auth("access_token").map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_cached_user(db: State<'_, Arc<Database>>) -> Result<Option<String>, String> {
    db.get_auth("user").map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clear_auth(db: State<'_, Arc<Database>>) -> Result<(), String> {
    db.clear_auth().map_err(|e| e.to_string())
}

// ─── Cached Orders ───────────────────────────────────────

#[tauri::command]
pub fn get_cached_orders(
    db: State<'_, Arc<Database>>,
    shop_id: String,
) -> Result<String, String> {
    let orders = db
        .get_orders_by_shop(&shop_id)
        .map_err(|e| e.to_string())?;
    serde_json::to_string(&orders).map_err(|e| e.to_string())
}

// ─── Cached Customers ────────────────────────────────────

#[tauri::command]
pub fn get_cached_customers(
    db: State<'_, Arc<Database>>,
    shop_id: String,
) -> Result<String, String> {
    let customers = db
        .get_customers_by_shop(&shop_id)
        .map_err(|e| e.to_string())?;
    serde_json::to_string(&customers).map_err(|e| e.to_string())
}

// ─── Cached Products ─────────────────────────────────────

#[tauri::command]
pub fn get_cached_products(
    db: State<'_, Arc<Database>>,
    shop_id: String,
) -> Result<String, String> {
    let products = db
        .get_products_by_shop(&shop_id)
        .map_err(|e| e.to_string())?;
    serde_json::to_string(&products).map_err(|e| e.to_string())
}

// ─── Metal Rates ─────────────────────────────────────────

#[tauri::command]
pub fn get_cached_metal_rates(
    db: State<'_, Arc<Database>>,
) -> Result<String, String> {
    let rates = db.get_metal_rates().map_err(|e| e.to_string())?;
    serde_json::to_string(&rates).map_err(|e| e.to_string())
}

// ─── Drafts ──────────────────────────────────────────────

#[tauri::command]
pub fn save_draft(
    db: State<'_, Arc<Database>>,
    shop_id: String,
    draft_type: String,
    title: String,
    payload: String,
) -> Result<String, String> {
    let draft = crate::db::DraftItem {
        id: uuid::Uuid::new_v4().to_string(),
        shop_id,
        draft_type,
        title,
        payload_json: payload,
        created_at: chrono::Utc::now().to_rfc3339(),
        updated_at: chrono::Utc::now().to_rfc3339(),
        synced: false,
    };
    db.save_draft(&draft).map_err(|e| e.to_string())?;
    Ok(draft.id)
}

#[tauri::command]
pub fn get_pending_drafts(
    db: State<'_, Arc<Database>>,
    shop_id: String,
) -> Result<String, String> {
    let drafts = db
        .get_pending_drafts(&shop_id)
        .map_err(|e| e.to_string())?;
    serde_json::to_string(&drafts).map_err(|e| e.to_string())
}

// ─── Sync Operations ─────────────────────────────────────

#[tauri::command]
pub async fn trigger_sync(
    db: State<'_, Arc<Database>>,
    sync_state: State<'_, SyncState>,
    shop_id: String,
) -> Result<String, String> {
    let engine_guard = sync_state.0.lock().await;
    let engine = engine_guard
        .as_ref()
        .ok_or("Sync engine not initialized")?
        .clone();
    drop(engine_guard);

    let token = db
        .get_auth("access_token")
        .map_err(|e| e.to_string())?
        .ok_or("Not authenticated")?;

    // Process upload queue first
    let uploaded = engine
        .process_upload_queue(&token)
        .await
        .unwrap_or(0);

    // Then pull fresh data
    let pulled = engine
        .pull_data(&token, &shop_id)
        .await
        .unwrap_or_else(|_| serde_json::json!({}));

    let result = serde_json::json!({
        "uploaded": uploaded,
        "pulled": pulled,
        "syncedAt": chrono::Utc::now().to_rfc3339(),
    });

    Ok(result.to_string())
}

#[tauri::command]
pub async fn get_sync_status(
    db: State<'_, Arc<Database>>,
    sync_state: State<'_, SyncState>,
) -> Result<String, String> {
    let engine_guard = sync_state.0.lock().await;
    if let Some(engine) = engine_guard.as_ref() {
        let is_online = engine.check_connectivity().await;
        let mut status = engine.get_status();
        status.is_online = is_online;
        serde_json::to_string(&status).map_err(|e| e.to_string())
    } else {
        // Engine not initialized — return basic status
        let queue = db.get_sync_queue().unwrap_or_default();
        let status = crate::sync::SyncStatus {
            is_online: false,
            last_sync_at: db.get_auth("last_sync_at").unwrap_or(None),
            pending_uploads: queue.len() as i64,
            pending_downloads: 0,
            sync_in_progress: false,
        };
        serde_json::to_string(&status).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn add_to_sync_queue(
    db: State<'_, Arc<Database>>,
    endpoint: String,
    action: String,
    payload: String,
) -> Result<(), String> {
    let entry = crate::db::SyncQueueEntry {
        id: uuid::Uuid::new_v4().to_string(),
        endpoint,
        action,
        payload,
        created_at: chrono::Utc::now().to_rfc3339(),
        retry_count: 0,
        last_error: None,
    };
    db.add_to_sync_queue(&entry)
        .map_err(|e| e.to_string())
}

// ─── Local Stats ─────────────────────────────────────────

#[tauri::command]
pub fn get_local_stats(
    db: State<'_, Arc<Database>>,
    shop_id: String,
) -> Result<String, String> {
    let stats = db.get_local_stats(&shop_id).map_err(|e| e.to_string())?;
    serde_json::to_string(&stats).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clear_local_data(
    db: State<'_, Arc<Database>>,
) -> Result<(), String> {
    db.clear_all_cached_data().map_err(|e| e.to_string())
}

// ─── Initialize Sync Engine ──────────────────────────────

#[tauri::command]
pub async fn init_sync_engine(
    db: State<'_, Arc<Database>>,
    sync_state: State<'_, SyncState>,
    shop_id: String,
) -> Result<(), String> {
    let engine = Arc::new(SyncEngine::new(db.inner().clone()));

    let token = db
        .get_auth("access_token")
        .map_err(|e| e.to_string())?
        .ok_or("Not authenticated — cannot start sync")?;

    // Start background sync loop
    engine.clone().start_background_sync(token, shop_id);

    // Store engine reference
    let mut guard = sync_state.0.lock().await;
    *guard = Some(engine);

    log::info!("Sync engine initialized and background sync started");
    Ok(())
}

// ─── Desktop-Specific Commands ───────────────────────────

/// Open Google OAuth in the system browser with a localhost callback server.
/// Flow: Start local HTTP server → open browser with port info → browser does
/// Google OAuth → oauth-callback page sends tokens to localhost → desktop receives them.
#[tauri::command]
#[allow(deprecated)]
pub async fn open_google_auth(
    app: tauri::AppHandle,
    db: State<'_, Arc<Database>>,
    token_receiver: State<'_, AuthTokenReceiver>,
    role: String,
    mode: String,
) -> Result<u16, String> {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    // Start a local TCP server on a random port
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|e| format!("Failed to bind local server: {}", e))?;
    let port = listener.local_addr()
        .map_err(|e| format!("Failed to get port: {}", e))?
        .port();

    log::info!("Auth callback server started on port {}", port);

    // Open the login page in system browser with desktop_port param
    let login_url = format!(
        "https://www.orivraa.com/auth/login?desktop_port={}&desktop_role={}&desktop_mode={}",
        port, role, mode
    );

    tauri_plugin_shell::ShellExt::shell(&app)
        .open(&login_url, None)
        .map_err(|e| format!("Failed to open browser: {}", e))?;

    // Clear any stale tokens from previous auth attempts
    {
        let mut guard = token_receiver.0.lock().await;
        *guard = None;
    }
    let _ = db.set_auth("oauth_fresh", "false", None);

    // Clone what we need for the async task
    let db_clone = db.inner().clone();
    let receiver_clone = token_receiver.0.clone();

    // Listen for the callback in a background task (timeout: 5 minutes)
    tokio::spawn(async move {
        let deadline = tokio::time::Instant::now() + std::time::Duration::from_secs(300);

        loop {
            let remaining = deadline.saturating_duration_since(tokio::time::Instant::now());
            if remaining.is_zero() {
                log::warn!("Auth callback server timed out after 5 minutes");
                break;
            }

            let accept_result = tokio::time::timeout(remaining, listener.accept()).await;

            match accept_result {
                Ok(Ok((mut stream, addr))) => {
                    // Read the initial chunk of the HTTP request
                    let mut data = Vec::with_capacity(32768);
                    let mut buf = [0u8; 16384];
                    let n = stream.read(&mut buf).await.unwrap_or(0);
                    if n == 0 { continue; }
                    data.extend_from_slice(&buf[..n]);

                    let first_line = String::from_utf8_lossy(&data[..data.len().min(64)])
                        .lines().next().unwrap_or("?").to_string();
                    log::info!("Auth callback received from {}: {} bytes, method: {}",
                        addr, n, first_line);

                    // ── CORS preflight (OPTIONS) ──
                    if data.starts_with(b"OPTIONS") {
                        let response = "HTTP/1.1 204 No Content\r\n\
                            Access-Control-Allow-Origin: https://www.orivraa.com\r\n\
                            Access-Control-Allow-Methods: POST, OPTIONS\r\n\
                            Access-Control-Allow-Headers: Content-Type\r\n\
                            Access-Control-Allow-Private-Network: true\r\n\
                            Access-Control-Max-Age: 86400\r\n\
                            Content-Length: 0\r\n\
                            Connection: close\r\n\r\n";
                        let _ = stream.write_all(response.as_bytes()).await;
                        let _ = stream.shutdown().await;
                        continue;
                    }

                    // ── POST with tokens ──
                    if data.starts_with(b"POST") {
                        // Find the header/body boundary (\r\n\r\n)
                        if let Some(header_end) = data.windows(4).position(|w| w == b"\r\n\r\n") {
                            let body_start = header_end + 4;

                            // Parse Content-Length from headers
                            let header_str = String::from_utf8_lossy(&data[..header_end]);
                            let content_length: usize = header_str
                                .lines()
                                .find(|l| l.to_ascii_lowercase().starts_with("content-length:"))
                                .and_then(|l| l.split(':').nth(1))
                                .and_then(|v| v.trim().parse().ok())
                                .unwrap_or(0);

                            log::info!("Auth callback POST: Content-Length={}, body so far={}",
                                content_length, data.len().saturating_sub(body_start));

                            // Keep reading until we have the full body
                            while data.len().saturating_sub(body_start) < content_length {
                                match tokio::time::timeout(
                                    std::time::Duration::from_secs(5),
                                    stream.read(&mut buf),
                                ).await {
                                    Ok(Ok(m)) if m > 0 => {
                                        data.extend_from_slice(&buf[..m]);
                                        log::info!("Auth callback: read {} more bytes, total body={}/{}",
                                            m, data.len().saturating_sub(body_start), content_length);
                                    }
                                    _ => {
                                        log::warn!("Auth callback: read stalled at {}/{} body bytes",
                                            data.len().saturating_sub(body_start), content_length);
                                        break;
                                    }
                                }
                            }

                            let body = String::from_utf8_lossy(&data[body_start..]);
                            log::info!("Auth callback: processing body ({} bytes)", body.len());
                            process_auth_tokens(&body, &db_clone, &receiver_clone).await;
                        } else {
                            log::error!("Auth callback POST: no header/body boundary found");
                        }

                        let response = success_response();
                        let _ = stream.write_all(response.as_bytes()).await;
                        let _ = stream.shutdown().await;
                        log::info!("Auth callback: tokens processed, server closing");
                        break;
                    }

                    // ── Unknown method — respond 405 and keep listening ──
                    let resp = "HTTP/1.1 405 Method Not Allowed\r\n\
                        Access-Control-Allow-Origin: https://www.orivraa.com\r\n\
                        Content-Length: 0\r\n\
                        Connection: close\r\n\r\n";
                    let _ = stream.write_all(resp.as_bytes()).await;
                    let _ = stream.shutdown().await;
                }
                Ok(Err(e)) => {
                    log::error!("Auth callback server accept error: {}", e);
                    break;
                }
                Err(_) => {
                    log::warn!("Auth callback server timed out");
                    break;
                }
            }
        }
    });

    Ok(port)
}

fn success_response() -> String {
    let body = r#"<!DOCTYPE html><html><body style="background:#0f172a;color:#f3dd99;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><h2>✓ Signed in successfully!</h2><p style="color:rgba(255,255,255,0.6)">You can close this tab and return to Orivraa Desktop.</p><script>setTimeout(function(){window.close()},2000)</script></div></body></html>"#;
    format!(
        "HTTP/1.1 200 OK\r\n\
        Access-Control-Allow-Origin: https://www.orivraa.com\r\n\
        Access-Control-Allow-Private-Network: true\r\n\
        Content-Type: text/html; charset=utf-8\r\n\
        Content-Length: {}\r\n\
        Connection: close\r\n\r\n{}",
        body.len(),
        body
    )
}

async fn process_auth_tokens(
    body: &str,
    db: &Database,
    receiver: &AsyncMutex<Option<AuthTokenPayload>>,
) {
    match serde_json::from_str::<AuthTokenPayload>(body) {
        Ok(payload) => {
            log::info!("Received auth tokens from browser OAuth (token len: {}, refresh len: {})",
                payload.access_token.len(), payload.refresh_token.len());

            // Store in local DB
            let _ = db.set_auth("access_token", &payload.access_token, None);
            let _ = db.set_auth("refresh_token", &payload.refresh_token, None);
            if let Some(ref user_json) = payload.user_json {
                let _ = db.set_auth("user", user_json, None);
            }
            // Mark tokens as fresh so poll_auth_tokens DB fallback can find them
            let _ = db.set_auth("oauth_fresh", "true", None);

            // Store in receiver for the frontend to pick up
            let mut guard = receiver.lock().await;
            *guard = Some(payload);
            log::info!("Auth tokens stored in receiver for polling");
        }
        Err(e) => {
            log::error!("Failed to parse auth tokens: {} — body preview: {}", e, &body[..body.len().min(500)]);
        }
    }
}

/// Check if auth tokens have been received from browser OAuth.
/// Called by the desktop enhancements JS polling loop.
/// Checks in-memory receiver first, then falls back to local DB.
#[tauri::command]
pub async fn poll_auth_tokens(
    db: State<'_, Arc<Database>>,
    token_receiver: State<'_, AuthTokenReceiver>,
) -> Result<Option<AuthTokenPayload>, String> {
    // Primary: check in-memory receiver
    let mut guard = token_receiver.0.lock().await;
    if let Some(payload) = guard.take() {
        log::info!("poll_auth_tokens: found tokens in memory receiver");
        return Ok(Some(payload));
    }
    drop(guard);

    // Fallback: check local DB (in case memory receiver was missed)
    if let Some(flag) = db.get_auth("oauth_fresh").unwrap_or(None) {
        if flag == "true" {
            if let (Some(at), Some(rt)) = (
                db.get_auth("access_token").unwrap_or(None),
                db.get_auth("refresh_token").unwrap_or(None),
            ) {
                log::info!("poll_auth_tokens: found fresh tokens in DB fallback");
                // Clear the flag so we don't return them again
                let _ = db.set_auth("oauth_fresh", "false", None);
                let user_json = db.get_auth("user").unwrap_or(None);
                return Ok(Some(AuthTokenPayload {
                    access_token: at,
                    refresh_token: rt,
                    user_json,
                }));
            }
        }
    }

    Ok(None)
}

/// Open any external URL in the system browser.
#[tauri::command]
#[allow(deprecated)]
pub async fn open_external_url(
    app: tauri::AppHandle,
    url: String,
) -> Result<(), String> {
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("Invalid URL: must start with http:// or https://".into());
    }

    tauri_plugin_shell::ShellExt::shell(&app)
        .open(&url, None)
        .map_err(|e| format!("Failed to open URL: {}", e))?;

    Ok(())
}

// ─── Update Commands ─────────────────────────────────────

/// Check for application updates. Returns version info if update is available.
#[tauri::command]
pub async fn check_for_updates(
    app: tauri::AppHandle,
) -> Result<Option<String>, String> {
    use tauri_plugin_updater::UpdaterExt;

    let updater = app.updater_builder().build()
        .map_err(|e| format!("Failed to build updater: {}", e))?;

    match updater.check().await {
        Ok(Some(update)) => {
            let info = serde_json::json!({
                "version": update.version,
                "date": update.date.map(|d| d.to_string()),
                "body": update.body,
                "currentVersion": update.current_version,
            });
            Ok(Some(info.to_string()))
        }
        Ok(None) => Ok(None),
        Err(e) => Err(format!("Update check failed: {}", e)),
    }
}

/// Download and install an available update.
#[tauri::command]
pub async fn install_update(
    app: tauri::AppHandle,
) -> Result<(), String> {
    use tauri_plugin_updater::UpdaterExt;

    let updater = app.updater_builder().build()
        .map_err(|e| format!("Failed to build updater: {}", e))?;

    match updater.check().await {
        Ok(Some(update)) => {
            log::info!("Installing update v{}", update.version);

            let mut downloaded = 0;
            update.download_and_install(
                |chunk_length, content_length| {
                    downloaded += chunk_length;
                    log::info!("Downloaded {} of {:?} bytes", downloaded, content_length);
                },
                || {
                    log::info!("Download complete, installing...");
                },
            ).await.map_err(|e| format!("Install failed: {}", e))?;

            log::info!("Update installed. Restarting...");
            app.restart();
        }
        Ok(None) => Err("No update available".into()),
        Err(e) => Err(format!("Update check failed: {}", e)),
    }
}

/// Get the current app version.
#[tauri::command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Send a heartbeat to the server with version info.
/// Called periodically by the desktop enhancements script.
#[tauri::command]
pub async fn send_heartbeat(
    db: State<'_, Arc<Database>>,
) -> Result<String, String> {
    let version = env!("CARGO_PKG_VERSION").to_string();
    let os_info = std::env::consts::OS.to_string();
    let arch = std::env::consts::ARCH.to_string();

    let os_display = match os_info.as_str() {
        "windows" => "Windows".to_string(),
        "macos" => "macOS".to_string(),
        "linux" => "Linux".to_string(),
        other => other.to_string(),
    };

    // Get auth token if available
    let token = db.get_auth("access_token").unwrap_or(None);

    let client = reqwest::Client::new();
    let mut req = client
        .post("https://api.orivraa.com/releases/heartbeat")
        .json(&serde_json::json!({
            "appVersion": version,
            "os": os_display,
            "arch": arch,
        }));

    if let Some(t) = &token {
        req = req.header("Authorization", format!("Bearer {}", t));
    }

    // Also send desktop session heartbeat if we have an active session token
    if let Some(ref t) = token {
        if let Some(session_token) = db.get_auth("desktop_session_token").unwrap_or(None) {
            let _ = send_desktop_session_heartbeat(&session_token, t).await;
        }
    }

    let resp = req.send().await.map_err(|e| format!("Heartbeat failed: {}", e))?;
    let body = resp.text().await.unwrap_or_default();
    Ok(body)
}

async fn send_desktop_session_heartbeat(session_token: &str, auth_token: &str) {
    let client = reqwest::Client::new();
    let _ = client
        .post("https://api.orivraa.com/sessions/desktop/heartbeat")
        .header("Authorization", format!("Bearer {}", auth_token))
        .json(&serde_json::json!({ "sessionToken": session_token }))
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await;
}

// ─── Desktop Session Analytics ───────────────────────────────────────────────

/// Called when the desktop app launches. Registers a session with the API server.
/// The returned session token is stored locally for heartbeats and end-session.
#[tauri::command]
pub async fn start_desktop_session(
    db: State<'_, Arc<Database>>,
) -> Result<String, String> {
    let version = env!("CARGO_PKG_VERSION").to_string();
    let os = match std::env::consts::OS {
        "windows" => "Windows",
        "macos" => "macOS",
        "linux" => "Linux",
        other => other,
    }.to_string();
    let arch = std::env::consts::ARCH.to_string();

    let token = db.get_auth("access_token").unwrap_or(None);

    let client = reqwest::Client::new();
    let mut req = client
        .post("https://api.orivraa.com/sessions/desktop/start")
        .json(&serde_json::json!({
            "appVersion": version,
            "os": os,
            "arch": arch,
        }))
        .timeout(std::time::Duration::from_secs(10));

    if let Some(ref t) = token {
        req = req.header("Authorization", format!("Bearer {}", t));
    }

    match req.send().await {
        Ok(resp) if resp.status().is_success() => {
            if let Ok(body) = resp.json::<serde_json::Value>().await {
                if let Some(session_token) = body.get("sessionToken").and_then(|v| v.as_str()) {
                    let _ = db.set_auth("desktop_session_token", session_token, None);
                    log::info!("Desktop session started: {}", session_token);
                    return Ok(session_token.to_string());
                }
            }
            Err("Invalid response from session start".into())
        }
        Ok(resp) => Err(format!("Session start failed: {}", resp.status())),
        Err(e) => Err(format!("Session start error: {}", e)),
    }
}

/// Called when the app quits (from Tauri's on_window_event or the JS beforeunload).
#[tauri::command]
pub async fn end_desktop_session(
    db: State<'_, Arc<Database>>,
    closed_by: Option<String>,
) -> Result<(), String> {
    let session_token = match db.get_auth("desktop_session_token").unwrap_or(None) {
        Some(t) => t,
        None => return Ok(()), // No session in progress
    };

    let auth_token = db.get_auth("access_token").unwrap_or(None);

    let client = reqwest::Client::new();
    let mut req = client
        .post("https://api.orivraa.com/sessions/desktop/end")
        .json(&serde_json::json!({
            "sessionToken": session_token,
            "closedBy": closed_by.unwrap_or_else(|| "user_quit".to_string()),
        }))
        .timeout(std::time::Duration::from_secs(5));

    if let Some(ref t) = auth_token {
        req = req.header("Authorization", format!("Bearer {}", t));
    }

    let _ = req.send().await;
    let _ = db.set_auth("desktop_session_token", "", None);
    log::info!("Desktop session ended: {}", session_token);
    Ok(())
}

