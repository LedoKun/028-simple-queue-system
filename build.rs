fn main() {
    println!("cargo:rerun-if-changed=tailwind.css");
    println!("cargo:rerun-if-changed=package.json");
    println!("cargo:rerun-if-changed=package-lock.json");
}
