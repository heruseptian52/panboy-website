"use client";
import {useEffect,useState} from "react";

const DAY=24*60*60*1000;

export default function EventCountdown({closeAt}:{closeAt:string}){
  const target=new Date(closeAt).getTime();
  const [remaining,setRemaining]=useState<number|null>(null);
  useEffect(()=>{const tick=()=>setRemaining(target-Date.now());tick();const timer=setInterval(tick,1000);return()=>clearInterval(timer)},[target]);
  if(remaining===null||!Number.isFinite(target)||remaining<=0||remaining>DAY)return null;
  const total=Math.floor(remaining/1000),hours=Math.floor(total/3600),minutes=Math.floor(total%3600/60),seconds=total%60;
  const pad=(value:number)=>String(value).padStart(2,"0");
  return <div className="event-countdown" aria-live="polite"><small>REGISTRASI DITUTUP DALAM</small><strong>{pad(hours)}:{pad(minutes)}:{pad(seconds)}</strong><span>{new Intl.DateTimeFormat("id-ID",{day:"2-digit",month:"short",year:"numeric",timeZone:"Asia/Jakarta"}).format(new Date(target))} • 19.00 WIB</span></div>;
}
