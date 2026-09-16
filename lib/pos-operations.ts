import { newId } from './ids.ts';
import type { Store, Operation, Order, Product, Line } from './engine.ts';

export type CartItem = { productId: string; qty: number; note?: string };
export type HeldCart = { id: string; name: string; mode: 'retail' | 'restaurant'; items: CartItem[]; notes: string; at: string };
export type DiningTable = { id: string; name: string; seats: number };

function requireValue(ok: unknown, message: string): asserts ok { if (!ok) throw new Error(message); }
export function cleanText(value: unknown, label: string, max: number, optional = false): string {
  requireValue(typeof value === 'string' && value.length <= max && (optional || value.trim()), `Enter a valid ${label}.`);
  return value.trim();
}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => JSON.stringify(k) + ':' + canonical(v)).join(',') + '}';
  return JSON.stringify(value);
}
export function makeLines(s: Store, items: unknown, mode: string): Line[] {
  requireValue(Array.isArray(items) && items.length > 0 && items.length <= 100, 'Add 1–100 items.');
  const seen = new Set<string>();
  return items.map((row: CartItem) => {
    const p = s.products.find(p => p.id === row?.productId);
    requireValue(p && p.mode === mode, 'Item belongs to a different register or is unavailable.');
    requireValue(!seen.has(p.id), 'Duplicate product line.'); seen.add(p.id);
    requireValue(Number.isSafeInteger(row.qty) && row.qty > 0 && row.qty <= 999, 'Invalid quantity.');
    requireValue(row.qty <= p.stock, 'Not enough stock for ' + p.name + '.');
    return { productId: p.id, name: p.name, sku: p.sku, qty: row.qty, price: p.price, cost: p.cost, taxBps: p.taxBps, tax: Math.round(p.price * row.qty * p.taxBps / 10000), refunded: 0, note: row.note === undefined ? '' : cleanText(row.note, 'item note', 200, true) };
  });
}
export function queuePrint(s: Store, o: Order, at: string, kind: 'kitchen' | 'receipt', event: 'order' | 'addition' | 'cancellation' | 'reprint' = 'order', lines = o.lines) {
  s.prints.push({ id: newId(), orderId: o.id, kind, event, status: 'pending', createdAt: at, snapshot: structuredClone({ ...o, lines }) });
}
export function extendedOperation(s: Store, op: Operation, at: string): string | undefined {
  const id = op.id;
  switch (op.type) {
    case 'voiceDraft': {
      const callId = cleanText(op.callId, 'call ID', 100);
      requireValue(/^[a-zA-Z0-9_-]+$/.test(callId) && !['__proto__', 'constructor', 'prototype'].includes(callId), 'Invalid call ID.');
      requireValue(!s.orders.some(o => o.callId === callId), 'An order already exists for this call.');
      requireValue(Object.keys(s.voiceDrafts ?? {}).length < 1000 || Object.hasOwn(s.voiceDrafts ?? {}, callId), 'Call draft capacity reached.');
      (s.voiceDrafts ??= {})[callId] = cleanText(op.quoteId, 'quote ID', 100); return 'Phone quote prepared';
    }
    case 'table': {
      const name = cleanText(op.name, 'table name', 40);
      requireValue(!s.tables?.some(t => t.name.toLowerCase() === name.toLowerCase()), 'Table name already exists.');
      requireValue(Number.isInteger(op.seats) && Number(op.seats) > 0 && Number(op.seats) <= 30, 'Seats must be between 1 and 30.');
      requireValue((s.tables?.length ?? 0) < 100, 'Table limit reached.');
      (s.tables ??= []).push({ id, name, seats: Number(op.seats) }); return 'Table added';
    }
    case 'hold': {
      requireValue(op.mode === 'retail' || op.mode === 'restaurant', 'Invalid register.');
      const lines = makeLines(s, op.items, op.mode);
      requireValue((s.holds?.length ?? 0) < 100, 'Held cart limit reached.');
      (s.holds ??= []).push({ id, name: cleanText(op.name, 'cart name', 100), mode: op.mode, items: lines.map(l => ({ productId: l.productId, qty: l.qty, note: l.note })), notes: cleanText(op.notes ?? '', 'notes', 1000, true), at });
      return 'Cart held. Stock and prices are checked again at checkout.';
    }
    case 'discardHold': {
      requireValue(s.holds?.some(h => h.id === op.holdId), 'This cart was already completed or removed.');
      s.holds = (s.holds ?? []).filter(h => h.id !== op.holdId); return 'Held cart removed';
    }
    case 'editProduct': {
      const p = s.products.find(p => p.id === op.productId);
      requireValue(p, 'Product not found.');
      const sku = cleanText(op.sku, 'SKU', 80);
      requireValue(!s.products.some(x => x.id !== p.id && x.sku.toLowerCase() === sku.toLowerCase()), 'SKU already exists.');
      for (const [field, max] of [['price', 1000000], ['cost', 1000000], ['low', 1000000], ['taxBps', 3000]] as const) requireValue(Number.isSafeInteger(op[field]) && Number(op[field]) >= (field === 'price' ? 1 : 0) && Number(op[field]) <= max, 'Invalid ' + field + '.');
      Object.assign(p, { sku, name: cleanText(op.name, 'product name', 120), category: cleanText(op.category, 'category', 60), price: op.price, cost: op.cost, low: op.low, taxBps: op.taxBps });
      return 'Product updated. Previous sales keep their original prices.';
    }
    case 'appendOrder': {
      requireValue(s.shifts.some(sh => !sh.closedAt), 'Open a cash shift first.');
      const o = s.orders.find(o => o.id === op.orderId);
      requireValue(o?.mode === 'restaurant' && o.status === 'unpaid' && o.kitchen !== 'served', 'This check cannot accept more items.');
      requireValue(op.expectedVersion === (o.version ?? 1), 'Check changed on another register. Review it before adding items.');
      requireValue(op.confirmed === true, 'Confirm the additions.');
      o.batches ??= [{id:o.id,lines:structuredClone(o.lines),status:o.kitchen as 'new'|'preparing'|'ready',createdAt:o.createdAt}];
      const additions = makeLines(s, op.items, 'restaurant');
      // Existing lines can be combined only when the original price, tax and note match.
      // This keeps product-based refund attribution unambiguous in this release.
      for (const add of additions) {
        const existing = o.lines.find(l => l.productId === add.productId);
        if (existing) {
          requireValue(existing.price === add.price && existing.taxBps === add.taxBps && (existing.note ?? '') === (add.note ?? ''), 'An existing item has different pricing or notes. Start a separate check for that item.');
          requireValue(existing.qty + add.qty <= 999, 'Quantity limit reached.');
          existing.qty += add.qty; existing.tax += add.tax;
        } else o.lines.push(add);
        const p = s.products.find(p => p.id === add.productId) as Product;
        p.stock -= add.qty;
        s.movements.push({ id: newId(), productId: p.id, delta: -add.qty, reason: 'Items added to check', at, reference: o.id });
      }
      const increment = additions.reduce((n, l) => n + l.price * l.qty + l.tax, 0);
      requireValue(op.expectedTotal === increment, 'Price changed. Review the additions.');
      o.subtotal = o.lines.reduce((n, l) => n + l.price * l.qty, 0); o.tax = o.lines.reduce((n, l) => n + l.tax, 0); o.total = o.subtotal + o.tax;
      requireValue(o.total <= 100000000 && o.lines.length <= 100, 'Check limit exceeded.');
      // Once any preparation begins, cancellation must never put the entire check back in stock.
      if (o.kitchen !== 'new') o.preparationStarted = true;
      o.batches.push({id:op.id,lines:structuredClone(additions),status:'new',createdAt:at});
      o.kitchen = 'new'; o.version = (o.version ?? 1) + 1;
      queuePrint(s, o, at, 'kitchen', 'addition', additions); return 'Items sent to kitchen';
    }
    case 'printReconcile': {
      const job = s.prints.find(j => j.id === op.jobId);
      requireValue(job?.status === 'claimed', 'Only an unresolved claim can be reconciled.');
      const reason = cleanText(op.reason, 'reconciliation reason', 200);
      requireValue(op.bridgeStopped === true, 'Stop the printing worker before reconciling its claim.');
      job.status = 'uncertain'; return 'Printer outcome marked uncertain: ' + reason;
    }
    case 'reprint': {
      const job = s.prints.find(j => j.id === op.jobId);
      requireValue(job, 'Print job not found.');
      requireValue(['confirmed', 'submitted', 'uncertain'].includes(job.status), 'Resolve the original printer attempt before requesting a copy.');
      const reason = cleanText(op.reason, 'reprint reason', 200);
      const o = job.snapshot ?? s.orders.find(o => o.id === job.orderId);
      requireValue(o, 'Order not found.'); queuePrint(s, o, at, job.kind, 'reprint'); return 'Copy queued: ' + reason;
    }
  }
}
