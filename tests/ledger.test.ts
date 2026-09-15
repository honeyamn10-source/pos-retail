import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {applyOperation,emptyStore,type Store,type Operation} from '../lib/engine.ts';
import {initializeLedger,syncLedger,history,receiptHistory} from '../server/ledger.ts';
function fixture(){const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE stores(owner TEXT PRIMARY KEY,revision INTEGER,payload TEXT)');let state=emptyStore(),revision=0;db.prepare('INSERT INTO stores VALUES(?,?,?)').run('merchant',0,JSON.stringify(state));initializeLedger(db);
 const save=(next:Store)=>{db.exec('BEGIN IMMEDIATE');try{db.prepare('UPDATE stores SET revision=?,payload=? WHERE owner=?').run(revision+1,JSON.stringify(next),'merchant');syncLedger(db,'merchant',next,revision+1);db.exec('COMMIT');state=next;revision++;}catch(e){db.exec('ROLLBACK');throw e;}};
 const run=(op:Operation)=>{const result=applyOperation(state,op,'2026-09-15T16:00:00Z');if(!result.duplicate)save(result.state);return result;};
 return {db,run,save,state:()=>state,revision:()=>revision};}
const sale={id:'sale',type:'order',mode:'retail',items:[{productId:'sample-1',qty:2}],tender:'cash',cashReceived:4068,expectedTotal:4068,confirmed:true};
test('migration preserves legacy records and rerunning it does not duplicate versions',()=>{
 const f=fixture();try{f.run({id:'seed',type:'seed'});f.run({id:'shift',type:'openShift',float:10000});f.run(sale);const snapshot=JSON.stringify(f.state());f.db.exec('DROP TABLE ledger_orders;DROP TABLE ledger_order_versions;DROP TABLE ledger_records;DROP TABLE ledger_coverage');initializeLedger(f.db);initializeLedger(f.db);assert.equal(f.db.prepare('SELECT count(*) AS n FROM ledger_order_versions').get()?.n,1);assert.equal(JSON.stringify(f.state()),snapshot);assert.equal(receiptHistory(f.db,'merchant','sale')?.order.total,4068);}finally{f.db.close();}
});
test('sale, partial refund and duplicate recovery preserve one receipt with two versions',()=>{
 const f=fixture();try{f.run({id:'seed',type:'seed'});f.run({id:'shift',type:'openShift',float:10000});f.run(sale);f.run(sale);f.run({id:'refund',type:'refund',orderId:'sale',reason:'Customer return',items:[{productId:'sample-1',qty:1,restock:true}]});const receipt=receiptHistory(f.db,'merchant','sale');assert.equal(receipt?.versions,2);assert.equal(receipt?.refunds.length,1);assert.equal(receipt?.refunds[0].total,2034);assert.equal(receipt?.order.lines[0].refunded,1);assert.equal(f.db.prepare("SELECT count(*) AS n FROM ledger_records WHERE kind='operation'").get()?.n,4);assert.equal(f.state().products[0].stock,23);}finally{f.db.close();}
});
test('journal failure rolls back the store and all partial journal writes',()=>{
 const f=fixture();try{f.run({id:'seed',type:'seed'});f.run({id:'shift',type:'openShift',float:10000});const before=f.db.prepare('SELECT payload,revision FROM stores').get();f.db.exec("CREATE TRIGGER fail_stock BEFORE INSERT ON ledger_records WHEN NEW.kind='stock' BEGIN SELECT RAISE(ABORT,'simulated disk failure'); END;");assert.throws(()=>f.run(sale),/simulated/);assert.deepEqual(f.db.prepare('SELECT payload,revision FROM stores').get(),before);assert.equal(f.db.prepare('SELECT count(*) AS n FROM ledger_orders').get()?.n,0);assert.equal(f.db.prepare('SELECT count(*) AS n FROM ledger_order_versions').get()?.n,0);}finally{f.db.close();}
});
test('existing monetary records and duplicate-operation protection cannot be silently erased',()=>{
 const f=fixture();try{f.run({id:'seed',type:'seed'});f.run({id:'shift',type:'openShift',float:10000});f.run(sale);
  const erased=structuredClone(f.state());erased.orders=[];assert.throws(()=>f.save(erased),/cannot be removed/);
  const changed=structuredClone(f.state());changed.movements[0].delta=0;assert.throws(()=>f.save(changed),/cannot be rewritten/);
  const forgotten=structuredClone(f.state());delete forgotten.applied.sale;assert.throws(()=>f.save(forgotten),/cannot be removed/);
  assert.equal(receiptHistory(f.db,'merchant','sale')?.order.total,4068);
 }finally{f.db.close();}
});
test('history pages have stable descending cursors, exact filters and merchant isolation',()=>{
 const f=fixture();try{
  const insert=f.db.prepare('INSERT INTO ledger_orders VALUES(?,?,?,?,?,?,?,?,?,?)');for(let n=1001;n<=1105;n++)insert.run('merchant','id-'+n,n,'2026-09-15T16:00:00Z','2026-09-15','retail','paid','register',100,'{}');
  const first=history(f.db,'merchant',new URLSearchParams());assert.equal(first.orders.length,50);assert.equal(first.orders[0].number,1105);assert.equal(first.nextBefore,1056);
  const second=history(f.db,'merchant',new URLSearchParams({before:String(first.nextBefore)}));assert.equal(second.orders[0].number,1055);assert.equal(new Set([...first.orders,...second.orders].map(o=>o.id)).size,100);
  assert.equal(history(f.db,'other',new URLSearchParams()).orders.length,0);assert.equal(receiptHistory(f.db,'other','id-1001'),null);
  assert.equal(history(f.db,'merchant',new URLSearchParams({number:'1001'})).orders[0].number,1001);assert.equal(history(f.db,'merchant',new URLSearchParams({mode:'restaurant'})).orders.length,0);
  for(const params of [{from:'2026-02-30'},{before:'NaN'},{mode:"' OR 1=1 --"}] as Record<string,string>[])assert.throws(()=>history(f.db,'merchant',new URLSearchParams(params)));
 }finally{f.db.close();}
});
