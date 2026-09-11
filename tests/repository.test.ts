import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {readRepository,mutateRepository} from '../lib/repository.ts';
function database(){
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec(readFileSync(new URL('../drizzle/0000_faulty_pandemic.sql',import.meta.url),'utf8'));
 const adapter={
  prepare(sql:string){
   return {bind(...values:(string|number)[]){
    return {
     async first(){await Promise.resolve();return sqlite.prepare(sql).get(...values)??null;},
     async run(){await Promise.resolve();return {meta:{changes:Number(sqlite.prepare(sql).run(...values).changes)}};}
    };
   }};
  }
 };
 return {sqlite,db:adapter as unknown as D1Database};
}
test('actual SQLite schema and compare-and-swap isolate owners',async()=>{const {db,sqlite}=database();await mutateRepository(db,'owner-a',{id:'seed',type:'seed'});assert.equal((await readRepository(db,'owner-a')).state.products.length,12);assert.equal((await readRepository(db,'owner-b')).state.products.length,0);sqlite.close();});
test('concurrent last-item checkout has exactly one winner',async()=>{const {db,sqlite}=database();await mutateRepository(db,'owner',{id:'seed',type:'seed'});await mutateRepository(db,'owner',{id:'shift',type:'openShift',float:0});await mutateRepository(db,'owner',{id:'stock',type:'stock',productId:'sample-1',count:1,reason:'Last item'});const results=await Promise.allSettled(['sale-a','sale-b'].map(id=>mutateRepository(db,'owner',{id,type:'order',mode:'retail',items:[{productId:'sample-1',qty:1}],confirmed:true,tender:'cash',cashReceived:10000})));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);const {state}=await readRepository(db,'owner');assert.equal(state.orders.length,1);assert.equal(state.products[0].stock,0);assert.equal(state.prints.length,1);sqlite.close();});
test('concurrent identical requests persist one order and replay original result',async()=>{const {db,sqlite}=database();await mutateRepository(db,'owner',{id:'seed',type:'seed'});await mutateRepository(db,'owner',{id:'shift',type:'openShift',float:0});const op={id:'sale',type:'order',mode:'retail',items:[{productId:'sample-1',qty:1}],confirmed:true,tender:'cash',cashReceived:10000};const [a,b]=await Promise.all([mutateRepository(db,'owner',op),mutateRepository(db,'owner',op)]);assert.equal(a.result,b.result);const saved=await readRepository(db,'owner');assert.equal(saved.state.orders.length,1);assert.equal(saved.revision,3);sqlite.close();});
test('concurrent completion of a held cart accepts exactly one sale',async()=>{const {db,sqlite}=database();await mutateRepository(db,'owner',{id:'seed',type:'seed'});await mutateRepository(db,'owner',{id:'shift',type:'openShift',float:0});await mutateRepository(db,'owner',{id:'held',type:'hold',mode:'retail',name:'Saved customer',items:[{productId:'sample-1',qty:1}],notes:''});const results=await Promise.allSettled(['a','b'].map(id=>mutateRepository(db,'owner',{id,type:'order',mode:'retail',holdId:'held',items:[{productId:'sample-1',qty:1}],confirmed:true,tender:'cash',cashReceived:10000})));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);const {state}=await readRepository(db,'owner');assert.equal(state.holds?.length,0);assert.equal(state.orders.length,1);sqlite.close();});
test('concurrent opening of the same table preserves one unpaid check',async()=>{const {db,sqlite}=database();await mutateRepository(db,'owner',{id:'seed',type:'seed'});await mutateRepository(db,'owner',{id:'shift',type:'openShift',float:0});const results=await Promise.allSettled(['a','b'].map(id=>mutateRepository(db,'owner',{id,type:'order',mode:'restaurant',tableId:'table-1',items:[{productId:'sample-7',qty:1}],confirmed:true,tender:'unpaid'})));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);const {state}=await readRepository(db,'owner');assert.equal(state.orders.length,1);assert.equal(state.products[6].stock,29);sqlite.close();});

test('two registers accepting the same online request commit one order and ticket',async()=>{const {db,sqlite}=database();await mutateRepository(db,'owner',{id:'seed',type:'seed'});await mutateRepository(db,'owner',{id:'shift',type:'openShift',float:0});await mutateRepository(db,'owner',{id:'request',type:'channelRequest',source:'doordash',externalId:'same-provider-reference',mode:'restaurant',customer:'Test',notes:'',items:[{productId:'sample-7',qty:1}],expectedTotal:1639,payment:'platform_collected',fulfillment:'delivery'});const results=await Promise.all(['accept-a','accept-b'].map(id=>mutateRepository(db,'owner',{id,type:'channelAccept',requestId:'request',confirmed:true,platformHandled:true})));assert.equal(results[0].result,results[1].result);const {state}=await readRepository(db,'owner');assert.equal(state.orders.length,1);assert.equal(state.prints.length,1);assert.equal(state.products[6].stock,29);sqlite.close();});
