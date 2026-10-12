import {recipeTypes,defaultLabels} from './catalog';
export type Ingredient = { quantity: number | null; unit: string; name: string };
export type Recipe = { id: string; ownerId: string; ownerName?: string; title: string; description: string; category: string; tags: string[]; servings: number; servingUnit?: "servings" | "batch"; prep: number; cook: number; ingredients: Ingredient[]; steps: string[]; notes: string; image: string; attachments: {key:string;name:string}[]; updatedAt?: string; sharedWith?: string[] };
export type Member = { id:string; email:string; name:string; role:string; active:number; auth_id?:string; username?:string };
export const defaults = {title:"ExampleUser Kitchen", tagline:"Good food. Kept close.", description:"A little collection of tried, loved, and worth-making-again recipes.", accent:"#b74d2d", background:"#f7f4ec", heroImage:"/images/pasta.svg", font:"serif", layout:"grid", catalogVersion:2, categories:recipeTypes, tags:defaultLabels};
export function quantityLabel(n:number) { const whole=Math.floor(n); const fraction=n-whole; const pairs:[number,string][]=[[.125,"⅛"],[.25,"¼"],[.375,"⅜"],[1/3,"⅓"],[.5,"½"],[.625,"⅝"],[2/3,"⅔"],[.75,"¾"],[.875,"⅞"]]; const match=pairs.find(([v])=>Math.abs(fraction-v)<.002); return match ? (whole?`${whole} `:"")+match[1] : String(Math.round(n*1000)/1000); }
export function canRead(member:Member, ownerId:string, sharedWith:string[]) { return member.role==="admin"||ownerId===member.id||sharedWith.includes(member.id); }
export function canEdit(member:Member, ownerId:string) { return member.role==="admin"||ownerId===member.id; }




