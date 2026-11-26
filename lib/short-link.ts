/** Only explicitly supported Panboy destinations; never an arbitrary redirect. */
export function normalizeShortDestination(value:unknown):string|null{
 if(typeof value!=="string"||value.length>500||!value.startsWith("/")||value.startsWith("//")||value.includes("\\")||/[\r\n]/.test(value))return null;
 try{const url=new URL(value,"https://panboy.invalid");if(url.origin!=="https://panboy.invalid"||url.hash)return null;
  if(/^\/overlay\/(?:live-leaderboard|leaderboard)\/[a-f0-9]{20,128}$/i.test(url.pathname)&&!url.search)return url.pathname;
  if(/^\/showcase\/[a-zA-Z0-9_-]{1,80}$/.test(url.pathname)&&!url.search)return url.pathname;
  if(url.pathname==="/data-event"){const event=url.searchParams.get("event"),token=url.searchParams.get("token"),invite=url.searchParams.get("invite");if(!event||!/^\d{1,12}$/.test(event)||Number(event)<1||!!token===!!invite||[...url.searchParams.keys()].length!==2)return null;
    const secret=token||invite||"";if(!/^[a-zA-Z0-9._-]{20,160}$/.test(secret))return null;return "/data-event?"+new URLSearchParams({event,[token?"token":"invite"]:secret});
  }
 }catch{}return null;
}
export function shortCode(){const bytes=crypto.getRandomValues(new Uint8Array(16));return btoa(String.fromCharCode(...bytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
export const validShortCode=(value:string)=>/^[a-zA-Z0-9_-]{22}$/.test(value);
