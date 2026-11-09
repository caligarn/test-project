import { it } from 'vitest'
import assert from 'node:assert/strict'
import * as L from '../src/games/telephone/logic.js'

// Telephone party rules: rotation, turn checks, leaving players, votes, scores.
it('telephone party rules', () => {
  const P = (ids, off=[]) => ids.map((id,i)=>({id, host:i===0, connected: !off.includes(id)}))
  let players = P(['a','b','c'])
  let s = L.reduceParty(L.LOBBY_STATE, {type:'start'}, 'b', players)
  assert.equal(s, L.LOBBY_STATE) // non-host ignored
  s = L.reduceParty(L.LOBBY_STATE, {type:'start'}, 'a', players)
  assert.equal(s.phase,'play'); assert.equal(s.steps,3)
  // every player touches every chain
  const seen = {a:new Set(),b:new Set(),c:new Set()}
  for (let st=0; st<3; st++) for (let i=0;i<3;i++) seen[s.order[L.assigneeSeat(i,st,3)]].add(i)
  for (const k in seen) assert.equal(seen[k].size,3)
  assert.equal(L.chainForSeat(1,1,3), 0)
  const sub = (s, who, img) => { const seat=s.order.indexOf(who); const chain=L.chainForSeat(seat,s.step,3); return L.reduceParty(s,{type:'submit',step:s.step,chain,text:'t '+who,imageUrl:img||'u'+who+s.step},who,players) }
  s = sub(s,'a'); s = sub(s,'b');
  assert.deepEqual(L.pendingPlayers(s), ['c'])
  const dup = sub(s,'a'); assert.equal(dup, s) // already played
  s = sub(s,'c'); assert.equal(s.step,1)
  // c leaves at step 1
  players = P(['a','b','c'],['c'])
  s = L.reduceParty(s,{type:'$leave',playerId:'c'},'c',players)
  assert.deepEqual(L.pendingPlayers(s).sort(), ['a','b'])
  s = sub(s,'a'); s = sub(s,'b'); assert.equal(s.step,2)
  // step 2: c's turn auto-skipped on advance
  assert.deepEqual(L.pendingPlayers(s).sort(), ['a','b'])
  s = sub(s,'a');
  s = L.reduceParty(s,{type:'skipPending'},'a',players)
  assert.equal(s.phase,'reveal')
  const skippedChain = s.chains.find(c=>c.entries[1].skipped)
  assert.ok(skippedChain); assert.equal(L.latestImage({entries:[{imageUrl:"x"},{skipped:true}]}), "x")
  s = L.reduceParty(s,{type:'revealPos',pos:9},'a',players); assert.equal(s.revealPos,2)
  s = L.reduceParty(s,{type:'startVote'},'a',players)
  const ca = s.chains.findIndex(c=>c.starter==='a')
  assert.equal(L.reduceParty(s,{type:'vote',chain:ca},'a',players), s) // no self vote
  s = L.reduceParty(s,{type:'vote',chain:(ca+1)%3},'a',players); assert.equal(s.phase,'vote')
  s = L.reduceParty(s,{type:'vote',chain:ca},'b',players); assert.equal(s.phase,'done')
  const sc = L.partyScores(s)
  for (const k in sc) assert.ok(sc[k].total<=1000)
  assert.ok(sc.a.starterPts===50)
  // drop chain: author leaves before step 0
  players = P(['a','b'])
  let t = L.reduceParty(L.LOBBY_STATE,{type:'start'},'a',players)
  players = P(['a','b'],['b'])
  t = L.reduceParty(t,{type:'$leave',playerId:'b'},'b',players)
  t = L.reduceParty(t,{type:'submit',step:0,chain:0,text:'x',imageUrl:'u'},'a',players)
  assert.equal(t.phase,'reveal') // a's step-1 chain (b's) has no image -> skipped; b gone -> skipped
  assert.deepEqual(L.revealableChains(t),[0])
  // solo
  assert.deepEqual(L.soloScore({driftScore:100, wordScore:100}).total, 1000)
  assert.deepEqual(L.soloScore({driftScore:null, wordScore:50}), {judged:false, driftPts:0, wordPts:150, total:150})

})
