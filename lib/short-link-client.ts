"use client";
const cache=new Map<string,string>();
export async function shortLink(value:string):Promise<string>{
 try{const u=new URL(value,location.origin);if(u.origin!==location.origin)return value;
 if(/^\/s\/[a-zA-Z0-9_-]{22}$/.test(u.pathname)||/^\/(e|r)\/\d+$/.test(u.pathname))return u.href;
 if(u.pathname==="/data-event"&&u.searchParams.size===1&&/^\d+$/.test(u.searchParams.get("event")||""))return location.origin+"/r/"+u.searchParams.get("event");
 if(/^\/event\/\d+$/.test(u.pathname)&&!u.search)return location.origin+"/e/"+u.pathname.split("/").pop();
 const key=u.pathname+u.search;if(cache.has(key))return cache.get(key)!;
 const r=await fetch("/api/short-link",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({path:key})});if(!r.ok)return u.href;const x=await r.json();if(!/^\/s\/[a-zA-Z0-9_-]{22}$/.test(x.path))return u.href;const result=location.origin+x.path;cache.set(key,result);return result
 }catch{return value}
}
export async function copyShortLink(value:string){const link=await shortLink(value);await navigator.clipboard.writeText(link);return link}
