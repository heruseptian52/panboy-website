import test from "node:test";
import assert from "node:assert/strict";
import { calculateMatchScore, liveTotals, visibleLivePoints } from "../lib/scoreboard-match.ts";

const rule={placement:{"1":10,"2":6,"3":5,"4":4,"5":3,"6":2,"7":1,"8":1},eliminationPoint:1};
const result=(matchNumber,placement,eliminations)=>({matchNumber,placement,eliminations,...calculateMatchScore(rule,placement,eliminations),calculationMode:"auto"});

test("default PUBG Mobile placement dan kill dihitung otomatis",()=>{
 assert.equal(calculateMatchScore(rule,1,10).totalPoints,20);
 assert.equal(calculateMatchScore(rule,8,3).totalPoints,4);
 assert.equal(calculateMatchScore(rule,10,5).totalPoints,5);
 assert.equal(calculateMatchScore(rule,7,6).totalPoints,7);
 assert.equal(calculateMatchScore(rule,5,3).totalPoints,6);
});

test("kill naik dan turun menghitung ulang PTS tanpa akumulasi ganda",()=>{
 const match=result(1,7,6);
 assert.equal(liveTotals([match],1).points,7);
 match.eliminations=5;Object.assign(match,calculateMatchScore(rule,7,5));
 assert.equal(liveTotals([match],1).points,6);
 match.placement=5;Object.assign(match,calculateMatchScore(rule,5,5));
 assert.equal(liveTotals([match],1).points,8);
});

test("total lama ditambah satu kali dengan hasil match aktif",()=>{
 const previous=result(1,1,10),current=result(2,7,6);
 assert.deepEqual(liveTotals([previous,current],2),{points:27,elims:6,overallElims:16});
});

test("placement aktif tidak dihitung selama team masih hidup",()=>{
 assert.equal(visibleLivePoints(3,1,true),2);
 assert.equal(visibleLivePoints(3,1,false),3);
});

test("rank 1 WWCD tetap masuk ke PTS walaupun team pemenang masih alive",()=>{
 assert.equal(visibleLivePoints(10,10,true,1),10);
 assert.equal(visibleLivePoints(13,10,true,1),13);
 assert.equal(visibleLivePoints(20,10,true,1),20);
});

test("match aktif membawa PTS dan mereset ELIMS",()=>{
 const match1=result(1,1,10),match2=result(2,0,0);
 assert.deepEqual(liveTotals([match1],1),{points:20,elims:10,overallElims:10});
 assert.deepEqual(liveTotals([match1,match2],2),{points:20,elims:0,overallElims:10});
 match2.eliminations=3;Object.assign(match2,calculateMatchScore(rule,0,3));
 assert.deepEqual(liveTotals([match1,match2],2),{points:23,elims:3,overallElims:13});
 match2.placement=8;Object.assign(match2,calculateMatchScore(rule,8,3));
 assert.deepEqual(liveTotals([match1,match2],2),{points:24,elims:3,overallElims:13});
});

test("edit match lama menghitung ulang total tanpa double count",()=>{
 const match1=result(1,1,10),match2=result(2,8,3),match3=result(3,0,0);
 assert.equal(liveTotals([match1,match2,match3],3).points,24);
 match1.eliminations=9;Object.assign(match1,calculateMatchScore(rule,1,9));
 assert.equal(liveTotals([match1,match2,match3],3).points,23);
 assert.equal(liveTotals([match1,match2,match3],3).elims,0);
});

test("manual override hanya mengganti poin match terkait",()=>{
 const match1={...result(1,1,10),calculationMode:"manual",manualPoints:18},match2=result(2,8,3);
 assert.equal(liveTotals([match1,match2],2).points,22);
});

test("edit placement match lama langsung mengubah kumulatif",()=>{
 const match1=result(1,1,10),match2=result(2,8,3);
 assert.equal(liveTotals([match1,match2],2).points,24);
 match1.placement=2;Object.assign(match1,calculateMatchScore(rule,2,10));
 assert.equal(liveTotals([match1,match2],2).points,20);
});

test("perhitungan dua leaderboard tidak tercampur",()=>{
 const boardA=[result(1,1,10)],boardB=[result(1,8,1)];
 assert.equal(liveTotals(boardA,1).points,20);
 assert.equal(liveTotals(boardB,1).points,2);
});

test("custom kill point berlaku tanpa mengubah data match lain",()=>{
 const custom={...rule,eliminationPoint:2};
 assert.equal(calculateMatchScore(custom,8,3).totalPoints,7);
 assert.equal(calculateMatchScore(rule,8,3).totalPoints,4);
});
