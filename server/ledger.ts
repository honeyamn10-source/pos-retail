import type {DatabaseSync} from 'node:sqlite';
import type {Store} from '../lib/engine.ts';

/** All callers must hold the same transaction as the store update. */
export function syncLedger(db:DatabaseSync,owner:string,state:Store,revision:number){
 const previous=db.prepare('SELECT id,payload FROM ledger_orders WHERE owner=?').all(owner) as {id:string;payload:string}[];
 const prior=new Map(previous.map(r=>[r.id,r.payload]));
 const ids=new Set(state.orders.map(o=>o.id));
 if(previous.some(r=>!ids.has(r.id)))throw new Error('Transaction history cannot be removed from this installation.');
 const upsert=db.prepare('INSERT INTO ledger_orders(owner,id,number,created_at,business_date,mode,status,channel,total,payload) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(owner,id) DO UPDATE SET status=excluded.status,channel=excluded.channel,total=excluded.total,payload=excluded.payload');
 const snapshot=db.prepare('INSERT INTO ledger_order_versions(owner,order_id,revision,payload) VALUES(?,?,?,?)');
 for(const order of state.orders){const payload=JSON.stringify(order);if(prior.get(order.id)===payload)continue;
  // A numbered receipt must not acquire another identity during an update.
  if(prior.has(order.id)){const old=JSON.parse(prior.get(order.id)!);if(old.number!==order.number||old.createdAt!==order.createdAt||old.mode!==order.mode||old.businessDate!==order.businessDate)throw new Error('Original order identity cannot change.');}
  snapshot.run(owner,order.id,revision,payload);
  upsert.run(owner,order.id,order.number,order.createdAt,order.businessDate,order.mode,order.status,order.channel,order.total,payload);
 }
 const immutable=(kind:string,rows:{id:string;[key:string]:unknown}[])=>{
  const previous=db.prepare('SELECT id,payload FROM ledger_records WHERE owner=? AND kind=?').all(owner,kind) as {id:string;payload:string}[];
  const known=new Map(previous.map(r=>[r.id,r.payload]));const current=new Set(rows.map(r=>r.id));
  if(previous.some(r=>!current.has(r.id)))throw new Error('Recorded '+kind+' history cannot be removed.');
  const insert=db.prepare('INSERT INTO ledger_records(owner,kind,id,revision,payload) VALUES(?,?,?,?,?)');
  for(const row of rows){const payload=JSON.stringify(row);if(known.has(row.id)){if(known.get(row.id)!==payload)throw new Error('Recorded '+kind+' history cannot be rewritten.');}else insert.run(owner,kind,row.id,revision,payload);}
 };
 immutable('refund',state.refunds);immutable('stock',state.movements);immutable('audit',state.audit);
 immutable('operation',Object.entries(state.applied).map(([id,entry])=>({id,...entry})));
 db.prepare('INSERT INTO ledger_coverage(owner,revision) VALUES(?,?) ON CONFLICT(owner) DO UPDATE SET revision=excluded.revision').run(owner,revision);
}

export function initializeLedger(db:DatabaseSync){
 db.exec(`CREATE TABLE IF NOT EXISTS ledger_orders(owner TEXT NOT NULL,id TEXT NOT NULL,number INTEGER NOT NULL,created_at TEXT NOT NULL,business_date TEXT NOT NULL,mode TEXT NOT NULL,status TEXT NOT NULL,channel TEXT NOT NULL,total INTEGER NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(owner,id),UNIQUE(owner,number));
 CREATE INDEX IF NOT EXISTS ledger_orders_date ON ledger_orders(owner,business_date,number);
 CREATE TABLE IF NOT EXISTS ledger_order_versions(owner TEXT NOT NULL,order_id TEXT NOT NULL,revision INTEGER NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(owner,order_id,revision));
 CREATE TABLE IF NOT EXISTS ledger_records(owner TEXT NOT NULL,kind TEXT NOT NULL,id TEXT NOT NULL,revision INTEGER NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(owner,kind,id));
 CREATE TABLE IF NOT EXISTS ledger_coverage(owner TEXT PRIMARY KEY,revision INTEGER NOT NULL);`);
 db.exec('BEGIN IMMEDIATE');try{
  for(const row of db.prepare('SELECT owner,revision,payload FROM stores').all() as {owner:string;revision:number;payload:string}[])syncLedger(db,row.owner,JSON.parse(row.payload),row.revision);
  db.exec('COMMIT');
 }catch(e){db.exec('ROLLBACK');throw e;}
}

export function history(db:DatabaseSync,owner:string,params:URLSearchParams){
 const from=params.get('from')||'0001-01-01',to=params.get('to')||'9999-12-31',mode=params.get('mode')||'all',status=params.get('status')||'all',cursor=Number(params.get('before')||2147483647),number=params.get('number');
 const date=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
 if(!date(from)||!date(to)||from>to||!['all','restaurant','retail'].includes(mode)||!['all','paid','unpaid','refunded','cancelled'].includes(status)||!Number.isSafeInteger(cursor)||cursor<1||(number!==null&&!/^[1-9]\d{0,9}$/.test(number)))throw new Error('Choose valid history filters.');
 const rows=db.prepare('SELECT id,number,business_date,created_at,mode,status,channel,total FROM ledger_orders WHERE owner=? AND business_date>=? AND business_date<=? AND (?=\'all\' OR mode=?) AND (?=\'all\' OR status=?) AND number<? AND (? IS NULL OR number=?) ORDER BY number DESC LIMIT 51').all(owner,from,to,mode,mode,status,status,cursor,number,number) as {id:string;number:number}[];
 return {orders:rows.slice(0,50),nextBefore:rows.length>50?rows[49].number:null,dateBasis:'Order creation business date'};
}

export function receiptHistory(db:DatabaseSync,owner:string,id:string){
 const row=db.prepare('SELECT payload FROM ledger_orders WHERE owner=? AND id=?').get(owner,id) as {payload:string}|undefined;
 if(!row)return null;
 const refunds=(db.prepare("SELECT payload FROM ledger_records WHERE owner=? AND kind='refund'").all(owner) as {payload:string}[]).map(r=>JSON.parse(r.payload)).filter(r=>r.orderId===id);
 return {order:JSON.parse(row.payload),refunds,versions:db.prepare('SELECT count(*) AS count FROM ledger_order_versions WHERE owner=? AND order_id=?').get(owner,id)?.count??0};
}
