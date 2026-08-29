export type EventItem = {
  id: string;
  name: string;
  category: "Event Panboy" | "Event Premium" | "Event Official";
  mode: "Online" | "Offline";
  prizepool: number;
  fee: number;
  period: string;
  status: "Open Regist" | "Regist" | "Close";
  city?: string;
  adminWa?: string;
};

export const events: EventItem[] = [
  { id:"ult-s5", name:"Ultimate Collab Tournament S5", category:"Event Panboy", mode:"Online", prizepool:3000000, fee:30000, period:"10–12 September 2026", status:"Open Regist", adminWa:"6280000000000" },
  { id:"vexen-opening", name:"Vexen Esport Grand Opening", category:"Event Premium", mode:"Online", prizepool:2000000, fee:0, period:"22 Agustus 2026", status:"Close", adminWa:"6280000000000" },
  { id:"erafone-palu", name:"Erafone S1 Palu", category:"Event Official", mode:"Offline", prizepool:2000000, fee:0, period:"2 Agustus 2026", status:"Close", city:"Palu", adminWa:"6280000000000" }
];

export const rupiah = (n:number) => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n);
