import {requestContext} from './database';
export async function getChatGPTUser(){const u=requestContext.getStore()?.user;return u?{userId:'local-store',displayName:u.username,email:u.username,fullName:u.username}:null;}
