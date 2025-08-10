import { useCallback, useEffect, useState } from 'react';
import { Button, Stack, Typography, Chip } from '@mui/material';
import { recommendNext, Recommendation } from '../services/tasks';

export function RecPanel({ onResume, watchKey }: { onResume: (id: number) => void; watchKey: string }) {
  const [rec, setRec] = useState<Recommendation | null>(null);
  const load = useCallback(async () => setRec(await recommendNext()), []);
  useEffect(() => { load(); }, [load, watchKey]);

  const invalid = !rec || rec.task.done;
  if (invalid) return (
    <Stack direction="row" alignItems="center" gap={1} className="rec-panel">
      <Typography variant="body2" color="text.secondary">Next:</Typography>
      <Button size="small" variant="outlined" disabled>—</Button>
    </Stack>
  );
  return (
    <Stack direction="row" alignItems="center" gap={1} className="rec-panel">
      <Typography variant="body2" color="text.secondary">Next:</Typography>
      <Button size="small" variant="outlined" onClick={() => onResume(rec.task.id)}>#{rec.task.id} {rec.task.title}</Button>
      <Chip
        size="small"
        label={`#${rec.task.id}`}
        variant="outlined"
        sx={{ borderStyle: 'solid', borderColor: 'primary.main', color: 'primary.main', bgcolor: 'rgba(56,189,248,0.12)' }}
      />
    </Stack>
  );
}
