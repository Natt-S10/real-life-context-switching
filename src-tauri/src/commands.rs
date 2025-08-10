use crate::housekeeping::{sweep_archive_for_today, sweep_hard_delete};
use crate::domain::{compute_recommendation, compute_scored_tasks, compute_sorted_tasks};
use crate::types::{now_ms, SharedState, Status, Task};

#[tauri::command]
pub fn list_tasks(state: tauri::State<SharedState>) -> Vec<Task> {
    let mut s = state.lock().unwrap();
    // Auto-sweep on read
    sweep_archive_for_today(&mut s);
    sweep_hard_delete(&mut s);
    s.tasks.clone()
}

#[tauri::command]
pub fn add_task(
    state: tauri::State<SharedState>,
    title: String,
    notes: Option<String>,
    tags: Option<Vec<String>>,      // keep API but we’ll set status Active by default
    due_ts: Option<i64>,            // ignored by your simplified flow
    est_min: Option<u32>,           // ignored by your simplified flow
    _status: Option<Status>,         // ignored; we enforce Active on add
) -> Task {
    let mut s = state.lock().unwrap();

    // Single-thread rule: park all non-done tasks
    for t in s.tasks.iter_mut() {
        if !t.done {
            t.status = Status::Parked;
        }
    }

    let now = now_ms();
    let tags = tags.unwrap_or_default();
    let task = Task {
        id: { s.next_id += 1; s.next_id },
        title,
        notes,
        done: false,
        tags: tags.clone(),
        due_ts,
        est_min,
        last_touched_ms: now,
        status: Status::Active, // new task is in progress
    };

    // Update batching context from first tag, if any
    if let Some(first_tag) = task.tags.first().cloned() {
        s.current_tag = Some(first_tag);
        s.context_started_ms = Some(now);
    }

    s.tasks.push(task.clone());
    task
}

#[tauri::command]
pub fn remove_task(state: tauri::State<SharedState>, id: u64) -> bool {
    let mut s = state.lock().unwrap();
    let before = s.tasks.len();
    s.tasks.retain(|t| t.id != id);
    before != s.tasks.len()
}

#[tauri::command]
pub fn toggle_task(state: tauri::State<SharedState>, id: u64) -> Option<Task> {
    let mut s = state.lock().unwrap();
    if let Some(t) = s.tasks.iter_mut().find(|t| t.id == id) {
        t.done = !t.done;
        t.last_touched_ms = now_ms();
        return Some(t.clone());
    }
    None
}

#[tauri::command]
pub fn set_task_status(state: tauri::State<SharedState>, id: u64, status: Status) -> Option<Task> {
    let mut s = state.lock().unwrap();
    let now = now_ms();

    // Find target index first
    let target_index = match s.tasks.iter().position(|t| t.id == id) {
        Some(i) => i,
        None => return None,
    };

    if status == Status::Active {
        // Park all other non-done tasks (single-thread rule)
        let len = s.tasks.len();
        for i in 0..len {
            if i != target_index && !s.tasks[i].done {
                s.tasks[i].status = Status::Parked;
            }
        }
    }

    // Capture first tag before mutating other app state
    let first_tag = s.tasks[target_index].tags.first().cloned();

    // Update the task
    s.tasks[target_index].status = status.clone();
    s.tasks[target_index].last_touched_ms = now;

    if status == Status::Active {
        if let Some(tag) = first_tag {
            s.current_tag = Some(tag);
            s.context_started_ms = Some(now);
        }
    }

    Some(s.tasks[target_index].clone())
}

#[tauri::command]
pub fn soft_delete_task(state: tauri::State<SharedState>, id: u64) -> Option<Task> {
    let mut s = state.lock().unwrap();
    if let Some(t) = s.tasks.iter_mut().find(|t| t.id == id) {
        t.status = Status::Deleted;
        t.last_touched_ms = now_ms();
        return Some(t.clone());
    }
    None
}

#[tauri::command]
pub fn recommend_next(state: tauri::State<SharedState>) -> Option<crate::score::Recommendation> {
    let now = now_ms();
    let mut s = state.lock().unwrap();
    sweep_archive_for_today(&mut s);
    sweep_hard_delete(&mut s);
    compute_recommendation(now, &s)
}

#[tauri::command]
pub fn list_tasks_sorted(state: tauri::State<SharedState>) -> Vec<Task> {
    let now = now_ms();
    let mut s = state.lock().unwrap();
    sweep_archive_for_today(&mut s);
    sweep_hard_delete(&mut s);
    compute_sorted_tasks(now, &s)
}

#[tauri::command]
pub fn sweep_archive(state: tauri::State<SharedState>) -> usize {
    let mut s = state.lock().unwrap();
    sweep_archive_for_today(&mut s)
}

#[tauri::command]
pub fn list_tasks_scored(state: tauri::State<SharedState>) -> Vec<crate::score::Recommendation> {
    let now = now_ms();
    let mut s = state.lock().unwrap();
    sweep_archive_for_today(&mut s);
    sweep_hard_delete(&mut s);
    compute_scored_tasks(now, &s)
}
