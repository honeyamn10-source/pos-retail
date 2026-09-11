import { env } from 'cloudflare:workers';
import {readRepository,mutateRepository} from './repository';
import type {Operation} from './engine';
function db(){if(!env.DB)throw new Error('Database unavailable. Please try again.');return env.DB;}
export const readStore=(owner:string)=>readRepository(db(),owner);
export const mutateStore=(owner:string,op:Operation)=>mutateRepository(db(),owner,op);
