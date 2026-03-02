// ═══════════════════════════════════════════════════════════
// Orivraa Desktop — Library Entry Point
// ═══════════════════════════════════════════════════════════

pub mod commands;
pub mod db;
pub mod sync;

use commands::SyncState;
use db::Database;
use std::sync::Arc;
use tokio::sync::Mutex as AsyncMutex;

/// Build the Tauri application with all plugins, state, and IPC handlers
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
        ])
        .run(tauri::generate_context!())
        .expect("Error while running Orivraa Desktop");
}
