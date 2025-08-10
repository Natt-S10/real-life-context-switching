import { Box, Button, Chip, IconButton, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import UndoIcon from '@mui/icons-material/Undo';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteIcon from '@mui/icons-material/Delete';
import { Task, Recommendation } from '../api';
import { useEffect, useMemo, useState } from 'react';

export function TaskRow({ t, onToggle, onRemove, onResume, score, tagColors, showDetails }: {
  t: Task;
  onToggle: (id: number) => void;
  onRemove: (id: number) => void;
  onResume: (id: number) => void;
  score?: Recommendation | null;
  tagColors?: Record<string, { main: string; bg: string }>;
  showDetails?: boolean;
}) {
  const breakdown = score?.breakdown;
  const overall = typeof score?.score === 'number' ? score!.score : null;

  const formatAge = (nowMs: number) => {
    const delta = Math.max(0, nowMs - (t.last_touched_ms || 0));
    if (delta < 60_000) {
      const s = Math.floor(delta / 1000);
      return `${s}s`;
    }
    if (delta < 3_600_000) {
      const m = Math.floor(delta / 60_000);
      return `${m}m`;
    }
    const h = Math.floor(delta / 3_600_000);
    const m = Math.floor((delta % 3_600_000) / 60_000);
    return `${h}h ${m}m`;
  };

  const [ageLabel, setAgeLabel] = useState<string>(() => formatAge(Date.now()));
  useEffect(() => {
    let mounted = true;
    const tick = () => { if (mounted) setAgeLabel(formatAge(Date.now())); };
    tick();
    const id = setInterval(tick, 1000);
    return () => { mounted = false; clearInterval(id); };
  }, [t.last_touched_ms]);

  const statusChip = useMemo(() => {
    if (t.done) {
      return <Chip size="small" label="Done" sx={{ bgcolor: 'success.main', color: 'success.contrastText' }} />;
    }
    switch (t.status) {
      case 'Active':
        return <Chip size="small" label="Active" sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }} />;
      case 'Blocked':
        return <Chip size="small" label="Blocked" sx={{ bgcolor: 'error.main', color: 'error.contrastText' }} />;
      case 'Archived':
        return <Chip size="small" label="Archived" sx={{ bgcolor: 'grey.600', color: 'grey.100' }} />;
      case 'Parked':
      default:
        return <Chip size="small" label="Parked" sx={{ bgcolor: 'grey.700', color: 'grey.100' }} />;
    }
  }, [t.done, t.status]);

  return (
    <li className={`task-item ${t.done ? 'done' : ''}`} style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto auto', alignItems: 'center', gap: 8, padding: '8px 10px' }}>
      <IconButton
        size="small"
        title={t.done ? 'Mark as Undone' : 'Mark as Done'}
        onClick={() => onToggle(t.id)}
        sx={{ width: 32, height: 32, '& .MuiSvgIcon-root': { fontSize: 18 } }}
      >
        {t.done ? <UndoIcon /> : <CheckIcon />}
      </IconButton>
      <Box>
        <Typography className="task-title" variant="subtitle1">
          <Box component="span" sx={{ mr: 1, color: 'text.secondary', fontWeight: 600 }}>#{t.id}</Box>
          {t.title}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
          {(t.tags || []).map(tag => {
            const c = tagColors?.[tag];
            return (
              <Chip
                key={tag}
                size="small"
                label={`#${tag}`}
                variant="outlined"
                sx={c ? {
                  borderColor: c.main,
                  color: c.main,
                  bgcolor: c.bg,
                  borderStyle: 'solid',
                } : undefined}
              />
            );
          })}
          {statusChip}
          <Chip size="small" variant="outlined" label={`age ${ageLabel}`} />
          {showDetails && breakdown && (
            <>
              <Chip size="small" variant="outlined" label={`aging ${breakdown.aging}`} />
              <Chip size="small" variant="outlined" label={`batch ${breakdown.batch_bonus}`} />
            </>
          )}
          {showDetails && overall !== null && <Chip size="small" color="primary" label={`Score: ${overall}`} />}
        </Box>
      </Box>
      <Button
        variant="contained"
        color="primary"
        size="medium"
        startIcon={<PlayArrowIcon />}
        disabled={t.status === 'Active' && !t.done}
        onClick={() => onResume(t.id)}
        sx={{
          fontWeight: 700,
          textTransform: 'none',
          borderRadius: 999,
          px: 1.5,
          '& .MuiSvgIcon-root': { fontSize: 20 },
          '&:not(:disabled)': {
            boxShadow: (theme) => theme.shadows[4],
          },
          '&:not(:disabled):hover': {
            boxShadow: (theme) => theme.shadows[6],
          },
        }}
      >
        Resume
      </Button>
      <IconButton size="small" title="Remove" onClick={() => onRemove(t.id)}>
        <DeleteIcon fontSize="small" />
      </IconButton>
    </li>
  );
}
