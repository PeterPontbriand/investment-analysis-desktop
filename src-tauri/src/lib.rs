mod engine;

use std::thread;

use tauri::{Manager, RunEvent};

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
            let origin = app
                .get_webview_window("main")
                .and_then(|window| window.url().ok())
                .and_then(|url| engine::origin_of(&url));
            let handle = app.handle().clone();
            thread::spawn(move || {
                let engine = handle.state::<engine::Engine>();
                match origin {
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
