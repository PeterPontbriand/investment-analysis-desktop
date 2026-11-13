mod engine;

use std::thread;
use std::time::Duration;

use tauri::{Manager, RunEvent};

/// The origin of the main webview's URL. The window finishes loading after `setup` returns, and a webview that has
/// not navigated yet reports `about:blank`, so this waits a few seconds for a URL that has an origin.
fn main_window_origin(handle: &tauri::AppHandle) -> Option<String> {
    for _ in 0..100 {
        let origin = handle
            .get_webview_window("main")
            .and_then(|window| window.url().ok())
            .and_then(|url| engine::origin_of(&url));
        if origin.is_some() {
            return origin;
        }
        thread::sleep(Duration::from_millis(100));
    }
    None
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    #[cfg(feature = "e2e")]
    let builder = builder.plugin(tauri_plugin_wdio_webdriver::init());

    let application = builder
        .manage(engine::Engine::default())
        .invoke_handler(tauri::generate_handler![
            engine::engine_connection,
            engine::engine_status
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            thread::spawn(move || {
                let engine = handle.state::<engine::Engine>();
                match main_window_origin(&handle) {
                    Some(origin) => engine::launch(&engine, &origin),
                    None => engine::fail_without_origin(&engine),
                }
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building the application");

    application.run(|handle, event| {
        if let RunEvent::Exit = event {
            handle.state::<engine::Engine>().close_standard_input();
        }
    });
}
