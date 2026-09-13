import {activeShift,businessDate,isOpen,report,type Store} from '../lib/engine.ts';

export function storeOverview(state:Store,config:Record<string,string|undefined>,origin:string,mode:string,bytes:number,now=new Date().toISOString()){
 const day=businessDate(now,state.settings),sales=report(state,day,day);
 const credential=(key:string)=>(config[key]?.length??0)>=32;
 const online=!!state.online?.enabled;
 return {store:state.settings.name,mode,day,timezone:state.settings.timezone,cutoff:state.settings.cutoff,hours:{open:state.settings.open,close:state.settings.close},open:isOpen(now,state.settings),shiftOpen:!!activeShift(state),
  today:{net:sales.net,tax:sales.tax,cash:sales.cash,external:sales.external,count:sales.count},
  queues:{unpaid:state.orders.filter(o=>o.status==='unpaid').length,kitchen:state.orders.filter(o=>o.mode==='restaurant'&&!['served','cancelled','none'].includes(o.kitchen)&&!['cancelled','refunded'].includes(o.status)).length,
   inbox:(state.channelRequests??[]).filter(r=>r.status==='pending'&&(r.source!=='online'||Date.parse(now)-Date.parse(r.createdAt)<=1800000)).length,
   expired:(state.channelRequests??[]).filter(r=>r.status==='pending'&&r.source==='online'&&Date.parse(now)-Date.parse(r.createdAt)>1800000).length,
   printReview:state.prints.filter(p=>['claimed','submitted','uncertain'].includes(p.status)).length,printPending:state.prints.filter(p=>p.status==='pending').length,lowStock:state.products.filter(p=>p.stock<=p.low).length},
  storage:{products:state.products.length,productLimit:2000,orders:state.orders.length,orderLimit:1000,bytes,byteLimit:1800000},
  links:{restaurant:origin+'/order/restaurant',retail:origin+'/order/retail'},
  integrations:[
   {id:'online',name:'Online pickup',configured:online,status:online&&!!activeShift(state)&&isOpen(now,state.settings)?'Accepting requests':'Paused',detail:'Customers request pickup; your team accepts it in Online orders. Payment is collected at pickup.'},
   {id:'voice',name:'Voice agent',configured:credential('JAWA_VOICE_TOKEN'),status:credential('JAWA_VOICE_TOKEN')?'API configured':'Setup needed',detail:'Phone number, LiveKit, speech models and staff transfer need configuration and a real-call test.'},
   {id:'printer',name:'Kitchen & receipt printer',configured:credential('JAWA_PRINTER_TOKEN'),status:credential('JAWA_PRINTER_TOKEN')?'API configured':'Setup needed',detail:'Run the local bridge with a supported network printer. Confirm actual paper in the print queue.'},
   ...['DOORDASH','UBEREATS','SKIP'].map((key,i)=>({id:key.toLowerCase(),name:['DoorDash','Uber Eats','Skip'][i],configured:credential('JAWA_CHANNEL_TOKEN')&&!!config[`JAWA_${key}_STORE_ID`],status:'Connector unfinished',detail:'The local order inbox is available. An approved provider connector and bidirectional updates still need implementation.'})),
   {id:'payments',name:'Card payments',configured:false,status:'Not implemented',detail:'Cash is supported. A payment processor and supported terminals still need integration.'}
  ]};
}
export function rangeSummary(state:Store,from:string,to:string){
 const date=(v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
 if(!date(from)||!date(to)||from>to)throw new Error('Choose valid start and end business dates in order.');
 const r=report(state,from,to);
 return {from,to,timezone:state.settings.timezone,cutoff:state.settings.cutoff,currency:'CAD',orders:r.count,net:r.net,tax:r.tax,cash:r.cash,external:r.external};
}
export function summaryCsv(summary:ReturnType<typeof rangeSummary>){
 const cell=(v:string|number)=>'"'+(/^-?\d+(?:\.\d+)?$/.test(String(v))?String(v):String(v).replace(/^[=+@\-\t\r]/,"'$&")).replace(/"/g,'""')+'"';
 const columns=['From','To','Timezone','Business day cutoff','Currency','Paid orders','Net sales','Net tax','Cash collected after refunds','Platform collected'];
 const row=[summary.from,summary.to,summary.timezone,summary.cutoff,summary.currency,summary.orders,...[summary.net,summary.tax,summary.cash,summary.external].map(n=>(n/100).toFixed(2))];
 return '\uFEFF'+columns.map(cell).join(',')+'\r\n'+row.map(cell).join(',')+'\r\n';
}
