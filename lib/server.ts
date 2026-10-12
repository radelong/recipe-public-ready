import { env } from "cloudflare:workers";
import { cookies } from "next/headers";
import {digest} from "./password";
import { defaults, type Member, type Recipe, canRead, canEdit } from "./recipe";
export function db() { if(!env.DB) throw new Error("Database is unavailable."); return env.DB; }
export class HttpError extends Error { constructor(public status:number,message:string){super(message);} }
export async function member():Promise<Member> {
 const token=(await cookies()).get('kitchen_session')?.value;
 if(!token||!/^([a-f0-9]{64})$/.test(token))throw new HttpError(401,"Sign in to open your cookbook.");
 const m=await db().prepare("SELECT m.id,m.email,m.name,m.username,m.role,m.active FROM sessions s JOIN members m ON m.id=s.member_id WHERE s.token_hash=? AND s.expires>?").bind(await digest(token),Date.now()).first<Member>();
 if(!m||!m.active)throw new HttpError(401,"Your session has ended. Please sign in again.");
 return m;
}
export function admin(m:Member){if(m.role!=="admin")throw new HttpError(403,"Administrator access is required.");}
export async function recipeRow(id:string,m:Member,edit=false) { const row=await db().prepare("SELECT * FROM recipes WHERE id = ?").bind(id).first<any>(); if(!row) throw new HttpError(404,"Recipe not found."); const shared=(await db().prepare("SELECT member_id FROM grants WHERE recipe_id = ?").bind(id).all<any>()).results.map(x=>x.member_id); if(!(edit?canEdit(m,row.owner_id):canRead(m,row.owner_id,shared)))throw new HttpError(404,"Recipe not found."); return row; }
export function validateRecipe(raw:any): Omit<Recipe,"id"|"ownerId"> {
 const text=(v:any,max=4000)=>String(v??"").trim().slice(0,max);
 if(!text(raw.title,160))throw new HttpError(400,"Add a recipe title.");
 if(!Array.isArray(raw.ingredients)||!raw.ingredients.length||raw.ingredients.length>150)throw new HttpError(400,"Add between 1 and 150 ingredients.");
 if(!Array.isArray(raw.steps)||raw.steps.length>80)throw new HttpError(400,"Use a list of up to 80 cooking steps.");
 const positive=(v:any,max:number)=>{const n=Number(v);if(!Number.isFinite(n)||n<=0||n>max)throw new HttpError(400,"Servings must be a positive number.");return n;};
 const time=(v:any)=>{const n=Number(v);if(!Number.isFinite(n)||n<0||n>10080)throw new HttpError(400,"Enter valid cooking and prep times.");return n;};
 if(!Array.isArray(raw.tags)||raw.tags.length>20)throw new HttpError(400,"Choose up to 20 sublabels.");
 const steps=raw.steps.map((s:any)=>text(s,5000)).filter(Boolean);
 return {title:text(raw.title,160),description:text(raw.description,600),category:text(raw.category,60)||"Entrée",tags:(Array.isArray(raw.tags)?raw.tags:[]).slice(0,20).map((x:any)=>text(x,60)).filter(Boolean),servings:positive(raw.servings,10000),servingUnit:raw.servingUnit==="batch"?"batch":"servings",prep:time(raw.prep),cook:time(raw.cook),ingredients:raw.ingredients.map((i:any)=>{let quantity=i.quantity==null||i.quantity===""?null:Number(i.quantity);if(quantity!==null&&(!Number.isFinite(quantity)||quantity<0||quantity>1000000))throw new HttpError(400,"Ingredient quantities must be nonnegative numbers.");if(!text(i.name,200))throw new HttpError(400,"Every ingredient needs a name.");return {quantity,unit:text(i.unit,40),name:text(i.name,200)};}),steps,notes:text(raw.notes,10000),image:["/images/pasta.svg","/images/cookies.svg","/images/pesto.svg"].includes(raw.image)?raw.image:"",attachments:[]};
}
export function responseError(e:any){if(!(e instanceof HttpError))console.error(e);return Response.json({error:e instanceof HttpError?e.message:"Something went wrong. Please try again."},{status:e instanceof HttpError?e.status:500,headers:{"Cache-Control":"no-store"}});}
export function checkOrigin(req:Request){const origin=req.headers.get("origin");if(!origin||new URL(origin).origin!==new URL(req.url).origin)throw new HttpError(403,"Please submit changes from this site.");}
export async function siteSettings(){const row=await db().prepare("SELECT data FROM settings WHERE id='site'").first<any>();if(!row)return defaults;const saved=JSON.parse(row.data);return {...defaults,...saved,...(saved.catalogVersion===2?{}:{catalogVersion:2,categories:[...new Set([...defaults.categories,...(saved.categories||[])])],tags:[...new Set([...defaults.tags,...(saved.tags||[])])]})};}

