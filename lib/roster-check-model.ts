export type RosterPlayer={nick:string;playerId:string};
export type CheckEntry={id:number;teamName:string;players:RosterPlayer[]};
export type BlacklistHit={id:number;playerId:string;reason:string;evidenceKey?:string;evidenceLink?:string};
export type RosterIssue={key:string;playerId:string;type:"duplicate"|"blacklist";players:{entryId:number;teamName:string;nick:string}[];blacklist?:BlacklistHit;decision?:string};
export function checkRoster(entries:CheckEntry[],blacklist:BlacklistHit[]):RosterIssue[]{
 const map=new Map<string,RosterIssue["players"]>();for(const e of entries)for(const p of e.players){const id=String(p.playerId||"").trim();if(!/^\d{5,20}$/.test(id))continue;const rows=map.get(id)||[];rows.push({entryId:e.id,teamName:e.teamName,nick:p.nick});map.set(id,rows)}
 const hits=new Map(blacklist.map(b=>[b.playerId,b])),issues:RosterIssue[]=[];
 for(const [id,players] of map){const signature=players.map(p=>p.entryId+":"+p.nick).sort().join("|");if(players.length>1)issues.push({key:"duplicate:"+id+":"+signature,playerId:id,type:"duplicate",players});const hit=hits.get(id);if(hit)issues.push({key:"blacklist:"+hit.id+":"+id+":"+signature,playerId:id,type:"blacklist",players,blacklist:hit})}return issues;
}
