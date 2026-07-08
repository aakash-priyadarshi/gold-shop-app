// ═══════════════════════════════════════════════════════════
// Orivraa Desktop — Application Entry Point
// ═══════════════════════════════════════════════════════════

// Prevents a console window from opening on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::Write;

/// Install a panic hook that writes crash info to a log file and shows
/// a Windows message box, so silent crashes (with windows_subsystem = "windows")
/// are diagnosable instead of the window just flashing and closing.
fn install_panic_hook() {
    let default_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |panic_info| {
        // Build the crash message
        let msg = format!(
            "Orivraa Desktop crashed (v{})\n\nPanic: {}\n\nLocation: {}\n\nBacktrace:\n{}",
            env!("CARGO_PKG_VERSION"),
            panic_info.payload().downcast_ref::<&str>().copied().unwrap_or("<non-string panic>"),
            panic_info.location().map(|l| l.to_string()).unwrap_or_else(|| "<unknown>".to_string()),
            std::backtrace::Backtrace::force_capture(),
        );

        // Write to crash log file in the app data directory
        if let Some(local_dir) = dirs::data_local_dir() {
            let crash_dir = local_dir.join("com.orivraa.desktop").join("logs");
            let _ = std::fs::create_dir_all(&crash_dir);
            let crash_file = crash_dir.join("crash.log");
            if let Ok(mut f) = std::fs::File::create(&crash_file) {
                let _ = writeln!(f, "[{}] {}", chrono::Local::now().format("%Y-%m-%d %H:%M:%S"), msg);
            }
        }

        // Show a Windows message box so the user sees the error
        #[cfg(target_os = "windows")]
        {
            use std::ffi::CString;
            let title = CString::new("Orivraa Desktop — Crash Report").unwrap();
            let body = CString::new(msg.clone()).unwrap();
            unsafe {
                extern "C" {
                    fn MessageBoxA(
                        hwnd: *mut std::ffi::c_void,
                        lp_text: *const i8,
                        lp_caption: *const i8,
                        u_type: u32,
                    ) -> i32;
                }
                MessageBoxA(
                    std::ptr::null_mut(),
                    body.as_ptr(),
                    title.as_ptr(),
                    0x10, // MB_ICONERROR
                );
            }
        }

        // Also print to stderr (visible if run from a terminal)
        eprintln!("{}", msg);

        // Call the default hook for standard panic behavior
        default_hook(panic_info);
    }));
}

fn main() {
    install_panic_hook();
    gold_shop_desktop_lib::run();
}
