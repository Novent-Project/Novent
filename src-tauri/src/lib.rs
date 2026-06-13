use tauri::{Manager, RunEvent};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandChild;
use std::sync::Mutex;
use std::process::Command as StdCommand;

struct BackendProcess(Mutex<Option<CommandChild>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let sidecar_command = app.shell()
                .sidecar("backend")
                .expect("Failed to create `backend` binary command.");

            let (_receiver, child) = sidecar_command
                .spawn()
                .expect("Failed to spawn Python backend sidecar");

            println!("Python backend spawned successfully. PID: {}", child.pid());

            app.manage(BackendProcess(Mutex::new(Some(child))));

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        if let RunEvent::Exit = event {
            let state = app_handle.state::<BackendProcess>();
            let mut process_guard = state.0.lock().unwrap();
            
            if let Some(child) = process_guard.take() {
                println!("Wiping out process tree:");
                let pid = child.pid();

                #[cfg(target_os = "windows")]
                {
                    let _ = StdCommand::new("taskkill")
                        .args(["/F", "/T", "/PID", &pid.to_string()])
                        .status();
                }

                #[cfg(not(target_os = "windows"))]
                {
                    let _ = child.kill();
                }
            }
        }
    });
}