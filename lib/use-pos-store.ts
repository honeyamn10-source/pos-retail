'use client';
import { newId } from './ids';
import { useCallback, useEffect, useRef, useState } from 'react';
import { applyOperation, emptyStore, type Store, type Operation } from './engine';
import { createTourStore } from './tour';
import { toast } from 'sonner';

export function usePosStore(tour = false) {
  const [state, setState] = useState<Store>(emptyStore);
  const [loaded, setLoaded] = useState(false), [failure, setFailure] = useState(''), [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Operation | null>(null);
  const [signInRequired, setSignInRequired] = useState(false);
  const tourState = useRef<Store | null>(null);
  const locked = useRef(false), sequence = useRef(0), pendingRef = useRef<Operation | null>(null), key = useRef('');
  const load = useCallback(async () => {
    if (tour) {
      try { tourState.current ??= createTourStore(); setState(tourState.current); setLoaded(true); setFailure(''); }
      catch (e) { setFailure(e instanceof Error ? e.message : 'The sample register could not start.'); }
      return;
    }
    const sequenceId = ++sequence.current;
    try {
      const res = await fetch('/api/state', { cache: 'no-store' }); const data = await res.json() as {state: Store;workspaceId: string;error?: string;result: string};
      setSignInRequired(res.status === 401);
      if (!res.ok) throw new Error(data.error || 'Records unavailable.');
      if (sequenceId !== sequence.current || locked.current) return;
      if (!key.current) {
        key.current = 'jawa-pending-v2:' + data.workspaceId;
        try { const saved = sessionStorage.getItem(key.current); pendingRef.current = saved ? JSON.parse(saved) : null; setPending(pendingRef.current); } catch { throw new Error('Enable browser session storage to safely recover interrupted transactions.'); }
      }
      setState(data.state); setLoaded(true); setFailure('');
    } catch (e) { if (sequenceId === sequence.current) setFailure(e instanceof Error ? e.message : 'Connection unavailable.'); }
  }, [tour]);
  useEffect(() => { void load(); const interval = setInterval(() => { if (!locked.current) void load(); }, 10000); return () => clearInterval(interval); }, [load]);
  const submit = useCallback(async (op: Operation): Promise<boolean> => {
    if (tour) {
      if (locked.current || !tourState.current) return false;
      locked.current = true;
      try { const next = applyOperation(tourState.current, op); tourState.current = next.state; setState(next.state); setFailure(''); toast.success(op.type === 'order' ? 'Sample order #' + next.result + ' accepted' : next.result); return true; }
      catch (e) { const message = e instanceof Error ? e.message : 'Could not complete sample action.'; setFailure(message); toast.error(message); return false; }
      finally { locked.current = false; }
    }
    if (locked.current || !key.current) return false;
    locked.current = true; setBusy(true); ++sequence.current;
    const clear = () => { sessionStorage.removeItem(key.current); pendingRef.current = null; setPending(null); };
    try {
      // This is a short-lived retry journal. The server remains the record of every sale.
      sessionStorage.setItem(key.current, JSON.stringify(op)); pendingRef.current = op; setPending(op);
      const res = await fetch('/api/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(op) });
      const data = await res.json() as {state: Store;workspaceId: string;error?: string;result: string};
      if (!res.ok) { if (res.status >= 400 && res.status < 500 && ![408, 429].includes(res.status)) clear(); throw new Error(data.error || 'Could not save.'); }
      setState(data.state); clear(); setFailure(''); toast.success(op.type === 'order' ? 'Order #' + data.result + ' accepted' : data.result); return true;
    } catch (e) { const message = e instanceof Error ? e.message : 'Connection interrupted. Recover the pending action before continuing.'; setFailure(message); toast.error(message); return false; }
    finally { locked.current = false; setBusy(false); }
  }, [tour]);
  const run = useCallback(async (data: Omit<Operation, 'id'>) => {
    if (pendingRef.current) { toast.error('Recover the pending action first.'); return false; }
    return submit({ ...data, id: newId() } as Operation);
  }, [submit]);
  const recover = useCallback(() => pendingRef.current ? submit(pendingRef.current) : Promise.resolve(false), [submit]);
  return { state, loaded, busy, failure, pending, signInRequired, load, run, recover };
}
