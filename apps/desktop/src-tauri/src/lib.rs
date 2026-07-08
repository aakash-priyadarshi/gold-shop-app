// ═══════════════════════════════════════════════════════════
// Orivraa Desktop — Library Entry Point
// ═══════════════════════════════════════════════════════════

pub mod commands;
pub mod db;
pub mod sync;

use commands::{AuthTokenReceiver, SyncState};
use db::Database;
use std::sync::Arc;
use tauri::{Emitter, Manager};
use tokio::sync::Mutex as AsyncMutex;

/// JavaScript injected into orivraa.com pages for desktop enhancements:
/// - Disables right-click context menu on non-input elements
/// - Intercepts Google login to open in system browser
/// - Adds keyboard shortcuts (F5 refresh, F11 fullscreen)
/// - Opens external links in system browser
/// - Shows offline connectivity banner
const DESKTOP_ENHANCEMENTS_JS: &str = include_str!("../desktop-enhancements.js");

/// Build the Tauri application with all plugins, state, and IPC handlers
#[allow(deprecated)] // tauri_plugin_shell::open — will migrate to tauri-plugin-opener
pub fn run() {
    let db = Arc::new(Database::new().expect("Failed to initialize local database"));

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(db)
        .manage(SyncState(Arc::new(AsyncMutex::new(None))))
        .manage(AuthTokenReceiver(Arc::new(AsyncMutex::new(None))))
        // Inject desktop enhancements into orivraa.com pages after they load
        .on_page_load(|webview, payload| {
            if matches!(payload.event(), tauri::webview::PageLoadEvent::Finished) {
                let url = payload.url().to_string();

                // Inject desktop enhancements on orivraa.com pages
                if url.contains("orivraa.com") {
                    let _ = webview.eval(DESKTOP_ENHANCEMENTS_JS);
                    log::info!("Desktop enhancements injected for: {}", url);
                }
            }
        })
        .setup(|app| {
            env_logger::Builder::from_env(
                env_logger::Env::default().default_filter_or("info"),
            )
            .init();

            log::info!("Orivraa Desktop started");

            // Check for updates on startup (non-blocking, fire-and-forget)
            // The check runs 5s after startup to avoid blocking initialization.
            // If an update is found, a system notification is shown and a
            // Tauri event is emitted for the frontend to display a banner.
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(std::time::Duration::from_secs(5)).await;
                use tauri_plugin_updater::UpdaterExt;
                use tauri_plugin_notification::NotificationExt;

                match app_handle.updater_builder().build() {
                    Ok(updater) => {
                        match updater.check().await {
                            Ok(Some(update)) => {
                                log::info!("Update available on startup: v{}", update.version);

                                // Emit event for frontend
                                let info = serde_json::json!({
                                    "version": update.version,
                                    "date": update.date.map(|d| d.to_string()),
                                    "body": update.body,
                                    "currentVersion": update.current_version,
                                });
                                let _ = app_handle.emit("orivraa-update-available", &info);

                                // Show system notification
                                let _ = app_handle.notification()
                                    .builder()
                                    .title("Orivraa Update Available")
                                    .body(&format!("Version {} is ready to install. Click the update icon in the app to update.", update.version))
                                    .show();
                            }
                            Ok(None) => {
                                log::info!("App is up to date (startup check)");
                            }
                            Err(e) => {
                                log::warn!("Startup update check failed: {}", e);
                            }
                        }
                    }
                    Err(e) => {
                        log::warn!("Failed to build updater for startup check: {}", e);
                    }
                }
            });

            // Register a desktop session (fire-and-forget, non-blocking)
            let db_handle = app.state::<Arc<Database>>().inner().clone();
            tauri::async_runtime::spawn(async move {
                let version = env!("CARGO_PKG_VERSION").to_string();
                let os = match std::env::consts::OS {
                    "windows" => "Windows",
                    "macos" => "macOS",
                    "linux" => "Linux",
                    other => other,
                }.to_string();
                let arch = std::env::consts::ARCH.to_string();
                let token = db_handle.get_auth("access_token").unwrap_or(None);

                let client = reqwest::Client::new();
                let mut req = client
                    .post("https://api.orivraa.com/sessions/desktop/start")
                    .json(&serde_json::json!({
                        "appVersion": version,
                        "os": os,
                        "arch": arch,
                    }))
                    .timeout(std::time::Duration::from_secs(8));

                if let Some(ref t) = token {
                    req = req.header("Authorization", format!("Bearer {}", t));
                }

                if let Ok(resp) = req.send().await {
                    if let Ok(body) = resp.json::<serde_json::Value>().await {
                        if let Some(st) = body.get("sessionToken").and_then(|v| v.as_str()) {
                            let _ = db_handle.set_auth("desktop_session_token", st, None);
                            // Log only a truncated hash — never the full token
                            let token_preview = if st.len() > 8 { &st[..8] } else { st };
                            log::info!("Desktop session registered (token prefix: {}...)", token_preview);
                        }
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // System
            commands::is_desktop,
            commands::check_connectivity,
            // Auth
            commands::save_auth_token,
            commands::get_auth_token,
            commands::get_cached_user,
            commands::clear_auth,
            // Data
            commands::get_cached_orders,
            commands::get_cached_customers,
            commands::get_cached_products,
            commands::get_cached_metal_rates,
            // Drafts
            commands::save_draft,
            commands::get_pending_drafts,
            // Sync
            commands::init_sync_engine,
            commands::trigger_sync,
            commands::get_sync_status,
            commands::add_to_sync_queue,
            // Stats & Maintenance
            commands::get_local_stats,
            commands::clear_local_data,
            // Desktop-specific
            commands::open_google_auth,
            commands::open_external_url,
            commands::poll_auth_tokens,
            // Updates
            commands::check_for_updates,
            commands::auto_check_updates,
            commands::install_update,
            commands::get_app_version,
            commands::send_heartbeat,
            // Desktop Session Analytics
            commands::start_desktop_session,
            commands::end_desktop_session,
        ])
        .run(tauri::generate_context!())
        .expect("Error while running Orivraa Desktop");
}
