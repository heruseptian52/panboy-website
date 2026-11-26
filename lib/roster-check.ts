import {env} from "cloudflare:workers";
import {checkRoster,type CheckEntry,type BlacklistHit} from "./roster-check-model";
export async function ensureReviews(){await env.DB.prepare("CREATE TABLE IF NOT EXISTS roster_issue_reviews(event_id INTEGER NOT NULL,issue_key TEXT NOT NULL,decision TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(event_id,issue_key))").run()}
export async function rosterIssues(eventId:number,evidence=false){
 await ensureReviews();const [entries,blacklist,reviews]=await Promise.all([
 env.DB.prepare("SELECT id,team_name AS teamName,players_json AS playersJson FROM roster_entries WHERE event_id=?").bind(eventId).all<any>(),
 env.DB.prepare("SELECT id,player_id AS playerId,reason"+(evidence?",evidence_key AS evidenceKey,evidence_link AS evidenceLink":"")+" FROM blacklist_players WHERE status='approved' AND player_id IN (SELECT json_extract(p.value,'$.playerId') FROM roster_entries r,json_each(r.players_json) p WHERE r.event_id=?)").bind(eventId).all<BlacklistHit>(),
 env.DB.prepare("SELECT issue_key AS issueKey,decision FROM roster_issue_reviews WHERE event_id=?").bind(eventId).all<{issueKey:string;decision:string}>()]);
 const parsed=entries.results.map((r:any)=>{let players=[];try{players=JSON.parse(r.playersJson)}catch{}return {id:r.id,teamName:r.teamName,players:Array.isArray(players)?players:[]} as CheckEntry});const decisions=new Map(reviews.results.map((x:{issueKey:string;decision:string})=>[x.issueKey,x.decision]));return checkRoster(parsed,blacklist.results).map(i=>({...i,decision:decisions.get(i.key)||""}))
}
export async function rosterIssueCount(){await ensureReviews();const [entries,blacklist,reviews]=await Promise.all([
 env.DB.prepare("SELECT id,event_id AS eventId,team_name AS teamName,players_json AS playersJson FROM roster_entries WHERE json_valid(players_json) AND players_json<>'[]'").all<any>(),
 env.DB.prepare("SELECT id,player_id AS playerId,reason FROM blacklist_players WHERE status='approved'").all<BlacklistHit>(),
 env.DB.prepare("SELECT event_id AS eventId,issue_key AS issueKey FROM roster_issue_reviews").all<any>()]);
 const byEvent=new Map<number,CheckEntry[]>(),reviewed=new Set(reviews.results.map((r:any)=>r.eventId+":"+r.issueKey));for(const row of entries.results){let players=[];try{players=JSON.parse(row.playersJson)}catch{}if(!Array.isArray(players))continue;const list=byEvent.get(row.eventId)||[];list.push({id:row.id,teamName:row.teamName,players});byEvent.set(row.eventId,list)}let n=0;for(const [eventId,list] of byEvent)n+=checkRoster(list,blacklist.results).filter(i=>!reviewed.has(eventId+":"+i.key)).length;return n}
