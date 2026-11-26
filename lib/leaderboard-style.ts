export const styleIds=["original","capsule","official","championship","futuristic","minimalist","split","glass"] as const;
export type StyleId=typeof styleIds[number];
export type BoardStyle={header:string;rank:string;row:string;point:string;text:string;border:string;total:string;gradientEnd:string;gradient:boolean;opacity:number;radius:number;borderWidth:number;height:number;spacing:number;highlight:boolean};
const base:BoardStyle={header:"#a67c31",rank:"#d7b35c",row:"#161d2b",point:"#263449",text:"#ffffff",border:"#8a744b",total:"#ffdf86",gradientEnd:"#10131b",gradient:false,opacity:1,radius:0,borderWidth:1,height:84,spacing:0,highlight:false};
export const styles: {id:StyleId;name:string;description:string;design:BoardStyle}[]=[
 {id:"original",name:"Original",description:"Bentuk lama dengan baris standar.",design:{...base,header:"#211707",rank:"#087fc4",row:"#080808",point:"#080808",border:"#9b6a32",total:"#f2c354",borderWidth:0}},
 {id:"capsule",name:"Modern Capsule",description:"Kapsul penuh dengan badge poin membulat.",design:{...base,header:"#b6d34f",rank:"#567023",row:"#184e37",point:"#284e37",gradientEnd:"#102d24",text:"#ffffff",border:"#a5c658",total:"#e5ff98",radius:32,height:78,spacing:2}},
 {id:"official",name:"Official Esports",description:"Panel persegi dengan blok rank dan poin tegas.",design:{...base,header:"#3733a6",rank:"#615be9",row:"#111c3e",point:"#28346b",border:"#6b69c8",total:"#ffdc72",radius:0,height:86}},
 {id:"championship",name:"Championship",description:"Medali Top 1–3 dan baris premium.",design:{...base,header:"#a65d20",rank:"#9b6828",row:"#35271a",point:"#694a25",gradientEnd:"#140e0a",gradient:true,highlight:true,borderWidth:2,radius:4}},
 {id:"futuristic",name:"Futuristic",description:"Sudut dipotong dan garis geometris.",design:{...base,header:"#006b8c",rank:"#075b76",row:"#102c3c",point:"#063b51",border:"#30d6e2",total:"#78f4ff",gradient:true,gradientEnd:"#0d1523",radius:8}},
 {id:"minimalist",name:"Minimalist Pro",description:"Baris ringan dengan garis bawah.",design:{...base,header:"#212733",rank:"#1b222b",row:"#141923",point:"#141923",border:"#57616f",total:"#ffffff",opacity:.82,borderWidth:1,height:80}},
 {id:"split",name:"Split Panel",description:"Rank, nama dan setiap kolom poin terpisah.",design:{...base,header:"#8e3940",rank:"#bd5650",row:"#282331",point:"#50343b",border:"#b46c69",total:"#ffd4a4",radius:7,height:80,spacing:4}},
 {id:"glass",name:"Glass Premium",description:"Panel transparan, garis tipis dan glossy.",design:{...base,header:"#557899",rank:"#52748c",row:"#263b4d",point:"#405d73",border:"#abc6d9",total:"#e5f6ff",gradient:true,gradientEnd:"#141923",opacity:.65,radius:12,borderWidth:1,height:83}},
];
export const isStyleId=(v:unknown):v is StyleId=>styleIds.includes(v as StyleId);
export const stylePreset=(id:unknown)=>styles.find(x=>x.id===id)||styles[0];
export function sanitizeDesign(value:unknown,id:StyleId):BoardStyle{
 const v=value&&typeof value==="object"?value as Partial<BoardStyle>:{},d={...stylePreset(id).design};
 for(const key of ["header","rank","row","point","text","border","total","gradientEnd"] as const)if(typeof v[key]==="string"&&/^#[0-9a-f]{6}$/i.test(v[key]!))d[key]=v[key]!;
 for(const [key,min,max] of [["opacity",0,1],["radius",0,48],["borderWidth",0,8],["height",30,100],["spacing",0,25]] as const){const n=Number(v[key]);if(Number.isFinite(n))d[key]=Math.max(min,Math.min(max,n))}
 for(const key of ["gradient","highlight"] as const)if(typeof v[key]==="boolean")d[key]=v[key]!;
 return d;
}
export type CatalogEntry={id:StyleId;owner:boolean;others:boolean};
export type TemplateCatalog={entries:CatalogEntry[];defaultId:StyleId};
export const defaultCatalog:TemplateCatalog={entries:styleIds.map(id=>({id,owner:true,others:true})),defaultId:"original"};
export function sanitizeCatalog(x:unknown):TemplateCatalog{
 const v=x as Partial<TemplateCatalog>;if(!v||!Array.isArray(v.entries)||!isStyleId(v.defaultId))throw Error("Konfigurasi template tidak valid.");
 const entries=v.entries.map(e=>({id:e.id,owner:e.owner===true,others:e.others===true}));
 if(entries.length!==styleIds.length||new Set(entries.map(e=>e.id)).size!==styleIds.length||entries.some(e=>!isStyleId(e.id)))throw Error("Daftar template tidak lengkap.");
 if(!entries.some(e=>e.owner)||!entries.some(e=>e.others))throw Error("Setiap jenis admin harus memiliki minimal satu template aktif.");
 if(!entries.some(e=>e.id===v.defaultId&&(e.owner||e.others)))throw Error("Template default harus tersedia untuk minimal satu jenis admin.");
 return {entries,defaultId:v.defaultId};
}
export function visibleStyles(c:TemplateCatalog,owner:boolean){return c.entries.filter(e=>owner?e.owner:e.others).map(e=>e.id)}
export function roleDefault(c:TemplateCatalog,owner:boolean){const allowed=visibleStyles(c,owner);return allowed.includes(c.defaultId)?c.defaultId:allowed[0]||"original"}
export function canChooseStyle(c:TemplateCatalog,owner:boolean,next:unknown,existing:unknown){return isStyleId(next)&&(next===existing||visibleStyles(c,owner).includes(next))}
export const podiumColors=["#d7ad42","#b7c7dd","#b87945"];
export function designRowHeight(d:BoardStyle,gap:number){return Math.max(1,gap*Math.max(.15,(d.height-d.spacing)/100))}
export function designRadius(id:StyleId,d:BoardStyle,height:number){return id==="capsule"?Math.min(height/2,Math.max(0,d.radius)):Math.min(height/2,d.radius)}
export function designCSS(id:StyleId,d:BoardStyle,part:"header"|"row"|"rank"|"point",rank=0):React.CSSProperties{
 const top=d.highlight&&rank>0&&rank<=3?podiumColors[rank-1]:null,fill=part==="header"?d.header:part==="rank"?top||d.rank:part==="point"?d.point:d.row;
 const hex=(color:string)=>color+Math.round(d.opacity*255).toString(16).padStart(2,"0");
 return {background:d.gradient&&(part==="row"||part==="header")?`linear-gradient(110deg,${hex(fill)},${hex(d.gradientEnd)})`:hex(fill),border:part==="row"&&id==="minimalist"?undefined:`${d.borderWidth}px solid ${top||d.border}`,borderBottom:id==="minimalist"?`${Math.max(1,d.borderWidth)}px solid ${d.border}`:undefined,borderRadius:id==="capsule"?999:d.radius,clipPath:id==="futuristic"?"polygon(5% 0,100% 0,95% 100%,0 100%)":undefined,color:d.text,boxShadow:id==="glass"?"inset 0 1px 0 #ffffff30":undefined};
}
