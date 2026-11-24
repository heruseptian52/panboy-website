"use client";
import {useMemo,useState} from "react";
import OrderCard from "../shop/order-card";
export default function StoreClient({products}:{products:any[]}){
 const [q,setQ]=useState("");
 const filtered=useMemo(()=>products.filter(p=>`${p.name} ${p.type} ${p.description}`.toLowerCase().includes(q.toLowerCase())),[products,q]);
 return <><div className="digital-search"><span>⌕</span><input aria-label="Cari produk" value={q} onChange={e=>setQ(e.target.value)} placeholder="PUBG, Mobile Legends, Telkomsel, PLN..."/></div><div className="digital-results">{q&&`${filtered.length} produk ditemukan`}</div><section className="product-grid">{filtered.map(p=><OrderCard product={p} key={p.id}/>)}{!filtered.length&&<div className="shop-empty">Produk tidak ditemukan atau belum tersedia.</div>}</section></>;
}
