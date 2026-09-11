'use client';
import { useState } from 'react';
import { activeShift, money, type Store, type Operation } from '@/lib/engine';
import { Button } from '@/components/ui/button';

export default function CashDrawer({state,run,disabled}:{state:Store;run:(op:Omit<Operation,'id'>)=>Promise<boolean>;disabled:boolean}) {
  const shift = activeShift(state);
  const [direction,setDirection] = useState<'in'|'out'>('in');
  const [amount,setAmount] = useState(''), [reason,setReason] = useState(''), [confirmed,setConfirmed] = useState(false);
  const cents = /^\d{1,6}(\.\d{1,2})?$/.test(amount) ? Math.round(Number(amount)*100) : 0;
  const movements = (state.cashMovements??[]).filter(m=>m.shiftId===shift?.id);
  return <section className="pos-section"><div className="pos-section-heading"><div><h2>Cash drawer</h2><p>Record float top-ups, supplier payouts and cash removed for deposit.</p></div></div>
    <p className="pos-drawer-note">Restaurant and retail currently share one cash shift. These movements affect drawer reconciliation; they do not change sales or tax. Count the drawer independently when closing.</p>
    {!shift ? <p>Open a cash shift to record a movement.</p> : <form className="pos-drawer-form" onSubmit={async e=>{e.preventDefault();if(await run({type:'cashMovement',direction,amount:cents,reason,confirmed})){setAmount('');setReason('');setConfirmed(false);}}}>
      <label className="pos-field"><span>Movement</span><select value={direction} onChange={e=>{setDirection(e.target.value as 'in'|'out');setConfirmed(false);}}><option value="in">Cash in</option><option value="out">Cash out</option></select></label>
      <label className="pos-field"><span>Amount (CAD)</span><input inputMode="decimal" value={amount} onChange={e=>{setAmount(e.target.value);setConfirmed(false);}} placeholder="0.00" required /></label>
      <label className="pos-field"><span>Reason</span><input value={reason} onChange={e=>{setReason(e.target.value);setConfirmed(false);}} placeholder="For example, float top-up" maxLength={200} required /></label>
      <label className="pos-check"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I confirm this cash was physically {direction==='in'?'added to':'removed from'} the drawer.</label>
      <Button disabled={disabled||!confirmed||cents<=0||!reason.trim()}>Record cash {direction}</Button>
    </form>}
    <h3>Current shift movements</h3><div className="pos-table-scroll"><table className="pos-data-table"><thead><tr><th>Time</th><th>Movement</th><th>Amount</th><th>Reason</th></tr></thead><tbody>{[...movements].reverse().map(m=><tr key={m.id}><td>{new Date(m.at).toLocaleTimeString('en-CA',{timeZone:state.settings.timezone,hour:'numeric',minute:'2-digit'})}</td><td>Cash {m.direction}</td><td>{money(m.amount)}</td><td>{m.reason}</td></tr>)}</tbody></table></div>{!movements.length&&<p>No cash movements recorded in this shift.</p>}
  </section>;
}
