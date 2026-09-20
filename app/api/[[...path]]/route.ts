import {env} from 'cloudflare:workers';
import {api} from '../../../server/api.js';
export const dynamic='force-dynamic';
async function handler(request:Request){const id=request.headers.get('oai-authenticated-user-id'),email=request.headers.get('oai-authenticated-user-email');let name=request.headers.get('oai-authenticated-user-full-name')||email||'Collaborator';try{if(request.headers.get('oai-authenticated-user-full-name-encoding')==='percent-encoded-utf-8')name=decodeURIComponent(name)}catch{}return api(request,env.DB,id?{id,name,email}:null)}
export {handler as GET,handler as POST,handler as PATCH,handler as DELETE};
