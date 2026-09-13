import {DatabaseSync,backup} from 'node:sqlite';
import {mkdirSync,chmodSync,readFileSync,writeFileSync,existsSync,renameSync,unlinkSync} from 'node:fs';
import {resolve} from 'node:path';
import {randomBytes,scryptSync,createCipheriv} from 'node:crypto';
import {AsyncLocalStorage} from 'node:async_hooks';
export type Staff={id:string;username:string;role:'owner'|'manager'|'cashier'|'kitchen'};
export const requestContext=new AsyncLocalStorage<{user:Staff|null;operationId?:string}>();
export const directory=resolve(process.env.JAWA_DATA_DIR||'data');mkdirSync(directory,{recursive:true,mode:0o700});
export const sqlite=new DatabaseSync(resolve(directory,'jawa.sqlite'));chmodSync(resolve(directory,'jawa.sqlite'),0o600);
sqlite.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS stores(owner TEXT PRIMARY KEY,revision INTEGER NOT NULL,payload TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS staff(id TEXT PRIMARY KEY,username TEXT UNIQUE NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL,disabled INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS throttle(key TEXT PRIMARY KEY,count INTEGER NOT NULL,reset INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS staff_audit(id INTEGER PRIMARY KEY,at TEXT NOT NULL,user_id TEXT NOT NULL,action TEXT NOT NULL,reference TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS daily_reports(day TEXT PRIMARY KEY,generated_at TEXT NOT NULL,revision INTEGER NOT NULL,payload TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS service_activity(scope TEXT PRIMARY KEY,last_seen TEXT NOT NULL,method TEXT NOT NULL);
PRAGMA user_version=1;`);
export const db={prepare(sql:string){return{bind(...values:(string|number)[]){return{
 async first(){return sqlite.prepare(sql).get(...values)??null;},
 async run(){sqlite.exec('BEGIN IMMEDIATE');try{const r=sqlite.prepare(sql).run(...values),ctx=requestContext.getStore();if(Number(r.changes)===1&&sql.startsWith('UPDATE stores')&&ctx?.user)sqlite.prepare('INSERT INTO staff_audit(at,user_id,action,reference) VALUES(?,?,?,?)').run(new Date().toISOString(),ctx.user.id,'store mutation',ctx.operationId??'');sqlite.exec('COMMIT');return{meta:{changes:Number(r.changes)}};}catch(e){sqlite.exec('ROLLBACK');throw e;}}
};}};}} as unknown as D1Database;
export async function backupBytes(passphrase:string){
 if(passphrase.length<16||passphrase.length>128)throw new Error('Backup passphrase must have 16–128 characters.');
 const path=resolve(directory,`.snapshot-${randomBytes(12).toString('hex')}.sqlite`);
 try{await backup(sqlite,path);chmodSync(path,0o600);const salt=randomBytes(16),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',scryptSync(passphrase,salt,32),iv),encrypted=Buffer.concat([cipher.update(readFileSync(path)),cipher.final()]);return Buffer.concat([Buffer.from('JAWABAK1'),salt,iv,cipher.getAuthTag(),encrypted]);}finally{if(existsSync(path))unlinkSync(path);}
}
export async function automaticBackup(){const key=resolve(directory,'backup.key');if(!existsSync(key))writeFileSync(key,randomBytes(32).toString('hex'),{mode:0o600,flag:'wx'});const dir=resolve(directory,'backups');mkdirSync(dir,{recursive:true,mode:0o700});const file=resolve(dir,new Date().toISOString().slice(0,10)+'.jawabak');if(existsSync(file))return;writeFileSync(file+'.tmp',await backupBytes(readFileSync(key,'utf8').trim()),{mode:0o600});renameSync(file+'.tmp',file);}
