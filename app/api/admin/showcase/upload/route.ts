import {env} from "cloudflare:workers";
import {requirePermission} from "../../../../../lib/admin-auth";
import {chunkedImage} from "../../../../../lib/chunked-image";
import {detectUploadedImage} from "../../../../../lib/uploaded-image";
export async function POST(request:Request){
 if(!await requirePermission(request,"appearance"))return Response.json({error:"Tidak diizinkan."},{status:403});
 if(new URL(request.url).searchParams.has("action"))return chunkedImage(request,"showcase-media",10*1024*1024,true);
 const form=await request.formData(),file=form.get("poster");
 if(!(file instanceof File)||!file.size||file.size>10*1024*1024)return Response.json({error:"Pilih gambar maksimal 10 MB."},{status:400});
 const bytes=new Uint8Array(await file.arrayBuffer()),image=detectUploadedImage(bytes);
 if(!image)return Response.json({error:"File bukan gambar yang valid."},{status:400});
 const key="showcase-media/"+crypto.randomUUID()+"."+image.extension;
 await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:image.contentType,cacheControl:"private, no-store"}});
 return Response.json({url:"/api/images/"+encodeURIComponent(key)});
}
