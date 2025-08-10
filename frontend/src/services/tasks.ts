import { invoke, Task, Recommendation, Status } from '../api';

export const listTasksSorted = async (): Promise<Task[]> => {
  const tasks: Task[] = await invoke('list_tasks_sorted');
  // Hide Archived and Deleted in UI for now
  return tasks.filter(t => t.status !== 'Archived' && t.status !== 'Deleted');
};

export const listTasksScored = async (): Promise<Recommendation[]> => {
  const recs: Recommendation[] = await invoke('list_tasks_scored');
  return recs.filter(r => r.task.status !== 'Archived' && r.task.status !== 'Deleted');
};

export const addTask = (title: string, tag: string) =>
  invoke('add_task', { title, notes: null, tags: [tag], due_ts: null, est_min: null, status: null });

export const removeTask = (id: number) => invoke('remove_task', { id });

export const toggleTask = (id: number) => invoke('toggle_task', { id });

export const setTaskStatus = (id: number, status: Status) => invoke('set_task_status', { id, status });

export const setTaskActive = (id: number) => setTaskStatus(id, 'Active');

export const recommendNext = async (): Promise<Recommendation | null> => {
  const rec = await invoke('recommend_next');
  if (!rec) return null;
  return rec.task.status === 'Archived' || rec.task.status === 'Deleted' ? null : rec;
};

export const archiveTask = (id: number) => setTaskStatus(id, 'Archived');
export const softDeleteTask = (id: number) => invoke('soft_delete_task', { id });

export type { Task, Recommendation, Status };
