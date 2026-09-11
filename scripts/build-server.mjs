import {spawnSync} from 'node:child_process';
await import('./prepare-ocr.mjs');
for(const config of ['server/vite.config.ts','server/vite.backend.ts']){const r=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build','--config',config],{stdio:'inherit'});if(r.status!==0)process.exit(r.status??1);}
