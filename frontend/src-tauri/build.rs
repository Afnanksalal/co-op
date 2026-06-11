fn main() {
    println!("cargo:rerun-if-env-changed=COOP_CLOUD_URL");
    println!("cargo:rerun-if-env-changed=NEXT_PUBLIC_API_URL");
    println!("cargo:rerun-if-changed=../.env");
    println!("cargo:rerun-if-changed=../.env.local");

    if let Some(url) = configured_cloud_url() {
        println!("cargo:rustc-env=COOP_CLOUD_URL={}", strip_api_prefix(&url));
    }

    tauri_build::build()
}

fn configured_cloud_url() -> Option<String> {
    std::env::var("COOP_CLOUD_URL")
        .ok()
        .or_else(|| std::env::var("NEXT_PUBLIC_API_URL").ok())
        .or_else(|| read_frontend_env("NEXT_PUBLIC_API_URL"))
        .map(|value| {
            value
                .trim()
                .trim_matches('"')
                .trim_matches('\'')
                .to_string()
        })
        .filter(|value| !value.is_empty())
}

fn read_frontend_env(key: &str) -> Option<String> {
    ["../.env.local", "../.env"].into_iter().find_map(|path| {
        let content = std::fs::read_to_string(path).ok()?;
        content.lines().find_map(|line| {
            let trimmed = line.trim();
            if trimmed.starts_with('#') || trimmed.is_empty() {
                return None;
            }
            let (name, value) = trimmed.split_once('=')?;
            if name.trim() == key {
                Some(value.trim().to_string())
            } else {
                None
            }
        })
    })
}

fn strip_api_prefix(value: &str) -> String {
    let trimmed = value.trim().trim_end_matches('/');
    trimmed
        .strip_suffix("/api/v1")
        .unwrap_or(trimmed)
        .trim_end_matches('/')
        .to_string()
}
