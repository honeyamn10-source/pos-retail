import { applyOperation, emptyStore, type Store, type Operation } from './engine.ts';
export async function readRepository(db:D1Database,owner:string){const row=await db.prepare('SELECT revision,payload FROM stores WHERE owner=?').bind(owner).first<{revision:number;payload:string}>();return {revision:row?.revision??0,state:row?JSON.parse(row.payload) as Store:emptyStore()};}
export async function mutateRepository(db:D1Database,owner:string,op:Operation){
 await db.prepare('INSERT OR IGNORE INTO stores(owner,revision,payload) VALUES(?,0,?)').bind(owner,JSON.stringify(emptyStore())).run();
 for(let i=0;i<6;i++){const current=await readRepository(db,owner);const changed=applyOperation(current.state,op);if(changed.duplicate)return {...current,result:changed.result};const payload=JSON.stringify(changed.state);if(new TextEncoder().encode(payload).length>1800000)throw new Error('Training storage limit reached. Export your records.');const saved=await db.prepare('UPDATE stores SET payload=?,revision=revision+1 WHERE owner=? AND revision=?').bind(payload,owner,current.revision).run();if(saved.meta.changes===1)return {state:changed.state,revision:current.revision+1,result:changed.result};}
 throw new Error('Another register is updating. Please retry this action.');
}
