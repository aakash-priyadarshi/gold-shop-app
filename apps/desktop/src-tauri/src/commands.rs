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

/// Open Google OAuth in the system browser so existing sessions are available.
/// The browser will handle the full OAuth flow with Google's consent screen.
#[tauri::command]
#[allow(deprecated)]
pub async fn open_google_auth(
    app: tauri::AppHandle,
    role: String,
    mode: String,
) -> Result<(), String> {
    let api_url = "https://api.orivraa.com/api";
    let auth_url = format!("{}/auth/google?role={}&mode={}", api_url, role, mode);

    log::info!("Opening Google auth in system browser: role={}, mode={}", role, mode);

    tauri_plugin_shell::ShellExt::shell(&app)
        .open(&auth_url, None)
        .map_err(|e| format!("Failed to open browser: {}", e))?;

    Ok(())
}

/// Open any external URL in the system browser.
/// Used for links that should not load inside the desktop webview.
#[tauri::command]
#[allow(deprecated)]
pub async fn open_external_url(
    app: tauri::AppHandle,
    url: String,
) -> Result<(), String> {
    // Basic URL validation
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("Invalid URL: must start with http:// or https://".into());
    }

    tauri_plugin_shell::ShellExt::shell(&app)
        .open(&url, None)
        .map_err(|e| format!("Failed to open URL: {}", e))?;

    Ok(())
}
