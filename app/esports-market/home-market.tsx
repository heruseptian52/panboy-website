import type {MarketData,MarketKind,MarketSettings} from "../../lib/market-model";
import PanboyIcon from "../panboy-icon";
import "./home-market.css";
export type HomeMarketItem={id:number;kind:MarketKind;data:MarketData};
export function HomeMarket({settings,items}:{settings:MarketSettings;items:HomeMarketItem[]}){
 const panels=([
  {kind:"player",title:"Transfer Market Player",description:"Temukan player yang sedang mencari team.",action:"Ajukan profil player",icon:"profile"},
  {kind:"team",title:"Team Recruitment",description:"Temukan team atau clan yang sedang membuka rekrutmen.",action:"Buka rekrutmen team",icon:"member"}
 ] as const).filter(p=>settings[p.kind]);
 if(!panels.length)return null;
 return <section className="container home-market" aria-labelledby="home-market-title"><div className="refresh-heading"><div><p className="eyebrow">PANBOY COMMUNITY · ESPORTS MARKET</p><h2 id="home-market-title">Esports Market<span>.</span></h2><p>Temukan peluang baru, bangun roster terbaik, dan bergabung dengan team pilihanmu.</p></div><a href="/esports-market">Lihat semua market</a></div>
 <div className="home-market-panels">{panels.map(panel=>{const available=items.filter(x=>x.kind===panel.kind);const path="/esports-market?kind="+panel.kind;return <article className="home-market-panel" key={panel.kind}><div className="home-market-panel-head"><span className="home-market-symbol"><PanboyIcon name={panel.icon}/></span><div><h3>{panel.title}</h3><p>{panel.description}</p></div><span className="home-market-count">{available.length} publikasi</span></div>
 <div className="home-market-list">{available.slice(0,4).map(item=>{const d=item.data;return <a className="home-market-item" key={item.id} href={path+"&post="+item.id}>{d.photo||d.poster?<img src={d.photo||d.poster} alt="" loading="lazy" decoding="async"/>:<span className="home-market-item-icon"><PanboyIcon name={panel.icon}/></span>}<div className="home-market-item-copy"><strong>{d.name}</strong>{(d.role||d.position||d.status)&&<div className="home-market-tags">{[d.position,d.role,d.status].filter(Boolean).map((v,i)=><span key={i}>{v}</span>)}</div>}{d.domicile&&<small>{d.domicile}</small>}{d.description&&<p>{d.description}</p>}</div><span className="home-market-item-link" aria-hidden="true">›</span></a>})}
 {!available.length&&<div className="home-market-empty"><PanboyIcon name={panel.icon}/><p>Belum ada publikasi. Jadilah yang pertama!</p></div>}</div>
 <div className="home-market-actions"><a className="home-market-primary" href={path+"&apply=1"}>{panel.action}</a><a href={path}>Lihat semua {panel.kind==="player"?"player":"rekrutmen"}</a></div></article>})}</div></section>
}
