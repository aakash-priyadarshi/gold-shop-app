// ═══════════════════════════════════════════════════════════
// Orivraa Desktop — Library Entry Point
// ═══════════════════════════════════════════════════════════

pub mod commands;
pub mod db;
pub mod sync;

use commands::{AuthTokenReceiver, SyncState};
use db::Database;
use std::sync::Arc;
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
        .setup(|_app| {
            env_logger::Builder::from_env(
                env_logger::Env::default().default_filter_or("info"),
            )
            .init();

            log::info!("Orivraa Desktop started");
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
            commands::install_update,
            commands::get_app_version,
            commands::send_heartbeat,
        ])
        .run(tauri::generate_context!())
        .expect("Error while running Orivraa Desktop");
}
