import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';
export default defineConfig({root:resolve('server'),plugins:[react()],resolve:{alias:{'@':resolve('.')}},publicDir:resolve('public'),build:{outDir:resolve('server-dist/web'),emptyOutDir:true}});
