// Generate matching private connection files without modifying the running server.
import {randomBytes} from 'node:crypto';
import {existsSync,readFileSync,mkdirSync,writeFileSync,rmSync,lstatSync} from 'node:fs';
import {resolve} from 'node:path';
import {parseEnv} from 'node:util';
const root=resolve(import.meta.dirname,'..');process.chdir(root);
try{
 const args=process.argv.slice(2);if(args.length!==2||args[0]!=='--origin')throw new Error('Usage: node scripts/configure-integrations.mjs --origin https://pos.yourdomain.ca');
 const url=new URL(args[1]);if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('Use your exact HTTPS origin, without a path or credentials.');
 const config=existsSync('.env.server')?parseEnv(readFileSync('.env.server','utf8')):{};
 config.JAWA_ORIGIN=url.origin;config.JAWA_PORT||='8787';
 const names=['JAWA_VOICE_TOKEN','JAWA_PRINTER_TOKEN','JAWA_CHANNEL_TOKEN'];
 for(const name of names){if(config[name]&&config[name].length<32)throw new Error(name+' is too short. Review it before generating connection files.');config[name]||=randomBytes(32).toString('hex');}
 if(new Set(names.map(n=>config[n])).size!==3)throw new Error('Voice, printer and channel secrets must be different.');
 const data=resolve('data');if(existsSync(data)&&lstatSync(data).isSymbolicLink())throw new Error('Use a real data directory for the private connection kit.');
 mkdirSync(data,{recursive:true,mode:0o700});const dir=resolve(data,'connection-kit');mkdirSync(dir,{mode:0o700});
 const encode=values=>Object.entries(values).map(([k,v])=>{if(/[\r\n]/.test(v))throw new Error('Multiline configuration is not supported by this helper.');if(v.includes("'")&&v.includes('"'))throw new Error('Mixed quote characters require manual configuration.');return k+'='+(v.includes("'")?'"'+v+'"':"'"+v+"'");}).join('\n')+'\n';
 try{
  const voice={JAWA_VOICE_ENDPOINT:url.origin+'/api/voice',JAWA_VOICE_TOKEN:config.JAWA_VOICE_TOKEN,JAWA_VOICE_JOURNAL:resolve(data,'voice-journal.sqlite'),JAWA_AGENT_NAME:'jawa-orders',LIVEKIT_URL:'',LIVEKIT_API_KEY:'',LIVEKIT_API_SECRET:'',JAWA_STT_MODEL:'',JAWA_LLM_MODEL:'',JAWA_TTS_MODEL:'',JAWA_TTS_VOICE:'',JAWA_STAFF_PHONE:'',JAWA_PYTHON:''};
  const printer={JAWA_PRINTER_ENDPOINT:url.origin+'/api/printer',JAWA_PRINTER_TOKEN:config.JAWA_PRINTER_TOKEN,JAWA_PRINT_JOURNAL:resolve(data,'print-journal.sqlite'),JAWA_PRINTER_HOST:'',JAWA_PRINTER_PROFILE:'',JAWA_PYTHON:''};
  for(const [file,values]of [['server.env',config],['voice.env',voice],['printer.env',printer]])writeFileSync(resolve(dir,file),encode(values),{mode:0o600,flag:'wx'});
 }catch(e){rmSync(dir,{recursive:true,force:true});throw e;}
 console.log('Private connection files created in data/connection-kit. No secrets were printed.\nReview server.env, then copy it to .env.server and restart Jawa.\nFill provider/printer fields in voice.env and printer.env.\nRun node scripts/run-integration.mjs voice --check or printer --check.\nRead docs/CUSTOMER_DEPLOYMENT.md before connecting customers.');
}catch(e){console.error('Connection setup stopped: '+(e.code==='EEXIST'?'data/connection-kit already exists. Reuse or securely relocate it first; existing files were preserved.':e.message));process.exitCode=1;}
