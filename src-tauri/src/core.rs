use crate::score::{score_task, Recommendation};
use crate::types::{AppState, Status, Task};

// Pure: compute the next recommendation from immutable state
pub fn compute_recommendation(now_ms: i64, state: &AppState) -> Option<Recommendation> {
    let mut recs: Vec<Recommendation> = state
        .tasks
        .iter()
        .filter(|t| !t.done && t.status != Status::Blocked && t.status != Status::Archived)
        .map(|t| score_task(now_ms, state, t))
        .collect();

    if recs.is_empty() {
        return None;
    }

    recs.sort_by(|a, b| {
        b.score
            .cmp(&a.score)
            .then_with(|| a.task.last_touched_ms.cmp(&b.task.last_touched_ms))
            .then_with(|| a.task.due_ts.cmp(&b.task.due_ts))
    });

    recs.into_iter().next()
}

// Pure: compute the sorted task list (filters archived)
pub fn compute_sorted_tasks(now_ms: i64, state: &AppState) -> Vec<Task> {
    let mut recs: Vec<(Task, i32)> = state
        .tasks
        .iter()
        .filter(|t| t.status != Status::Archived)
        .map(|t| {
            let rec = score_task(now_ms, state, t);
            (rec.task, rec.score)
        })
        .collect();

    recs.sort_by(|a, b| {
        let (ref ta, sa) = a;
        let (ref tb, sb) = b;
        ta.done
            .cmp(&tb.done)
            .then_with(|| {
                if !ta.done && !tb.done {
                    sb.cmp(&sa)
                        .then_with(|| ta.last_touched_ms.cmp(&tb.last_touched_ms))
                        .then_with(|| ta.due_ts.cmp(&tb.due_ts))
                } else {
                    let atag = ta.tags.first().cloned().unwrap_or_default();
                    let btag = tb.tags.first().cloned().unwrap_or_default();
                    atag.cmp(&btag).then_with(|| ta.title.cmp(&tb.title))
                }
            })
    });

    recs.into_iter().map(|(t, _)| t).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::Task;

    fn mk_task(id: u64, status: Status, done: bool, last_touched_ms: i64) -> Task {
        Task {
            id,
            title: format!("t{id}"),
            notes: None,
            done,
            tags: vec![],
            due_ts: None,
            est_min: None,
            last_touched_ms,
            status,
        }
    }

    #[test]
    fn compute_recommendation_excludes_done_blocked_archived() {
        let now = 1_700_000_000_000; // arbitrary
        let mut state = AppState::default();
        state.tasks = vec![
            mk_task(1, Status::Active, true, now),      // done -> ineligible
            mk_task(2, Status::Blocked, false, now),    // blocked -> ineligible
            mk_task(3, Status::Archived, false, now),   // archived -> ineligible
            mk_task(4, Status::Parked, false, now),     // only eligible
        ];
        let rec = compute_recommendation(now, &state);
        assert!(rec.is_some());
        assert_eq!(rec.unwrap().task.id, 4);
    }

    #[test]
    fn compute_sorted_tasks_filters_archived() {
        let now = 1_700_000_000_000; // arbitrary
        let mut state = AppState::default();
        state.tasks = vec![
            mk_task(1, Status::Archived, false, now),
            mk_task(2, Status::Active, false, now),
            mk_task(3, Status::Parked, true, now),
        ];
        let out = compute_sorted_tasks(now, &state);
        let ids: Vec<u64> = out.into_iter().map(|t| t.id).collect();
        assert!(ids.contains(&2));
        assert!(ids.contains(&3));
        assert!(!ids.contains(&1)); // archived filtered
    }
}
