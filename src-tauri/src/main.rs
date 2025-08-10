#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod types;
mod score;
mod commands;
mod housekeeping;
mod persistence;
mod domain;

use crate::commands::{
    add_task, list_tasks, list_tasks_sorted, recommend_next, remove_task, set_task_status,
    sweep_archive, toggle_task, list_tasks_scored, soft_delete_task,
};
use crate::types::{AppState, SharedState};
use crate::persistence::{export_tasks_to_json, import_tasks_from_json};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use tauri::Manager;

fn main() {
    let state: SharedState = Arc::new(Mutex::new(AppState {
        tasks: vec![],
        next_id: 0,
        current_tag: None,
        context_started_ms: None,
    }));
    let close_once = Arc::new(AtomicBool::new(false));

    tauri::Builder::default()
        .manage(state.clone())
        .invoke_handler(tauri::generate_handler![
            list_tasks,
            add_task,
            remove_task,
            toggle_task,
            set_task_status,
            recommend_next,
            list_tasks_sorted,
            sweep_archive,
            list_tasks_scored,
            soft_delete_task
        ])
        .setup({
            let state = state.clone();
            move |app| {
                import_tasks_from_json(&app.handle(), &state);
                Ok(())
            }
        })
        .on_window_event({
            let state = state.clone();
            let close_once = close_once.clone();
            move |window, event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    // Run export exactly once, then allow the window to close.
                    if !close_once.swap(true, Ordering::SeqCst) {
                        api.prevent_close();
                        let app = window.app_handle();
                        export_tasks_to_json(&app, &state);
                        let _ = window.close();
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
