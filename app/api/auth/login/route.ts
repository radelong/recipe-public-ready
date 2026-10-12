import {env} from 'cloudflare:workers';
import {db,checkOrigin,HttpError,responseError} from '../../../../lib/server';
import {digest,passwordHash,equalHash,randomHex} from '../../../../lib/password';
export const dynamic='force-dynamic';
export async function POST(req:Request){try{
 checkOrigin(req);if(Number(req.headers.get('content-length'))>4096)throw new HttpError(413,'Login request is too large.');
 const text=await req.text();if(text.length>4096)throw new HttpError(413,'Login request is too large.');
 let b:any;try{b=JSON.parse(text);}catch{throw new HttpError(400,'Enter your username and password.');}
 const name=String(b.username||'').trim().toLowerCase();const password=String(b.password||'');
 if(name.length>40||password.length>256)throw new HttpError(401,'Username or password is incorrect.');
 const now=Date.now();const ip=req.headers.get('cf-connecting-ip')||'local';
 const keys=[await digest('ip:'+ip),await digest('pair:'+ip+':'+name)];
 await db().batch([db().prepare('DELETE FROM login_attempts WHERE expires<?').bind(now),db().prepare('DELETE FROM sessions WHERE expires<?').bind(now)]);
 const counts=await db().batch(keys.map(key=>db().prepare('INSERT INTO login_attempts (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key,now+15*60*1000)));
 if(Number((counts[0].results[0] as any)?.count)>60||Number((counts[1].results[0] as any)?.count)>12)throw new HttpError(429,'Too many sign-in attempts. Try again in 15 minutes.');
 const config=env as any;let m:any;
 if(name==='admin'&&config.ADMIN_PASSWORD_HASH&&config.ADMIN_PASSWORD_SALT){
  const hash=await passwordHash(password,String(config.ADMIN_PASSWORD_SALT));
  if(!equalHash(hash,String(config.ADMIN_PASSWORD_HASH)))throw new HttpError(401,'Username or password is incorrect.');
  const email=String(config.ADMIN_EMAIL||'user@example.invalid').toLowerCase();
  await db().prepare("INSERT INTO members (id,email,name,username,role,active) VALUES (?,?,?,'admin','admin',1) ON CONFLICT(email) DO UPDATE SET username='admin',role='admin',active=1").bind(crypto.randomUUID(),email,'Administrator').run();
  m=await db().prepare("SELECT id FROM members WHERE username='admin' AND role='admin'").first<any>();
 }else{
  m=await db().prepare('SELECT id,password_hash,password_salt,active FROM members WHERE username=?').bind(name).first<any>();
  const hash=await passwordHash(password,m?.password_salt||'no-account-placeholder-salt');
  if(!m||!m.active||!m.password_hash||!equalHash(hash,m.password_hash))throw new HttpError(401,'Username or password is incorrect.');
 }
 if(!m)throw new HttpError(503,'The administrator login is not configured yet.');
 const token=randomHex();await db().batch([db().prepare('DELETE FROM login_attempts WHERE key=?').bind(keys[1]),db().prepare('INSERT INTO sessions (token_hash,member_id,expires) VALUES (?,?,?)').bind(await digest(token),m.id,now+7*24*60*60*1000)]);
 const secure=new URL(req.url).protocol==='https:'?'; Secure':'';
 return Response.json({ok:true},{headers:{'Cache-Control':'no-store','Set-Cookie':`kitchen_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800${secure}`}});
 }catch(e){return responseError(e);}}
