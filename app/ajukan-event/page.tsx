import type { Metadata } from "next";
import PanboyIcon from "../panboy-icon";
import EventSubmissionForm from "./submission-form";

export const metadata: Metadata = { title: "Ajukan Event", description: "Ajukan event esports untuk ditinjau Panboy Community." };
export default function Page() {
  return <main className="submission-public"><nav className="submission-nav"><a href="/"><img src="/panboy-logo.png" alt="Panboy"/><span>PANBOY<small>COMMUNITY EVENT</small></span></a><a href="/#all-event">← LIHAT EVENT</a></nav><div className="submission-layout"><div className="submission-intro"><PanboyIcon name="event"/><p className="submission-eyebrow">PANGGUNG EVENT KOMUNITAS</p><h1>Bagikan event kamu<span>.</span></h1><p>Isi informasi yang akan tampil bersama poster. Tim Panboy akan memeriksa pengajuan terlebih dahulu sebelum menerbitkannya di website.</p><div className="submission-steps"><span>01 · Kirim informasi</span><span>02 · Pemeriksaan admin</span><span>03 · Event tampil di website</span></div></div><EventSubmissionForm/></div></main>;
}
