"use client";

export async function removeLogoBackground(file:File):Promise<File>{
  const bitmap=await createImageBitmap(file),max=1600,scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
  const width=Math.max(1,Math.round(bitmap.width*scale)),height=Math.max(1,Math.round(bitmap.height*scale));
  const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
  const context=canvas.getContext("2d",{willReadFrequently:true});if(!context)throw new Error("Gambar tidak dapat diproses");
  context.drawImage(bitmap,0,0,width,height);bitmap.close();
  const image=context.getImageData(0,0,width,height),data=image.data;
  const corners=[[0,0],[width-1,0],[0,height-1],[width-1,height-1]].map(([x,y])=>{const i=(y*width+x)*4;return [data[i],data[i+1],data[i+2]]});
  const bg=corners.reduce((best,color)=>{const score=corners.reduce((n,c)=>n+Math.hypot(c[0]-color[0],c[1]-color[1],c[2]-color[2]),0);return score<best.score?{color,score}:best},{color:corners[0],score:Infinity}).color;
  const seen=new Uint8Array(width*height),queue=new Int32Array(width*height);let head=0,tail=0;
  const push=(x:number,y:number)=>{if(x<0||y<0||x>=width||y>=height)return;const p=y*width+x;if(seen[p])return;const i=p*4,d=Math.hypot(data[i]-bg[0],data[i+1]-bg[1],data[i+2]-bg[2]);if(d>72)return;seen[p]=1;queue[tail++]=p;data[i+3]=d<38?0:Math.round(255*(d-38)/34)};
  for(let x=0;x<width;x++){push(x,0);push(x,height-1)}for(let y=0;y<height;y++){push(0,y);push(width-1,y)}
  while(head<tail){const p=queue[head++],x=p%width,y=Math.floor(p/width);push(x-1,y);push(x+1,y);push(x,y-1);push(x,y+1)}
  context.putImageData(image,0,0);const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error("Gambar tidak dapat disimpan")),"image/png"));
  return new File([blob],`${file.name.replace(/\.[^.]+$/,"")}-transparent.png`,{type:"image/png"});
}
