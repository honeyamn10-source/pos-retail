import type { Store, Operation, Mode, Line } from './engine.ts';
import { activeShift, isOpen } from './engine.ts';
import { canonical, cleanText, makeLines, queuePrint } from './pos-operations.ts';
export type Channel = 'online'|'doordash'|'ubereats'|'skip';
export const channelNames:Record<Channel,string>={online:'Jawa Online',doordash:'DoorDash',ubereats:'Uber Eats',skip:'Skip'};
export type ChannelRequest = {id:string;source:Channel;externalId:string;mode:Mode;customer:string;notes:string;items:Line[];total:number;createdAt:string;status:'pending'|'accepted'|'rejected';orderId?:string;reason?:string;receiptKey?:string;fingerprint:string;payment:'pay_at_pickup'|'platform_collected';fulfillment:'pickup'|'delivery'};
function check(value:unknown,message:string):asserts value{if(!value)throw new Error(message);}
export function channelOperation(s:Store,op:Operation,at:string):string|undefined{
 switch(op.type){
 case 'onlineSettings':{
  check(typeof op.enabled==='boolean','Choose whether to take online orders.');
  check(Number.isInteger(op.prepMinutes)&&Number(op.prepMinutes)>=5&&Number(op.prepMinutes)<=180,'Preparation time must be 5–180 minutes.');
  s.online={enabled:op.enabled,prepMinutes:Number(op.prepMinutes)};return op.enabled?'Online pickup requests enabled':'Online pickup requests paused';
 }
 case 'channelRequest':{
  check(['online','doordash','ubereats','skip'].includes(String(op.source)),'Unsupported order channel.');
  const source=op.source as Channel;
  const externalId=cleanText(op.externalId,'external order reference',100);
  check(op.mode==='retail'||op.mode==='restaurant','Invalid register.');
  check(source==='online'||op.mode==='restaurant','Marketplace restaurant ordering only in this release.');
  check(op.fulfillment==='pickup'||(source!=='online'&&op.fulfillment==='delivery'),'Direct online orders currently support pickup only.');
  check(source==='online'?op.payment==='pay_at_pickup':op.payment==='platform_collected','Unsupported channel payment.');
  const customer=cleanText(op.customer,'pickup name',80),notes=cleanText(op.notes??'','instructions',500,true);
  if(source==='online')check(typeof op.receiptKey==='string'&&/^[a-f0-9]{64}$/.test(op.receiptKey),'Invalid private order receipt.');
  const fingerprint=canonical({source,externalId,mode:op.mode,customer,notes,items:op.items,expectedTotal:op.expectedTotal,payment:op.payment,fulfillment:op.fulfillment,receiptKey:op.receiptKey});
  const previous=s.channelRequests?.find(r=>r.source===source&&r.externalId===externalId);
  if(previous){check(previous.fingerprint===fingerprint,'External reference already used for different order details.');return previous.id;}
  check((s.channelRequests??[]).length<500,'Order inbox capacity reached.');
  check((s.channelRequests??[]).filter(r=>r.status==='pending'&&(r.source!=='online'||Date.parse(at)-Date.parse(r.createdAt)<=30*60*1000)).length<100,'Order inbox is full. Please contact the store.');
  if(source==='online'){
   check(s.online?.enabled,'Online ordering is paused.');check(activeShift(s)&&isOpen(at,s.settings),'The store is closed for online requests.');
   check(!/\b(allerg\w*|anaphyla\w*|celiac|coeliac|gluten[- ]free)\b/i.test(notes+' '+JSON.stringify(op.items)),'Please contact staff directly about dietary or allergy requirements.');
  }
  const items=makeLines(s,op.items,op.mode),total=items.reduce((n,l)=>n+l.price*l.qty+l.tax,0);
  check(total<=100000000,'Order total exceeds the supported limit.');
  check(Number.isSafeInteger(op.expectedTotal)&&op.expectedTotal===total,'Prices or tax differ. Refresh the menu or reconcile platform pricing before importing.');
  const r:ChannelRequest={id:op.id,source,externalId,mode:op.mode,customer,notes,items,total,createdAt:at,status:'pending',fingerprint,payment:op.payment as ChannelRequest['payment'],fulfillment:op.fulfillment as ChannelRequest['fulfillment']};
  if(source==='online')r.receiptKey=op.receiptKey as string;
  (s.channelRequests??=[]).push(r);return r.id;
 }
 case 'channelReject':{
  const r=s.channelRequests?.find(r=>r.id===op.requestId);check(r,'Request not found.');check(r.status==='pending','This request is already resolved.');
  // A local rejection never cancels or refunds a delivery-platform order.
  if(r.source!=='online')check(op.platformHandled===true,'Handle the order on its delivery platform before marking it resolved here.');
  r.status='rejected';r.reason=cleanText(op.reason,'reason',200);return 'Request declined locally';
 }
 case 'channelAccept':{
  const r=s.channelRequests?.find(r=>r.id===op.requestId);check(r,'Request not found.');
  if(r.status==='accepted')return String(s.orders.find(o=>o.id===r.orderId)!.number);
  check(r.status==='pending','This request was declined.');check(activeShift(s),'Open a cash shift first.');
  check(op.confirmed===true,'Review and confirm the request.');
  if(r.source==='online')check(Date.parse(at)-Date.parse(r.createdAt)<=30*60*1000,'This request expired. Ask the customer to place a new request.');
  else check(op.platformHandled===true,'Verify acceptance and collected payment on the original delivery platform.');
  const lines=makeLines(s,r.items.map(l=>({productId:l.productId,qty:l.qty,note:l.note})),r.mode);
  check(canonical(lines.map(l=>({id:l.productId,name:l.name,sku:l.sku,price:l.price,tax:l.tax,qty:l.qty,note:l.note})))===canonical(r.items.map(l=>({id:l.productId,name:l.name,sku:l.sku,price:l.price,tax:l.tax,qty:l.qty,note:l.note}))),'Menu prices or tax changed. Resolve the request and obtain a new confirmed order.');
  check(s.orders.length<1000,'Training order capacity reached.');
  const platform=r.payment==='platform_collected';
  // All financial and stock mutations are committed by the repository's single CAS.
  const order:Store['orders'][number]={id:op.id,number:s.orders.length+1001,mode:r.mode,channel:r.source,externalId:r.externalId,reference:r.customer,notes:r.notes,lines,subtotal:lines.reduce((n,l)=>n+l.price*l.qty,0),tax:lines.reduce((n,l)=>n+l.tax,0),total:r.total,createdAt:at,businessDate:op.businessDate as string,status:platform?'paid':'unpaid',kitchen:r.mode==='restaurant'?'new':'none',paymentMethod:platform?'external':undefined,version:1};
  // Set by the engine wrapper from store time, never trusted from incoming data.
  if(platform){order.paidAt=at;order.paidBusinessDate=order.businessDate;order.shiftId=activeShift(s)!.id;}
  if(r.mode==='restaurant')order.batches=[{id:order.id,lines:structuredClone(lines),status:'new',createdAt:at}];
  for(const l of lines){const p=s.products.find(p=>p.id===l.productId)!;p.stock-=l.qty;s.movements.push({id:op.id+'-'+p.id,productId:p.id,delta:-l.qty,reason:'Accepted '+channelNames[r.source]+' order',at,reference:order.id});}
  s.orders.push(order);queuePrint(s,order,at,r.mode==='restaurant'?'kitchen':'receipt');r.status='accepted';r.orderId=order.id;return String(order.number);
 }
 }
}
export function onlineMenu(s:Store,at=new Date().toISOString()){
 return {store:s.settings.name,timezone:s.settings.timezone,hours:{open:s.settings.open,close:s.settings.close},open:!!s.online?.enabled&&!!activeShift(s)&&isOpen(at,s.settings),prepMinutes:s.online?.prepMinutes??20,currency:'CAD',products:s.products.map(p=>({id:p.id,name:p.name,category:p.category,mode:p.mode,price:p.price,taxBps:p.taxBps,available:p.stock>0}))};
}
export function publicReceipt(s:Store,r:ChannelRequest){const o=s.orders.find(o=>o.id===r.orderId);return {requestId:r.id,status:r.status==='pending'&&Date.now()-Date.parse(r.createdAt)>30*60*1000?'expired':r.status,reason:r.reason,orderNumber:o?.number,orderStatus:o?.status,kitchen:o?.kitchen,total:r.total,payment:o?.paidAt?'paid':'pay_at_pickup'};}
