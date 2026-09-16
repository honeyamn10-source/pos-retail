import {createServer,type IncomingMessage} from 'node:http';
import {readFileSync,existsSync,statSync,createReadStream} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Readable} from 'node:stream';
import * as stateRoute from '../app/api/state/route';
import * as onlineRoute from '../app/api/online/route';
import * as voiceRoute from '../app/api/voice/route';
import * as printerRoute from '../app/api/printer/route';
import * as channelsRoute from '../app/api/channel-orders/route';
import {RequestError,readJson,apiFailure} from '../lib/http';
import {sqlite,requestContext,directory,automaticBackup,backupBytes} from './database';
import {setupToken,hasOwner,setup,login,currentUser,cookie,tokenFrom,digest,throttle,createStaff,authorizeOperation,hashPassword,verifyPassword} from './auth';
import {businessDate,report,emptyStore,type Store} from '../lib/engine';
import {storeOverview,rangeSummary,summaryCsv} from './overview';
import {history,receiptHistory} from './ledger';
const mode=process.env.JAWA_MODE||(existsSync('product.json')?JSON.parse(readFileSync('product.json','utf8')).mode:'restaurant');
if(!['restaurant','retail'].includes(mode))throw new Error('JAWA_MODE must be restaurant or retail.');
const port=Number(process.env.JAWA_PORT||8787),host=process.env.JAWA_HOST||'127.0.0.1';
const origin=new URL(process.env.JAWA_ORIGIN||`http://localhost:${port}`).origin,secure=origin.startsWith('https:');
if(!secure&&!['localhost','127.0.0.1','[::1]'].includes(new URL(origin).hostname))throw new Error('Remote access requires an HTTPS JAWA_ORIGIN.');
const webRoot=resolve(fileURLToPath(new URL('.',import.meta.url)),'web');
const routes:Record<string,{GET?:(r:Request)=>Promise<Response>;POST?:(r:Request)=>Promise<Response>}>= {'/api/state':stateRoute,'/api/online':onlineRoute,'/api/voice':voiceRoute,'/api/printer':printerRoute,'/api/channel-orders':channelsRoute};
const secureHeaders={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY',...(secure?{'Strict-Transport-Security':'max-age=31536000'}:{})};
const json=(body:unknown,status=200,headers:Record<string,string>={})=>Response.json(body,{status,headers:{...secureHeaders,...headers}});
let housekeepingBusy=false,lastMaintenanceError='';
async function housekeeping(){if(housekeepingBusy)return;housekeepingBusy=true;try{
 const row=sqlite.prepare('SELECT revision,payload FROM stores WHERE owner=?').get('local-store') as {revision:number;payload:string}|undefined;
 if(row){const state=JSON.parse(row.payload) as Store,today=businessDate(new Date().toISOString(),state.settings);const dates=new Set([...state.orders.map(o=>o.paidBusinessDate).filter(Boolean),...state.refunds.map(r=>r.businessDate),...state.shifts.map(s=>s.businessDate)] as string[]);
  for(const day of dates){if(day>=today)continue;const previous=sqlite.prepare('SELECT revision FROM daily_reports WHERE day=?').get(day) as {revision:number}|undefined;if(previous?.revision===row.revision)continue;const r=report(state,day,day);const summary={businessDate:day,currency:'CAD',timezone:state.settings.timezone,cutoff:state.settings.cutoff,net:r.net,tax:r.tax,gross:r.gross,cash:r.cash,external:r.external,count:r.count};sqlite.prepare('INSERT INTO daily_reports(day,generated_at,revision,payload) VALUES(?,?,?,?) ON CONFLICT(day) DO UPDATE SET generated_at=excluded.generated_at,revision=excluded.revision,payload=excluded.payload').run(day,new Date().toISOString(),row.revision,JSON.stringify(summary));}}
 if(hasOwner())await automaticBackup();lastMaintenanceError='';
 }catch{lastMaintenanceError='Automatic reports or backup failed. Check server disk space and permissions.';console.error(lastMaintenanceError);}finally{housekeepingBusy=false;}}
async function dispatch(req:Request,peer:string){const path=new URL(req.url).pathname,method=req.method,user=currentUser(req);
 if(method!=='GET'&&method!=='HEAD'&&!['/api/voice','/api/printer','/api/channel-orders'].includes(path)&&req.headers.get('origin')!==origin)throw new RequestError('Invalid request origin.',403);
 if(path==='/healthz')return json({ok:true});
 if(path==='/api/session'&&method==='GET')return json({user,setupRequired:!hasOwner(),mode});
 if(path==='/api/setup'&&method==='POST'){throttle('setup:'+peer,5,600000);await setup(await readJson(req,4000));return json({ok:true});}
 if(path==='/api/login'&&method==='POST'){throttle('login:'+peer,20,600000);const body=await readJson(req,4000);throttle('username:'+digest(String(body.username).toLowerCase()),20,600000);const r=await login(body);return json({user:r.user},200,{'Set-Cookie':cookie(r.token,secure)});}
 if(path==='/api/logout'&&method==='POST'){sqlite.prepare('DELETE FROM sessions WHERE token=?').run(digest(tokenFrom(req)));return json({ok:true},200,{'Set-Cookie':cookie('',secure)});}
 if(path==='/api/password'&&method==='POST'){if(!user)throw new RequestError('Sign in to continue.',401);throttle('password:'+user.id,5,600000);const body=await readJson(req,4000),row=sqlite.prepare('SELECT password FROM staff WHERE id=?').get(user.id) as {password:string};if(!await verifyPassword(body.currentPassword,row.password))throw new RequestError('Current password is incorrect.',403);const hash=await hashPassword(body.password);sqlite.exec('BEGIN IMMEDIATE');try{sqlite.prepare('UPDATE staff SET password=? WHERE id=?').run(hash,user.id);sqlite.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);sqlite.exec('COMMIT');}catch(e){sqlite.exec('ROLLBACK');throw e;}return json({ok:true},200,{'Set-Cookie':cookie('',secure)});}
 if(path.startsWith('/api/admin/')){
  if(!user)throw new RequestError('Sign in to continue.',401);if(user.role!=='owner')throw new RequestError('Owner access required.',403);
  if(path==='/api/admin/history'&&method==='GET'){
   const params=new URL(req.url).searchParams,id=params.get('id');
   if(id!==null){const result=receiptHistory(sqlite,'local-store',id);if(!result)throw new RequestError('Receipt not found.',404);return json(result);}
   try{return json(history(sqlite,'local-store',params));}catch{throw new RequestError('Choose valid history filters.',400);}
  }
  if(path==='/api/admin/overview'&&method==='GET'){
   const row=sqlite.prepare('SELECT payload FROM stores WHERE owner=?').get('local-store') as {payload:string}|undefined;
   const state=row?JSON.parse(row.payload) as Store:emptyStore();
   return json({...storeOverview(state,process.env,origin,mode,Buffer.byteLength(row?.payload??'')),activity:sqlite.prepare('SELECT scope,last_seen,method FROM service_activity').all(),maintenanceError:lastMaintenanceError});
  }
  if(path==='/api/admin/report-export'&&method==='GET'){
   const row=sqlite.prepare('SELECT payload FROM stores WHERE owner=?').get('local-store') as {payload:string}|undefined;
   const query=new URL(req.url).searchParams;let summary;
   try{summary=rangeSummary(row?JSON.parse(row.payload) as Store:emptyStore(),query.get('from')??'',query.get('to')??'');}catch{throw new RequestError('Choose valid start and end business dates in order.',400);}
   return new Response(summaryCsv(summary),{headers:{...secureHeaders,'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="jawa-report-${summary.from}-${summary.to}.csv"`}});
  }
  if(path==='/api/admin/deployment-guide'&&method==='GET')return new Response(readFileSync(resolve('docs/CUSTOMER_DEPLOYMENT.md'),'utf8'),{headers:{...secureHeaders,'Content-Type':'text/markdown; charset=utf-8','Content-Disposition':'attachment; filename="Jawa_Customer_Deployment.md"'}});
  if(path==='/api/admin/staff'){
   if(method==='GET')return json({staff:sqlite.prepare('SELECT id,username,role,disabled FROM staff ORDER BY username').all()});
   if(method==='POST'){const body=await readJson(req,4000);if(body.action==='disable'){if(body.id===user.id)throw new RequestError('You cannot disable your owner account.',400);sqlite.exec('BEGIN IMMEDIATE');try{const r=sqlite.prepare('UPDATE staff SET disabled=1 WHERE id=? AND role<>?').run(String(body.id),'owner');if(!r.changes)throw new RequestError('Staff account not found.',404);sqlite.prepare('DELETE FROM sessions WHERE user_id=?').run(String(body.id));sqlite.exec('COMMIT');}catch(e){sqlite.exec('ROLLBACK');throw e;}}else await createStaff(body);sqlite.prepare('INSERT INTO staff_audit(at,user_id,action,reference) VALUES(?,?,?,?)').run(new Date().toISOString(),user.id,body.action==='disable'?'disable staff':'create staff',String(body.id??body.username));return json({ok:true});}
  }
  if(path==='/api/admin/backup'&&method==='POST'){throttle('backup:'+user.id,3);const body=await readJson(req,4000);return new Response(new Uint8Array(await backupBytes(String(body.passphrase??''))),{headers:{...secureHeaders,'Content-Type':'application/octet-stream','Content-Disposition':'attachment; filename="jawa-backup.jawabak"'}});}
  if(path==='/api/admin/reports'&&method==='GET'){await housekeeping();return json({reports:sqlite.prepare('SELECT * FROM daily_reports ORDER BY day DESC LIMIT 366').all().map(r=>({...r,payload:JSON.parse(String(r.payload))}))});}
  if(path==='/api/admin/diagnostics'&&method==='GET')return json({version:'0.5.0',mode,storage:sqlite.prepare('SELECT revision,length(payload) AS bytes FROM stores WHERE owner=?').get('local-store')??null,maintenanceError:lastMaintenanceError,staffAudit:sqlite.prepare('SELECT * FROM staff_audit ORDER BY id DESC LIMIT 100').all(),limits:{products:2000,orders:1000,payloadBytes:1800000},notice:'Live service and hardware operation requires separate verification.'});
  throw new RequestError('Not found.',404);
 }
 if(path==='/api/online')throttle('online:'+peer,120);
 if(routes[path]){if(path==='/api/state'&&!user)throw new RequestError('Sign in to open your workspace.',401);let operationId:string|undefined;if(path==='/api/state'&&method==='POST'){const body=await readJson(req.clone() as Request);authorizeOperation(user!,body.type);operationId=String(body.id??'');}const handler=routes[path][method as 'GET'|'POST'];if(!handler)throw new RequestError('Method not allowed.',405);const response=await requestContext.run({user,operationId},()=>handler(req));if(response.ok&&['/api/voice','/api/printer','/api/channel-orders'].includes(path)){const scope=path==='/api/voice'?'voice':path==='/api/printer'?'printer':'channels';sqlite.prepare('INSERT INTO service_activity(scope,last_seen,method) VALUES(?,?,?) ON CONFLICT(scope) DO UPDATE SET last_seen=excluded.last_seen,method=excluded.method').run(scope,new Date().toISOString(),method);}return response;}
 if(path.startsWith('/api/'))throw new RequestError('Not found.',404);if(!['GET','HEAD'].includes(method))throw new RequestError('Method not allowed.',405);return null;
}
function incomingRequest(req:IncomingMessage){const path=req.url??'/';if(!path.startsWith('/')||path.startsWith('//'))throw new RequestError('Invalid request target.',400);if(req.headers.host!==new URL(origin).host)throw new RequestError('Invalid host. Use the configured JAWA_ORIGIN.',421);const headers=new Headers();for(const[k,v]of Object.entries(req.headers))if(v)headers.set(k,Array.isArray(v)?v.join(','):v);return new Request(origin+path,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method??'GET')?{body:Readable.toWeb(req) as ReadableStream,duplex:'half'}:{})} as RequestInit);}
const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.wasm':'application/wasm','.gz':'application/gzip','.json':'application/json','.woff2':'font/woff2','.md':'text/plain; charset=utf-8'};
const server=createServer(async(req,res)=>{try{const request=incomingRequest(req);let response=await dispatch(request,req.socket.remoteAddress??'unknown');if(!response){const path=decodeURIComponent(new URL(request.url).pathname);if(path==='/signin-with-chatgpt'||path==='/signout-with-chatgpt'){res.writeHead(302,{Location:'/login'});res.end();return;}const file=resolve(webRoot,'.'+path);const staticFile=file.startsWith(webRoot+sep)&&existsSync(file)&&statSync(file).isFile()?file:null;
 if(staticFile){res.writeHead(200,{...secureHeaders,'Content-Type':mime[extname(staticFile)]??'application/octet-stream','Content-Length':String(statSync(staticFile).size),...(path.startsWith('/assets/')?{'Cache-Control':'public, max-age=31536000, immutable'}:{})});if(req.method==='HEAD'){res.end();return;}createReadStream(staticFile).pipe(res);return;}
 if(!['/','/login','/admin','/restaurant','/retail','/manage','/order/restaurant','/order/retail','/research'].includes(path))throw new RequestError('Page not found.',404);response=new Response(readFileSync(resolve(webRoot,'index.html')),{headers:{'Content-Type':'text/html; charset=utf-8'}});}
 res.writeHead(response.status,{...secureHeaders,...Object.fromEntries(response.headers)});if(req.method==='HEAD'){res.end();return;}res.end(Buffer.from(await response.arrayBuffer()));
 }catch(e){const r=apiFailure(e);res.writeHead(r.status,{...secureHeaders,'Content-Type':'application/json'});res.end(await r.text());}});
server.requestTimeout=15000;server.headersTimeout=10000;server.keepAliveTimeout=5000;setupToken();server.listen(port,host,()=>{console.log(`Jawa ${mode} ready at ${origin}`);if(!hasOwner())console.log(`Owner setup token file: ${resolve(directory,'setup-token')}`);void housekeeping();});
const timer=setInterval(()=>void housekeeping(),60000);timer.unref();for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>{clearInterval(timer);server.close(()=>{sqlite.close();process.exit(0);});server.closeIdleConnections();});
