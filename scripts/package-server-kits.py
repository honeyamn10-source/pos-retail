"""Package secret-free native server distributions and check every file digest."""
import hashlib,json,subprocess,zipfile
from pathlib import Path
root=Path(__file__).resolve().parents[1]
files={}
excluded={'kits','node_modules','.git','dist','.wrangler','.sites-runtime','.agents','.codex','outputs','work','data','server-dist'}
for name in sorted(set(subprocess.check_output(['git','ls-files','-co','--exclude-standard','-z'],cwd=root).decode().split('\0'))- {''}):
 p=Path(name)
 if p.parts[0] in excluded or '__pycache__' in p.parts or p.suffix in {'.pyc','.sqlite','.pem','.jawabak'} or (p.name.startswith('.env') and p.name!='.env.example'):continue
 if (root/p).is_file() and not (root/p).is_symlink():files[name]=(root/p).read_bytes()
files['.openai/hosting.json']=b'{"d1":"DB","r2":null}\n'
files['next-env.d.ts']=b'/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n'
if not (root/'server-dist/main.js').exists():raise RuntimeError('Build the native server before packaging.')
for p in (root/'server-dist').rglob('*'):
 if p.is_file() and not p.is_symlink():files[p.relative_to(root).as_posix()]=p.read_bytes()
rows=[];out=root/'kits';out.mkdir(exist_ok=True)
for mode in ['restaurant','retail']:
 title='Jawa_'+mode.title()+'_Server_Kit';kit=dict(files)
 kit['product.json']=(json.dumps({'name':'Jawa '+mode.title(),'mode':mode,'version':'0.3.0'})+'\n').encode()
 kit['START_HERE.md']=(f'# Jawa {mode.title()} server kit\n\nInstall Node.js 24 LTS, then run `node server-dist/main.js` in this folder.\nOpen http://localhost:8787 and create your owner account using `data/setup-token`.\n\nRead `docs/SERVER_INSTALL.md` for server/domain setup, staff, backup and recovery.\nThis is an installable controlled pilot; unfinished commercial features and\nexternal activation requirements are listed explicitly in that guide.\nBoth register routes share one engine. The default route for this kit is {mode}.\n').encode()
 manifest={p:hashlib.sha256(b).hexdigest() for p,b in sorted(kit.items())};kit['SERVER_MANIFEST.json']=(json.dumps(manifest,indent=2)+'\n').encode()
 target=out/(title+'.zip')
 with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for p,b in sorted(kit.items()):z.writestr(title+'/'+p,b)
 with zipfile.ZipFile(target) as z:
  assert z.testzip() is None
  for p,h in manifest.items():assert hashlib.sha256(z.read(title+'/'+p)).hexdigest()==h,p
  assert not any('/data/' in p or '/node_modules/' in p or p.endswith('/.env.server') for p in z.namelist())
 rows.append({'file':target.name,'bytes':target.stat().st_size,'files':len(kit),'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
(out/'SERVER_KIT_INDEX.json').write_text(json.dumps(rows,indent=2)+'\n');print(json.dumps(rows,indent=2))
