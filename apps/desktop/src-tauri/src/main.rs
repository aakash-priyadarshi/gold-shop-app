// ═══════════════════════════════════════════════════════════
// Orivraa Desktop — Application Entry Point
// ═══════════════════════════════════════════════════════════

// Prevents a console window from opening on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    gold_shop_desktop_lib::run();
}
