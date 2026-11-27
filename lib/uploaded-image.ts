export type UploadedImage={extension:"jpg"|"png"|"webp"|"gif"|"avif"|"bmp";contentType:string};

const starts=(bytes:Uint8Array,signature:number[])=>signature.every((value,index)=>bytes[index]===value);
const ascii=(bytes:Uint8Array,start:number,length:number)=>String.fromCharCode(...bytes.slice(start,start+length));

export function detectUploadedImage(bytes:Uint8Array):UploadedImage|null{
  if(starts(bytes,[0xff,0xd8,0xff]))return{extension:"jpg",contentType:"image/jpeg"};
  if(starts(bytes,[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))return{extension:"png",contentType:"image/png"};
  if(ascii(bytes,0,4)==="RIFF"&&ascii(bytes,8,4)==="WEBP")return{extension:"webp",contentType:"image/webp"};
  if(["GIF87a","GIF89a"].includes(ascii(bytes,0,6)))return{extension:"gif",contentType:"image/gif"};
  if(ascii(bytes,0,2)==="BM")return{extension:"bmp",contentType:"image/bmp"};
  if(ascii(bytes,4,4)==="ftyp"&&["avif","avis"].includes(ascii(bytes,8,4)))return{extension:"avif",contentType:"image/avif"};
  return null;
}
