#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

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

fn sanitize_basename(filename: &str, fallback: &str) -> String {
    let base = Path::new(filename)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(fallback);
    let cleaned: String = base
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_' | ' ') {
                c
            } else {
                '_'
            }
        })
        .collect();
    if cleaned.trim().is_empty() {
        fallback.to_string()
    } else {
        cleaned
    }
}

fn record_recent_project(app: &tauri::AppHandle, path_str: &str) -> Result<(), String> {
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
    std::fs::write(&index_path, serialized)
        .map_err(|e| format!("Failed to write recent projects: {}", e))?;
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
fn save_project_to_disk(filename: String, content: String) -> Result<String, String> {
    let base_dir = std::env::var("USERPROFILE")
        .map(PathBuf::from)
        .unwrap_or_else(|_| std::env::current_dir().unwrap_or_default());

    let downloads_dir = base_dir.join("Downloads");
    let target_dir = if downloads_dir.exists() {
        downloads_dir
    } else {
        base_dir.join("Desktop")
    };

    let safe_name = sanitize_basename(&filename, "designbox-project.dbx.json");
    let full_path = target_dir.join(safe_name);
    std::fs::write(&full_path, content).map_err(|e| format!("Failed to write file: {}", e))?;
    Ok(full_path.to_string_lossy().to_string())
}

#[tauri::command]
fn open_project_dialog(
    window: tauri::Window,
    app: tauri::AppHandle,
) -> Result<Option<OpenedProjectPayload>, String> {
    let selected = rfd::FileDialog::new()
        .set_parent(&window)
        .set_title("Open DesignBox Project")
        .add_filter("DesignBox Project", &["dbx", "json"])
        .pick_file();

    let Some(path) = selected else {
        return Ok(None);
    };

    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read project file: {}", e))?;
    let path_str = path.to_string_lossy().to_string();
    let _ = record_recent_project(&app, &path_str);

    Ok(Some(OpenedProjectPayload {
        name: display_name_from_path(&path),
        path: path_str,
        content,
    }))
}

#[tauri::command]
fn save_project_dialog(
    window: tauri::Window,
    app: tauri::AppHandle,
    suggested_name: String,
    content: String,
) -> Result<Option<SavedProjectPayload>, String> {
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

    std::fs::write(&path, &content)
        .map_err(|e| format!("Failed to save project file: {}", e))?;
    let path_str = path.to_string_lossy().to_string();
    let _ = record_recent_project(&app, &path_str);

    Ok(Some(SavedProjectPayload {
        name: display_name_from_path(&path),
        path: path_str,
    }))
}

#[tauri::command]
fn save_project_at_path(
    app: tauri::AppHandle,
    path: String,
    content: String,
) -> Result<SavedProjectPayload, String> {
    let target = PathBuf::from(&path);
    std::fs::write(&target, &content)
        .map_err(|e| format!("Failed to write project file: {}", e))?;
    let _ = record_recent_project(&app, &path);

    Ok(SavedProjectPayload {
        name: display_name_from_path(&target),
        path,
    })
}

#[tauri::command]
fn read_project_file(
    app: tauri::AppHandle,
    path: String,
) -> Result<OpenedProjectPayload, String> {
    let target = PathBuf::from(&path);
    let content = std::fs::read_to_string(&target)
        .map_err(|e| format!("Failed to read project file: {}", e))?;
    let _ = record_recent_project(&app, &path);

    Ok(OpenedProjectPayload {
        name: display_name_from_path(&target),
        path,
        content,
    })
}

#[tauri::command]
fn get_recent_projects(app: tauri::AppHandle) -> Result<Vec<RecentProjectEntry>, String> {
    let index_path = recent_index_path(&app)?;
    if !index_path.exists() {
        return Ok(Vec::new());
    }
    let raw = std::fs::read_to_string(&index_path)
        .map_err(|e| format!("Failed to read recent projects: {}", e))?;
    let mut entries: Vec<RecentProjectEntry> = serde_json::from_str(&raw).unwrap_or_default();
    for entry in &mut entries {
        entry.exists = Path::new(&entry.path).exists();
    }
    Ok(entries)
}

#[tauri::command]
fn save_local_snapshot(
    app: tauri::AppHandle,
    project_name: String,
    content: String,
) -> Result<SnapshotEntry, String> {
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
    let id = format!("snap_{}.dbx.json", ts);
    let file_path = snap_dir.join(&id);
    std::fs::write(&file_path, &content)
        .map_err(|e| format!("Failed to write snapshot file: {}", e))?;

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
    std::fs::write(&idx_path, serialized)
        .map_err(|e| format!("Failed to save snapshot index: {}", e))?;

    Ok(entry)
}

#[tauri::command]
fn list_local_snapshots(app: tauri::AppHandle) -> Result<Vec<SnapshotEntry>, String> {
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
}

#[tauri::command]
fn load_local_snapshot(app: tauri::AppHandle, snapshot_id: String) -> Result<String, String> {
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
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            validate_platform_snippet,
            save_project_to_disk,
            open_project_dialog,
            save_project_dialog,
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
