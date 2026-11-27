import "./member-fix.css";
import { getCommunityMembers } from "../../lib/members";
import { getSettings } from "../../lib/settings";
import MemberBrowser from "./member-browser";
import { getMemberBenefits } from "../../lib/member-benefits";
export const metadata={title:"Member Panboy Community",description:"Daftar team yang tergabung sebagai Member Panboy Community.",openGraph:{title:"Member Panboy Community",description:"Daftar team yang tergabung sebagai Member Panboy Community.",images:["/panboy-menu-logo.png"]}};
export const dynamic = "force-dynamic";

export default async function MemberPage() {
  const [members, settings, benefits] = await Promise.all([getCommunityMembers(), getSettings(),getMemberBenefits()]);
  const config = {
    memberRegistrationStatus: settings.memberRegistrationStatus,
    memberBenefitVisible: settings.memberBenefitVisible,
    memberJoinText: settings.memberJoinText,
    memberWhatsapp: settings.memberWhatsapp,
    memberWhatsappMessage: settings.memberWhatsappMessage,
    memberBenefitBanner: settings.memberBenefitBanner,
    memberBenefitSubtitle: settings.memberBenefitSubtitle,
    memberBenefitTitle: settings.memberBenefitTitle,
    memberBenefitIntro: settings.memberBenefitIntro,
    memberBenefitVideo: settings.memberBenefitVideo,
    memberHowToVisible: settings.memberHowToVisible,
    memberHowToTitle: settings.memberHowToTitle,
    memberHowToSteps: settings.memberHowToSteps,
  };
  return <main className="member-page">
    <header className="member-nav"><a href="/"><img src={settings.logoUrl} alt="Panboy"/><span>PANBOY<small>COMMUNITY MEMBER</small></span></a><a href="/">← BERANDA</a></header>
    <section className="member-hero">
      <p>OFFICIAL COMMUNITY</p>
      <h1>MEMBER PANBOY<br/><span>COMMUNITY</span></h1>
      <div className="member-team-count"><b>{members.length}</b><span>TEAM BERGABUNG</span></div>
    </section>
    <section className="member-content"><div className="member-finance-links"><a className="member-join member-dues-link" href="/member/bayar">BAYAR IURAN MEMBER →</a></div><MemberBrowser members={members} benefits={benefits} config={config}/></section>
  </main>;
}
