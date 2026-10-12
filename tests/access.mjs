// Run against the built LOCAL Worker only, with test-only admin credentials.
import assert from 'node:assert/strict';

const origin=process.env.TEST_ORIGIN || 'http://127.0.0.1:8787';
if(!['127.0.0.1','localhost'].includes(new URL(origin).hostname))throw Error('Tests are local-only');
const stamp=Date.now();const testIP="198.51.100."+((stamp%200)+1);
let owner;
let alice;const aliceName=`alice${stamp}`;
let bob;const bobName=`bob${stamp}`;
async function request(user,body,path='/api/kitchen',method){const headers={Origin:origin,"CF-Connecting-IP":testIP};if(user)headers.Cookie=user.cookie;
 if(body&&!(body instanceof FormData))headers['Content-Type']='application/json';
 const r=await fetch(origin+path,{method:method||(body?'POST':'GET'),headers,body:body instanceof FormData?body:body?JSON.stringify(body):undefined});const json=await r.json().catch(()=>null);return {status:r.status,json};}
const good=async(...args)=>{const r=await request(...args);assert.equal(r.status,200,JSON.stringify(r));return r.json;};

assert.equal((await request(null)).status,401);
async function login(username,password='test-password-long'){const r=await fetch(origin+'/api/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':testIP},body:JSON.stringify({username,password})});assert.equal(r.status,200,await r.text());const cookie=r.headers.get('set-cookie');assert.ok(cookie.includes('HttpOnly'));assert.ok(cookie.includes('SameSite=Strict'));return {cookie:cookie.split(';')[0]};}
const wrong=await request(null,{username:'admin',password:'REPLACE_WITH_YOUR_SECRET'},'/api/auth/login');assert.equal(wrong.status,401);
owner=await login('admin',(process.env.TEST_ADMIN_PASSWORD || 'local-admin-testing'));
assert.equal((await good(owner)).me.username,'admin');
await good(owner,{action:'member',username:aliceName,password:'test-password-long',name:'Test Alice'});
await good(owner,{action:'member',username:bobName,password:'test-password-long',name:'Test Bob'});
alice=await login(aliceName);bob=await login(bobName);
const a=await good(alice),b=await good(bob);
assert.equal(a.me.role,'user');assert.equal(a.members.length,0);
const recipe={title:'Access test',description:'Local only',category:'Sauce',tags:['Quick & easy'],servings:4,prep:2,cook:0,ingredients:[{quantity:.5,unit:'cup',name:'water'},{quantity:null,unit:'',name:'salt, to taste'}],steps:['Stir together.'],notes:''};
const created=await good(alice,{action:'save',recipe});const id=created.id;
const incomplete=await good(alice,{action:'save',recipe:{...recipe,title:'Instructions to add later',steps:[],servings:1,servingUnit:'batch'}});
let incompleteRow=(await good(alice)).recipes.find(r=>r.id===incomplete.id);
assert.deepEqual(incompleteRow.steps,[]);
assert.equal(incompleteRow.servingUnit,'batch');
await good(alice,{action:'save',id:incomplete.id,updatedAt:incompleteRow.updatedAt,recipe:{...incompleteRow,steps:['Stir together.','Serve.']}});
incompleteRow=(await good(alice)).recipes.find(r=>r.id===incomplete.id);
assert.deepEqual(incompleteRow.steps,['Stir together.','Serve.']);
await good(alice,{action:'delete',id:incomplete.id});
assert.ok((await good(alice)).recipes.some(r=>r.id===id));
assert.ok(!(await good(bob)).recipes.some(r=>r.id===id));
assert.equal((await request(bob,{action:'save',id,recipe})).status,404);
assert.equal((await request(bob,{action:'delete',id})).status,404);
assert.equal((await request(alice,{action:'share',id,members:[b.me.id]})).status,403);
assert.equal((await request(alice,{action:'settings',settings:{}})).status,403);
assert.equal((await request(alice,{action:'member',name:'No',email:'user@example.invalid'})).status,403);
const file=new FormData();file.set('file',new File(['Original test recipe'], 'recipe.txt',{type:'text/plain'}));
await good(alice,file,`/api/recipes/${id}/files`);
const saved=(await good(alice)).recipes.find(r=>r.id===id);const key=saved.attachments[0].key;
assert.equal((await request(bob,null,`/api/files?key=${encodeURIComponent(key)}`)).status,404);
await good(owner,{action:'share',id,members:[b.me.id]});
assert.ok((await good(bob)).recipes.some(r=>r.id===id));
assert.equal((await request(bob,null,`/api/files?key=${encodeURIComponent(key)}`)).status,200);
assert.equal((await request(bob,{action:'save',id,recipe})).status,404);
assert.equal((await request(bob,{action:'remove-file',id,key})).status,404);
const before=(await good(owner)).recipes.find(r=>r.id===id);
await good(owner,{action:'save',id,updatedAt:before.updatedAt,recipe:{...recipe,title:'Admin edited'}});
assert.equal((await request(alice,{action:'save',id,updatedAt:before.updatedAt,recipe})).status,409);
assert.equal((await good(alice)).recipes.find(r=>r.id===id).title,'Admin edited');
await good(owner,{action:'share',id,members:[]});
assert.ok(!(await good(bob)).recipes.some(r=>r.id===id));
assert.equal((await request(bob,null,`/api/files?key=${encodeURIComponent(key)}`)).status,404);
await good(alice,{action:'remove-file',id,key});
assert.equal((await request(alice,null,`/api/files?key=${encodeURIComponent(key)}`)).status,404);
assert.equal((await request(alice,{action:'save',recipe:{...recipe,ingredients:[{quantity:-1,name:'invalid'}]}})).status,400);
const cross=await fetch(origin+'/api/kitchen',{method:'POST',headers:{Origin:'https://other.test','Content-Type':'application/json',Cookie:owner.cookie},body:JSON.stringify({action:'delete',id})});assert.equal(cross.status,403);
await good(owner,{action:'member-active',id:b.me.id,active:false});
assert.equal((await request(bob)).status,401);
const createId=crypto.randomUUID();const copy1=await good(alice,{action:'save',createId,recipe:{...recipe,title:'Copy test',description:''}});const copyRetry=await good(alice,{action:'save',createId,recipe:{...recipe,title:'Copy test',description:''}});assert.equal(copy1.id,copyRetry.id);assert.notEqual(copy1.id,id);assert.equal((await good(alice)).recipes.filter(r=>r.id===createId).length,1);assert.equal((await good(alice)).recipes.find(r=>r.id===id).title,'Admin edited');
const countBefore=(await good(alice)).recipes.length;assert.equal((await request(alice,{action:'import',recipes:[recipe,{...recipe,title:''}]})).status,400);assert.equal((await good(alice)).recipes.length,countBefore);
await good(alice,{action:'delete',id});await good(alice,{action:'delete',id:createId});
await good(owner,{action:'member-password',id:a.me.id,password:'test-replacement-password'});
assert.equal((await request(alice)).status,401);
const oldPassword=await request(null,{username:aliceName,password:'test-password-long'},'/api/auth/login');assert.equal(oldPassword.status,401);
alice=await login(aliceName,'test-replacement-password');
await good(alice,undefined,'/api/auth/logout','POST');assert.equal((await request(alice)).status,401);
await good(owner,{action:'member-active',id:a.me.id,active:false});
const denied=await request(null,{username:bobName,password:'test-password-long'},'/api/auth/login');assert.equal(denied.status,401);
for(let i=0;i<13;i++){const r=await request(null,{username:'ratetest'+stamp,password:'REPLACE_WITH_YOUR_SECRET'},'/api/auth/login');assert.equal(r.status,i<12?401:429);}
const catalog=(await good(owner)).settings;assert.equal(catalog.categories.length,16);assert.ok(catalog.tags.length>200);assert.ok(catalog.tags.includes('Cookies'));assert.ok(catalog.tags.includes('Chicken'));

console.log('PASS: sign-in; username/password login; cookie sessions; password reset; rate limiting; expanded catalog; separate copy IDs; retry-safe new saves; stale-edit rejection; atomic imports; owner/admin edits; per-user visibility; sharing and revocation; protected uploads; disabled accounts; validation; cross-origin writes.');

