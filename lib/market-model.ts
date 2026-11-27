export type MarketKind="player"|"team";
export type MarketData=Record<string,string>;
export type Field={key:string;label:string;type:"text"|"textarea"|"date"|"url"|"image"|"video"|"select";options?:string[];required?:boolean};
export const statuses=["Free Agent","Looking for Team","Trial","Joined Team"];
export const defaultRoles=["IGL","Assaulter","Support","Sniper","Scout","Fragger","Flex"];
export const defaultPositions=["Player","Manager","Coach","Analyst","Admin","Content Creator"];
const f=(key:string,label:string,type:Field["type"]="text",options?:string[]):Field=>({key,label,type,options});
const socials=["Instagram","TikTok","WhatsApp","YouTube","Discord","Facebook","Telegram","X","Website"];
const links=socials.map(x=>f(x,x,"url"));
export const builtin:Record<MarketKind,Field[]>={
 player:[{...f("name","Nickname player"),required:true},f("fullName","Nama lengkap"),f("playerId","ID PUBG Mobile"),f("photo","Foto player","image"),f("age","Umur"),f("domicile","Domisili"),f("role","Role player","select",defaultRoles),f("experience","Pengalaman kompetitif","textarea"),f("history","Riwayat team","textarea"),f("achievements","Prestasi","textarea"),f("status","Status player","select",statuses),f("description","Tentang player","textarea"),f("poster","Poster","image"),f("video","Video","video"),...links,f("otherLink","Link lainnya","url")],
 team:[{...f("name","Nama Team / Clan"),required:true},f("photo","Logo team","image"),f("poster","Poster recruitment","image"),f("video","Video","video"),f("description","Tentang team","textarea"),f("position","Posisi yang dibutuhkan","select",defaultPositions),f("role","Role player yang dibutuhkan","select",defaultRoles),f("requirements","Persyaratan","textarea"),f("benefits","Benefit","textarea"),f("domicile","Domisili"),f("practice","Jadwal latihan"),f("target","Target kompetitif"),f("deadline","Batas recruitment","date"),...links,f("registration","Link formulir","url"),f("otherLink","Link lainnya","url")]
};
export type MarketSettings={player:boolean;team:boolean;membersOnly:boolean;roles:string[];positions:string[];categories:string[];hidden:Record<MarketKind,string[]>;custom:Record<MarketKind,Field[]>};
export const marketDefaults:MarketSettings={player:true,team:true,membersOnly:false,roles:defaultRoles,positions:defaultPositions,categories:["PUBG Mobile"],hidden:{player:[],team:[]},custom:{player:[],team:[]}};
const strings=(v:unknown,max=30)=>Array.isArray(v)?[...new Set(v.map(x=>String(x).trim().slice(0,80)).filter(Boolean))].slice(0,max):[];
export function normalizeSettings(v:any):MarketSettings{
 const custom=(k:MarketKind)=>Array.isArray(v?.custom?.[k])?v.custom[k].slice(0,20).map((x:any,i:number)=>({key:/^custom_[a-z0-9_]{1,48}$/.test(x.key)?x.key:"custom_"+i,label:String(x.label||"").trim().slice(0,80),type:["text","textarea","url","date"].includes(x.type)?x.type:"text"})).filter((x:Field)=>x.label):[];
 return {player:v?.player!==false,team:v?.team!==false,membersOnly:v?.membersOnly===true,roles:strings(v?.roles).length?strings(v.roles):defaultRoles,positions:strings(v?.positions).length?strings(v.positions):defaultPositions,categories:strings(v?.categories),hidden:{player:strings(v?.hidden?.player),team:strings(v?.hidden?.team)},custom:{player:custom("player"),team:custom("team")}};
}
export function fields(k:MarketKind,s:MarketSettings):Field[]{
 return [...builtin[k],f("category","Kategori","select",s.categories),...s.custom[k]].filter(x=>x.required||!s.hidden[k].includes(x.key)).map(x=>x.key==="role"?{...x,options:s.roles}:x.key==="position"?{...x,options:s.positions}:x);
}
export const mediaKey=(v:string)=>{try{const x=decodeURIComponent(v.replace(/^\/api\/images\//,""));return /^market-media\/[a-f0-9-]{36}\.(jpg|png|webp|gif|avif|bmp|mp4|webm)$/.test(x)?x:""}catch{return ""}};
export function validateData(k:MarketKind,v:any,s:MarketSettings):MarketData{
 const out:MarketData={};
 for(const field of fields(k,s)){let value=String(v?.[field.key]??"").trim();if(!value)continue;if(value.length>(field.type==="textarea"?4000:800))throw Error(field.label+" terlalu panjang.");
  if(field.key==="playerId"&&!/^\d{5,20}$/.test(value))throw Error("ID PUBG harus berupa 5–20 digit.");
  if(field.key==="age"&&(!/^\d{1,2}$/.test(value)||Number(value)<13||Number(value)>99))throw Error("Umur tidak valid.");
  if(field.key==="status"&&!statuses.includes(value))throw Error("Status player tidak valid.");
  if(field.type==="url"){if(field.key==="WhatsApp"&&/^\+?[\d\s()-]{8,23}$/.test(value)){let n=value.replace(/\D/g,"");if(n.startsWith("0"))n="62"+n.slice(1);value="https://wa.me/"+n}let u:URL;try{u=new URL(value)}catch{throw Error(field.label+" harus berupa tautan yang valid.")}if(!["https:","http:"].includes(u.protocol)||u.username||u.password)throw Error("URL tidak diizinkan.");value=u.href}
  if(["image","video"].includes(field.type)&&(!mediaKey(value)||!value.startsWith("/api/images/")||(field.type==="video")!==/\.(mp4|webm)$/.test(mediaKey(value))))throw Error(field.label+" harus diunggah melalui formulir.");
  if(field.type==="date"&&!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error("Tanggal tidak valid.");
  out[field.key]=value;
 }
 if(!out.name||out.name.length<2||out.name.length>100)throw Error("Isi identitas minimal 2–100 karakter.");
 return out;
}
