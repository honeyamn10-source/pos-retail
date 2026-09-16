"""Build a text source manifest for atomic GitHub tree uploads. No credentials."""
import json,subprocess,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[1]
excluded={'kits','node_modules','.git','dist','.wrangler','.sites-runtime','.agents','.codex','outputs','work','data','server-dist'}
entries=[]
for name in sorted(set(subprocess.check_output(['git','ls-files','-co','--exclude-standard','-z'],cwd=root).decode().split('\0'))- {''}):
 p=Path(name)
 if p.parts[0] in excluded or '__pycache__' in p.parts or (p.name.startswith('.env') and p.name!='.env.example') or p.suffix in {'.pyc','.sqlite','.pem','.jawabak'}:continue
 # Large, reproducible OCR binaries are recreated by build:server.
 if name.startswith('public/ocr/') and (p.suffix in {'.js','.gz'}):continue
 if not (root/p).is_file() or (root/p).is_symlink():continue
 try:content=(root/p).read_text()
 except UnicodeDecodeError:continue
 if name=='.openai/hosting.json':content='{"d1":"DB","r2":null}\n'
 entries.append({'path':name,'mode':'100644','type':'blob','content':content})
entries.append({'path':'next-env.d.ts','mode':'100644','type':'blob','content':'/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n'})
print(json.dumps(entries))
