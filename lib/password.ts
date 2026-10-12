const encoder=new TextEncoder();
export function randomHex(bytes=32){return Array.from(crypto.getRandomValues(new Uint8Array(bytes)),b=>b.toString(16).padStart(2,'0')).join('');}
export async function digest(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
export async function passwordHash(password:string,salt:string){
 const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:encoder.encode(salt),iterations:100000},key,256);
 return Array.from(new Uint8Array(bits),b=>b.toString(16).padStart(2,'0')).join('');
}
export function equalHash(a:string,b:string){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
export function username(value:unknown){const name=String(value||'').trim().toLowerCase();if(!/^[a-z0-9][a-z0-9_.-]{2,39}$/.test(name))throw new Error('Use a username of 3–40 letters, numbers, dots, dashes, or underscores.');return name;}
export function validPassword(value:unknown){return typeof value==='string'&&value.length>=10&&value.length<=256;}
