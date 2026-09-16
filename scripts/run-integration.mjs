import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawn} from 'node:child_process';
const root=resolve(import.meta.dirname,'..');process.chdir(root);
try{
 const [scope,option]=process.argv.slice(2);
 if(!['voice','printer'].includes(scope)||process.argv.length>4||(option&&!['--check','--probe'].includes(option)))throw new Error('Usage: node scripts/run-integration.mjs voice|printer [--check|--probe]');
 const file=resolve('data/connection-kit',scope+'.env');if(!existsSync(file))throw new Error('Create private connection files using scripts/configure-integrations.mjs first.');
 process.loadEnvFile(file);
 const python=process.env.JAWA_PYTHON||(process.platform==='win32'?'python':'python3');
 const args=option?['integrations/check.py',scope,option]:scope==='voice'?['integrations/voice/agent.py','start']:['integrations/printer/bridge.py'];
 const child=spawn(python,args,{cwd:root,env:process.env,stdio:'inherit'});
 child.on('error',()=>{console.error('Python could not start. Set JAWA_PYTHON to your virtual environment Python executable.');process.exitCode=1;});
 child.on('exit',code=>{process.exitCode=code??1;});
 const stop=()=>child.kill('SIGTERM');process.on('SIGINT',stop);process.on('SIGTERM',stop);
}catch(e){console.error(e.message);process.exitCode=1;}
