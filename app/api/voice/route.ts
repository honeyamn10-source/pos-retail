import { serviceIdentity } from '@/lib/service-auth';
import { readStore, mutateStore } from '@/lib/store';
import { quoteOrder, signQuote, verifyQuote, validateQuoteAtCommit, type VoiceDraft } from '@/lib/voice';
import { activeShift, isOpen, type Order } from '@/lib/engine';
import { readJson, apiFailure } from '@/lib/http';
const headers = { 'Cache-Control': 'no-store' };
const accepted = (o: Order) => ({ orderNumber: String(o.number), status: 'accepted', orderStatus: o.status, payment: o.paidAt ? 'paid' : 'due_at_pickup', kitchen: o.kitchen });
export async function GET(req: Request) {
  try {
    const { owner } = await serviceIdentity(req, 'voice'); const { state } = await readStore(owner);
    return Response.json({ store: state.settings.name, open: isOpen(new Date().toISOString(), state.settings) && !!activeShift(state), hours: state.settings, currency: 'CAD', menu: state.products.filter(p => p.mode === 'restaurant').map(p => ({ productId: p.id, name: p.name, stock: p.stock, priceCents: p.price, taxBps: p.taxBps })) }, { headers });
  } catch (e) { return apiFailure(e); }
}
export async function POST(req: Request) {
  try {
    const { owner, secret } = await serviceIdentity(req, 'voice');
    const body = await readJson(req, 20000); const { state } = await readStore(owner);
    if (body.action === 'status') {
      if (typeof body.callId !== 'string' || !/^[\w-]{1,100}$/.test(body.callId)) throw new Error('Invalid call identifier.');
      const o = state.orders.find(o => o.callId === body.callId);
      return Response.json(o ? accepted(o) : { status: 'not_found' }, { headers });
    }
    if (body.action === 'quote') {
      const quote = quoteOrder(state, owner, body.draft as VoiceDraft);
      quote.operation.quoteId = quote.id;
      await mutateStore(owner, { id: quote.id + '-draft', type: 'voiceDraft', callId: quote.callId, quoteId: quote.id });
      const lines = (quote.operation.items as { productId: string; qty: number; note?: string }[]).map(item => ({ ...item, name: state.products.find(p => p.id === item.productId)!.name }));
      return Response.json({ quoteToken: await signQuote(quote, secret), totalCents: quote.total, expiresAt: quote.expiresAt, currency: 'CAD', payment: 'due_at_pickup', customer: quote.operation.reference, notes: quote.operation.notes, items: lines }, { headers });
    }
    if (body.action !== 'confirm' || body.confirmed !== true) throw new Error('Customer confirmation is required.');
    const quote = await verifyQuote(body.quoteToken as string, secret, owner, Date.now(), state);
    validateQuoteAtCommit(state, quote);
    const result = await mutateStore(owner, quote.operation);
    return Response.json(accepted(result.state.orders.find(o => o.id === quote.id)!), { headers });
  } catch (e) { return apiFailure(e); }
}
