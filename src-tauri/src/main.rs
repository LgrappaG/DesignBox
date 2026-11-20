#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::collections::hash_map::DefaultHasher;
use std::collections::HashSet;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

static TMP_SEQ: AtomicU64 = AtomicU64::new(1);
static SNAP_SEQ: AtomicU64 = AtomicU64::new(1);

struct AppSecurityState {
    authorized_paths: Arc<Mutex<HashSet<String>>>,
    io_lock: Arc<Mutex<()>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ValidationReport {
    pub valid: bool,
    pub platform: String,
    pub notes: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenedProjectPayload {
    pub path: String,
    pub name: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedProjectPayload {
    pub path: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentProjectEntry {
    pub path: String,
    pub name: String,
    pub updated_at_ms: u64,
    pub exists: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotEntry {
    pub id: String,
    pub project_name: String,
    pub created_at_ms: u64,
    pub byte_size: usize,
    pub content_hash: String,
}

fn now_epoch_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn compute_content_hash(content: &str) -> String {
    let mut hasher = DefaultHasher::new();
    content.hash(&mut hasher);
    format!("{:016x}", hasher.finish())
}

fn has_project_extension(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|ext| matches!(ext.to_ascii_lowercase().as_str(), "json" | "dbx"))
        .unwrap_or(false)
}

fn normalize_path_key(path: &Path) -> String {
    let resolved = std::fs::canonicalize(path).unwrap_or_else(|_| {
        if let (Some(parent), Some(name)) = (path.parent(), path.file_name()) {
            if let Ok(canon_parent) = std::fs::canonicalize(parent) {
                return canon_parent.join(name);
            }
        }
        path.to_path_buf()
    });
    let s = resolved.to_string_lossy().to_string();
    #[cfg(windows)]
    {
        s.to_lowercase()
    }
    #[cfg(not(windows))]
    {
        s
    }
}

fn authorize_path(auth: &Arc<Mutex<HashSet<String>>>, path: &Path) {
    if !has_project_extension(path) {
        return;
    }
    if let Ok(mut guard) = auth.lock() {
        guard.insert(normalize_path_key(path));
    }
}

fn is_path_authorized(auth: &Arc<Mutex<HashSet<String>>>, path: &Path) -> bool {
    if !has_project_extension(path) {
        return false;
    }
    auth.lock()
        .map(|guard| guard.contains(&normalize_path_key(path)))
        .unwrap_or(false)
}

fn app_state_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {}", e))?;
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("Failed to create app data directory: {}", e))?;
    Ok(dir)
}

fn snapshots_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app_state_dir(app)?.join("snapshots");
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("Failed to create snapshots directory: {}", e))?;
    Ok(dir)
}

fn recent_index_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app_state_dir(app)?.join("recent_projects.json"))
}

fn snapshots_index_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app_state_dir(app)?.join("snapshots_index.json"))
}

fn display_name_from_path(path: &Path) -> String {
    path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("project.dbx.json")
        .to_string()
}

fn is_windows_reserved_stem(stem: &str) -> bool {
    matches!(
        stem.to_ascii_uppercase().as_str(),
        "CON"
            | "PRN"
            | "AUX"
            | "NUL"
            | "COM1"
            | "COM2"
            | "COM3"
            | "COM4"
            | "COM5"
            | "COM6"
            | "COM7"
            | "COM8"
            | "COM9"
            | "LPT1"
            | "LPT2"
            | "LPT3"
            | "LPT4"
            | "LPT5"
            | "LPT6"
            | "LPT7"
            | "LPT8"
            | "LPT9"
    )
}

fn sanitize_basename(filename: &str, fallback: &str) -> String {
    let base = Path::new(filename)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(fallback);
    let cleaned: String = base
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || matches!(c, '.' | '-' | '_' | ' ') {
                c
            } else {
                '_'
            }
        })
        .collect();
    let trimmed = cleaned.trim_matches(|c: char| c == '.' || c.is_whitespace());
    if trimmed.is_empty() {
        return fallback.to_string();
    }
    let stem = trimmed.split('.').next().unwrap_or(trimmed);
    if is_windows_reserved_stem(stem) {
        format!("_{}", trimmed)
    } else {
        trimmed.to_string()
    }
}

fn write_file_atomic(target: &Path, content: &str) -> Result<(), String> {
    use std::io::Write;
    if let Some(parent) = target.parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create parent directory: {}", e))?;
        }
    }
    let file_name = target
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("designbox");
    let seq = TMP_SEQ.fetch_add(1, Ordering::Relaxed);
    let pid = std::process::id();
    let tmp_path = target.with_file_name(format!(".{}.{}.{}.{}.tmp", file_name, pid, now_epoch_ms(), seq));
    {
        let mut file = std::fs::File::create(&tmp_path)
            .map_err(|e| format!("Failed to create temp file: {}", e))?;
        if let Err(write_err) = file.write_all(content.as_bytes()) {
            drop(file);
            let _ = std::fs::remove_file(&tmp_path);
            return Err(format!("Failed to write temp file: {}", write_err));
        }
        let _ = file.sync_all();
    }
    if let Err(rename_err) = std::fs::rename(&tmp_path, target) {
        if target.exists() {
            let copy_res = std::fs::copy(&tmp_path, target);
            let _ = std::fs::remove_file(&tmp_path);
            copy_res.map_err(|copy_err| {
                format!("Failed to replace target file ({}): {}", rename_err, copy_err)
            })?;
        } else {
            let _ = std::fs::remove_file(&tmp_path);
            return Err(format!("Failed to finalize temp file: {}", rename_err));
        }
    }
    Ok(())
}

fn record_recent_project(
    app: &tauri::AppHandle,
    io_lock: &Arc<Mutex<()>>,
    path_str: &str,
) -> Result<(), String> {
    let _guard = io_lock
        .lock()
        .map_err(|_| "Failed to acquire recent projects lock.".to_string())?;
    let index_path = recent_index_path(app)?;
    let mut entries: Vec<RecentProjectEntry> = if index_path.exists() {
        let raw = std::fs::read_to_string(&index_path).unwrap_or_default();
        serde_json::from_str(&raw).unwrap_or_default()
    } else {
        Vec::new()
    };

    entries.retain(|item| !item.path.eq_ignore_ascii_case(path_str));
    entries.insert(
        0,
        RecentProjectEntry {
            path: path_str.to_string(),
            name: display_name_from_path(Path::new(path_str)),
            updated_at_ms: now_epoch_ms(),
            exists: Path::new(path_str).exists(),
        },
    );
    entries.truncate(10);

    let serialized = serde_json::to_string_pretty(&entries)
        .map_err(|e| format!("Failed to serialize recent projects: {}", e))?;
    write_file_atomic(&index_path, &serialized)?;
    Ok(())
}

#[tauri::command]
fn validate_platform_snippet(html: String, platform: String) -> ValidationReport {
    let mut notes = Vec::new();
    let lower = html.to_lowercase();
    let is_toyhouse = platform.starts_with("toyhouse");
    let is_toyhouse_free = platform == "toyhouse_free" || platform == "toyhouse_oc";

    let has_script = lower.contains("<script");
    let has_iframe = lower.contains("<iframe");

    if has_script {
        notes.push("JavaScript (<script>) is stripped by Toyhouse and restricted embeds.".into());
    }
    if is_toyhouse && has_iframe {
        notes.push("<iframe> tags are stripped by Toyhouse HTML sanitizer.".into());
    }
    if is_toyhouse && (lower.contains("onload=") || lower.contains("onerror=") || lower.contains("onclick=")) {
        notes.push("Inline JS event attributes (onclick/onload/onerror) are stripped on Toyhouse.".into());
    }
    if is_toyhouse_free && lower.contains("<style") {
        notes.push("F2U / Free mode forbids custom <style> tags (requires Toyhouse Premium CSS).".into());
    }
    if is_toyhouse && lower.contains("position: fixed") {
        notes.push("CSS position: fixed may be stripped or bounded by Toyhouse character containers.".into());
    }
    if lower.contains("data:image/") || lower.contains("blob:") {
        notes.push(
            "Embedded local DataURL/blob image detected; upload to ImgBB or external HTTPS URL before publishing to Toyhouse."
                .into(),
        );
    }

    ValidationReport {
        valid: !has_script && !(is_toyhouse && has_iframe),
        platform,
        notes,
    }
}

#[tauri::command]
async fn save_project_to_disk(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppSecurityState>,
    filename: String,
    content: String,
) -> Result<String, String> {
    let auth = state.authorized_paths.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let target_dir = app
            .path()
            .download_dir()
            .ok()
            .filter(|p| p.exists())
            .or_else(|| {
                std::env::var_os("USERPROFILE")
                    .or_else(|| std::env::var_os("HOME"))
                    .map(PathBuf::from)
                    .map(|home| {
                        let dl = home.join("Downloads");
                        if dl.exists() {
                            dl
                        } else {
                            home.join("Desktop")
                        }
                    })
            })
            .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());

        let mut safe_name = sanitize_basename(&filename, "designbox-project.dbx.json");
        if !has_project_extension(Path::new(&safe_name)) {
            safe_name.push_str(".dbx.json");
        }
        let full_path = target_dir.join(safe_name);
        write_file_atomic(&full_path, &content)?;
        authorize_path(&auth, &full_path);
        Ok(full_path.to_string_lossy().to_string())
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
async fn open_project_dialog(
    window: tauri::Window,
    app: tauri::AppHandle,
    state: tauri::State<'_, AppSecurityState>,
) -> Result<Option<OpenedProjectPayload>, String> {
    let auth = state.authorized_paths.clone();
    let io_lock = state.io_lock.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let selected = rfd::FileDialog::new()
            .set_parent(&window)
            .set_title("Open DesignBox Project")
            .add_filter("DesignBox Project", &["dbx", "json"])
            .pick_file();

        let Some(path) = selected else {
            return Ok(None);
        };
        if !has_project_extension(&path) {
            return Err("Selected file must have a .json or .dbx extension.".into());
        }

        let content = std::fs::read_to_string(&path)
            .map_err(|e| format!("Failed to read project file: {}", e))?;
        authorize_path(&auth, &path);
        let path_str = path.to_string_lossy().to_string();
        let _ = record_recent_project(&app, &io_lock, &path_str);

        Ok(Some(OpenedProjectPayload {
            name: display_name_from_path(&path),
            path: path_str,
            content,
        }))
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
async fn save_project_dialog(
    window: tauri::Window,
    app: tauri::AppHandle,
    state: tauri::State<'_, AppSecurityState>,
    suggested_name: String,
    content: String,
) -> Result<Option<SavedProjectPayload>, String> {
    let auth = state.authorized_paths.clone();
    let io_lock = state.io_lock.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let safe_suggested = sanitize_basename(&suggested_name, "designbox-project.dbx.json");
        let selected = rfd::FileDialog::new()
            .set_parent(&window)
            .set_title("Save DesignBox Project As")
            .set_file_name(&safe_suggested)
            .add_filter("DesignBox Project", &["dbx", "json"])
            .save_file();

        let Some(path) = selected else {
            return Ok(None);
        };
        if !has_project_extension(&path) {
            return Err("Project files must be saved with a .json or .dbx extension.".into());
        }

        write_file_atomic(&path, &content)?;
        authorize_path(&auth, &path);
        let path_str = path.to_string_lossy().to_string();
        let _ = record_recent_project(&app, &io_lock, &path_str);

        Ok(Some(SavedProjectPayload {
            name: display_name_from_path(&path),
            path: path_str,
        }))
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
async fn export_html_dialog(
    window: tauri::Window,
    suggested_name: String,
    html: String,
) -> Result<Option<SavedProjectPayload>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let safe_suggested = sanitize_basename(&suggested_name, "designbox-export.html");
        let selected = rfd::FileDialog::new()
            .set_parent(&window)
            .set_title("Export DesignBox HTML")
            .set_file_name(&safe_suggested)
            .add_filter("HTML Document", &["html", "htm"])
            .save_file();

        let Some(path) = selected else {
            return Ok(None);
        };

        write_file_atomic(&path, &html)?;
        let path_str = path.to_string_lossy().to_string();

        Ok(Some(SavedProjectPayload {
            name: display_name_from_path(&path),
            path: path_str,
        }))
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
async fn save_project_at_path(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppSecurityState>,
    path: String,
    content: String,
) -> Result<SavedProjectPayload, String> {
    let auth = state.authorized_paths.clone();
    let io_lock = state.io_lock.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let target = PathBuf::from(&path);
        if !is_path_authorized(&auth, &target) {
            return Err(
                "Access denied: project path must be authorized via Open/Save dialog.".into(),
            );
        }
        write_file_atomic(&target, &content)?;
        let _ = record_recent_project(&app, &io_lock, &path);

        Ok(SavedProjectPayload {
            name: display_name_from_path(&target),
            path,
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
async fn read_project_file(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppSecurityState>,
    path: String,
) -> Result<OpenedProjectPayload, String> {
    let auth = state.authorized_paths.clone();
    let io_lock = state.io_lock.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let target = PathBuf::from(&path);
        if !is_path_authorized(&auth, &target) {
            return Err(
                "Access denied: project path must be authorized via Open/Save dialog or Recent Projects."
                    .into(),
            );
        }
        let content = std::fs::read_to_string(&target)
            .map_err(|e| format!("Failed to read project file: {}", e))?;
        let _ = record_recent_project(&app, &io_lock, &path);

        Ok(OpenedProjectPayload {
            name: display_name_from_path(&target),
            path,
            content,
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
async fn get_recent_projects(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppSecurityState>,
) -> Result<Vec<RecentProjectEntry>, String> {
    let auth = state.authorized_paths.clone();
    let io_lock = state.io_lock.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = io_lock
            .lock()
            .map_err(|_| "Failed to acquire recent projects lock.".to_string())?;
        let index_path = recent_index_path(&app)?;
        if !index_path.exists() {
            return Ok(Vec::new());
        }
        let raw = std::fs::read_to_string(&index_path)
            .map_err(|e| format!("Failed to read recent projects: {}", e))?;
        let mut entries: Vec<RecentProjectEntry> = serde_json::from_str(&raw).unwrap_or_default();
        for entry in &mut entries {
            let p = Path::new(&entry.path);
            entry.exists = p.exists();
            authorize_path(&auth, p);
        }
        Ok(entries)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
async fn save_local_snapshot(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppSecurityState>,
    project_name: String,
    content: String,
) -> Result<SnapshotEntry, String> {
    let io_lock = state.io_lock.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = io_lock
            .lock()
            .map_err(|_| "Failed to acquire snapshot lock.".to_string())?;
        let snap_dir = snapshots_dir(&app)?;
        let idx_path = snapshots_index_path(&app)?;
        let mut entries: Vec<SnapshotEntry> = if idx_path.exists() {
            let raw = std::fs::read_to_string(&idx_path).unwrap_or_default();
            serde_json::from_str(&raw).unwrap_or_default()
        } else {
            Vec::new()
        };

        let content_hash = compute_content_hash(&content);
        if let Some(latest) = entries.first() {
            if latest.content_hash == content_hash && snap_dir.join(&latest.id).exists() {
                return Ok(latest.clone());
            }
        }

        let ts = now_epoch_ms();
        let seq = SNAP_SEQ.fetch_add(1, Ordering::Relaxed);
        let id = format!("snap_{}_{}.dbx.json", ts, seq);
        let file_path = snap_dir.join(&id);
        write_file_atomic(&file_path, &content)?;

        let entry = SnapshotEntry {
            id: id.clone(),
            project_name: sanitize_basename(&project_name, "Untitled Project"),
            created_at_ms: ts,
            byte_size: content.len(),
            content_hash,
        };

        entries.insert(0, entry.clone());
        while entries.len() > 15 {
            if let Some(removed) = entries.pop() {
                let old_file = snap_dir.join(&removed.id);
                let _ = std::fs::remove_file(old_file);
            }
        }

        let serialized = serde_json::to_string_pretty(&entries)
            .map_err(|e| format!("Failed to serialize snapshot index: {}", e))?;
        write_file_atomic(&idx_path, &serialized)?;

        Ok(entry)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
async fn list_local_snapshots(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppSecurityState>,
) -> Result<Vec<SnapshotEntry>, String> {
    let io_lock = state.io_lock.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = io_lock
            .lock()
            .map_err(|_| "Failed to acquire snapshot lock.".to_string())?;
        let snap_dir = snapshots_dir(&app)?;
        let idx_path = snapshots_index_path(&app)?;
        if !idx_path.exists() {
            return Ok(Vec::new());
        }
        let raw = std::fs::read_to_string(&idx_path)
            .map_err(|e| format!("Failed to read snapshot index: {}", e))?;
        let mut entries: Vec<SnapshotEntry> = serde_json::from_str(&raw).unwrap_or_default();
        entries.retain(|item| snap_dir.join(&item.id).exists());
        Ok(entries)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
async fn load_local_snapshot(
    app: tauri::AppHandle,
    snapshot_id: String,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let valid_id = !snapshot_id.is_empty()
            && snapshot_id
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '-' | '.'));
        if !valid_id || snapshot_id.contains("..") {
            return Err("Invalid snapshot identifier.".into());
        }

        let file_path = snapshots_dir(&app)?.join(&snapshot_id);
        std::fs::read_to_string(&file_path)
            .map_err(|e| format!("Failed to read local snapshot: {}", e))
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

fn main() {
    tauri::Builder::default()
        .manage(AppSecurityState {
            authorized_paths: Arc::new(Mutex::new(HashSet::new())),
            io_lock: Arc::new(Mutex::new(())),
        })
        .setup(|app| {
            let state = app.state::<AppSecurityState>();
            if let Ok(index_path) = recent_index_path(app.handle()) {
                if index_path.exists() {
                    if let Ok(raw) = std::fs::read_to_string(&index_path) {
                        if let Ok(entries) = serde_json::from_str::<Vec<RecentProjectEntry>>(&raw) {
                            for entry in entries {
                                authorize_path(&state.authorized_paths, Path::new(&entry.path));
                            }
                        }
                    }
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            validate_platform_snippet,
            save_project_to_disk,
            open_project_dialog,
            save_project_dialog,
            export_html_dialog,
            save_project_at_path,
            read_project_file,
            get_recent_projects,
            save_local_snapshot,
            list_local_snapshots,
            load_local_snapshot
        ])
        .run(tauri::generate_context!())
        .expect("error while running DesignBox Tauri application");
}
