import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyStore,applyOperation} from '../lib/engine.ts';
import {storeOverview,rangeSummary,summaryCsv} from '../server/overview.ts';
test('connection readiness never represents configured credentials as a verified device',()=>{
 const state=emptyStore(),secret='never-send-this-secret-to-browser-1234567890';
 const result=storeOverview(state,{JAWA_VOICE_TOKEN:secret,JAWA_PRINTER_TOKEN:secret,JAWA_CHANNEL_TOKEN:secret,JAWA_DOORDASH_STORE_ID:'store-1'},'https://merchant.example','restaurant',10,'2026-09-12T05:00:00Z');
 assert.equal(result.day,'2026-09-11');assert.equal(result.integrations.find(i=>i.id==='voice')?.status,'API configured');assert.equal(result.integrations.find(i=>i.id==='doordash')?.status,'Connector unfinished');assert.equal(JSON.stringify(result).includes(secret),false);assert.equal(result.shiftOpen,false);
});
test('range export uses paid business dates and preserves integer-cent accounting',()=>{
 let state=applyOperation(emptyStore(),{id:'seed',type:'seed'}).state;
 state=applyOperation(state,{id:'shift',type:'openShift',float:0},'2026-09-12T12:00:00Z').state;
 state=applyOperation(state,{id:'sale',type:'order',mode:'retail',items:[{productId:'sample-1',qty:1}],expectedTotal:2034,tender:'cash',cashReceived:2034,confirmed:true},'2026-09-12T12:00:00Z').state;
 const summary=rangeSummary(state,'2026-09-12','2026-09-12');assert.equal(summary.net,1800);assert.equal(summary.tax,234);assert.equal(summary.cash,2034);assert.equal(summary.external,0);
 assert.match(summaryCsv(summary),/"18.00","2.34","20.34","0.00"/);assert.equal(rangeSummary(state,'2026-09-13','2026-09-13').orders,0);
});
test('invalid calendar dates and reversed ranges are rejected',()=>{
 for(const [from,to] of [['2026-02-30','2026-03-01'],['2026-09-13','2026-09-12'],['=cmd','2026-09-12']])assert.throws(()=>rangeSummary(emptyStore(),from,to));
});
test('negative refund-day amounts remain numeric in CSV',()=>{
 const summary={...rangeSummary(emptyStore(),'2026-09-12','2026-09-12'),net:-500,tax:-65,cash:-565};
 assert.match(summaryCsv(summary),/"-5.00","-0.65","-5.65","0.00"/);
});
