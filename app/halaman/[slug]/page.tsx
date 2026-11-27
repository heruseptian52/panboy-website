import {notFound} from "next/navigation";
import {readBuilder} from "../../../lib/website-builder";
export const dynamic="force-dynamic";
export default async function Page({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const state=await readBuilder().catch(()=>null);
 const block=state?.blocks.find(b=>b.enabled&&b.slug===slug);
 if(!block)notFound();
 return <main style={{minHeight:"100vh",background:"#0d0d0f",color:"#f4ead8",padding:"clamp(20px,5vw,60px)"}}>
 <header style={{display:"flex",alignItems:"center",gap:16,marginBottom:32}}><a href="/" className="button gold">← Beranda</a><img src="/panboy-logo.png" alt="Panboy" width={45} height={45}/><b>PANBOY COMMUNITY</b></header>
 <article style={{maxWidth:960,margin:"auto",border:"1px solid #765a30",borderRadius:16,padding:"clamp(20px,5vw,48px)",background:"#181614"}}>
 <h1 style={{fontSize:"clamp(28px,5vw,46px)",fontWeight:800}}>{block.title}</h1>{block.description&&<p style={{whiteSpace:"pre-wrap",lineHeight:1.7,margin:"24px 0"}}>{block.description}</p>}{block.href&&block.button&&<a className="button gold" href={block.href}>{block.button}</a>}</article></main>;
}
