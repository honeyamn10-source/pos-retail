import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,copyFileSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:net';
const root=resolve(import.meta.dirname,'..');
function fixture(mode){
 const dir=mkdtempSync(join(tmpdir(),'Jawa kit with spaces '));
 for(const sub of ['scripts','server-dist/web'])mkdirSync(join(dir,sub),{recursive:true});
 for(const file of ['scripts/start-local.mjs','server-dist/main.js','server-dist/web/index.html'])copyFileSync(join(root,file),join(dir,file));
 writeFileSync(join(dir,'product.json'),JSON.stringify({mode}));return dir;
}
function env(){return Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('JAWA_')));}
async function freePort(){return new Promise(r=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>r(port));});});}
function launch(dir){const p=spawn(process.execPath,[join(dir,'scripts/start-local.mjs'),'--no-browser'],{cwd:tmpdir(),env:env(),stdio:['ignore','pipe','pipe']});let output='';p.stdout.on('data',b=>output+=b);p.stderr.on('data',b=>output+=b);return {p,output:()=>output};}
async function ready(app){for(let i=0;i<200;i++){if(app.output().includes('Open http://'))return;if(app.p.exitCode!==null)throw new Error('Launcher stopped before readiness');await new Promise(r=>setTimeout(r,25));}throw new Error('Launcher did not become ready');}
async function stop(app){if(app.p.exitCode!==null)return;const done=new Promise(r=>app.p.once('exit',r));app.p.kill('SIGINT');await done;}
for(const mode of ['restaurant','retail'])test(`${mode}: first launch from another folder, owner setup and restart preserve data`,{timeout:20000},async()=>{
 const dir=fixture(mode),port=await freePort(),origin=`http://localhost:${port}`;let app;
 try{
  writeFileSync(join(dir,'.env.server'),`JAWA_PORT=${port}\nJAWA_ORIGIN=${origin}\n`);
  app=launch(dir);await ready(app);
  let session=await (await fetch(origin+'/api/session')).json();assert.equal(session.mode,mode);assert.equal(session.setupRequired,true);
  const token=readFileSync(join(dir,'data/setup-token'),'utf8').trim();assert.ok(app.output().includes(token));
  const response=await fetch(origin+'/api/setup',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({token,username:'launcher-owner',password:'launcher-test-password'})});assert.equal(response.status,200);
  assert.equal(existsSync(join(dir,'data/setup-token')),false);
  await stop(app);assert.equal(app.p.exitCode,0);
  app=launch(dir);await ready(app);session=await (await fetch(origin+'/api/session')).json();assert.equal(session.setupRequired,false);assert.equal(app.output().includes(token),false);
 }finally{if(app)await stop(app);rmSync(dir,{recursive:true,force:true});}
});
test('preflight catches invalid configuration and missing builds without creating a database',()=>{
 const dir=fixture('retail'),script=join(dir,'scripts/start-local.mjs');
 try{
  const check=()=>spawnSync(process.execPath,[script,'--check'],{cwd:tmpdir(),env:env(),encoding:'utf8'});
  let r=check();assert.equal(r.status,0);assert.match(r.stdout,/localhost:8788/);assert.equal(existsSync(join(dir,'data')),false);
  writeFileSync(join(dir,'.env.server'),'JAWA_PORT=abc\n');r=check();assert.equal(r.status,1);assert.match(r.stderr,/JAWA_PORT/);
  writeFileSync(join(dir,'.env.server'),'JAWA_PORT=9000\nJAWA_ORIGIN=http://localhost:8000\n');r=check();assert.equal(r.status,1);assert.match(r.stderr,/same port/);
  writeFileSync(join(dir,'.env.server'),'JAWA_ORIGIN=http://example.com\n');r=check();assert.equal(r.status,1);assert.match(r.stderr,/HTTPS/);
  rmSync(join(dir,'server-dist/main.js'));r=check();assert.equal(r.status,1);assert.match(r.stderr,/built application is missing/);assert.equal(existsSync(join(dir,'data')),false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('occupied port fails clearly without opening a browser or displaying the setup token',{timeout:10000},async()=>{
 const dir=fixture('restaurant'),occupied=createServer();let app;
 try{
  await new Promise(r=>occupied.listen(0,'127.0.0.1',r));const port=occupied.address().port;
  writeFileSync(join(dir,'.env.server'),`JAWA_PORT=${port}\nJAWA_ORIGIN=http://localhost:${port}\n`);
  app=launch(dir);await new Promise(r=>app.p.once('close',r));assert.equal(app.p.exitCode,1);
  assert.match(app.output(),/port is already in use/);assert.equal(app.output().includes('Open http://'),false);
  const token=readFileSync(join(dir,'data/setup-token'),'utf8').trim();assert.equal(app.output().includes(token),false);
 }finally{if(app)await stop(app);await new Promise(r=>occupied.close(r));rmSync(dir,{recursive:true,force:true});}
});
