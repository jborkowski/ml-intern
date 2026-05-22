import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Link,
  Typography,
} from '@mui/material';
import { apiFetch } from '@/utils/api';

type Visibility = 'public' | 'private' | null;

interface ShareTracesState {
  enabled: boolean;
  repo_id: string | null;
  url: string | null;
  visibility: Visibility;
  error?: string;
}

interface ShareTracesDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ShareTracesDialog({ open, onClose }: ShareTracesDialogProps) {
  const [state, setState] = useState<ShareTracesState | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<Visibility>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiFetch('/api/share-traces')
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<ShareTracesState>;
      })
      .then((data) => { if (!cancelled) setState(data); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load trace settings.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open]);

  const handleSet = async (visibility: 'public' | 'private') => {
    setUpdating(visibility);
    setError(null);
    try {
      const res = await apiFetch('/api/share-traces', {
        method: 'POST',
        body: JSON.stringify({ visibility }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail?.detail || `Update failed (${res.status})`);
      }
      setState(await res.json() as ShareTracesState);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update visibility.');
    } finally {
      setUpdating(null);
    }
  };

  const body = (() => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={24} />
        </Box>
      );
    }
    if (error) {
      return (
        <DialogContentText sx={{ color: 'var(--accent-red, #d32f2f)', fontSize: '0.85rem' }}>
          {error}
        </DialogContentText>
      );
    }
    if (!state) return null;
    if (!state.enabled) {
      return (
        <DialogContentText sx={{ color: 'var(--muted-text)', fontSize: '0.85rem' }}>
          Personal trace sharing isn't configured for this account.
        </DialogContentText>
      );
    }
    if (state.error === 'missing_token') {
      return (
        <DialogContentText sx={{ color: 'var(--muted-text)', fontSize: '0.85rem' }}>
          Sign in with Hugging Face to manage your trace dataset.
        </DialogContentText>
      );
    }
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <DialogContentText sx={{ color: 'var(--muted-text)', fontSize: '0.85rem', lineHeight: 1.55 }}>
          Each session is mirrored to your private Hugging Face dataset in Claude Code
          format so the Agent Trace Viewer auto-renders it. Flip it public to share
          recipes; flip back to private to lock it down.
        </DialogContentText>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="caption" sx={{ color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Dataset
          </Typography>
          {state.url ? (
            <Link
              href={state.url}
              target="_blank"
              rel="noreferrer"
              sx={{ fontSize: '0.85rem', color: 'var(--text)', wordBreak: 'break-all' }}
            >
              {state.repo_id}
            </Link>
          ) : (
            <Typography sx={{ fontSize: '0.85rem', color: 'var(--text)' }}>{state.repo_id}</Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="caption" sx={{ color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Visibility
          </Typography>
          <Typography sx={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: 600 }}>
            {state.visibility === null
              ? 'Not created yet — created private on next save'
              : state.visibility === 'public' ? 'Public' : 'Private'}
          </Typography>
        </Box>
      </Box>
    );
  })();

  const canToggle = state?.enabled && state.error !== 'missing_token';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{
        backdrop: { sx: { backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' } },
      }}
      PaperProps={{
        sx: {
          bgcolor: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-1)',
          maxWidth: 460,
          mx: 2,
        },
      }}
    >
      <DialogTitle sx={{ color: 'var(--text)', fontWeight: 700, fontSize: '1rem', pt: 2.5, pb: 0, px: 3 }}>
        Share traces
      </DialogTitle>
      <DialogContent sx={{ px: 3, pt: 1.25, pb: 0 }}>
        {body}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, pt: 2, gap: 1 }}>
        {canToggle && (
          <>
            <Button
              onClick={() => handleSet('private')}
              disabled={updating !== null || state.visibility === 'private'}
              size="small"
              sx={{
                color: 'var(--muted-text)',
                fontSize: '0.82rem',
                px: 2,
                textTransform: 'none',
                '&:hover': { bgcolor: 'var(--hover-bg)' },
              }}
            >
              {updating === 'private' ? 'Locking…' : 'Make private'}
            </Button>
            <Button
              onClick={() => handleSet('public')}
              disabled={updating !== null || state.visibility === 'public'}
              variant="contained"
              size="small"
              sx={{
                fontSize: '0.82rem',
                px: 2.5,
                bgcolor: 'var(--accent-yellow)',
                color: '#000',
                textTransform: 'none',
                fontWeight: 700,
                boxShadow: 'none',
                '&:hover': { bgcolor: '#FFB340', boxShadow: 'none' },
              }}
            >
              {updating === 'public' ? 'Publishing…' : 'Make public'}
            </Button>
          </>
        )}
        <Button
          onClick={onClose}
          size="small"
          sx={{
            color: 'var(--muted-text)',
            fontSize: '0.82rem',
            px: 2,
            textTransform: 'none',
            '&:hover': { bgcolor: 'var(--hover-bg)' },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
