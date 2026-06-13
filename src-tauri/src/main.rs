#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    fs,
    io::Write,
    sync::Mutex,
    process::Child,
};
use tauri::{Manager, State};

// Embed the backend binary at compile time
static BACKEND_BYTES: &[u8] = include_bytes!(
    "../binaries/backend-x86_64-pc-windows-msvc.exe"
);

struct BackendProcess(Mutex<Option<Child>>);

fn main() {
    tauri::Builder::default()
        .manage(BackendProcess(Mutex::new(None)))
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()
                .expect("failed to get app data dir");

            fs::create_dir_all(&app_data_dir)?;

            let backend_path = app_data_dir.join("backend.exe");

            let mut file = fs::File::create(&backend_path)?;
            file.write_all(BACKEND_BYTES)?;
            drop(file);

            let child = std::process::Command::new(&backend_path)
                .spawn()
                .expect("failed to start backend");

            *app.state::<BackendProcess>().0.lock().unwrap() = Some(child);

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let state = window.app_handle().state::<BackendProcess>();
                if let Some(mut child) = state.0.lock().unwrap().take() {
                    let _ = child.kill();
                };
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}