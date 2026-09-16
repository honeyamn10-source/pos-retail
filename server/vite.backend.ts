import {defineConfig} from 'vite';
import {resolve} from 'node:path';
export default defineConfig({publicDir:false,resolve:{alias:[{find:'@/app/chatgpt-auth',replacement:resolve('server/identity.ts')},{find:'cloudflare:workers',replacement:resolve('server/bindings.ts')},{find:'@',replacement:resolve('.')}]},build:{ssr:resolve('server/main.ts'),outDir:'server-dist',emptyOutDir:false,rollupOptions:{output:{entryFileNames:'main.js'}}}});
