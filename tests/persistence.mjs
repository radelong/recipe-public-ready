// Local-only restart check. Run `seed`, restart the built Worker, then run `check`.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const origin=process.env.TEST_ORIGIN || 'http://127.0.0.1:8787';
if(!['127.0.0.1','localhost'].includes(new URL(origin).hostname))throw Error('Tests are local-only');
const login=await fetch(origin+'/api/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'198.51.100.254'},body:JSON.stringify({username:'admin',password:process.env.TEST_ADMIN_PASSWORD || 'local-admin-testing'})});
assert.equal(login.status,200);await login.text();const cookie=login.headers.get('set-cookie').split(';')[0];
async function request(body,path='/api/kitchen'){const r=await fetch(origin+path,{method:body?'POST':'GET',headers:{Origin:origin,Cookie:cookie,...(body&&!(body instanceof FormData)?{'Content-Type':'application/json'}:{})},body:body instanceof FormData?body:body?JSON.stringify(body):undefined});const text=await r.text();assert.equal(r.status,200,text);return new Response(text,{status:r.status,headers:r.headers});}
const stateFile='.sites-runtime/persistence-check.json';
if(process.argv[2]==='seed'){
 const before=await (await request()).json();const recipe={title:'Local persistence proof',description:'',category:'Sauce',tags:['Make ahead'],servings:4,prep:1,cook:0,ingredients:[{quantity:.5,unit:'cup',name:'water'}],steps:['Stir.'],notes:''};
 const first=await (await request({action:'save',recipe})).json();const second=await (await request({action:'save',recipe:{...recipe,title:'Local persistence copy'}})).json();assert.notEqual(first.id,second.id);
 const file=new FormData();file.set('file',new File(['Persistent recipe attachment'],'local.txt',{type:'text/plain'}));await request(file,`/api/recipes/${first.id}/files`);
 await request({action:'settings',settings:{...before.settings,title:'Local persistence proof',tags:[...before.settings.tags,'Restart proof']}});
 const after=await (await request()).json();await writeFile(stateFile,JSON.stringify({ids:[first.id,second.id],originalSettings:before.settings,originalIds:before.recipes.map(r=>r.id),saved:after.recipes.filter(r=>r.id===first.id||r.id===second.id)}));console.log('SEEDED: two distinct recipes, optional description, attachment, and expanded settings. Restart the local Worker now.');
}else if(process.argv[2]==='check'){
 const saved=JSON.parse(await readFile(stateFile,'utf8'));const after=await (await request()).json();assert.deepEqual(after.recipes.filter(r=>saved.ids.includes(r.id)),saved.saved);assert.equal(after.settings.title,'Local persistence proof');assert.ok(after.settings.tags.includes('Restart proof'));assert.ok(saved.originalIds.every(id=>after.recipes.some(r=>r.id===id)));
 const key=saved.saved.find(r=>r.attachments.length).attachments[0].key;assert.equal(await (await request(undefined,'/api/files?key='+encodeURIComponent(key))).text(),'Persistent recipe attachment');
 await request({action:'settings',settings:saved.originalSettings});for(const id of saved.ids)await request({action:'delete',id});console.log('PASS: recipes, separate IDs, optional descriptions, labels, appearance, and uploaded file survived a Worker restart; original content remained intact. Test records removed.');
}else throw Error('Choose seed or check.');
