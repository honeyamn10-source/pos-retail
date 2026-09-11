'use client';
import { useState } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { money, type Store, type Operation } from '@/lib/engine';
export default function PrintQueue({ state, run, disabled }: { state: Store; run: (op: Omit<Operation, 'id'>) => Promise<boolean>; disabled: boolean }) {
  const [selectedId, setSelectedId] = useState(''), [reason, setReason] = useState(''), [stopped, setStopped] = useState(false);
  const job = state.prints.find(j => j.id === selectedId), order = job && (job.snapshot ?? state.orders.find(o => o.id === job.orderId));
  const liveOrder = job && state.orders.find(o => o.id === job.orderId);
  const obsolete = job && !['cancellation', 'reprint'].includes(job.event ?? '') && liveOrder && ['cancelled', 'refunded'].includes(liveOrder.status);
  return <section className="pos-section"><div className="pos-section-heading"><div><h2>Printer queue</h2><p>Check each ticket. Transport success does not confirm paper output.</p></div></div>
    <div className="pos-table-scroll"><table className="pos-data-table"><thead><tr><th>Order</th><th>Ticket</th><th>Delivery state</th><th>Action</th></tr></thead><tbody>{[...state.prints].reverse().slice(0, 100).map(j => <tr key={j.id}><td>#{state.orders.find(o => o.id === j.orderId)?.number}</td><td>{j.kind}<small>{j.event ?? 'order'}</small></td><td>{j.status}</td><td><Button variant="outline" onClick={() => { setSelectedId(j.id); setReason(''); setStopped(false); }}>Review ticket</Button></td></tr>)}</tbody></table></div>
    {!state.prints.length && <p className="pos-help">Accepted orders create their tickets automatically.</p>}
    <Dialog open={!!job} onOpenChange={v => { if (!v) setSelectedId(''); }}><DialogContent className="pos-dialog"><DialogHeader><DialogTitle>Review {job?.kind} ticket</DialogTitle><DialogDescription>Print only this ticket. Addition tickets contain new items only.</DialogDescription></DialogHeader>
      {job && order && <><div id="print-area"><h2>JAWA · {job.kind.toUpperCase()}</h2><h3>{(job.event ?? 'ORDER').toUpperCase()} · #{order.number}</h3><p>{order.reference}</p>{order.externalId&&<p>{order.channel} · {order.externalId}</p>}{order.paymentMethod==='external'&&<p>PLATFORM COLLECTED · Do not collect cash</p>}{order.lines.map(l => <p key={l.productId}>{l.qty}× {l.name}{l.note && <small> · {l.note}</small>}</p>)}{order.notes && <p>{order.notes}</p>}{job.kind === 'receipt' && <p>{money(order.total)} · {order.status} · Training receipt</p>}</div>
        {obsolete && <p className="pos-low">The order was cancelled or refunded. Use its cancellation ticket or an explicitly labelled copy.</p>}
        {job.status === 'pending' && !obsolete && <Button disabled={disabled} onClick={() => void run({ type: 'printClaim', jobId: job.id, delivery: 'manual' })}>Reserve ticket for manual printing</Button>}
        {job.status === 'claimed' && job.delivery !== 'manual' && <p>The hardware bridge owns this attempt. Reconcile the physical printer before requesting a copy.</p>}
        {job.status === 'claimed' && job.delivery === 'manual' && !obsolete && <Button variant="outline" disabled={disabled} onClick={() => window.print()}><Printer />Open print dialog</Button>}
        {job.status !== 'pending' && job.status !== 'confirmed' && <Button disabled={disabled} onClick={() => void run({ type: 'printConfirm', jobId: job.id })}>I checked the physical paper</Button>}
        {job.status === 'claimed' && <><label className="pos-field"><span>Unresolved attempt: what did you check?</span><input maxLength={200} value={reason} onChange={e=>setReason(e.target.value)}/></label><label className="pos-check"><input type="checkbox" checked={stopped} onChange={e=>setStopped(e.target.checked)}/>Printing worker is stopped; the paper outcome is unknown</label><Button variant="outline" disabled={disabled||!reason.trim()||!stopped} onClick={()=>void run({type:'printReconcile',jobId:job.id,reason,bridgeStopped:stopped})}>Mark outcome uncertain</Button></>}
        {['submitted', 'uncertain', 'confirmed'].includes(job.status) && <><label className="pos-field"><span>Reason for a clearly labelled copy</span><input value={reason} maxLength={200} onChange={e => setReason(e.target.value)} /></label><Button variant="outline" disabled={disabled || !reason.trim()} onClick={async () => { if (await run({ type: 'reprint', jobId: job.id, reason })) setSelectedId(''); }}>Queue a copy</Button></>}
      </>}
    </DialogContent></Dialog>
  </section>;
}
