export const categoriesDefault=["Team / Clan Esports","Sponsor","Brand","Business","Media Partner","Community Partner","Produk & Jasa","Open Recruitment","Lainnya"].map((name,i)=>({id:"cat-"+(i+1),name}));
export const platforms=["Instagram","TikTok","YouTube","Facebook","X / Twitter","WhatsApp","Telegram","Discord","Website","Shopee","Tokopedia","Lazada","TikTok Shop","Google Maps","Custom"] as const;
export const labels=["Official Member","Sponsor","Premium Sponsor","Official Partner","Media Partner","Featured Team","Featured Brand","Custom Label"];
export const bioTypes=["Owner","Founder","Co-Owner","Management","Coach","Staff & anggota","Roster player","Prestasi & penghargaan","Produk & jasa","Informasi kerja sama","Galeri","Custom"];
export const profileKeys=["about","history","vision","mission","founded","location"] as const;
export type ProfileKey=typeof profileKeys[number];
export type Media={id:string;kind:"image"|"video";url:string;caption:string;link:string;visible:boolean};
export type Bio={id:string;type:string;title:string;text:string;photo:string;role:string;link:string;icon:string;visible:boolean};
export type ShowcaseLink={id:string;platform:string;label:string;url:string;icon:string;color:string;visible:boolean;primary:boolean};
export type ShowcaseContent={title:string;description:string;name:string;logo:string;banner:string;motto:string;founded:string;location:string;about:string;history:string;vision:string;mission:string;categoryId:string;showCategory:boolean;profileOrder:ProfileKey[];hiddenProfile:ProfileKey[];consentConfirmed:boolean;label:string;customLabel:string;labelColor:string;labelIcon:string;partnershipConfirmed:boolean;media:Media[];bios:Bio[];links:ShowcaseLink[];detail:boolean;autoplay:boolean;seconds:number};
export type ShowcaseAd={id:string;internalName:string;memberId:number|null;status:"draft"|"published"|"inactive";startsAt:string;endsAt:string;priority:number;sortOrder:number;content:ShowcaseContent};
export type PublicShowcase={id:string;content:ShowcaseContent;category:string;label:string};
export type ShowcaseConfig={categories:{id:string;name:string}[];whatsapp:string};
export const defaultConfig:ShowcaseConfig={categories:categoriesDefault,whatsapp:"6281545910291"};
export const blankContent:ShowcaseContent={title:"",description:"",name:"",logo:"",banner:"",motto:"",founded:"",location:"",about:"",history:"",vision:"",mission:"",categoryId:"",showCategory:false,profileOrder:[...profileKeys],hiddenProfile:[],consentConfirmed:false,label:"",customLabel:"",labelColor:"#d4af54",labelIcon:"",partnershipConfirmed:false,media:[],bios:[],links:[],detail:false,autoplay:false,seconds:7};
export const blankAd:ShowcaseAd={id:"",internalName:"",memberId:null,status:"draft",startsAt:"",endsAt:"",priority:0,sortOrder:0,content:blankContent};
const str=(v:unknown,max=4000)=>typeof v==="string"?v.trim().slice(0,max):"";
const obj=(v:unknown):Record<string,unknown>=>v&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:{};
const integer=(v:unknown,min:number,max:number,fallback=0)=>Number.isFinite(Number(v))?Math.min(max,Math.max(min,Math.round(Number(v)))):fallback;
const id=(v:unknown)=>{const value=str(v,80);return /^[a-zA-Z0-9_-]{1,80}$/.test(value)?value:crypto.randomUUID()};
export function externalUrl(v:unknown){const s=str(v,2048);if(!s)return "";try{const u=new URL(s);if((u.protocol==="https:"||u.protocol==="http:")&&!u.username&&!u.password)return u.href}catch{}throw Error("Link harus berupa URL HTTP/HTTPS yang valid.")}
export function mediaUrl(v:unknown){const s=str(v,2048);if(!s)return "";if(s.startsWith("/api/images/")){try{const key=decodeURIComponent(s.slice(12));if(/^(?:showcase-media|uploads|team-logos)\/[a-zA-Z0-9_./-]+$/.test(key)&&!key.includes(".."))return "/api/images/"+encodeURIComponent(key)}catch{}throw Error("Media tidak diizinkan.");} if(!s.startsWith("/api/")&&!s.startsWith("/admin/")&&/^\/[\w./-]+\.(png|jpe?g|webp|gif|avif|bmp)$/i.test(s)&&!s.includes(".."))return s;throw Error("Media harus berasal dari upload website.")}
const imageUrl=(v:unknown)=>{const s=mediaUrl(v);if(s&&!/\.(png|jpe?g|webp|gif|avif|bmp)$/i.test(s))throw Error("Pilih file gambar yang valid.");return s};
const color=(v:unknown)=>/^#[a-f0-9]{6}$/i.test(str(v,7))?str(v,7):"#d4af54";
function arr(v:unknown,max:number){if(!Array.isArray(v))return [];if(v.length>max)throw Error("Jumlah item melebihi batas penyimpanan.");return v.map(obj)}
function distinct<T extends {id:string}>(items:T[]){if(new Set(items.map(x=>x.id)).size!==items.length)throw Error("ID item ganda.");return items}
export function normalizeContent(v:unknown):ShowcaseContent{
 const x=obj(v),textKeys=["title","description","name","motto","founded","location","about","history","vision","mission","categoryId","label","customLabel"] as const;
 const result={...blankContent}; for(const k of textKeys)result[k]=str(x[k],["about","history","vision","mission","description"].includes(k)?6000:180);
 result.logo=imageUrl(x.logo);result.banner=imageUrl(x.banner);result.labelIcon=imageUrl(x.labelIcon);result.labelColor=color(x.labelColor);
 result.showCategory=x.showCategory===true;result.consentConfirmed=x.consentConfirmed===true;const profileList=(v:unknown)=>Array.isArray(v)?Array.from(new Set(v.filter((k):k is ProfileKey=>profileKeys.includes(k as ProfileKey)))):[];result.profileOrder=Array.from(new Set([...profileList(x.profileOrder),...profileKeys]));result.hiddenProfile=profileList(x.hiddenProfile);result.partnershipConfirmed=x.partnershipConfirmed===true;result.detail=x.detail===true;result.autoplay=x.autoplay===true;result.seconds=integer(x.seconds,3,60,7);
 result.media=distinct(arr(x.media,50).map(m=>({id:id(m.id),kind:m.kind==="video"?"video":"image",url:mediaUrl(m.url),caption:str(m.caption,500),link:externalUrl(m.link),visible:m.visible!==false}))) as Media[];
 result.bios=distinct(arr(x.bios,100).map(b=>({id:id(b.id),type:str(b.type,100),title:str(b.title,180),text:str(b.text,6000),photo:imageUrl(b.photo),role:str(b.role,180),link:externalUrl(b.link),icon:imageUrl(b.icon),visible:b.visible!==false})));
 result.links=distinct(arr(x.links,50).map(l=>({id:id(l.id),platform:platforms.includes(l.platform as typeof platforms[number])?String(l.platform):"Custom",label:str(l.label,120),url:externalUrl(l.url),icon:imageUrl(l.icon),color:color(l.color),visible:l.visible!==false,primary:l.primary===true})));
 for(const m of result.media)if(m.url&&((m.kind==="video")!==/\.(mp4|webm)$/i.test(m.url)))throw Error("Jenis media tidak sesuai dengan file.");
 return result;
}
const date=(v:unknown)=>{const s=str(v,40);if(!s)return "";const n=Date.parse(s);if(!Number.isFinite(n))throw Error("Tanggal tidak valid.");return new Date(n).toISOString()};
export function normalizeAd(v:unknown):ShowcaseAd{
 const x=obj(v),startsAt=date(x.startsAt),endsAt=date(x.endsAt);if(startsAt&&endsAt&&startsAt>=endsAt)throw Error("Tanggal berakhir harus setelah tanggal mulai.");
 const memberId=Number(x.memberId);const status=x.status==="published"||x.status==="inactive"?x.status:"draft";
 return {id:id(x.id),internalName:str(x.internalName,180)||"Iklan baru",memberId:Number.isSafeInteger(memberId)&&memberId>0?memberId:null,status,startsAt,endsAt,priority:integer(x.priority,-100000,100000),sortOrder:integer(x.sortOrder,-100000,100000),content:normalizeContent(x.content)};
}
export function normalizeConfig(v:unknown):ShowcaseConfig{const x=obj(v),whatsapp=str(x.whatsapp,35).replace(/[\s()+-]/g,"");if(whatsapp&&!/^[1-9]\d{7,14}$/.test(whatsapp))throw Error("WhatsApp wajib format internasional, contoh 62815...");return {whatsapp:whatsapp||defaultConfig.whatsapp,categories:distinct(arr(x.categories,150).map(c=>({id:id(c.id),name:str(c.name,100)}))).filter(c=>c.name)}}
export function displayStatus(ad:ShowcaseAd,now=new Date().toISOString()){if(ad.status==="draft")return "Draft";if(ad.status==="inactive")return "Nonaktif";if(ad.endsAt&&ad.endsAt<=now)return "Berakhir";if(ad.startsAt&&ad.startsAt>now)return "Terjadwal";return "Aktif"}
export function publicContent(ad:ShowcaseAd,config:ShowcaseConfig,memberActive:boolean):PublicShowcase|null{
 const c=ad.content,content={...c,media:c.media.filter(x=>x.visible&&x.url),bios:c.bios.filter(x=>x.visible&&(x.title||x.text||x.photo||x.role||x.link||x.icon)),links:c.links.filter(x=>x.visible&&x.url)};
 for(const k of c.hiddenProfile||[])content[k]="";
 const category=c.showCategory?config.categories.find(x=>x.id===c.categoryId)?.name||"":"";
 const chosen=c.label==="Custom Label"?c.customLabel:c.label;
 const reserved=labels.find(x=>x.toLowerCase()===chosen.toLowerCase())||chosen;
 const partnership=["Sponsor","Premium Sponsor","Official Partner","Media Partner"].includes(reserved);
 const label=reserved==="Official Member"?(memberActive?reserved:""):partnership&&!c.partnershipConfirmed?"":c.label==="Custom Label"||labels.includes(c.label)?chosen:"";
 if(!label)content.labelIcon="";
 const hasInfo=!!(c.name||c.title||c.description||c.logo||c.banner||c.motto||content.founded||content.location||content.about||content.history||content.vision||content.mission||content.media.length||content.bios.length||content.links.length);
 if(!hasInfo)return null;
 // The home card has the media and concise profile; biodata-only ads need a usable detail or summary.
 return {id:ad.id,category,label,content};
}
export function validMetric(ad:PublicShowcase,key:string){
 if(key==="view")return true;if(key==="detail")return ad.content.detail;
 if(!/^(link|bio|media):[a-zA-Z0-9_-]{1,80}$/.test(key))return false;
 const [kind,entry]=key.split(":");
 if(kind==="link")return ad.content.links.some(x=>x.id===entry&&x.url);
 if(kind==="bio")return ad.content.bios.some(x=>x.id===entry&&x.link);
 if(kind==="media")return ad.content.media.some(x=>x.id===entry&&x.link);
 return false;
}
