// Jawa's normalized bridge contract. This is NOT a native marketplace webhook.
import {env} from 'cloudflare:workers';
import {serviceIdentity} from '@/lib/service-auth';
import {readStore,mutateStore} from '@/lib/store';
import {readJson,apiFailure,RequestError} from '@/lib/http';
const headers={'Cache-Control':'no-store'};
export async function POST(req:Request){try{
 const {owner}=await serviceIdentity(req,'channels');const body=await readJson(req,30000);
 if(!['doordash','ubereats','skip'].includes(String(body.source)))throw new RequestError('Unsupported marketplace.',400);
 const config=env as unknown as Record<string,string|undefined>;
 const expectedStore=config['JAWA_'+String(body.source).toUpperCase()+'_STORE_ID'];
 if(!expectedStore||body.storeId!==expectedStore)throw new RequestError('Marketplace location is not configured or does not match.',403);
 if(body.action==='status'){
  const {state}=await readStore(owner);const r=state.channelRequests?.find(r=>r.source===body.source&&r.externalId===body.externalId);
  const o=state.orders.find(o=>o.id===r?.orderId);
  return Response.json(r?{requestId:r.id,status:r.status,orderNumber:o?.number,kitchen:o?.kitchen,providerUpdateSent:false}:{status:'not_found'},{headers});
 }
 if(body.action!=='receive'||body.currency!=='CAD'||body.providerAccepted!==true||body.payment!=='platform_collected')throw new RequestError('Only CAD, already-accepted, platform-collected orders are supported by this bridge contract.',400);
 const result=await mutateStore(owner,{id:String(body.id??''),type:'channelRequest',source:body.source,externalId:body.externalId,mode:'restaurant',customer:body.customer,notes:body.notes,items:body.items,expectedTotal:body.expectedTotal,payment:'platform_collected',fulfillment:body.fulfillment});
 const r=result.state.channelRequests!.find(r=>r.id===result.result)!;
 return Response.json({requestId:r.id,status:r.status,providerUpdateSent:false},{headers});
 }catch(e){return apiFailure(e);}}
