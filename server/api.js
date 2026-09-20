import {validateScene,applyPatches} from '../public/packages/core/index.js';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const uuid=()=>crypto.randomUUID();
export async function api(request,db,identity){
 try{
 if(!identity?.id)return json({error:'Sign in to save and collaborate.'},401);if(!db)return json({error:'Project storage is unavailable. Export your scene to preserve edits.'},503);
 const url=new URL(request.url),path=url.pathname.replace(/^\/api\/?/,'').split('/').filter(Boolean),method=request.method;let body={};if(!['GET','HEAD'].includes(method)){const origin=request.headers.get('origin');if(origin&&origin!==url.origin)return json({error:'Cross-origin writes are not allowed'},403);const raw=await request.text();if(raw.length>2_000_000)return json({error:'Project request exceeds 2 MB'},413);try{body=JSON.parse(raw||'{}')}catch{return json({error:'Invalid JSON'},400)}}
 const all=async(sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
 const first=async(sql,...args)=>db.prepare(sql).bind(...args).first();
 const run=async(sql,...args)=>db.prepare(sql).bind(...args).run();
 if(path[0]==='me')return json(identity);
 if(path[0]==='join'&&method==='POST'){
 const invitation=await first('SELECT * FROM invites WHERE token=? AND expires_at>?',String(body.token),Date.now());if(!invitation)return json({error:'This invitation has expired or is invalid'},404);
 await run('INSERT OR IGNORE INTO members (project_id,user_id,name,role,last_seen) VALUES (?,?,?,?,?)',invitation.project_id,identity.id,identity.name,invitation.role,Date.now());return json({id:invitation.project_id})}
 if(path[0]!=='projects')return json({error:'Not found'},404);
 if(path.length===1){if(method==='GET')return json({projects:await all('SELECT p.id,p.name,p.revision,p.updated_at,m.role FROM projects p JOIN members m ON m.project_id=p.id WHERE m.user_id=? ORDER BY p.updated_at DESC',identity.id)});if(method==='POST'){validateScene(body.scene);const id=uuid(),now=Date.now();await db.batch([db.prepare('INSERT INTO projects (id,name,owner,scene,revision,created_at,updated_at) VALUES (?,?,?,?,1,?,?)').bind(id,String(body.scene.name).slice(0,150),identity.id,JSON.stringify(body.scene),now,now),db.prepare('INSERT INTO members (project_id,user_id,name,role,last_seen) VALUES (?,?,?,?,?)').bind(id,identity.id,identity.name,'owner',now)]);return json({id,revision:1,role:'owner'},201)}}
 const id=path[1],member=await first('SELECT * FROM members WHERE project_id=? AND user_id=?',id,identity.id);if(!member)return json({error:'Project access denied'},403);
 if(path.length===2&&method==='GET'){const p=await first('SELECT * FROM projects WHERE id=?',id);if(!p)return json({error:'Project not found'},404);return json({id,name:p.name,scene:JSON.parse(p.scene),revision:p.revision,role:member.role})}
 if(path[2]==='presence'){
 if(method==='POST')await run('UPDATE members SET last_seen=?,selection=? WHERE project_id=? AND user_id=?',Date.now(),JSON.stringify(body.selection||null).slice(0,300),id,identity.id);
 return json({members:await all('SELECT user_id,name,role,last_seen,selection FROM members WHERE project_id=?',id)})}
 if(path[2]==='versions'&&path.length===3&&method==='GET')return json({versions:await all('SELECT id,name,author,created_at FROM versions WHERE project_id=? ORDER BY created_at DESC LIMIT 30',id)});
 if(path[2]==='versions'&&path[3]&&method==='GET'){const v=await first('SELECT * FROM versions WHERE id=? AND project_id=?',path[3],id);return v?json({...v,scene:JSON.parse(v.scene)}):json({error:'Version not found'},404)}
 if(member.role==='viewer')return json({error:'This project is read only'},403);
 if(path.length===2&&method==='PATCH'){
 if(!Array.isArray(body.patches)||body.patches.length>500)return json({error:'Invalid patch batch'},400);
 const p=await first('SELECT scene,revision FROM projects WHERE id=?',id);if(Number(body.revision)!==p.revision)return json({error:'Revision conflict',revision:p.revision,scene:JSON.parse(p.scene)},409);
 let next;try{next=applyPatches(JSON.parse(p.scene),body.patches,{check:true})}catch(e){return json({error:e.message,revision:p.revision,scene:JSON.parse(p.scene)},409)}
 const result=await run('UPDATE projects SET scene=?,name=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?',JSON.stringify(next),String(next.name).slice(0,150),Date.now(),id,p.revision);if(!result.meta.changes)return json({error:'Concurrent update; retry'},409);return json({revision:p.revision+1})}
 if(path[2]==='versions'&&method==='POST'){const p=await first('SELECT scene FROM projects WHERE id=?',id),versionId=uuid();await run('INSERT INTO versions (id,project_id,name,scene,author,created_at) VALUES (?,?,?,?,?,?)',versionId,id,String(body.name||'Checkpoint').slice(0,150),p.scene,identity.name,Date.now());return json({id:versionId},201)}
 if(member.role!=='owner')return json({error:'Only the owner can manage collaborators'},403);
 if(path[2]==='invites'&&method==='POST'){if(!['editor','viewer'].includes(body.role))return json({error:'Invalid role'},400);const token=uuid()+uuid();await run('INSERT INTO invites (token,project_id,role,expires_at) VALUES (?,?,?,?)',token,id,body.role,Date.now()+86400000);return json({token,expiresIn:86400})}
 if(path[2]==='members'&&method==='PATCH'){if(!['editor','viewer','remove'].includes(body.role))return json({error:'Invalid role'},400);if(body.userId===identity.id)return json({error:'Owner role cannot be changed'},400);if(body.role==='remove')await run('DELETE FROM members WHERE project_id=? AND user_id=?',id,body.userId);else await run('UPDATE members SET role=? WHERE project_id=? AND user_id=?',body.role,id,body.userId);return json({ok:true})}
 return json({error:'Not found'},404);
 }catch(error){console.error('Project API:',error.message);return json({error:error.message?.includes('Invalid')||error.message?.includes('Scene')||error.message?.includes('Missing')?error.message:'Unable to complete this operation. Your local edits are preserved.'},400)}
}
