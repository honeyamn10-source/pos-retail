// Isolated compiled-Worker contract checks. No live server, account or data is used.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { realpathSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(realpathSync(resolve('node_modules/wrangler/package.json')));
const { Miniflare } = require('miniflare');
const voiceToken = 'test-only-voice-token-0123456789abcdef';
const printerToken = 'test-only-print-token-0123456789abcdef';
const channelToken = 'test-only-channel-token-0123456789abcdef';
const modulePaths = ['index.js', ...readdirSync('dist/server',{recursive:true}).filter(p=>/\.m?js$/.test(p)&&p!=='index.js')];
const mf = new Miniflare({ modules: modulePaths.map(p=>({type:'ESModule',path:resolve('dist/server',p)})), modulesRoot: resolve('dist/server'), compatibilityDate: '2026-05-15', compatibilityFlags: ['nodejs_compat'], d1Databases: { DB: 'isolated-jawa-api-test' }, bindings: { JAWA_SERVICE_OWNER: 'test-owner', JAWA_VOICE_TOKEN: voiceToken, JAWA_PRINTER_TOKEN: printerToken, JAWA_CHANNEL_TOKEN: channelToken, JAWA_ONLINE_OWNER:'test-owner', JAWA_DOORDASH_STORE_ID:'test-dd-store' }, cf: false });
let checks = 0;
const ok = (value, expected) => { assert.deepEqual(value, expected); checks++; };
const identity = { 'oai-authenticated-user-id': 'test-owner', 'oai-authenticated-user-email': 'test@example.test', 'content-type': 'application/json', origin: 'https://jawa.example.test' };
async function request(path, body, headers = identity) {
  const response = await mf.dispatchFetch('https://jawa.example.test' + path, { method: body === undefined ? 'GET' : 'POST', headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: response.status, body: await response.json() };
}
try {
  const db = await mf.getD1Database('DB');
  await db.exec(readFileSync('drizzle/0000_faulty_pandemic.sql', 'utf8').replaceAll('\n', ' '));
  ok((await request('/api/state', undefined, {})).status, 401);
  ok((await request('/api/state', { id: 'seed', type: 'seed' }, { ...identity, origin: 'https://foreign.example' })).status, 403);
  ok((await request('/api/state', { id: 'seed', type: 'seed' })).status, 200);
  await request('/api/state', { id: 'hours', type: 'settings', name: 'API test', timezone: 'America/Toronto', open: '00:00', close: '23:59', cutoff: '04:00', closedDays: [] });
  ok((await request('/api/state', { id: 'shift', type: 'openShift', float: 0 })).status, 200);
  const sale = { id: 'cash-sale', type: 'order', mode: 'retail', items: [{ productId: 'sample-1', qty: 1 }], tender: 'cash', cashReceived: 3000, confirmed: true };
  const paid = await request('/api/state', sale); ok(paid.status, 200); ok(paid.body.state.orders[0].total, 2034);
  const retried = await request('/api/state', sale); ok(retried.body.state.orders.length, 1);
  ok((await request('/api/state', undefined, { ...identity, 'oai-authenticated-user-id': 'other-test-owner' })).body.state.orders.length, 0);
  const movement={id:'drawer-topup',type:'cashMovement',direction:'in',amount:5000,reason:'Float top-up',confirmed:true};
  ok((await request('/api/state',movement)).status,200);
  ok((await request('/api/state',movement)).body.state.cashMovements.length,1);
  ok((await request('/api/state',{...movement,id:'excess-out',direction:'out',amount:1000000})).status,400);
  ok((await request('/api/state',undefined,{...identity,'oai-authenticated-user-id':'other-test-owner'})).body.state.cashMovements,undefined);
  const voice = { authorization: 'Bearer ' + voiceToken, 'content-type': 'application/json' }, printer = { authorization: 'Bearer ' + printerToken, 'content-type': 'application/json' };
  ok((await request('/api/voice', undefined, printer)).status, 401);
  const quote = await request('/api/voice', { action: 'quote', draft: { callId: 'test-call', customer: 'Test customer', items: [{ productId: 'sample-7', qty: 1 }], notes: '' } }, voice);
  ok(quote.status, 200); ok(quote.body.items[0].name, 'Classic burger');
  const confirmed = await request('/api/voice', { action: 'confirm', quoteToken: quote.body.quoteToken, confirmed: true }, voice);
  ok(confirmed.status, 200); ok(confirmed.body.status, 'accepted');
  ok((await request('/api/voice', { action: 'confirm', quoteToken: quote.body.quoteToken, confirmed: true }, voice)).body.orderNumber, confirmed.body.orderNumber);
  const saved = (await request('/api/state')).body.state;
  const phone = saved.orders.find(o => o.channel === 'phone');
  await request('/api/state', { id: 'prepare', type: 'kitchen', orderId: phone.id, status: 'preparing' });
  ok((await request('/api/voice', { action: 'status', callId: 'test-call' }, voice)).body.kitchen, 'preparing');
  const candidate = await request('/api/printer', undefined, printer);
  const claim = await request('/api/printer', { action: 'claim', id: 'claim', jobId: candidate.body.job.id }, printer);
  ok(claim.status, 200); ok(claim.body.order.number, 1001); ok(claim.body.job.status, 'claimed');
  ok((await request('/api/printer', { action: 'claim', id: 'second-claim', jobId: candidate.body.job.id }, printer)).status, 400);
  // Actual direct-order and normalized-bridge handlers, including anonymous projection.
  const customerHeaders={'content-type':'application/json',origin:'https://jawa.example.test'};
  const menu=await request('/api/online',undefined,customerHeaders);ok(menu.status,200);ok(menu.body.open,false);ok(menu.body.privatePreview,false);ok('orders' in menu.body,false);ok('cost' in menu.body.products[0],false);
  await request('/api/state',{id:'online-enable',type:'onlineSettings',enabled:true,prepMinutes:20});
  const pickup={id:'online-pickup-request-one',action:'submit',mode:'restaurant',customer:'API pickup test',notes:'',items:[{productId:'sample-7',qty:1}],expectedTotal:1639,receiptKey:'a'.repeat(64),confirmed:true};
  ok((await request('/api/online',pickup,{...customerHeaders,origin:'https://foreign.example'})).status,403);
  const received=await request('/api/online',pickup,customerHeaders);ok(received.status,200);ok(received.body.status,'pending');ok('state' in received.body,false);
  ok((await request('/api/online',pickup,customerHeaders)).body.requestId,received.body.requestId);
  ok((await request('/api/online',{action:'status',requestId:pickup.id,receiptKey:'b'.repeat(64)},customerHeaders)).status,404);
  const before=(await request('/api/state')).body.state.products[6].stock;
  const acceptedPickup=await request('/api/state',{id:'online-accept',type:'channelAccept',requestId:pickup.id,confirmed:true});ok(acceptedPickup.status,200);ok(acceptedPickup.body.state.products[6].stock,before-1);
  const pickupStatus=await request('/api/online',{action:'status',requestId:pickup.id,receiptKey:pickup.receiptKey},customerHeaders);ok(pickupStatus.body.status,'accepted');ok(pickupStatus.body.kitchen,'new');
  const bridgeHeaders={authorization:'Bearer '+channelToken,'content-type':'application/json'};
  const platform={action:'receive',currency:'CAD',id:'dd-request',source:'doordash',storeId:'test-dd-store',externalId:'dd-order-100',providerAccepted:true,payment:'platform_collected',fulfillment:'delivery',customer:'Marketplace test',notes:'',items:[{productId:'sample-7',qty:1}],expectedTotal:1639};
  ok((await request('/api/channel-orders',platform,voice)).status,401);
  ok((await request('/api/channel-orders',{...platform,currency:'USD'},bridgeHeaders)).status,400);
  ok((await request('/api/channel-orders',{...platform,storeId:'wrong-store'},bridgeHeaders)).status,403);
  const bridged=await request('/api/channel-orders',platform,bridgeHeaders);ok(bridged.status,200);ok(bridged.body.status,'pending');ok(bridged.body.providerUpdateSent,false);
  ok((await request('/api/channel-orders',{...platform,id:'dd-redelivery'},bridgeHeaders)).body.requestId,bridged.body.requestId);
  ok((await request('/api/state',{id:'dd-accept',type:'channelAccept',requestId:bridged.body.requestId,confirmed:true,platformHandled:true})).status,200);
  const ddOrder=(await request('/api/state')).body.state.orders.find(o=>o.id==='dd-accept');ok(ddOrder.paymentMethod,'external');
  ok((await request('/api/state',{id:'bad-dd-refund',type:'refund',orderId:ddOrder.id,reason:'Cash refund',items:[{productId:'sample-7',qty:1}]})).status,400);
  for (const [path, text] of [['/', 'Choose your workspace'], ['/restaurant', 'New order'], ['/retail', 'Held carts'], ['/manage', 'Inventory'], ['/research', 'Executive assessment'], ['/tour/restaurant', 'Interactive sample'], ['/tour/retail', 'Interactive sample'], ['/tour/manage', 'Interactive sample'], ['/order/restaurant','Order food for pickup'], ['/order/retail','Shop for store pickup']]) {
    const response = await mf.dispatchFetch('https://jawa.example.test'+path,{headers:identity});
    ok(response.status,200); ok((await response.text()).includes(text),true);
  }
  console.log(JSON.stringify({ compiledWorkerContractChecks: checks, passed: true }));
} finally { await mf.dispose(); }
