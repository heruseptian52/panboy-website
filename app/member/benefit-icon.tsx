export const benefitIcons=["trophy","calendar","calculator","chart","upload","globe","megaphone","users","shield","handshake","star","crown","gift","rocket","sparkles"] as const;
export type BenefitIconName=typeof benefitIcons[number];
const paths:Record<string,React.ReactNode>={
 trophy:<><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v2a4 4 0 0 0 4 4M17 6h3v2a4 4 0 0 1-4 4"/></>,
 calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></>,
 calculator:<><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8v3H8zM8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01"/></>,
 chart:<><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></>,
 upload:<><path d="M12 16V3M7 8l5-5 5 5M5 21h14a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2"/></>,
 globe:<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></>,
 megaphone:<><path d="m3 11 15-6v14L3 13v-2ZM18 10a3 3 0 0 1 0 4M6 14l2 6h4l-2-5"/></>,
 users:<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
 shield:<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,
 handshake:<><path d="m8 12 3 3a2 2 0 0 0 3 0l5-5M2 12l5-5 4 1 2-2 4 1 5 5M7 17l2 2M4 14l2 2M15 17l-2 2"/></>,
 star:<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2L5.8 21 7 14.2l-5-4.9 6.9-1L12 2Z"/>,
 crown:<><path d="m3 6 4 4 5-7 5 7 4-4-2 13H5L3 6Z"/><path d="M5 19h14"/></>,
 gift:<><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18M7.5 8C5 8 4 6.8 4 5.5S5 3 6.5 3C9 3 12 8 12 8M16.5 8C19 8 20 6.8 20 5.5S19 3 17.5 3C15 3 12 8 12 8"/></>,
 rocket:<><path d="M4.5 16.5 3 21l4.5-1.5M9 15l-4-4s4-7 13-8c1 9-8 13-8 13Z"/><circle cx="14" cy="8" r="2"/></>,
 sparkles:<><path d="m12 3 1.3 3.7L17 8l-3.7 1.3L12 13l-1.3-3.7L7 8l3.7-1.3L12 3ZM5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14ZM19 13l.7 1.8 1.8.7-1.8.7L19 18l-.7-1.8-1.8-.7 1.8-.7L19 13Z"/></>,
};
export function BenefitIcon({name,className=""}:{name:string;className?:string}){return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]||paths.sparkles}</svg>}
