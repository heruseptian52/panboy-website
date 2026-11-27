"use client";
export default function DownloadReportButton(){
  return <a className="report-download no-print" href="/api/admin/finance?format=pdf&scope=member" download>DOWNLOAD PDF LAPORAN MEMBER</a>;
}
