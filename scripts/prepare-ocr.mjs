import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
import {mkdirSync,copyFileSync} from 'node:fs';
const require=createRequire(resolve('package.json')),tess=dirname(require.resolve('tesseract.js/package.json')),nested=createRequire(resolve(tess,'package.json')),core=dirname(nested.resolve('tesseract.js-core/package.json')),lang=dirname(require.resolve('@tesseract.js-data/eng/package.json'));
for(const d of ['public/ocr/core','public/ocr/lang'])mkdirSync(d,{recursive:true});
for(const n of ['tesseract-core-lstm.wasm.js','tesseract-core-simd-lstm.wasm.js','tesseract-core-relaxedsimd-lstm.wasm.js','LICENSE'])copyFileSync(resolve(core,n),resolve('public/ocr/core',n));
copyFileSync(resolve(tess,'dist/worker.min.js'),'public/ocr/worker.min.js');copyFileSync(resolve(tess,'dist/worker.min.js.LICENSE.txt'),'public/ocr/worker.min.js.LICENSE.txt');copyFileSync(resolve(tess,'LICENSE.md'),'public/ocr/LICENSE-TESSERACT.md');copyFileSync(resolve(lang,'4.0.0/eng.traineddata.gz'),'public/ocr/lang/eng.traineddata.gz');console.log('Local OCR assets prepared from locked dependencies.');
