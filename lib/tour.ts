import { applyOperation, emptyStore, type Store } from './engine.ts';

// Sample data uses the real transaction engine. Never writes to the merchant API.
export function createTourStore(at = new Date().toISOString()): Store {
  let state = emptyStore();
  const apply = (op: Parameters<typeof applyOperation>[1]) => { state = applyOperation(state, op, at).state; };
  apply({id:'tour-seed',type:'seed'});
  state.settings.name = 'Jawa sample store';
  apply({id:'tour-shift',type:'openShift',float:10000});
  apply({id:'tour-table-order',type:'order',mode:'restaurant',tableId:'table-2',reference:'Table 2',items:[{productId:'sample-7',qty:2},{productId:'sample-10',qty:1}],tender:'unpaid',confirmed:true});
  apply({id:'tour-preparing',type:'kitchen',orderId:'tour-table-order',status:'preparing'});
  apply({id:'tour-pickup-order',type:'order',mode:'restaurant',reference:'Nina · pickup',items:[{productId:'sample-9',qty:1},{productId:'sample-12',qty:2}],tender:'unpaid',confirmed:true});
  apply({id:'tour-retail-order',type:'order',mode:'retail',reference:'Sample customer',items:[{productId:'sample-1',qty:1}],tender:'cash',cashReceived:2500,confirmed:true});
  apply({id:'tour-held-cart',type:'hold',mode:'retail',name:'Alex · collecting later',items:[{productId:'sample-2',qty:2}],notes:''});
  return state;
}
