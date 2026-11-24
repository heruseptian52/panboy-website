import {env} from "cloudflare:workers";
export function driveFolderId(value:string){
  try{const url=new URL(value);if(url.hostname!=="drive.google.com")return "";return /^[-\w]{12,}$/.exec(url.pathname.match(/\/folders\/([-\w]+)/)?.[1]||url.searchParams.get("id")||"")?.[0]||""}catch{return ""}
}
export async function syncRosterLogo(key:string,name:string,folderUrl:string,teamName:string){
  const folder=driveFolderId(folderUrl);
  if(!folder)return {status:"not_connected",fileId:""};
  const secrets=env as unknown as Record<string,string|undefined>,clientId=secrets.GOOGLE_DRIVE_CLIENT_ID,clientSecret=secrets.GOOGLE_DRIVE_CLIENT_SECRET,refreshToken=secrets.GOOGLE_DRIVE_REFRESH_TOKEN;
  if(!clientId||!clientSecret||!refreshToken)return {status:"not_connected",fileId:""};
  try{
    const tokenResponse=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,refresh_token:refreshToken,grant_type:"refresh_token"})});
    if(!tokenResponse.ok)throw new Error(`OAuth ${tokenResponse.status}`);
    const token=await tokenResponse.json() as {access_token?:string};if(!token.access_token)throw new Error("No access token");
    const object=await env.BUCKET.get(key);if(!object)throw new Error("Logo tidak ditemukan");
    const mime=object.httpMetadata?.contentType||"image/png",boundary=`panboy_${crypto.randomUUID()}`;
    const safeName=`${teamName.trim().slice(0,70)} - ${name.trim().slice(0,70)}`;
    const payload=new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({name:safeName,parents:[folder]})}\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`,await object.arrayBuffer(),`\r\n--${boundary}--`]);
    const upload=await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id&supportsAllDrives=true",{method:"POST",headers:{Authorization:`Bearer ${token.access_token}`,"Content-Type":`multipart/related; boundary=${boundary}`},body:payload});
    if(!upload.ok)throw new Error(`Drive ${upload.status}`);
    const result=await upload.json() as {id?:string};if(!result.id)throw new Error("No file ID");
    return {status:"synced",fileId:result.id};
  }catch(error){console.error("Roster logo Drive sync failed",error);return {status:"failed",fileId:""}}
}
