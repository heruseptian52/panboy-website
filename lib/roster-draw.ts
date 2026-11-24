export type DrawTeam = {id:number;teamName:string};
export type DrawAssignment = {id:number;teamName:string;group:number;slot:number};

export function groupLabel(index:number){let label="";for(let n=index+1;n>0;n=Math.floor((n-1)/26))label=String.fromCharCode(65+(n-1)%26)+label;return label}

/** Spread teams evenly. Teams with a shared leading tag are separated when space permits. */
export function drawRoster(teams:DrawTeam[],requestedGroups:number,random:()=>number=Math.random):DrawAssignment[]{
  if(!Number.isSafeInteger(requestedGroups)||requestedGroups<1||requestedGroups>50)throw new Error("Jumlah grup harus 1–50.");
  const ids=new Set(teams.map(team=>team.id));
  if(ids.size!==teams.length)throw new Error("ID team harus unik.");
  const count=Math.min(requestedGroups,Math.max(1,teams.length));
  const shuffled=[...teams];
  for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(Math.max(0,Math.min(.999999999,random()))*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]]}
  const groups:Array<DrawAssignment[]> = Array.from({length:count},()=>[]);
  const tag=(name:string)=>name.trim().toLocaleUpperCase("id-ID").split(/[\s._-]+/)[0];
  for(const team of shuffled){
    const prefix=tag(team.teamName);
    const min=Math.min(...groups.map(group=>group.length));
    const choices=groups.map((group,index)=>({group,index})).filter(item=>item.group.length===min);
    choices.sort((a,b)=>Number(a.group.some(row=>tag(row.teamName)===prefix))-Number(b.group.some(row=>tag(row.teamName)===prefix)));
    const chosen=choices[0];chosen.group.push({id:team.id,teamName:team.teamName,group:chosen.index,slot:chosen.group.length});
  }
  return groups.flat();
}
