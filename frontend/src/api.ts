export type Status = 'Active' | 'Parked' | 'Blocked' | 'Archived' | 'Deleted';

export interface Task {
  id: number;
  title: string;
  notes: string | null;
  done: boolean;
  tags: string[];
  due_ts: number | null;
  est_min: number | null;
  last_touched_ms: number;
  status: Status;
}

export interface ScoreBreakdown { urgency: number; aging: number; batch_bonus: number; quick_win: number; sla_override: boolean; }
export interface Recommendation { task: Task; score: number; breakdown: ScoreBreakdown }

let cachedInvoke: ((cmd: string, args?: any) => Promise<any>) | null = null;

const getTauriInvoke = async (): Promise<((cmd: string, args?: any) => Promise<any>) | null> => {
  if (cachedInvoke) return cachedInvoke;
  try {
    const mod = await import('@tauri-apps/api/core');
    if (mod && typeof mod.invoke === 'function') {
      cachedInvoke = mod.invoke;
      return cachedInvoke;
    }
  } catch {}
  const g: any = (window as any).__TAURI__ || {};
  const fn = (g.core && typeof g.core.invoke === 'function') ? g.core.invoke : (g.tauri && typeof g.tauri.invoke === 'function') ? g.tauri.invoke : null;
  if (fn) {
    cachedInvoke = fn;
    return cachedInvoke;
  }
  return null;
};

// Local storage fallback
interface LocalState { tasks: Task[]; next_id: number; current_tag: string | null; context_started_ms: number | null; }
const LS_KEY = 'rlcs_tasks_state_v1';
const loadState = (): LocalState => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { tasks: [], next_id: 0, current_tag: null, context_started_ms: null };
    const parsed = JSON.parse(raw);
    return { tasks: parsed.tasks ?? [], next_id: parsed.next_id ?? 0, current_tag: parsed.current_tag ?? null, context_started_ms: parsed.context_started_ms ?? null };
  } catch { return { tasks: [], next_id: 0, current_tag: null, context_started_ms: null }; }
};
const saveState = (s: LocalState) => localStorage.setItem(LS_KEY, JSON.stringify(s));
const nowMs = () => Date.now();

const browserInvoke = async (cmd: string, args: any = {}): Promise<any> => {
  const state = loadState();
  switch (cmd) {
    case 'list_tasks_sorted': {
      const now = nowMs();
      const withinBatch = state.context_started_ms && (now - (state.context_started_ms || 0)) <= 60 * 60 * 1000;
      const scoreTask = (t: Task) => {
        if (t.done) return { score: -1e9, t };
        const dt = Math.max(0, now - (t.last_touched_ms || 0));
        const aging = dt >= 3 * 86_400_000 ? 3 : dt >= 86_400_000 ? 2 : dt >= 6 * 60 * 60 * 1000 ? 1 : 0;
        const batch = withinBatch && state.current_tag && t.tags?.includes(state.current_tag) ? 2 : 0;
        const score = 3 * aging + 2 * batch; // only aging + batch
        return { score, t };
      };
      const arr = state.tasks.slice();
      arr.sort((a: Task, b: Task) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        if (!a.done && !b.done) {
          const sa = scoreTask(a).score; const sb = scoreTask(b).score;
          if (sb !== sa) return sb - sa;
          if (a.last_touched_ms !== b.last_touched_ms) return a.last_touched_ms - b.last_touched_ms;
          return (a.due_ts ?? 0) - (b.due_ts ?? 0);
        } else {
          const atag = (a.tags?.[0] || '').localeCompare(b.tags?.[0] || '');
          if (atag !== 0) return atag;
          return (a.title || '').localeCompare(b.title || '');
        }
      });
      return arr;
    }
    case 'add_task': {
      const title = (args?.title || '').trim();
      const tags: string[] = Array.isArray(args?.tags) ? args.tags.filter(Boolean) : [];
      if (!title) throw new Error('Title required');
      state.tasks.forEach(t => { if (!t.done) t.status = 'Parked'; });
      state.next_id += 1;
      const task: Task = { id: state.next_id, title, notes: null, done: false, tags, due_ts: null, est_min: null, last_touched_ms: nowMs(), status: 'Active' };
      if (task.tags.length) { state.current_tag = task.tags[0]; state.context_started_ms = task.last_touched_ms; }
      state.tasks.push(task); saveState(state); return task;
    }
    case 'remove_task': {
      const id = Number(args?.id); const before = state.tasks.length; const tasks = state.tasks.filter((t) => t.id !== id); state.tasks = tasks; saveState(state); return tasks.length !== before;
    }
    case 'toggle_task': {
      const id = Number(args?.id); const t = state.tasks.find((t) => t.id === id); if (!t) return null; t.done = !t.done; t.last_touched_ms = nowMs(); saveState(state); return { ...t };
    }
    case 'recommend_next': {
      const now = nowMs();
      const withinBatch = state.context_started_ms && (now - (state.context_started_ms || 0)) <= 60 * 60 * 1000;
      const scoreTask = (t: Task) => {
        if (t.done || t.status === 'Blocked' || t.status === 'Archived') return { score: -1e9, t, breakdown: { urgency: 0, aging: 0, batch_bonus: 0, quick_win: 0, sla_override: false } };
        const dt = Math.max(0, now - (t.last_touched_ms || 0));
        const aging = dt >= 3 * 86_400_000 ? 3 : dt >= 86_400_000 ? 2 : dt >= 6 * 60 * 60 * 1000 ? 1 : 0;
        const batch = withinBatch && state.current_tag && t.tags?.includes(state.current_tag) ? 2 : 0;
        const score = 3 * aging + 2 * batch; // only aging + batch
        return { score, t, breakdown: { urgency: 0, aging, batch_bonus: batch, quick_win: 0, sla_override: false } };
      };
      const recs = state.tasks.map(scoreTask);
      recs.sort((a, b) => b.score - a.score || (a.t.last_touched_ms - b.t.last_touched_ms) || ((a.t.due_ts ?? 0) - (b.t.due_ts ?? 0)));
      const best = recs[0];
      if (!best || best.score < -1e8) return null;
      return { task: best.t, score: best.score, breakdown: best.breakdown };
    }
    case 'set_task_status': {
      const id = Number(args?.id); const status = args?.status as Status; const t = state.tasks.find((t) => t.id === id); if (!t) return null; if (status === 'Active') { state.tasks.forEach(x => { if (x.id !== id && !x.done) x.status = 'Parked'; }); if (t.tags?.length) { state.current_tag = t.tags[0]; state.context_started_ms = nowMs(); } } t.status = status; t.last_touched_ms = nowMs(); saveState(state); return { ...t };
    }
    default: throw new Error(`Unknown command in browser mode: ${cmd}`);
  }
};

export const invoke = async (cmd: string, args?: any) => {
  const inv = await getTauriInvoke();
  if (inv) return inv(cmd, args);
  return browserInvoke(cmd, args);
};
