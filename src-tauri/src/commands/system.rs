use tauri::Manager;
use crate::core::backend::BackendProcess;

#[tauri::command]
pub fn quit(app: tauri::AppHandle) {
    app.state::<BackendProcess>().kill();
    app.exit(0);
}

#[tauri::command]
pub fn restart_app(app: tauri::AppHandle) {
    tauri::process::restart(&app.env());
}

#[derive(serde::Serialize)]
pub struct OsInfo {
    pub platform: &'static str,
    pub is_windows: bool,
}

#[tauri::command]
pub fn get_os_info() -> OsInfo {
    OsInfo {
        platform: std::env::consts::OS,
        is_windows: cfg!(target_os = "windows"),
    }
}