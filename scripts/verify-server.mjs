// Actual native HTTP, shared business logic, persistent SQLite and recovery.
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:net';
import {DatabaseSync} from 'node:sqlite';
const dir=mkdtempSync(join(tmpdir(),'jawa-native-')),port=await new Promise(r=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>r(p));});});
const origin='http://127.0.0.1:'+port,secret='test-only-service-secret-0123456789abcdef';let child,checks=0;
const ok=(a,b)=>{assert.deepEqual(a,b);checks++;};
async function start(data=dir){child=spawn(process.execPath,['server-dist/main.js'],{env:{...process.env,JAWA_PORT:String(port),JAWA_ORIGIN:origin,JAWA_DATA_DIR:data,JAWA_VOICE_TOKEN:secret,JAWA_PRINTER_TOKEN:secret+'-printer'},stdio:['ignore','pipe','pipe']});let log='';child.stdout.on('data',x=>log+=x);child.stderr.on('data',x=>log+=x);for(let i=0;i<100;i++){try{if((await fetch(origin+'/healthz')).ok)return;}catch{}if(child.exitCode!==null)throw new Error(log);await new Promise(r=>setTimeout(r,50));}throw new Error('Startup failed: '+log);}
async function stop(){if(child&&child.exitCode===null){const p=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');await p;}}
async function req(path,body,cookie='',extra={}){const r=await fetch(origin+path,{headers:{origin,'content-type':'application/json',cookie,...extra},...(body===undefined?{}:{method:'POST',body:JSON.stringify(body)})});return{status:r.status,headers:r.headers,body:r.headers.get('content-type')?.includes('application/json')?await r.json():Buffer.from(await r.arrayBuffer())};}
const logIn=async(name,password='test-owner-password-2026')=>{const r=await req('/api/login',{username:name,password});ok(r.status,200);return r.headers.get('set-cookie').split(';')[0];};
try{
 await start();ok((await req('/api/session')).body.setupRequired,true);ok((await req('/api/state',undefined,'',{'oai-authenticated-user-id':'fake','oai-authenticated-user-email':'fake@x.test'})).status,401);
 ok((await req('/api/setup',{token:'bad',username:'owner',password:'test-owner-password-2026'})).status,403);
 const token=readFileSync(join(dir,'setup-token'),'utf8').trim();ok((await req('/api/setup',{token,username:'owner',password:'test-owner-password-2026'})).status,200);ok(existsSync(join(dir,'setup-token')),false);ok((await req('/api/setup',{token,username:'other',password:'test-owner-password-2026'})).status,409);
 const owner=await logIn('owner');ok((await req('/api/state',{id:'bad',type:'seed'},owner,{origin:'https://evil.test'})).status,403);ok((await req('/api/state',{id:'seed',type:'seed'},owner)).status,200);
 ok((await req('/api/state',{id:'hours',type:'settings',name:'Native test',timezone:'America/Toronto',open:'00:00',close:'23:59',cutoff:'04:00',closedDays:[]},owner)).status,200);ok((await req('/api/state',{id:'shift',type:'openShift',float:10000},owner)).status,200);
 for(const role of ['cashier','kitchen','manager'])ok((await req('/api/admin/staff',{username:role,password:'test-staff-password-2026',role},owner)).status,200);
 const cashier=await logIn('cashier','test-staff-password-2026'),kitchen=await logIn('kitchen','test-staff-password-2026');
 ok((await req('/api/admin/staff',undefined,cashier)).status,403);ok((await req('/api/state',{id:'bad-hours',type:'settings'},cashier)).status,403);ok((await req('/api/state',{id:'bad-refund',type:'refund'},cashier)).status,403);
 const sale={id:'cash-sale',type:'order',mode:'retail',items:[{productId:'sample-1',qty:1}],confirmed:true,tender:'cash',cashReceived:3000};ok((await req('/api/state',sale,kitchen)).status,403);
 const paid=await req('/api/state',sale,cashier);ok(paid.status,200);ok(paid.body.state.orders[0].total,2034);const retry=await req('/api/state',sale,cashier);ok(retry.body.state.orders.length,1);ok(retry.body.state.products[0].stock,23);
 ok((await req('/api/state',{...sale,id:'food-sale',mode:'restaurant',items:[{productId:'sample-7',qty:1}],tender:'unpaid',reference:'Pickup'},cashier)).status,200);const k=await req('/api/state',{id:'prepare',type:'kitchen',orderId:'food-sale',status:'preparing'},kitchen);ok(k.status,200);ok(k.body.state.orders[1].kitchen,'preparing');
 const vh={authorization:'Bearer '+secret};ok((await req('/api/voice',undefined,'',vh)).status,200);ok((await req('/api/voice',undefined,'',{authorization:'Bearer '+secret+'-printer'})).status,401);
 const q=await req('/api/voice',{action:'quote',draft:{callId:'native-call',customer:'Caller',notes:'',items:[{productId:'sample-7',qty:1}]}},'',vh);ok(q.status,200);ok((await req('/api/voice',{action:'confirm',quoteToken:q.body.quoteToken,confirmed:true},'',vh)).body.status,'accepted');
 ok((await req('/api/state',{id:'online',type:'onlineSettings',enabled:true,prepMinutes:15},owner)).status,200);const menu=await req('/api/online');ok(menu.body.privatePreview,false);ok(menu.body.products[0].cost,undefined);
 const pickup={id:'native-online-pickup',action:'submit',mode:'retail',customer:'Native pickup',notes:'',items:[{productId:'sample-1',qty:1}],expectedTotal:2034,receiptKey:'d'.repeat(64),confirmed:true};const requested=await req('/api/online',pickup);ok(requested.status,200);ok(requested.body.status,'pending');ok((await req('/api/state',{id:'accept-online',type:'channelAccept',requestId:pickup.id,confirmed:true},cashier)).status,200);
 ok((await req('/api/admin/diagnostics',undefined,owner)).body.staffAudit.some(x=>x.reference==='cash-sale'),true);
 const journal=await req('/api/admin/history',undefined,owner);ok(journal.status,200);ok(journal.body.orders.map(o=>o.number),[1004,1003,1002,1001]);ok(journal.body.nextBefore,null);ok(journal.body.orders[0].reference,undefined);
 ok((await req('/api/admin/history?number=1001&mode=retail&status=paid',undefined,owner)).body.orders[0].id,'cash-sale');
 ok((await req('/api/admin/history?before=1003',undefined,owner)).body.orders.map(o=>o.number),[1002,1001]);
 ok((await req('/api/admin/history?number=1001&mode=restaurant',undefined,owner)).body.orders.length,0);
 const receipt=(await req('/api/admin/history?id=cash-sale',undefined,owner)).body;ok(receipt.order.total,2034);ok(receipt.versions,1);ok(receipt.refunds.length,0);
 ok((await req('/api/admin/history?id=food-sale',undefined,owner)).body.versions,2);
 ok((await req('/api/admin/history?id=missing',undefined,owner)).status,404);ok((await req('/api/admin/history?from=2026-02-30',undefined,owner)).status,400);
 ok((await req('/api/admin/history',undefined,cashier)).status,403);ok((await req('/api/admin/history?id=cash-sale',undefined,kitchen)).status,403);ok((await req('/api/admin/history')).status,401);
 for(const path of ['/','/restaurant','/retail','/admin','/order/restaurant','/order/retail'])ok((await req(path)).status,200);
 ok((await req('/')).headers.get('x-content-type-options'),'nosniff');ok((await req('/data/jawa.sqlite')).status,404);ok((await req('/.env.server')).status,404);
 ok((await req('/api/admin/backup',{passphrase:'short'},owner)).status,400);const b=await req('/api/admin/backup',{passphrase:' backup-test-passphrase-2026 '},owner);ok(b.status,200);ok(b.body.subarray(0,8).toString(),'JAWABAK1');
 const bf=join(dir,'export.jawabak'),pf=join(dir,'phrase'),target=join(dir,'restored');writeFileSync(bf,b.body);writeFileSync(pf,' backup-test-passphrase-2026 ');const r=spawnSync(process.execPath,['server/restore.mjs',bf,pf,target],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);checks++;
 const db=new DatabaseSync(join(target,'jawa.sqlite'));ok(db.prepare('SELECT count(*) AS n FROM sessions').get().n,0);ok(JSON.parse(db.prepare('SELECT payload FROM stores').get().payload).orders.length,4);ok(db.prepare('SELECT count(*) AS n FROM ledger_orders').get().n,4);ok(db.prepare('SELECT count(*) AS n FROM ledger_order_versions').get().n,5);ok(db.prepare('SELECT revision FROM ledger_coverage').get().revision,db.prepare('SELECT revision FROM stores').get().revision);db.close();ok(spawnSync(process.execPath,['server/restore.mjs',bf,pf,target]).status,1);
 const broken=Buffer.from(b.body);broken[70]^=1;writeFileSync(join(dir,'broken.jawabak'),broken);ok(spawnSync(process.execPath,['server/restore.mjs',join(dir,'broken.jawabak'),pf,join(dir,'bad')]).status,1);
 const overview=(await req('/api/admin/overview',undefined,owner)).body;ok(overview.storage.orders,4);ok(overview.integrations.find(i=>i.id==='voice').status,'API configured');ok(JSON.stringify(overview).includes(secret),false);ok(overview.activity.some(a=>a.scope==='voice'),true);
 ok((await req('/api/admin/overview',undefined,cashier)).status,403);ok((await req('/api/admin/overview')).status,401);
 const csv=await req('/api/admin/report-export?from=2020-01-01&to=2099-12-31',undefined,owner);ok(csv.status,200);ok(csv.headers.get('content-type'),'text/csv; charset=utf-8');ok(csv.body.toString().includes('Platform collected'),true);
 ok((await req('/api/admin/report-export?from=2026-02-30&to=2026-03-02',undefined,owner)).status,400);ok((await req('/api/admin/report-export?from=2020-01-01&to=2099-12-31',undefined,cashier)).status,403);
 const guide=await req('/api/admin/deployment-guide',undefined,owner);ok(guide.status,200);ok(guide.body.toString().includes('customer deployment'),true);
 const staff=(await req('/api/admin/staff',undefined,owner)).body.staff;ok((await req('/api/admin/staff',{action:'disable',id:staff.find(x=>x.username==='cashier').id},owner)).status,200);ok((await req('/api/state',undefined,cashier)).status,401);
 ok((await req('/api/password',{currentPassword:'test-owner-password-2026',password:'test-owner-new-password-2026'},owner)).status,200);ok((await req('/api/state',undefined,owner)).status,401);const changed=await logIn('owner','test-owner-new-password-2026');await stop();await start();ok((await req('/api/state',undefined,changed)).body.state.orders.length,4);
 await stop();
 const ledger=new DatabaseSync(join(dir,'jawa.sqlite'));const state=JSON.parse(ledger.prepare('SELECT payload FROM stores').get().payload);state.orders[0].paidBusinessDate='2026-01-05';ledger.prepare('UPDATE stores SET payload=?,revision=revision+1').run(JSON.stringify(state));ledger.close();
 await start();const summary=await req('/api/admin/reports',undefined,changed);ok(summary.status,200);const closed=summary.body.reports.find(r=>r.day==='2026-01-05');ok(closed.payload.count,1);ok(closed.payload.cash,2034);ok(closed.payload.tax,234);ok(existsSync(join(dir,'backup.key')),true);ok(existsSync(join(dir,'backups',new Date().toISOString().slice(0,10)+'.jawabak')),true);
 ok((await req('/api/logout',{},changed)).status,200);ok((await req('/api/state',undefined,changed)).status,401);
 await stop();await start(target);ok((await req('/api/state',undefined,changed)).status,401);const restored=await logIn('owner');ok((await req('/api/state',undefined,restored)).body.state.orders.length,4);
 ok((await req('/api/admin/history?id=cash-sale',undefined,restored)).body.order.total,2034);ok((await req('/api/admin/history?id=food-sale',undefined,restored)).body.versions,2);
 console.log(JSON.stringify({standaloneServerChecks:checks,passed:true}));
}finally{await stop();rmSync(dir,{recursive:true,force:true});}
