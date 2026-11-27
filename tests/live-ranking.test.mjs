import test from "node:test";
import assert from "node:assert/strict";
import { compareLiveTeams } from "../lib/live-ranking.ts";

const rank=(rows,tieBreak)=>[...rows].sort((a,b)=>compareLiveTeams(a,b,tieBreak)).map(x=>x.id);

test("PTS selalu menjadi urutan utama",()=>{
  assert.deepEqual(rank([{id:1,points:10,wwcd:0},{id:2,points:11,wwcd:0}],[]),[2,1]);
});

test("tie-break mengikuti konfigurasi event",()=>{
  const rows=[
    {id:1,slotNumber:1,points:20,wwcd:0,placementPoints:10,overallElims:10,lastPlacement:2},
    {id:2,slotNumber:2,points:20,wwcd:1,placementPoints:9,overallElims:11,lastPlacement:5},
  ];
  assert.deepEqual(rank(rows,["wwcd","placementPoints","eliminations","lastPlacement"]),[2,1]);
  assert.deepEqual(rank(rows,["placementPoints","eliminations","wwcd","lastPlacement"]),[1,2]);
});

test("last placement yang lebih baik menang saat statistik lain sama",()=>{
  const rows=[{id:1,points:20,lastPlacement:5},{id:2,points:20,lastPlacement:2}];
  assert.deepEqual(rank(rows,["lastPlacement"]),[2,1]);
});
