import {randomBytes,scrypt as rawScrypt,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
import {existsSync,readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {resolve} from 'node:path';
import {sqlite,directory,type Staff} from './database';
import {RequestError} from '../lib/http';
const scrypt=promisify(rawScrypt);
export const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export function hasOwner(){return !!sqlite.prepare("SELECT id FROM staff WHERE role='owner' AND disabled=0").get();}
export function setupToken(){const p=resolve(directory,'setup-token');if(!hasOwner()&&!existsSync(p))writeFileSync(p,randomBytes(32).toString('hex'),{flag:'wx',mode:0o600});return p;}
export function throttle(key:string,max:number,windowMs=60000){const now=Date.now();sqlite.prepare('DELETE FROM throttle WHERE reset<?').run(now);const r=sqlite.prepare('SELECT count FROM throttle WHERE key=?').get(key) as {count:number}|undefined;if(r&&r.count>=max)throw new RequestError('Too many requests. Please wait and retry.',429);sqlite.prepare('INSERT INTO throttle(key,count,reset) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(key,now+windowMs);}
export async function hashPassword(p:unknown){if(typeof p!=='string'||p.length<12||p.length>128)throw new RequestError('Use a password of 12–128 characters.',400);const salt=randomBytes(16).toString('hex');return salt+':'+(await scrypt(p,salt,64) as Buffer).toString('hex');}
export async function verifyPassword(p:unknown,encoded:string){if(typeof p!=='string'||p.length>128)return false;const[salt,hash]=encoded.split(':'),a=await scrypt(p,salt,64) as Buffer,b=Buffer.from(hash,'hex');return a.length===b.length&&timingSafeEqual(a,b);}
export async function createStaff(body:Record<string,unknown>,initial=false){
 if(typeof body.username!=='string'||! /^[a-zA-Z0-9][a-zA-Z0-9._@-]{2,79}$/.test(body.username))throw new RequestError('Use a username of 3–80 letters, numbers, dots, dashes or @.',400);
 const username=body.username.toLowerCase(),password=await hashPassword(body.password),role=initial?'owner':body.role;
 if(!['manager','cashier','kitchen',...(initial?['owner']:[])].includes(String(role)))throw new RequestError('Invalid staff role.',400);
 if(initial&&hasOwner())throw new RequestError('Setup is already complete.',409);
 if(Number((sqlite.prepare('SELECT count(*) AS n FROM staff').get() as {n:number}).n)>=100)throw new RequestError('Staff capacity reached.',400);
 const id=randomBytes(16).toString('hex');try{sqlite.prepare('INSERT INTO staff(id,username,password,role) VALUES(?,?,?,?)').run(id,username,password,String(role));}catch{throw new RequestError('That username already exists.',409);}
 if(initial){const path=resolve(directory,'setup-token');if(existsSync(path))unlinkSync(path);}return{id,username,role:role as Staff['role']};
}
export async function setup(body:Record<string,unknown>){if(hasOwner())throw new RequestError('Setup is already complete.',409);const expected=readFileSync(setupToken(),'utf8').trim();if(typeof body.token!=='string'||digest(body.token)!==digest(expected))throw new RequestError('Invalid setup token.',403);return createStaff(body,true);}
const dummy='0'.repeat(32)+':'+'0'.repeat(128);
export async function login(body:Record<string,unknown>){const name=typeof body.username==='string'?body.username.toLowerCase():'';const row=sqlite.prepare('SELECT * FROM staff WHERE username=?').get(name) as (Staff&{password:string;disabled:number})|undefined;const valid=await verifyPassword(body.password,row?.password??dummy);if(!valid||!row||row.disabled)throw new RequestError('Username or password is incorrect.',401);const token=randomBytes(32).toString('hex');sqlite.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());sqlite.prepare('INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)').run(digest(token),row.id,Date.now()+28800000);return{token,user:{id:row.id,username:row.username,role:row.role}};}
export function tokenFrom(req:Request){return req.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('jawa_session='))?.slice(13)??'';}
export function currentUser(req:Request):Staff|null{const token=tokenFrom(req);if(!/^[a-f0-9]{64}$/.test(token))return null;return sqlite.prepare('SELECT staff.id,staff.username,staff.role FROM sessions JOIN staff ON staff.id=sessions.user_id WHERE sessions.token=? AND sessions.expires>? AND staff.disabled=0').get(digest(token),Date.now()) as Staff??null;}
export const cookie=(token:string,secure:boolean)=>`jawa_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${token?28800:0}${secure?'; Secure':''}`;
const cashier=new Set(['order','pay','hold','discardHold','appendOrder','cancel','kitchen','printClaim','printResult','printConfirm','reprint','channelAccept','channelReject']);
export function authorizeOperation(u:Staff,type:unknown){if(['owner','manager'].includes(u.role))return;if(u.role==='cashier'&&cashier.has(String(type)))return;if(u.role==='kitchen'&&['kitchen','printClaim','printResult','printConfirm','reprint'].includes(String(type)))return;throw new RequestError('Your staff role cannot perform this action. Ask a manager.',403);}
