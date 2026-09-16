// Dependency-free launcher for the extracted server kit.
import {existsSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
process.chdir(root);
function fail(message){console.error('\nCould not start Jawa: '+message);process.exitCode=1;}
async function main(){
 if(Number(process.versions.node.split('.')[0])<24)throw new Error('Install Node.js 24 LTS from https://nodejs.org/en/download, then reopen this launcher.');
 if(!existsSync('server-dist/main.js')||!existsSync('server-dist/web/index.html'))throw new Error('The built application is missing. Extract the complete Server Kit first. A GitHub source ZIP must be built using docs/SERVER_INSTALL.md.');
 if(existsSync('.env.server'))process.loadEnvFile('.env.server');
 const product=JSON.parse(readFileSync('product.json','utf8'));
 const mode=process.env.JAWA_MODE||product.mode;
 if(!['restaurant','retail'].includes(mode))throw new Error('product.json or JAWA_MODE must select restaurant or retail.');
 // Preserve existing configured installations; new retail kits use their own port.
 const port=process.env.JAWA_PORT||(process.env.JAWA_ORIGIN?'8787':mode==='retail'?'8788':'8787');
 if(!/^\d+$/.test(port)||Number(port)<1||Number(port)>65535)throw new Error('JAWA_PORT must be a number between 1 and 65535.');
 const url=new URL(process.env.JAWA_ORIGIN||`http://localhost:${port}`);
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('JAWA_ORIGIN must be a plain HTTP/HTTPS address, without a path, login or query.');
 if(url.protocol==='http:'&&!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw new Error('Remote access needs HTTPS. Follow docs/SERVER_INSTALL.md.');
 const origin=url.origin;
 if(url.protocol==='http:'&&Number(url.port||80)!==Number(port))throw new Error('For local HTTP, JAWA_ORIGIN and JAWA_PORT must use the same port.');
 console.log(`\nJawa ${mode} · ${origin}\nKeep this window open while using Jawa. Press Ctrl+C to stop.\n`);
 if(process.argv.includes('--check')){console.log('Setup files and configuration are valid. No server was started.');return;}
 const child=spawn(process.execPath,['server-dist/main.js'],{cwd:root,env:{...process.env,JAWA_MODE:mode,JAWA_PORT:port,JAWA_ORIGIN:origin},stdio:['ignore','pipe','pipe']});
 let ready=false,stopping=false,output='',errors='';
 const stop=()=>{stopping=true;child.kill('SIGTERM');};
 process.on('SIGINT',stop);process.on('SIGTERM',stop);
 const timeout=setTimeout(()=>{fail('Startup took too long. Check available disk space and the messages above.');stop();},30000);
 child.on('error',e=>{clearTimeout(timeout);fail(e.message);});
 child.stderr.on('data',chunk=>{errors=(errors+chunk).slice(-8000);process.stderr.write(chunk);});
 child.stdout.on('data',chunk=>{
  output=(output+chunk).slice(-8000);process.stdout.write(chunk);
  if(ready||!output.includes(`Jawa ${mode} ready at ${origin}`))return;
  ready=true;clearTimeout(timeout);
  const tokenFile=resolve(process.env.JAWA_DATA_DIR||'data','setup-token');
  try{if(existsSync(tokenFile))console.log('\nYour one-time installation token (paste into the owner setup form):\n'+readFileSync(tokenFile,'utf8').trim()+'\nKeep this token private. It is removed after owner setup.\n');}catch{console.log('Read your setup-token file to complete owner setup.');}
  console.log('Open '+origin+' in your browser.');
  if(process.argv.includes('--no-browser'))return;
  const program=process.platform==='win32'?'explorer.exe':process.platform==='darwin'?'open':'xdg-open';
  const browser=spawn(program,[origin],{stdio:'ignore'});
  browser.on('error',()=>console.log('Please open the address above manually.'));
  browser.on('exit',code=>{if(code)console.log('If the browser did not open, use the address above.');});browser.unref();
 });
 child.on('close',code=>{clearTimeout(timeout);process.off('SIGINT',stop);process.off('SIGTERM',stop);
  if(!stopping&&code!==0){if(errors.includes('EADDRINUSE'))fail('This port is already in use. Close the other Jawa window, or set JAWA_PORT and JAWA_ORIGIN together in .env.server. Your records have not been deleted.');else fail('The server stopped. Check the messages above and docs/EASY_SETUP.md.');}
  else if(!process.exitCode)console.log('Jawa stopped. Your saved records remain in the data folder.');
 });
}
main().catch(e=>fail(e.message));
