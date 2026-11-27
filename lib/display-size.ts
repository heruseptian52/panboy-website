export function displaySize(bytes:number|null, minimum:"KB"|"MB"="KB") {
 if(bytes===null || !Number.isFinite(bytes) || bytes<0)return "Tidak tersedia";
 const units=["KB","MB","GB","TB"];
 let index=minimum==="MB"?1:0;
 while(index<units.length-1 && bytes>=1024**(index+2))index++;
 const value=bytes/1024**(index+1);
 return value>0&&value<.01?"< 0,01 "+units[index]:value.toLocaleString("id-ID",{maximumFractionDigits:2})+" "+units[index];
}
