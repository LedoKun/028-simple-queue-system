use std::process::Command;

fn main() {
    println!("cargo:rerun-if-changed=tailwind.css");
    println!("cargo:rerun-if-changed=package.json");
    println!("cargo:rerun-if-changed=package-lock.json");

    println!("cargo:info=Running Tailwind CLI to rebuild public/css/styles.css");
    let status = Command::new("npx")
        .args([
            "@tailwindcss/cli",
            "-i",
            "./tailwind.css",
            "-o",
            "./public/css/styles.css",
            "-m",
        ])
        .status()
        .expect("failed to execute Tailwind CLI via npx");

    if !status.success() {
        panic!("Tailwind CLI build failed");
    }
}
