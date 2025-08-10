use crate::housekeeping::sweep_archive_for_today;
use crate::types::{SharedState, Status};
use std::fs;
use tauri::Manager;

pub fn export_tasks_to_json(app: &tauri::AppHandle, state: &SharedState) {
    let tasks = {
        let mut s = state.lock().unwrap();
        // Ensure we archive before exporting
        sweep_archive_for_today(&mut s);
        // Park any active (non-done) task on exit
        for t in s.tasks.iter_mut() {
            if !t.done && matches!(t.status, Status::Active) {
                t.status = Status::Parked;
            }
        }
        // Clear batching context so next session doesn't inherit it
        s.current_tag = None;
        s.context_started_ms = None;
        serde_json::to_value(&s.tasks).unwrap_or(serde_json::json!([]))
    };

    if let Ok(mut dir) = app.path().app_data_dir() {
        if let Err(e) = std::fs::create_dir_all(&dir) {
            eprintln!("Failed to create app data dir: {e}");
            return;
        }
        dir.push("tasks-export.json");
        if let Err(e) = fs::write(&dir, serde_json::to_vec_pretty(&tasks).unwrap()) {
            eprintln!("Failed to write tasks JSON: {e}");
        } else {
            println!("Exported tasks to {:?}", dir);
        }
    } else {
        eprintln!("Could not resolve app data dir");
    }
}

pub fn import_tasks_from_json(app: &tauri::AppHandle, state: &SharedState) {
    if let Ok(mut path) = app.path().app_data_dir() {
        path.push("tasks-export.json");
        match fs::read_to_string(&path) {
            Ok(content) => {
                match serde_json::from_str::<serde_json::Value>(&content) {
                    Ok(val) => {
                        let tasks_val = match val {
                            serde_json::Value::Array(_) => val,
                            // In case we later change the shape, try to pull `tasks` field
                            serde_json::Value::Object(map) => map.get("tasks").cloned().unwrap_or(serde_json::json!([])),
                            _ => serde_json::json!([]),
                        };
                        let tasks: Vec<crate::types::Task> = serde_json::from_value(tasks_val).unwrap_or_default();
                        let mut s = state.lock().unwrap();
                        if !tasks.is_empty() {
                            let max_id = tasks.iter().map(|t| t.id).max().unwrap_or(0);
                            s.tasks = tasks;
                            s.next_id = max_id;
                            // We don't try to restore batching context here.
                        }
                    }
                    Err(e) => {
                        eprintln!("Failed parsing tasks JSON: {e}");
                    }
                }
            }
            Err(_e) => {
                // No prior file yet; start empty.
            }
        }
    }
}
