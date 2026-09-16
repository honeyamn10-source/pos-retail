export class RequestError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
export async function readJson(req: Request, limit = 64000): Promise<Record<string, unknown>> {
  if (!req.headers.get('content-type')?.startsWith('application/json')) throw new RequestError('JSON required.', 415);
  if (Number(req.headers.get('content-length')) > limit) throw new RequestError('Request too large.', 413);
  const reader = req.body?.getReader();
  if (!reader) throw new RequestError('Request body required.', 400);
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length;
      if (size > limit) { await reader.cancel(); throw new RequestError('Request too large.', 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  let value;
  try { value = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new RequestError('Invalid JSON.', 400); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new RequestError('A JSON object is required.', 400);
  return value;
}
export function apiFailure(error: unknown) {
  const message = error instanceof Error ? error.message : 'Request failed.';
  const unavailable = /D1|SQLITE|database|binding|Another register/i.test(message);
  const status = error instanceof RequestError ? error.status : unavailable || message.includes('not configured') ? 503 : message.includes('authorization') ? 401 : 400;
  return Response.json({ error: unavailable ? 'Records are temporarily unavailable. Retry the same action.' : message }, { status, headers: { 'Cache-Control': 'no-store' } });
}
