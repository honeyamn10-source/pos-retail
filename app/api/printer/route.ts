import { serviceIdentity } from '@/lib/service-auth';
import { readStore, mutateStore } from '@/lib/store';
import { readJson, apiFailure } from '@/lib/http';
const headers = { 'Cache-Control': 'no-store' };
export async function GET(req: Request) {
  try {
    const { owner } = await serviceIdentity(req, 'printer'); const { state } = await readStore(owner);
    const job = state.prints.find(j => j.status === 'pending' && (j.event === 'cancellation' || j.event === 'reprint' || state.orders.some(o => o.id === j.orderId && !['cancelled', 'refunded'].includes(o.status))));
    return Response.json({ job: job ?? null }, { headers });
  } catch (e) { return apiFailure(e); }
}
export async function POST(req: Request) {
  try {
    const { owner } = await serviceIdentity(req, 'printer'); const body = await readJson(req, 3000);
    if (!['claim', 'result'].includes(body.action as string)) throw new Error('Unsupported printer action.');
    const result = await mutateStore(owner, { id: body.id as string, type: body.action === 'claim' ? 'printClaim' : 'printResult', jobId: body.jobId, ...(body.action === 'result' ? { claimId: body.claimId, status: body.status } : {}) });
    const job = result.state.prints.find(j => j.id === body.jobId)!;
    return Response.json({ result: result.result, job, order: job.snapshot }, { headers });
  } catch (e) { return apiFailure(e); }
}
