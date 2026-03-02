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

    // Clone what we need for the async task
    let db_clone = db.inner().clone();
    let receiver_clone = token_receiver.0.clone();

    // Listen for the callback in a background task (timeout: 5 minutes)
    tokio::spawn(async move {
        let timeout = tokio::time::timeout(
            std::time::Duration::from_secs(300),
            listener.accept(),
        ).await;

        match timeout {
            Ok(Ok((mut stream, _addr))) => {
                let mut buf = vec![0u8; 8192];
                let n = stream.read(&mut buf).await.unwrap_or(0);
                let request = String::from_utf8_lossy(&buf[..n]).to_string();

                // Parse the POST body (tokens as JSON)
                if let Some(body_start) = request.find("\r\n\r\n") {
                    let body = &request[body_start + 4..];

                    // CORS preflight response
                    if request.starts_with("OPTIONS") {
                        let response = "HTTP/1.1 204 No Content\r\n\
                            Access-Control-Allow-Origin: https://www.orivraa.com\r\n\
                            Access-Control-Allow-Methods: POST, OPTIONS\r\n\
                            Access-Control-Allow-Headers: Content-Type\r\n\
                            Access-Control-Max-Age: 86400\r\n\
                            Content-Length: 0\r\n\r\n";
                        let _ = stream.write_all(response.as_bytes()).await;

                        // Wait for the actual POST
                        let mut buf2 = vec![0u8; 8192];
                        let n2 = stream.read(&mut buf2).await.unwrap_or(0);
                        if n2 == 0 {
                            // Try accepting another connection for the POST
                            if let Ok(Ok((mut stream2, _))) = tokio::time::timeout(
                                std::time::Duration::from_secs(30),
                                listener.accept(),
                            ).await {
                                let mut buf3 = vec![0u8; 8192];
                                let n3 = stream2.read(&mut buf3).await.unwrap_or(0);
                                let request2 = String::from_utf8_lossy(&buf3[..n3]).to_string();
                                if let Some(body_start2) = request2.find("\r\n\r\n") {
                                    let body2 = &request2[body_start2 + 4..];
                                    process_auth_tokens(body2, &db_clone, &receiver_clone).await;
                                }
                                let resp = success_response();
                                let _ = stream2.write_all(resp.as_bytes()).await;
                            }
                            return;
                        }
                        let request2 = String::from_utf8_lossy(&buf2[..n2]).to_string();
                        if let Some(body_start2) = request2.find("\r\n\r\n") {
                            process_auth_tokens(&request2[body_start2 + 4..], &db_clone, &receiver_clone).await;
                        }
                        return;
                    }

                    // Handle POST with tokens
                    process_auth_tokens(body, &db_clone, &receiver_clone).await;

                    let response = success_response();
                    let _ = stream.write_all(response.as_bytes()).await;
                }
            }
            Ok(Err(e)) => {
                log::error!("Auth callback server accept error: {}", e);
            }
            Err(_) => {
                log::warn!("Auth callback server timed out after 5 minutes");
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
            log::info!("Received auth tokens from browser OAuth");

            // Store in local DB
            let _ = db.set_auth("access_token", &payload.access_token, None);
            let _ = db.set_auth("refresh_token", &payload.refresh_token, None);
            if let Some(ref user_json) = payload.user_json {
                let _ = db.set_auth("user", user_json, None);
            }

            // Store in receiver for the frontend to pick up
            let mut guard = receiver.lock().await;
            *guard = Some(payload);
        }
        Err(e) => {
            log::error!("Failed to parse auth tokens: {} — body: {}", e, &body[..body.len().min(200)]);
        }
    }
}

/// Check if auth tokens have been received from browser OAuth.
/// Called by the desktop enhancements JS polling loop.
#[tauri::command]
pub async fn poll_auth_tokens(
    token_receiver: State<'_, AuthTokenReceiver>,
) -> Result<Option<AuthTokenPayload>, String> {
    let mut guard = token_receiver.0.lock().await;
    Ok(guard.take()) // Returns and clears the stored tokens
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
