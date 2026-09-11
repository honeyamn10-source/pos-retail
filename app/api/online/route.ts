import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {readStore,mutateStore} from '@/lib/store';
import {onlineMenu,publicReceipt} from '@/lib/channels';
import {apiFailure,readJson,RequestError} from '@/lib/http';
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
async function context(){
 const config=env as unknown as Record<string,string|undefined>;
 if(config.JAWA_ONLINE_OWNER)return {owner:config.JAWA_ONLINE_OWNER,privatePreview:false};
 const user=await getChatGPTUser();
 if(!user)throw new RequestError('Online ordering is not configured for visitors yet.',503);
 return {owner:user.userId,privatePreview:true};
}
export async function GET(){try{const ctx=await context();const {state}=await readStore(ctx.owner);const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ctx.owner));const storeKey=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');return Response.json({...onlineMenu(state),privatePreview:ctx.privatePreview,storeKey},{headers});}catch(e){return apiFailure(e);}}
export async function POST(req:Request){try{
 if(req.headers.get('origin')!==new URL(req.url).origin)throw new RequestError('Invalid request origin.',403);
 const ctx=await context(),body=await readJson(req,20000);
 if(body.action==='status'){
  if(typeof body.requestId!=='string'||typeof body.receiptKey!=='string')throw new RequestError('Private receipt required.',400);
  const {state}=await readStore(ctx.owner),r=state.channelRequests?.find(r=>r.id===body.requestId&&r.source==='online'&&r.receiptKey===body.receiptKey);
  if(!r)throw new RequestError('Order receipt not found.',404);
  return Response.json(publicReceipt(state,r),{headers});
 }
 if(body.action!=='submit'||body.confirmed!==true)throw new RequestError('Confirm your pickup request.',400);
 if(typeof body.id!=='string'||!/^\w[\w-]{15,99}$/.test(body.id))throw new RequestError('Invalid request identifier.',400);
 const result=await mutateStore(ctx.owner,{id:body.id,type:'channelRequest',source:'online',externalId:body.id,mode:body.mode,customer:body.customer,notes:body.notes,items:body.items,expectedTotal:body.expectedTotal,receiptKey:body.receiptKey,fulfillment:'pickup',payment:'pay_at_pickup'});
 const r=result.state.channelRequests!.find(r=>r.id===result.result)!;
 return Response.json(publicReceipt(result.state,r),{headers});
 }catch(e){return apiFailure(e);}}
