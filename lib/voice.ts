import {canonical} from './pos-operations.ts';
import {applyOperation,type Store,type Operation} from './engine.ts';
export type VoiceDraft={callId:string;customer:string;items:{productId:string;qty:number}[];notes:string};
export type VoiceQuote={id:string;owner:string;callId:string;expiresAt:number;total:number;operation:Operation};
export function quoteOrder(state:Store,owner:string,draft:VoiceDraft,now=Date.now()):VoiceQuote{
 if(!draft||typeof draft.callId!=='string'||!/^[\w-]{1,100}$/.test(draft.callId))throw new Error('Invalid call identifier.');
 if(typeof draft.customer!=='string'||!draft.customer.trim()||draft.customer.length>100)throw new Error('Ask for a pickup name.');
 if(typeof draft.notes!=='string'||draft.notes.length>1000)throw new Error('Invalid order notes.');
 if(/allerg|anaphyla|celiac|coeliac|gluten.free/i.test(draft.notes+' '+(Array.isArray(draft.items)?draft.items.map(i=>(i as {note?:string})?.note??'').join(' '):'')))throw new Error('Staff review required for dietary safety. Do not promise this order is safe.');
 const id=crypto.randomUUID();const operation:Operation={id,type:'order',channel:'phone',callId:draft.callId,mode:'restaurant',items:draft.items,reference:draft.customer,notes:draft.notes,tender:'unpaid',confirmed:true};
 const preview=applyOperation(state,operation,new Date(now).toISOString());
 operation.expectedTotal=preview.state.orders.at(-1)!.total;
 return {id,owner,callId:draft.callId,expiresAt:now+120000,total:preview.state.orders.at(-1)!.total,operation};
}
const encoder=new TextEncoder();
function base64(bytes:Uint8Array){return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');}
function unbase64(value:string){return Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));}
async function hmacKey(secret:string){if(secret.length<32)throw new Error('Integration secret must be at least 32 characters.');return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export async function signQuote(quote:VoiceQuote,secret:string){const body=base64(encoder.encode(JSON.stringify(quote)));const signature=await crypto.subtle.sign('HMAC',await hmacKey(secret),encoder.encode(body));return body+'.'+base64(new Uint8Array(signature));}
export async function verifyQuote(token:string,secret:string,owner:string,now=Date.now(),recoveryState?:Store):Promise<VoiceQuote>{
 if(typeof token!=='string'||token.length>16000)throw new Error('Invalid quote.');const [body,signature,...extra]=token.split('.');
 if(!body||!signature||extra.length||!await crypto.subtle.verify('HMAC',await hmacKey(secret),unbase64(signature),encoder.encode(body)))throw new Error('Invalid quote signature.');
 const quote=JSON.parse(new TextDecoder().decode(unbase64(body))) as VoiceQuote;
 if(quote.owner!==owner||!Number.isFinite(quote.expiresAt))throw new Error('Quote expired or owner mismatch.');
 const accepted=recoveryState&&Object.hasOwn(recoveryState.applied,quote.id)?recoveryState.applied[quote.id]:undefined;
 const exactReplay=accepted&&canonical(JSON.parse(accepted.fingerprint))===canonical(quote.operation);
 if(quote.expiresAt<now&&!exactReplay)throw new Error('Quote expired. Read back a new quote.');return quote;
}
export function validateQuoteAtCommit(state:Store,quote:VoiceQuote,now=Date.now()){
 const preview=applyOperation(state,quote.operation,new Date(now).toISOString());
 const order=preview.state.orders.find(o=>o.id===quote.id);
 if(!order||order.total!==quote.total)throw new Error('Price changed. Read back a new quote.');
 return preview;
}
