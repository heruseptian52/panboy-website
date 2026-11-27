export type Block={title:string;description:string;button:string;href:string;menu:boolean;enabled:boolean;slug?:string};
export type BuilderState={blocks:Block[];version:string;history:{version:string;blocks:Block[]}[]};
export const emptyBuilder:BuilderState={blocks:[],version:"",history:[]};
export function validLink(value:string){
 if(!value)return true;
 if(/^\/(?!\/)[^\\\s]*$/.test(value))return true;
 if(/^#[a-zA-Z0-9_-]+$/.test(value))return true;
 try {const u=new URL(value);return u.protocol==="https:"&&!u.username&&!u.password;}catch{return false;}
}
export function parseBlocks(input:unknown):Block[]{
 if(!Array.isArray(input)||input.length>30)throw new Error("Maksimal 30 section.");
 const used=new Set<string>();
 return input.map(b=>{
  if(!b||typeof b!=="object")throw new Error("Data tidak valid.");
  const title=typeof b.title==="string"?b.title.trim():"",description=typeof b.description==="string"?b.description.trim():"",button=typeof b.button==="string"?b.button.trim():"",href=typeof b.href==="string"?b.href.trim():"";
  if(!title||title.length>100||description.length>2000||button.length>60||href.length>1000||!validLink(href))throw new Error("Periksa judul, panjang isi, dan link HTTPS atau link internal.");
  const slug=typeof b.slug==="string"?b.slug.trim():"";
  if(slug&&(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>80||used.has(slug)))throw new Error("Alamat halaman harus unik dan menggunakan huruf kecil, angka, atau tanda hubung.");
  if(slug)used.add(slug);
  return {title,description,button,href,menu:b.menu===true,enabled:b.enabled===true,slug};
 });
}
