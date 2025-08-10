use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum Status {
    Active,
    Parked,
    Blocked,
    Archived,
    Deleted,
}

impl Default for Status {
    fn default() -> Self {
        Status::Parked
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: u64,
    pub title: String,
    pub notes: Option<String>,
    pub done: bool,
    pub tags: Vec<String>,
    pub due_ts: Option<i64>,
    pub est_min: Option<u32>,
    pub last_touched_ms: i64,
    pub status: Status,
}

#[derive(Default)]
pub struct AppState {
    pub tasks: Vec<Task>,
    pub next_id: u64,
    pub current_tag: Option<String>,
    pub context_started_ms: Option<i64>,
}

pub type SharedState = Arc<Mutex<AppState>>;

pub fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or(Duration::from_millis(0))
        .as_millis() as i64
}
