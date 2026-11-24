import { getCommunityMembers } from "../../../lib/members";
import MemberPayment from "./payment";
import { getSettings } from "../../../lib/settings";
import { env } from "cloudflare:workers";
import { ipaymuConfig } from "../../../lib/ipaymu";
export const dynamic="force-dynamic";
export default async function Page(){const [members,settings]=await Promise.all([getCommunityMembers(false),getSettings()]);return <main className="member-page"><header className="member-nav"><a href="/member"><img src="/panboy-menu-logo.png" alt="Panboy"/><span>PANBOY<small>PEMBAYARAN MEMBER</small></span></a><a href="/member">← KEMBALI</a></header><section className="member-payment-wrap"><MemberPayment members={members.map(({id,teamName,logoUrl})=>({id,teamName,logoUrl}))} qrisUrl={settings.memberQrisUrl||"/panboy-qris-dana.png"} qrisEnabled={settings.memberQrisEnabled!=="false"} ipaymuEnabled={settings.memberIpaymuEnabled!=="false"&&ipaymuConfig(env).enabled}/></section></main>}
