import {db} from './database';
export const env={...process.env,DB:db,JAWA_SERVICE_OWNER:'local-store',JAWA_ONLINE_OWNER:'local-store'};
