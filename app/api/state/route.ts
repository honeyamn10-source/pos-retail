import {readJson,apiFailure} from '@/lib/http';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { readStore, mutateStore } from '@/lib/store';
import type { Operation } from '@/lib/engine';
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
export async function GET(){const user=await getChatGPTUser();if(!user)return Response.json({error:'Sign in to open your workspace.'},{status:401,headers});try{return Response.json({...await readStore(user.userId),workspaceId:user.userId},{headers});}catch{return Response.json({error:'Your records are temporarily unavailable. Please retry.'},{status:503,headers});}}
export async function POST(req:Request){const user=await getChatGPTUser();if(!user)return Response.json({error:'Sign in to continue.'},{status:401,headers});if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Invalid request origin.'},{status:403,headers});if(!req.headers.get('content-type')?.startsWith('application/json'))return Response.json({error:'JSON required.'},{status:415,headers});try{const op=await readJson(req) as Operation;return Response.json(await mutateStore(user.userId,op),{headers});}catch(e){return apiFailure(e);}}
