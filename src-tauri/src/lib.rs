mod commands;
mod core;

use tauri::Manager;
use core::backend::BackendProcess;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .manage(BackendProcess::empty())
        .invoke_handler(tauri::generate_handler![
            commands::system::quit,
            commands::system::restart_app,
            commands::system::get_os_info,
            commands::updater::list_releases,
            commands::updater::download_and_install_update,
        ])
        .setup(|app| {
            #[cfg(windows)]
            {
                let child = core::backend::spawn_and_wait(app.handle());
                *app.state::<BackendProcess>().0.lock().unwrap() = Some(child);
            }

            core::tray::build(app.handle())?;

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_decorations(false);
                let _ = window.set_title("Novent");
            }

            Ok(())
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                let _ = window.hide();
            }
            tauri::WindowEvent::Destroyed => {
                window.app_handle().state::<BackendProcess>().kill();
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}