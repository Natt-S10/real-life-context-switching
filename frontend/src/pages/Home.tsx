import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { Box, Button, Chip, Container, Paper, Stack, TextField, Typography } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { RecPanel } from '../components/RecPanel';
import { TaskRow } from '../components/TaskRow';
import { VirtualList } from '../components/VirtualList';
import { addTask, listTasksSorted, setTaskActive, toggleTask, softDeleteTask, Task, setTaskStatus } from '../services/tasks';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';

const ITEM_HEIGHT = 72;

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tag, setTag] = useState('');
  const [title, setTitle] = useState('');
  const [scored, setScored] = useState<Record<number, import('../api').Recommendation>>({});
  const [showDetails, setShowDetails] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const tagRef = useRef<HTMLInputElement>(null);

  const loadTasks = useCallback(async () => {
    const [tasksList, scoredList] = await Promise.all([
      listTasksSorted(),
      (async () => {
        try { const arr = await (await import('../services/tasks')).listTasksScored(); return arr; } catch { return []; }
      })(),
    ]);
    setTasks(tasksList);
    const map: Record<number, import('../api').Recommendation> = {};
    scoredList.forEach(r => { map[r.task.id] = r; });
    setScored(map);
  }, []);
  const refreshAll = useCallback(async () => { await loadTasks(); }, [loadTasks]);
  useEffect(() => { refreshAll(); }, [refreshAll]);

  const onSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const t = tag.trim();
    const ti = title.trim();
    if (!t || !ti) return;
    await addTask(ti, t);
    setTitle('');
    setTag('');
    setTimeout(() => { tagRef.current?.focus(); });
    await refreshAll();
  }, [tag, title, refreshAll]);

  const onToggle = useCallback(async (id: number) => { await toggleTask(id); await refreshAll(); }, [refreshAll]);
  const onRemove = useCallback(async (id: number) => { await softDeleteTask(id); await refreshAll(); }, [refreshAll]);
  const onResume = useCallback(async (id: number) => { await setTaskActive(id); await refreshAll(); }, [refreshAll]);

  // Active task derived from tasks
  const activeTask = useMemo(() => tasks.find(t => !t.done && t.status === 'Active') || null, [tasks]);
  // Exclude active task from the main list (it has its own section)
  const displayedTasks = useMemo(() => activeTask ? tasks.filter(t => t.id !== activeTask.id) : tasks, [tasks, activeTask]);
  const onPark = useCallback(async () => { if (!activeTask) return; await setTaskStatus(activeTask.id, 'Parked'); await refreshAll(); }, [activeTask, refreshAll]);
  const onDone = useCallback(async () => { if (!activeTask) return; await toggleTask(activeTask.id); await refreshAll(); }, [activeTask, refreshAll]);

  // Add dynamic age for the active task (placed after activeTask is defined)
  const [activeAge, setActiveAge] = useState('');
  useEffect(() => {
    const update = () => {
      if (!activeTask || !activeTask.last_touched_ms) { setActiveAge(''); return; }
      const delta = Math.max(0, Date.now() - activeTask.last_touched_ms);
      let label = '0s';
      if (delta < 60_000) label = `${Math.floor(delta / 1000)}s`;
      else if (delta < 3_600_000) label = `${Math.floor(delta / 60_000)}m`;
      else if (delta < 86_400_000) label = `${Math.floor(delta / 3_600_000)}h`;
      else label = `${Math.floor(delta / 86_400_000)}d`;
      setActiveAge(label);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [activeTask]);

  // Build a stable watch key for recs (id:done:status) to avoid stale suggestions
  const recWatchKey = useMemo(() => tasks.map(t => `${t.id}:${t.done ? 1 : 0}:${t.status}`).join('|'), [tasks]);

  const tagOptions = useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks) { (t.tags || []).forEach(tag => set.add(tag)); }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [tasks]);

  // Unique colors per displayed tag (archive-excluded since tasks excludes archived)
  const tagColors = useMemo(() => {
    const colors: Record<string, { main: string; bg: string }> = {};
    const n = tagOptions.length || 1;
    tagOptions.forEach((tg, i) => {
      const hue = Math.round((i * 360) / n);
      const main = `hsl(${hue} 70% 55%)`;
      const bg = `hsl(${hue} 70% 55% / 0.15)`; // subtle tinted background
      colors[tg] = { main, bg };
    });
    return colors;
  }, [tagOptions]);

  return (
    <Container maxWidth="md">
      <section className="new-task">
        <Typography variant="h6" sx={{ mb: 1 }}>Add Task</Typography>
        <form id="task-form" onSubmit={onSubmit}>
          <Stack direction="row" gap={1} alignItems="center">
            <Autocomplete
              freeSolo
              disableClearable
              options={tagOptions}
              inputValue={tag}
              onInputChange={(_, v) => setTag(v ?? '')}
              filterOptions={(options, { inputValue }) => {
                const q = (inputValue || '').trim().toLowerCase();
                if (!q) return options;
                const prefix: string[] = [];
                const partial: string[] = [];
                for (const opt of options) {
                  const lo = opt.toLowerCase();
                  if (lo.startsWith(q)) prefix.push(opt);
                  else if (lo.includes(q)) partial.push(opt);
                }
                return [...prefix, ...partial];
              }}
              sx={{ minWidth: 200, flexShrink: 0 }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  id="tag"
                  label="Tag"
                  required
                  inputRef={tagRef}
                  onKeyDown={(e) => {
                    if (e.key === 'Tab') {
                      const v = (e.target as HTMLInputElement)?.value || tag || '';
                      const match = tagOptions.find(o => o.toLowerCase().startsWith(v.toLowerCase()));
                      if (match) {
                        setTag(match);
                      }
                      e.preventDefault();
                      e.stopPropagation();
                      setTimeout(() => { titleRef.current?.focus(); });
                    }
                  }}
                />
              )}
            />
            <TextField id="title" inputRef={titleRef} label="Task title" value={title} onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} required fullWidth />
            <Button type="submit" variant="contained">Add</Button>
          </Stack>
        </form>
      </section>

      {activeTask && (
        <section className="current-task" style={{ marginTop: 16 }}>
          <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderColor: 'primary.main' }}>
            <Box>
              <Typography variant="overline" color="primary.main">Now</Typography>
              <Typography variant="h6" sx={{ mt: 0.5 }}>
                <Box component="span" sx={{ mr: 1, color: 'text.secondary', fontWeight: 600 }}>#{activeTask.id}</Box>
                {activeTask.title}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {(activeTask.tags || []).map(tag => (
                  <Chip
                    key={tag}
                    size="small"
                    label={`#${tag}`}
                    variant="outlined"
                    sx={{
                      borderColor: tagColors[tag]?.main,
                      color: tagColors[tag]?.main,
                      bgcolor: tagColors[tag]?.bg,
                      borderStyle: 'solid',
                    }}
                  />
                ))}
                <Chip size="small" label={activeTask.status} variant="outlined" />
                {activeAge && <Chip size="small" label={activeAge} variant="outlined" />}
              </Box>
            </Box>
            <Stack direction="row" gap={1}>
              <Button variant="outlined" color="inherit" onClick={onPark}>Park</Button>
              <Button variant="contained" color="primary" onClick={onDone}>Done</Button>
            </Stack>
          </Paper>
        </section>
      )}

      <section className="tasks">
        <Box className="tasks-header" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Typography variant="h6">Tasks</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControlLabel control={<Switch size="medium" checked={showDetails} onChange={(e) => setShowDetails(e.target.checked)} />} label="Show scores" />
            <RecPanel onResume={onResume} watchKey={recWatchKey} />
          </Box>
        </Box>

        <VirtualList
          items={displayedTasks}
          itemHeight={ITEM_HEIGHT}
          className="task-viewport"
          renderItem={(t) => (
            <TaskRow key={t.id} t={t} onToggle={onToggle} onRemove={onRemove} onResume={onResume} score={scored[t.id]} tagColors={tagColors} showDetails={showDetails} />
          )}
        />
      </section>
    </Container>
  );
}
