"use client";
import {useEffect,useState} from "react";
import "./style.css";
import {teamWhatsAppUrl} from "../../lib/roster-whatsapp";
import type {RosterOptions} from "../../lib/roster-options";
type Event={options:RosterOptions;id:number;title:string;deadline:string;stopped:number;maxPlayers:number};type Player={nick:string;playerId:string};
type Initial={data:Event & {teamName?:string;contactPhone?:string;players?:Player[];zones?:string[];logoUrl?:string;logoName?:string};token:string;invite:string};
export default function RosterForm({initial,initialError}:{initial?:Initial;initialError?:string}={}){const [zones,setZones]=useState<string[]>(initial?.data.zones||["","",""]),[logoIsImage,setLogoIsImage]=useState(false),[logoName,setLogoName]=useState(initial?.data.logoName||""),[logoUrl,setLogoUrl]=useState(initial?.data.logoUrl||""),[uploadToken,setUploadToken]=useState(""),[uploading,setUploading]=useState(false),[uploadProgress,setUploadProgress]=useState(0),[uploadError,setUploadError]=useState(""),[events,setEvents]=useState<Event[]>(initial?[initial.data]:[]),[eventId,setEventId]=useState(initial?.data.id||0),[teamName,setTeam]=useState(initial?.data.teamName||""),[contactPhone,setContactPhone]=useState(initial?.data.contactPhone||""),[players,setPlayers]=useState<Player[]>(initial?.data.players?.length?initial.data.players:Array.from({length:Math.min(4,initial?.data.maxPlayers||4)},()=>({nick:"",playerId:""}))),[message,setMessage]=useState(initialError||""),[busy,setBusy]=useState(false),[editToken,setToken]=useState(initial?.token||""),[inviteToken,setInviteToken]=useState(initial?.invite||"");
const [directLink,setDirectLink]=useState(!!initial||!!initialError),[loading,setLoading]=useState(!initial&&!initialError),[redirectUrl,setRedirectUrl]=useState("");
useEffect(()=>{
  if(initial||initialError)return;
  const params=new URLSearchParams(location.search);
  const event=params.get("event"),token=params.get("token")||"",invite=params.get("invite")||"";
  const load=async()=>{
    setDirectLink(event!==null);
    if(event!==null && !/^[1-9]\d*$/.test(event))throw new Error("Tautan event tidak valid.");
    const search=new URLSearchParams();
    if(event)search.set("id",event);
    if(token)search.set("token",token);
    else if(invite)search.set("invite",invite);
    const response=await fetch(`/api/roster-events?${search}`,{cache:"no-store"});
    const data=await response.json().catch(()=>({error:response.status===403?"Akses ditolak oleh server. Coba buka kembali tautan atau hubungi admin event.":"Tautan gagal dimuat. Coba lagi."}));
    if(!response.ok)throw new Error(data.error||"Tautan gagal dimuat.");
    if(!event){setEvents(data);return}
    setEvents([data]);setEventId(data.id);setToken(token);setInviteToken(invite);setTeam(data.teamName||"");
    if(token){
      setContactPhone(data.contactPhone||"");
      setPlayers(data.players?.length?data.players:[{nick:"",playerId:""}]);
      setZones(data.zones?.length?data.zones:["","",""]);
      setLogoUrl(data.logoUrl||"");setLogoName(data.logoName||"");
    }else setPlayers(Array.from({length:Math.min(4,data.maxPlayers)},()=>({nick:"",playerId:""})));
  };
  load().catch(error=>setMessage(error.message||"Daftar event gagal dimuat.")).finally(()=>setLoading(false));
},[]);
async function uploadLogo(file:File|undefined){
  setUploadError("");setUploadProgress(0);
  if(!file)return;
  if(file.size>5*1024*1024){setUploadError("File maksimal 5 MB.");return}
  if(!eventId){setUploadError("Pilih event lebih dulu.");return}
  setUploading(true);
  const parse=async(response:Response)=>{const raw=await response.text();let result:Record<string,any>;try{result=JSON.parse(raw)}catch{throw new Error(response.status===413?"Upload terlalu besar untuk sekali kirim. Coba lagi.":`Server upload gagal (${response.status}). Coba lagi.`)}if(!response.ok)throw new Error(result.error||"Upload gagal.");return result};
  try{
    const init=await parse(await fetch("/api/roster-events/upload?stage=init",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({eventId,fileName:file.name,size:file.size,inviteToken,editToken})}));
    const total=Math.ceil(file.size/init.chunkSize);
    for(let index=0;index<total;index++){
      const part=file.slice(index*init.chunkSize,Math.min(file.size,(index+1)*init.chunkSize));
      await parse(await fetch("/api/roster-events/upload?stage=chunk",{method:"POST",headers:{"x-upload-token":init.token,"x-event-id":String(eventId),"x-chunk-index":String(index)},body:part}));setUploadProgress(Math.min(98,Math.round((index+1)/total*98)));
    }
    setUploadProgress(99);
    const finish=await parse(await fetch("/api/roster-events/upload?stage=finish",{method:"POST",headers:{"x-upload-token":init.token,"x-event-id":String(eventId)} }));
    setUploadToken(finish.uploadToken);setLogoUrl(finish.previewUrl);setLogoName(finish.fileName);setLogoIsImage(!!finish.isImage);setUploadProgress(100);
  }catch(e){setUploadError((e as Error).message)}finally{setUploading(false)}
}
const selected=events.find(e=>e.id===eventId),closed=!selected||!!selected.stopped||Date.now()>=Date.parse(selected.deadline);
async function save(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage("");try{const response=await fetch("/api/roster-events",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({eventId,teamName,contactPhone,zones,players:players.filter(p=>p.nick.trim()||p.playerId.trim()),editToken,inviteToken,uploadToken})});const result=await response.json();if(!response.ok)throw new Error(result.error||"Gagal menyimpan");if(!editToken){const target=result.groupUrl||teamWhatsAppUrl(result.teamName||teamName);setRedirectUrl(target);setTimeout(()=>location.assign(target),350);return}const params=new URLSearchParams({event:String(eventId),token:result.editToken});location.assign(`/data-event/berhasil?${params.toString()}`)}catch(error){setMessage((error as Error).message)}finally{setBusy(false)}}
if(redirectUrl)return <main className="roster-page"><section className="roster-panel roster-success" role="status"><div className="success-mark">✓</div><h1>BERHASIL</h1><p>Mohon ditunggu, Anda sedang diarahkan ke WhatsApp event...</p><progress className="roster-redirect-progress"/><a className="success-back" href={redirectUrl} rel="noreferrer">Buka WhatsApp jika belum dialihkan</a></section></main>;
return <main className="roster-page"><header><a href="/">← BERANDA</a><strong>PANBOY COMMUNITY</strong><a href="/admin/data-event">ADMIN</a></header><section className="roster-panel"><span className="eyebrow">PENDATAAN EVENT</span><h1>Data team & player</h1><p>Isi data team untuk event yang dituju. Simpan tautan edit setelah mengirim data.</p><form onSubmit={save}><label>Nama event<select value={eventId} disabled={loading||uploading||busy||directLink} onChange={e=>{setEventId(Number(e.target.value));setToken("");setZones(["","",""]);setTeam("");setContactPhone("");setPlayers(Array.from({length:4},()=>({nick:"",playerId:""})));setMessage("");setLogoUrl("");setLogoName("");setLogoIsImage(false);setUploadToken("");setUploadError("")}} required><option value={0} disabled>{loading?"MEMUAT EVENT...":events.length?"PILIH NAMA EVENT":"BELUM ADA EVENT YANG DIBUKA"}</option>{events.map(e=><option key={e.id} value={e.id}>{e.title}</option>)}</select></label>{inviteToken&&<p className="roster-invite-note">Undangan khusus untuk <strong>{teamName}</strong>. Nama team terkunci agar data tidak masuk ke tim lain.</p>}{selected&&<div className="deadline">{closed?"PENGISIAN DITUTUP":"Batas edit"} · {new Date(selected.deadline).toLocaleString("id-ID",{timeZone:"Asia/Makassar",dateStyle:"long",timeStyle:"short"})} WITA</div>}<label>Nama team<input value={teamName} onChange={e=>setTeam(e.target.value)} placeholder="Contoh: VML VALERIUS" maxLength={80} required disabled={closed||!!inviteToken}/></label>{selected?.options.phoneEnabled&&<label>Nomor HP team<input type="tel" inputMode="tel" autoComplete="tel" value={contactPhone} onChange={e=>setContactPhone(e.target.value)} placeholder="Contoh: 081234567890" maxLength={22} required disabled={closed}/></label>}{selected?.options.playersEnabled&&<><div className="roster-heading"><h2>Nick + ID player</h2><span>Maksimal {selected?.maxPlayers??8} player</span></div>{players.map((p,i)=><div className="player-line" key={i}><b>{String(i+1).padStart(2,"0")}</b><input aria-label={`Nick player ${i+1}`} placeholder="Nick player" value={p.nick} disabled={closed} onChange={e=>setPlayers(players.map((v,j)=>j===i?{...v,nick:e.target.value}:v))}/><input aria-label={`ID player ${i+1}`} placeholder="ID PUBG Mobile" inputMode="numeric" value={p.playerId} disabled={closed} onChange={e=>setPlayers(players.map((v,j)=>j===i?{...v,playerId:e.target.value}:v))}/>{players.length>1&&<button type="button" aria-label={`Hapus player ${i+1}`} onClick={()=>setPlayers(players.filter((_,j)=>j!==i))}>×</button>}</div>)}{players.length<(selected?.maxPlayers??8)&&<button type="button" className="text-button" onClick={()=>setPlayers([...players,{nick:"",playerId:""}])} disabled={closed}>+ Tambah player</button>}</>}{selected?.options.zonesEnabled&&<fieldset><legend>Drop Zone</legend>{selected.options.maps.map((name,i)=><label key={i}>{name}<input required maxLength={100} disabled={closed} placeholder="Lokasi turun" value={zones[i]||""} onChange={e=>setZones(zones.map((v,j)=>i===j?e.target.value:v))}/></label>)}</fieldset>}{selected?.options.logoEnabled&&<div className="logo-upload"><label htmlFor="roster-logo">Upload logo team <small>({selected.options.logoRequired?"wajib":"opsional"}, maksimal 5 MB)</small></label><input id="roster-logo" type="file" disabled={closed||uploading} onChange={e=>uploadLogo(e.currentTarget.files?.[0])}/>{uploading&&<div role="status">{uploadProgress===99?"Memproses file...":`Mengupload file... ${uploadProgress}%`}<progress max="100" value={uploadProgress}/></div>}{uploadError&&<p role="alert">{uploadError}</p>}{logoUrl&&!uploading&&<div className="logo-ready">{logoIsImage&&<img src={logoUrl} alt="Pratinjau logo team"/>}<span>{uploadToken?`File ${logoName} selesai diupload, data siap dikirim.`:`File ${logoName} sudah tersimpan.`}</span></div>}</div>}<button className="primary" disabled={loading||!selected||busy||closed||uploading||(selected?.options.logoEnabled&&selected?.options.logoRequired&&!uploadToken&&!logoUrl)}>{busy?"Menyimpan...":editToken?"SIMPAN PERUBAHAN":"KIRIM DATA TEAM"}</button>{message&&<div className="notice" role="status">{message}</div>}</form></section></main>}
