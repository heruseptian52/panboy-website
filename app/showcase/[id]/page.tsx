import {notFound} from "next/navigation";
import {getPublicShowcases} from "../../../lib/showcase";
import {ShowcaseDetail} from "../showcase-view";
export const dynamic="force-dynamic";
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;const {ads}=await getPublicShowcases(id);const ad=ads[0];if(!ad||!ad.content.detail)notFound();return <main className="sc-detail-page"><header><a href="/">PANBOY COMMUNITY</a><span>PROMOTION & PARTNERSHIP</span></header><ShowcaseDetail ad={ad}/></main>}
