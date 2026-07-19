fn main() {

    println!("cargo:rerun-if-changed=binaries/backend-x86_64-pc-windows-msvc.exe");
    tauri_build::build()
}
