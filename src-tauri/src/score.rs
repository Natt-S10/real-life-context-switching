use crate::types::{AppState, Task};
use serde::{Deserialize, Serialize};

// const aging threshold values
const AGING_THRESHOLDS: [i64; 4] = [
    3 * 60 * 60 * 1000, // 3 hrs
    1 * 60 * 60 * 1000, // 1 hrs
    30 * 60 * 1000, // 30 minutes
    0, // less than 30 minutes
];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoreBreakdown {
    pub urgency: i32,
    pub aging: i32,
    pub batch_bonus: i32,
    pub quick_win: i32,
    pub sla_override: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Recommendation {
    pub task: Task,
    pub score: i32,
    pub breakdown: ScoreBreakdown,
}

pub fn score_task(now: i64, state: &AppState, t: &Task) -> Recommendation {
    if t.done {
        return Recommendation {
            task: t.clone(),
            score: i32::MIN / 2,
            breakdown: ScoreBreakdown { urgency: 0, aging: 0, batch_bonus: 0, quick_win: 0, sla_override: false },
        };
    }

    // Disable urgency for now (only aging + batch supported)
    let urgency = 0;

    let since_touch = now.saturating_sub(t.last_touched_ms);
    let aging = if since_touch >= AGING_THRESHOLDS[0] { 3 }
        else if since_touch >= AGING_THRESHOLDS[1] { 2 }
        else if since_touch >= AGING_THRESHOLDS[2] { 1 }
        else { 0 };

    let mut batch_bonus = 0;
    if let (Some(ctx_tag), Some(ctx_started)) = (&state.current_tag, state.context_started_ms) {
        let within_window = now.saturating_sub(ctx_started) <= 60 * 60 * 1000;
        if within_window && t.tags.iter().any(|tg| tg == ctx_tag) {
            batch_bonus = 2;
        }
    }

    // Disable quick_win and sla_override
    let quick_win = 0;
    let sla_override = false;

    // Score only from aging + batch
    let score = (3 * aging + 2 * batch_bonus) as i32;

    Recommendation { task: t.clone(), score, breakdown: ScoreBreakdown { urgency, aging, batch_bonus, quick_win, sla_override } }
}
