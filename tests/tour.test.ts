import {test,mock} from 'node:test';
import assert from 'node:assert/strict';
import {createTourStore} from '../lib/tour.ts';
import {newId} from '../lib/ids.ts';
test('walkthrough starts with coherent stock, table, kitchen and retail records',()=>{const s=createTourStore('2026-09-11T16:00:00.000Z');assert.equal(s.products.length,12);assert.equal(s.orders.length,3);assert.equal(s.orders[0].kitchen,'preparing');assert.equal(s.orders[1].kitchen,'new');assert.equal(s.orders[2].total,2034);assert.equal(s.holds?.length,1);assert.equal(s.products[6].stock,28);assert.equal(s.prints.length,3);});
test('walkthrough instances do not share changes',()=>{const a=createTourStore(),b=createTourStore();a.products[0].stock=0;assert.equal(b.products[0].stock,23);});
test('UUID fallback uses crypto bytes when browser randomUUID is unavailable',()=>{const original=crypto.randomUUID;Object.defineProperty(crypto,'randomUUID',{value:undefined,configurable:true});try {const id=newId();assert.match(id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);assert.notEqual(id,newId());}finally{Object.defineProperty(crypto,'randomUUID',{value:original,configurable:true});}});
