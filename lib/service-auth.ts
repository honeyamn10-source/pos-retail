import {env} from 'cloudflare:workers';
export async function serviceIdentity(req:Request,scope:'voice'|'printer'|'channels'){
 const config=env as unknown as Record<string,string|undefined>;
 const secret=config[scope==='voice'?'JAWA_VOICE_TOKEN':scope==='printer'?'JAWA_PRINTER_TOKEN':'JAWA_CHANNEL_TOKEN'];
 const owner=config.JAWA_SERVICE_OWNER;
 if(!owner||!secret||secret.length<32)throw new Error('Integration not configured.');
 const supplied=req.headers.get('authorization')?.replace(/^Bearer /,'')??'';
 const enc=new TextEncoder();const [a,b]=await Promise.all([crypto.subtle.digest('SHA-256',enc.encode(secret)),crypto.subtle.digest('SHA-256',enc.encode(supplied))]);
 let diff=0;new Uint8Array(a).forEach((v,i)=>{diff|=v^new Uint8Array(b)[i];});if(diff!==0)throw new Error('Integration authorization failed.');
 return {owner,secret};
}
