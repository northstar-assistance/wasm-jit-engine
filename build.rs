fn main() {
    // This build script is required for the dynasm crate to work properly
    // dynasm generates machine code at compile time
    println!("cargo:rerun-if-changed=src/lib.rs");
}
