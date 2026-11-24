"use client";
import { useEffect, useState } from "react";
export default function SitePopup({image,video,title,url,type}:{image:string;video:string;title:string;url:string;type:string}) {
  const [open,setOpen]=useState(false);
  useEffect(()=>{try {if(!sessionStorage.getItem("panboy-popup-seen")){setOpen(true);sessionStorage.setItem("panboy-popup-seen","1")}}catch{setOpen(true)}},[]);
  if(!open || !(type === "video" ? video : image)) return null;
  const media=type === "video" ? <video src={video} autoPlay muted loop playsInline controls aria-label={title}/> : <img src={image} alt={title}/>;
  return <div className="site-popup-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}><section className="site-popup-card" role="dialog" aria-modal="true" aria-label={title || "Iklan Panboy"}><button type="button" className="site-popup-close" aria-label="Tutup iklan" onClick={()=>setOpen(false)}>×</button><p>INFORMASI PANBOY</p>{url?<a href={url} target={url.startsWith("/")?undefined:"_blank"} rel="noreferrer" aria-label={`Buka ${title}`}>{media}<strong>{title || "Lihat selengkapnya"}</strong><span>LIHAT SELENGKAPNYA</span></a>:<div>{media}<strong>{title}</strong></div>}</section></div>
}
