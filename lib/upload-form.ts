/** Image upload with consistent chunk protocol, original query parameters, cancellation and retry. */
export async function uploadForm(url: string, options: RequestInit): Promise<Response> {
  const form = options.body;
  if (!(form instanceof FormData)) return fetch(url, options);
  let file = [...form.values()].find(value => value instanceof File) as File | undefined;
  if (!file) return fetch(url, options);
  const endpoint = new URL(url, location.origin);
  const signal=options.signal;
  if(typeof createImageBitmap==="function"&&file.type==="image/jpeg"&&file.size>2*1024*1024&&/\/(?:admin\/upload|uploads\/team-logo)$/.test(endpoint.pathname)){
    try{const bitmap=await createImageBitmap(file);try{const scale=Math.min(1,2400/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement("canvas");canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);const ctx=canvas.getContext("2d");if(ctx){ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",.9));if(blob&&blob.size<file.size)file=new File([blob],file.name,{type:"image/jpeg"})}}finally{bitmap.close()}}catch{}
  }
  function target(action:string,extra:Record<string,string>={}) {
    const u=new URL(endpoint);u.searchParams.set("action",action);for(const [k,v] of Object.entries(extra))u.searchParams.set(k,v);return u.toString();
  }
  async function json(response:Response) {
    const body=await response.json().catch(()=>null);
    if(!response.ok||!body) throw Error(body?.error||(response.status===413?"File melewati batas server.":`Upload gagal (${response.status}). Coba lagi.`));
    return body;
  }
  async function retryChunk(u:string,body:Blob){
    let last:unknown;
    for(let attempt=0;attempt<3;attempt++){
      if(signal?.aborted)throw new DOMException("Upload dibatalkan","AbortError");
      let r:Response|undefined;try{r=await fetch(u,{method:"POST",body,signal,credentials:options.credentials})}catch(e){last=e;if(signal?.aborted)throw e}if(r){if(![408,429,500,502,503,504].includes(r.status))return json(r);last=Error(`Koneksi upload (${r.status})`)}
      if(attempt<2)await new Promise(resolve=>setTimeout(resolve,300*(attempt+1)));
    }throw last;
  }
  try {
  const init=await json(await fetch(target("init"),{method:"POST",body:JSON.stringify({size:file.size,name:file.name,type:file.type}),headers:{"Content-Type":"application/json"},signal,credentials:options.credentials}));
  const count=Math.ceil(file.size/init.chunkSize);
  if(!init.uploadId||!Number.isFinite(count)||count<1||count>1000)throw Error("Sesi upload tidak valid.");
  const progress=(percent:number)=>window.dispatchEvent(new CustomEvent("panboy-upload-progress",{detail:{file:file.name,percent}}));
  progress(0);
  try{
    for(let index=0;index<count;index++){await retryChunk(target("chunk",{uploadId:init.uploadId,index:String(index)}),file.slice(index*init.chunkSize,(index+1)*init.chunkSize));progress(Math.min(99,Math.round((index+1)/count*100)))}
    const response=await fetch(target("complete",{uploadId:init.uploadId}),{method:"POST",signal,credentials:options.credentials});await json(response.clone());progress(100);return response;
  }catch(e){if(signal?.aborted)void fetch(target("cancel",{uploadId:init.uploadId}),{method:"POST"}).catch(()=>{});window.dispatchEvent(new CustomEvent("panboy-upload-error",{detail:{file:file.name,message:e instanceof Error?e.message:"Upload gagal."}}));throw e}
  } catch(e){window.dispatchEvent(new CustomEvent("panboy-upload-error",{detail:{file:file.name,message:e instanceof Error?e.message:"Upload gagal."}}));return Response.json({error:e instanceof Error?e.message:"Upload gagal."},{status:400})}
}
