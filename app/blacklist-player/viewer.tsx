"use client";
import {useEffect,useState} from "react";
type Comment={name:string;comment:string;createdAt:string};
type Entry={id:number;playerId:string;playerName:string;playerWhatsapp:string;nickname:string;reason:string;evidenceLink:string;hasEvidence:boolean;approvedAt:string;supports:number};
export default function BlacklistBrowser(){
 const [teams,setTeams]=useState<string[]>([]),[teamsError,setTeamsError]=useState(""),[items,setItems]=useState<Entry[]>([]),[q,setQ]=useState(""),[loading,setLoading]=useState(true),[error,setError]=useState(""),[submit,setSubmit]=useState(false),[support,setSupport]=useState<number|null>(null),[shownComments,setShownComments]=useState<Record<number,boolean>>({}),[comments,setComments]=useState<Record<number,Comment[]>>({}),[message,setMessage]=useState(""),[progress,setProgress]=useState(""),[saving,setSaving]=useState(false),[selectedFile,setSelectedFile]=useState(""),[whatsappUrl,setWhatsappUrl]=useState("");
 useEffect(()=>{const controller=new AbortController();fetch("/api/blacklist/teams",{signal:controller.signal}).then(async r=>{if(!r.ok)throw Error("Daftar tim belum bisa dimuat.");return r.json()}).then(data=>{setTeams(data.teams||[]);setTeamsError("")}).catch(()=>{if(!controller.signal.aborted)setTeamsError("Pilihan tim belum bisa dimuat. Muat ulang halaman.")});return()=>controller.abort()},[]);
 const teamPicker=(required=true)=><select name="team" required={required} defaultValue=""><option value="" disabled>{teamsError||"Pilih nama tim member"}</option>{teams.map(name=><option key={name} value={name}>{name}</option>)}</select>;
 useEffect(()=>{const controller=new AbortController(),timer=setTimeout(async()=>{try{setLoading(true);const r=await fetch(`/api/blacklist?q=${encodeURIComponent(q)}`,{signal:controller.signal});if(!r.ok)throw Error("Daftar belum bisa dimuat.");setItems((await r.json()).items);setError("")}catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Gagal memuat daftar.")}finally{if(!controller.signal.aborted)setLoading(false)}},q?250:0);return()=>{clearTimeout(timer);controller.abort()}},[q]);
 async function add(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(saving)return;setMessage("");setWhatsappUrl("");const form=e.currentTarget,data=new FormData(form),file=data.get("evidenceFile");
  if(file instanceof File && file.size>5*1024*1024){setMessage("File bukti terlalu besar. Maksimal 5 MB.");return}
  setSaving(true);
  try{
   if(file instanceof File && file.size){
    setProgress(`Menyiapkan upload 0 / ${(file.size/1048576).toFixed(2)} MB`);
    const init=await fetch("/api/blacklist/upload?action=init",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({team:data.get("team"),memberPhone:data.get("memberPhone"),size:file.size,type:file.type})});
    const info=await init.json();if(!init.ok)throw Error(info.error||"Gagal menyiapkan upload.");
    for(let index=0;index<info.parts;index++){
     const start=index*info.chunkSize,end=Math.min(start+info.chunkSize,file.size);
     const r=await fetch(`/api/blacklist/upload?action=chunk&uploadId=${encodeURIComponent(info.uploadId)}&index=${index}`,{method:"POST",headers:{"Content-Type":"application/octet-stream"},body:file.slice(start,end)});
     if(!r.ok){const body=await r.json();throw Error(body.error||"Upload terputus.")}
     setProgress(`Mengunggah ${(end/1048576).toFixed(2)} / ${(file.size/1048576).toFixed(2)} MB (${Math.round(end/file.size*100)}%)`);
    }
    setProgress(`Terkirim ${(file.size/1048576).toFixed(2)} MB. Menyelesaikan file...`);
    const complete=await fetch(`/api/blacklist/upload?action=complete&uploadId=${encodeURIComponent(info.uploadId)}`,{method:"POST"});
    const result=await complete.json();if(!complete.ok)throw Error(result.error||"File belum selesai diproses.");
    data.set("uploadId",info.uploadId);
    setProgress(`Upload selesai ${(file.size/1048576).toFixed(2)} MB. Menyimpan pengajuan...`);
   }else setProgress("Menyimpan pengajuan...");
   data.delete("evidenceFile");
   const response=await fetch("/api/blacklist",{method:"POST",body:data});
   let out:{error?:string;message?:string;whatsappUrl?:string}={};try{out=await response.json()}catch{}
   if(!response.ok)throw Error(out.error||`Gagal menyimpan (HTTP ${response.status}).`);
   setMessage(out.message||"Pengajuan tersimpan.");setWhatsappUrl(out.whatsappUrl||"");form.reset();setSelectedFile("");setSubmit(false);
  }catch(err){setMessage(err instanceof Error?err.message:"Gagal menyimpan pengajuan.")}finally{setSaving(false);setProgress("")}
 }
 async function endorse(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(support===null)return;
  const data=new FormData(e.currentTarget);let token=localStorage.getItem("panboy_blacklist_visitor");if(!token){token=crypto.randomUUID();localStorage.setItem("panboy_blacklist_visitor",token)}
  try{const r=await fetch(`/api/blacklist/${support}/support`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({visitorToken:token,name:data.get("name"),comment:data.get("comment")})});
   const out=await r.json();setMessage(r.ok?(out.added?"Dukungan berhasil dicatat.":"Kamu sudah mendukung player ini."):out.error||"Gagal mengirim dukungan.");
   if(r.ok){if(out.added)setItems(previous=>previous.map(i=>i.id===support?{...i,supports:i.supports+1}:i));setSupport(null);if(shownComments[support])void loadComments(support)}
  }catch{setMessage("Koneksi terputus. Coba lagi.")}
 }
 async function loadComments(id:number){try{const r=await fetch(`/api/blacklist/${id}/support`,{cache:"no-store"});if(!r.ok)throw Error();const out=await r.json();setComments(previous=>({...previous,[id]:out.comments||[]}))}catch{setMessage("Komentar belum bisa dimuat.")}}
 function toggleComments(id:number){const next=!shownComments[id];setShownComments(previous=>({...previous,[id]:next}));if(next)void loadComments(id)}
 return <><div className="blacklist-tools"><label>CARI PLAYER<input value={q} onChange={e=>setQ(e.target.value)} placeholder="Ketik ID, WhatsApp player, nama, atau nick..."/></label><button onClick={()=>{setSubmit(!submit);setSupport(null);setMessage("")}}>+ AJUKAN PLAYER</button></div>
 {message&&<p className="blacklist-message" role="status">{message}{whatsappUrl&&<a className="blacklist-wa-link" href={whatsappUrl} target="_blank" rel="noopener noreferrer">BERITAHU ADMIN VIA WHATSAPP ↗</a>}</p>}
 {submit&&<form className="blacklist-form" onSubmit={add}><h2>Ajukan Blacklist Player</h2><p>Lengkapi data player dan data pengaju pada bagian terpisah. Laporan baru ditampilkan setelah disetujui admin.</p>
 <fieldset className="blacklist-section"><legend>DATA PLAYER YANG DIBLACKLIST</legend><p>Data bagian ini dapat ditampilkan di website setelah persetujuan admin. Hanya ID player yang wajib.</p><div className="blacklist-grid"><label>NAMA PLAYER<input name="playerName" maxLength={120}/></label><label>NICK PLAYER<input name="nickname" maxLength={120}/></label><label>ID PLAYER *<input name="playerId" required maxLength={50}/></label><label>NO. WHATSAPP PLAYER<input name="playerWhatsapp" inputMode="tel" maxLength={40}/></label></div><label>ALASAN / KETERANGAN<textarea name="reason" maxLength={1500}/></label><label>LINK BUKTI<input name="evidenceLink" type="url" placeholder="https://..."/></label><label>ATAU UPLOAD BUKTI (MAKSIMAL 5 MB)<input name="evidenceFile" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={saving} onChange={e=>{const file=e.target.files?.[0];setSelectedFile(file?`${file.name} · ${(file.size/1048576).toFixed(2)} MB siap diunggah saat dikirim`:"")}}/></label>{(progress||selectedFile)&&<p className="blacklist-progress" role="status">{progress||selectedFile}</p>}</fieldset>
 <fieldset className="blacklist-section"><legend>DATA PENGAJU LAPORAN</legend><p>Bagian ini hanya terlihat oleh admin. Nomor WhatsApp pengaju boleh berbeda dari nomor yang terdaftar pada member team.</p><div className="blacklist-grid"><label>NAMA PENGAJU *<input name="reporterName" required maxLength={120}/></label><label>MEMBER TEAM *{teamPicker()}</label><label>NO. WHATSAPP PENGAJU *<input name="memberPhone" required inputMode="tel" maxLength={40}/></label></div></fieldset>
 <button type="submit" disabled={saving}>{saving?"MENGUNGGAH / MENYIMPAN...":"KIRIM KE ADMIN"}</button></form>}
 {support!==null&&<form className="blacklist-form" onSubmit={endorse}><h2>Dukung Player</h2><p>Semua pengunjung bisa memberi dukungan. Komentar disembunyikan sampai tombol tampilkan komentar dibuka.</p><label>NAMA *<input name="name" required maxLength={80} placeholder="Nama kamu"/></label><label>KOMENTAR (OPSIONAL)<textarea name="comment" maxLength={500} placeholder="Tulis dukungan atau keterangan singkat"/></label><button type="submit">KIRIM DUKUNGAN</button><button type="button" className="secondary" onClick={()=>setSupport(null)}>BATAL</button></form>}
 {error?<p role="alert">{error}</p>:loading?<p>Memuat daftar...</p>:items.length===0?<p>Belum ada player yang cocok.</p>:<div className="blacklist-list">{items.map(item=><article key={item.id} className="blacklist-card"><div className="blacklist-card-top"><div><small>DISETUJUI {new Date(item.approvedAt).toLocaleDateString("id-ID")}</small><h2>{item.nickname||item.playerName||`ID ${item.playerId}`}</h2></div><span className="blacklist-card-badge">BLACKLIST PLAYER</span></div><div className="blacklist-card-grid"><div><small>NAMA / NICK PLAYER</small><strong>{item.playerName||"—"}{item.nickname&&item.nickname!==item.playerName?` / ${item.nickname}`:""}</strong></div><div><small>ID PLAYER</small><strong>{item.playerId}</strong></div><div><small>WHATSAPP PLAYER</small><strong>{item.playerWhatsapp||"—"}</strong></div><div><small>ALASAN</small><strong>{item.reason||"—"}</strong></div></div><div className="blacklist-card-actions">{item.evidenceLink&&<a href={item.evidenceLink} target="_blank" rel="noopener noreferrer">LINK BUKTI ↗</a>}{item.hasEvidence&&<a href={`/api/blacklist/evidence/${item.id}`} target="_blank" rel="noopener noreferrer">FILE BUKTI ↗</a>}<button onClick={()=>{setSupport(item.id);setSubmit(false);setMessage("")}}>DUKUNG · {item.supports}</button><button className="secondary" onClick={()=>toggleComments(item.id)}>{shownComments[item.id]?"SEMBUNYIKAN KOMENTAR":"TAMPILKAN KOMENTAR"}</button></div>{shownComments[item.id]&&<div className="blacklist-comments">{!comments[item.id]?<p>Memuat komentar...</p>:comments[item.id].length===0?<p>Belum ada komentar.</p>:comments[item.id].map((entry,index)=><div key={`${entry.createdAt}-${index}`}><strong>{entry.name}</strong><small>{new Date(entry.createdAt).toLocaleDateString("id-ID")}</small><p>{entry.comment}</p></div>)}</div>}</article>)}</div>}
</>;
}
