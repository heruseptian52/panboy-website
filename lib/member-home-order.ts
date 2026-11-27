type OrderedMember={id:number;sortOrder:number;teamName:string};
export function parseMemberOrder(raw:string):number[]|null{
 if(!raw)return null;
 try{const value=JSON.parse(raw);if(!Array.isArray(value)||value.some(id=>!Number.isSafeInteger(id)||id<1)||new Set(value).size!==value.length)return null;return value}catch{return null}
}
export function orderHomeMembers<T extends OrderedMember>(members:T[],raw:string,legacyFeatured:string):T[]{
 const saved=parseMemberOrder(raw),legacy=Number(legacyFeatured);
 const order=saved??(Number.isSafeInteger(legacy)&&legacy>0?[legacy]:[]);
 const rank=new Map(order.map((id,index)=>[id,index]));
 return [...members].sort((a,b)=>(rank.get(a.id)??Infinity)-(rank.get(b.id)??Infinity)||a.sortOrder-b.sortOrder||a.teamName.localeCompare(b.teamName,"id",{sensitivity:"base"})||a.id-b.id);
}
export function moveMember<T extends {id:number}>(members:T[],fromId:number,toIndex:number):T[]{
 const index=members.findIndex(m=>m.id===fromId);if(index<0||!Number.isFinite(toIndex))return members;
 const next=[...members],target=Math.max(0,Math.min(next.length-1,Math.trunc(toIndex)));const [member]=next.splice(index,1);next.splice(target,0,member);return next;
}
