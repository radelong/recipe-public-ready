import {cookies} from 'next/headers';
import {db,checkOrigin,responseError} from '../../../../lib/server';
import {digest} from '../../../../lib/password';
export async function POST(req:Request){try{checkOrigin(req);const token=(await cookies()).get('kitchen_session')?.value;if(token)await db().prepare('DELETE FROM sessions WHERE token_hash=?').bind(await digest(token)).run();return Response.json({ok:true},{headers:{'Cache-Control':'no-store','Set-Cookie':`kitchen_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${new URL(req.url).protocol==='https:'?'; Secure':''}`}});}catch(e){return responseError(e);}}
