use crate::types::{AppState, Status};

// Archive tasks completed before the current local day
pub fn sweep_archive_for_today(s: &mut AppState) -> usize {
    let today = chrono::Local::now().date_naive();
    let mut count = 0;
    for t in s.tasks.iter_mut() {
        if t.done && t.status != Status::Archived {
            if let Some(dt_utc) = chrono::DateTime::<chrono::Utc>::from_timestamp_millis(t.last_touched_ms) {
                let local_date = dt_utc.with_timezone(&chrono::Local).date_naive();
                if local_date < today {
                    t.status = Status::Archived;
                    count += 1;
                }
            }
        }
    }
    count
}

// Permanently remove tasks soft-deleted for more than 30 days
pub fn sweep_hard_delete(s: &mut AppState) -> usize {
    let now = crate::types::now_ms();
    let thirty_days_ms: i64 = 30 * 86_400_000;
    let before = s.tasks.len();
    s.tasks.retain(|t| {
        if matches!(t.status, Status::Deleted) {
            let age = now.saturating_sub(t.last_touched_ms);
            return age < thirty_days_ms;
        }
        true
    });
    before.saturating_sub(s.tasks.len())
}
