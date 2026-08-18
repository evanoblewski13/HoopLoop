(()=>{
'use strict';
const DATA=window.HOOPLOOP_PPP_DATA||{cards:[],league:[],meta:{}};
const REAL=window.HOOPLOOP_CASH_GRAB_REAL_DATA||{};
const cards=DATA.cards||[], byId=new Map(cards.map(c=>[c.id,c])), legacyCardMap=DATA.legacyCardMap||{};
const $=id=>document.getElementById(id), clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function seedHash(s){let h=2166136261;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let a=seedHash(seed)||1;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function slug(s){return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')}
function shuffle(a,r){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function pick(a,r){return a[Math.floor(r()*a.length)]}
function cardValue(c){const s=c?.stats||{},mp=Number(s.mpg)||24;return (Number(s.ppg)||0)+.55*(Number(s.rpg)||0)+.72*(Number(s.apg)||0)+.5*(Number(s.spg)||0)+.45*(Number(s.bpg)||0)+Math.min(5,mp/8)}
const START_GROUPS=['G','G','F','F','C'];
const BENCH_MINUTES=[21,19,15,11,9];
const STARTER_MINUTES={1:36,2:35,3:33,4:31,5:30};
let state={slots:[],boostedSlots:new Set(),boostedCards:new Set(),boostLocked:false,pendingPulls:{},roster:{},swap:null,offense:{},history:loadHistory(),mode:null,opponent:null,defense:{},online:null,onlineTimer:null,series:null};
function makeSlots(){return [
 ...START_GROUPS.map((g,i)=>({id:'s'+i,label:['G','G','F','F','C'][i],group:g,starter:true,rotation:true,index:i})),
 ...['6TH MAN','7TH MAN','8TH MAN','9TH MAN','10TH MAN','RESERVE 1','RESERVE 2'].map((label,i)=>({id:'b'+i,label,group:'ANY',starter:false,rotation:i<5,index:i+5}))
]}
function resetBuilder(seed=Date.now()){
 state.slots=makeSlots();state.boostedSlots=new Set();state.boostedCards=new Set();state.boostLocked=false;state.pendingPulls={};state.roster={};state.swap=null;state.offense={};state.opponent=null;state.defense={};state.mode=null;
 $('boost-banner').classList.remove('hidden');$('lineup-tools').classList.add('hidden');$('matchup-section').classList.add('hidden');$('game-section').classList.add('hidden');$('season-result').classList.add('hidden');$('save-team').disabled=true;
 renderRoster();updateBoost();$('build-status').textContent='Choose anywhere from 0 to 3 boosted spots, then lock them.';
}
function updateBoost(){
 const n=state.boostedSlots.size;$('boost-count').textContent=`${n} / 3 boosts selected`;$('lock-boosts').disabled=state.boostLocked;$('lock-boosts').textContent=state.boostLocked?`${n} boosts locked`:`Lock ${n} boost${n===1?'':'s'}`;
}
function slotIsBoosted(s,c){return c?state.boostedCards.has(c.id):state.boostedSlots.has(s.id)}
function renderRoster(){
 $('starter-slots').innerHTML='';$('bench-slots').innerHTML='';
 for(const s of state.slots){
  const c=state.roster[s.id],boost=slotIsBoosted(s,c),el=document.createElement('button');el.type='button';el.className='roster-slot'+(boost?' boosted':'')+(state.swap===s.id?' selected-swap':'');
  const slotText=s.label;
  el.innerHTML=`<div class="slot-top"><span>${slotText}</span><span class="boost-mark">${boost?'BOOST':''}</span></div>`+(c?`<div class="player-card-mini"><img src="${c.headshot||c.photoFallback||''}" data-fallback="${c.photoFallback||''}" alt="${c.name}" onerror="if(this.dataset.fallback&&this.src!==this.dataset.fallback){this.src=this.dataset.fallback}else{this.classList.add('photo-failed')}"><strong>${c.name}</strong><small class="card-team">${c.team}</small><small class="card-years">${c.season}</small><small class="card-role">${c.pos||'—'} · ${c.playstyle||'NBA Role'}</small></div>`:`<div class="mystery-mark">?</div>`);
  el.onclick=()=>slotClick(s);(s.starter?$('starter-slots'):$('bench-slots')).appendChild(el);
 }
 if(Object.keys(state.roster).length===12)renderLineupTools();
}
function slotClick(s){
 if(!state.boostLocked){
  if(state.boostedSlots.has(s.id))state.boostedSlots.delete(s.id);else if(state.boostedSlots.size<3)state.boostedSlots.add(s.id);else{toast('Three is the maximum. Remove one boost first.');return}
  updateBoost();renderRoster();return;
 }
 if(!state.roster[s.id])return openPull(s);
 if(Object.keys(state.roster).length<12)return;
 if(!state.swap){state.swap=s.id;renderRoster();return}
 if(state.swap===s.id){state.swap=null;renderRoster();return}
 const a=state.slots.find(x=>x.id===state.swap),b=s,ca=state.roster[a.id],cb=state.roster[b.id];
 if(a.starter&&!cb.groups.includes(a.group)){toast(`${cb.name} cannot fill ${a.group}.`);return}
 if(b.starter&&!ca.groups.includes(b.group)){toast(`${ca.name} cannot fill ${b.group}.`);return}
 [state.roster[a.id],state.roster[b.id]]=[cb,ca];state.swap=null;normalizeOffense();renderRoster();
}
function normalPackProfile(r){const x=r();if(x<.50)return{fringe:.70,role:.28,solid:.02,strong:0,elite:0};if(x<.86)return{fringe:.48,role:.40,solid:.11,strong:.01,elite:0};if(x<.97)return{fringe:.18,role:.38,solid:.32,strong:.11,elite:.01};return{fringe:.02,role:.13,solid:.30,strong:.40,elite:.15}}
function chooseBand(profile,r){let x=r(),acc=0;for(const b of ['fringe','role','solid','strong','elite']){acc+=profile[b]||0;if(x<=acc)return b}return'fringe'}
function eligibleForSlot(c,s){return s.starter?c.groups.includes(s.group):true}
function drawOptionsForSlot(s,usedBase,boosted,seed){
 const r=rng(seed),pool=cards.filter(c=>!usedBase.has(String(c.baseId))&&eligibleForSlot(c,s)&&(boosted?c.boostEligible:true));
 const remaining=new Set(pool.map(c=>String(c.baseId))),opts=[],profile=boosted?{strong:.56,elite:.44}:normalPackProfile(r);
 for(let k=0;k<5&&remaining.size;k++){
  let band=chooseBand(profile,r),baseCandidates=[];
  for(const base of remaining){if(pool.some(c=>String(c.baseId)===base&&c.qualityBand===band))baseCandidates.push(base)}
  if(!baseCandidates.length){const fallbackBands=boosted?['strong','elite']:['fringe','role','solid','strong','elite'];for(const fb of fallbackBands){baseCandidates=[];for(const base of remaining){if(pool.some(c=>String(c.baseId)===base&&c.qualityBand===fb))baseCandidates.push(base)}if(baseCandidates.length){band=fb;break}}}
  if(!baseCandidates.length)baseCandidates=[...remaining];
  const base=pick(baseCandidates,r),versions=pool.filter(c=>String(c.baseId)===base&&(!band||c.qualityBand===band));
  const c=pick(versions.length?versions:pool.filter(c=>String(c.baseId)===base),r);opts.push(c);remaining.delete(base);
 }
 return opts;
}
function openPull(s){
 const boosted=state.boostedSlots.has(s.id),used=new Set(Object.values(state.roster).map(c=>String(c.baseId)));
 let ids=state.pendingPulls[s.id];if(!ids){ids=drawOptionsForSlot(s,used,boosted,`${Date.now()}-${s.id}-${Object.keys(state.roster).length}`).map(c=>c.id);state.pendingPulls[s.id]=ids}
 const opts=ids.map(id=>byId.get(id)).filter(Boolean).filter(c=>!used.has(String(c.baseId)));
 $('pull-title').textContent=`${s.label} · choose one`;$('pull-overline').textContent=boosted?'BOOSTED PULL':'PULL';$('pull-modal').querySelector('.modal-card').classList.toggle('boosted-modal',boosted);
 $('pull-options').innerHTML='';
 for(const c of opts){const b=document.createElement('button');b.type='button';b.className='pull-option';b.innerHTML=`<img src="${c.headshot||c.photoFallback||''}" data-fallback="${c.photoFallback||''}" alt="${c.name}" onerror="if(this.dataset.fallback&&this.src!==this.dataset.fallback){this.src=this.dataset.fallback}else{this.classList.add('photo-failed')}"><strong>${c.name}</strong><div class="card-team">${c.team}</div><div class="card-years">${c.season}</div><div class="stats">${c.pos||'—'} · ${c.playstyle||'NBA Role'}</div>`;b.onclick=()=>{state.roster[s.id]=c;if(boosted)state.boostedCards.add(c.id);delete state.pendingPulls[s.id];$('pull-modal').classList.add('hidden');renderRoster();if(Object.keys(state.roster).length===12){$('build-status').textContent='Roster complete. Arrange the rotation and set your offense order.';$('save-team').disabled=false}};$('pull-options').appendChild(b)}
 $('pull-modal').classList.remove('hidden');
}
function normalizeOffense(){
 const starters=state.slots.filter(s=>s.starter).map(s=>state.roster[s.id]).filter(Boolean),ids=new Set(starters.map(c=>String(c.baseId))),keys=Object.keys(state.offense).filter(k=>ids.has(String(k))),vals=keys.map(k=>state.offense[k]);
 if(keys.length!==5||new Set(vals).size!==5){state.offense={};starters.slice().sort((a,b)=>cardValue(b)-cardValue(a)).forEach((c,i)=>state.offense[String(c.baseId)]=i+1)}
}
function rotationMinutes(roster){
 const mins=Array(12).fill(0);for(let i=0;i<5;i++){const c=byId.get(roster.cards[i]),opt=Number(roster.offense?.[String(c?.baseId)])||3;mins[i]=STARTER_MINUTES[opt]||33}BENCH_MINUTES.forEach((m,j)=>mins[j+5]=m);return mins;
}
function renderLineupTools(){
 $('lineup-tools').classList.remove('hidden');$('boost-banner').classList.add('hidden');normalizeOffense();const payload=rosterPayload(),mins=rotationMinutes(payload);
 $('rotation-summary').innerHTML=state.slots.map((s,i)=>`<span>${mins[i]} MIN · ${state.roster[s.id].name}${state.boostedCards.has(state.roster[s.id].id)?' · BOOST':''}</span>`).join('');
 const starters=state.slots.filter(s=>s.starter).map(s=>state.roster[s.id]);$('offense-controls').innerHTML='';starters.forEach(c=>{const lab=document.createElement('label');lab.textContent=c.name;const sel=document.createElement('select');for(let i=1;i<=5;i++){const o=document.createElement('option');o.value=i;o.textContent=`#${i}`;if(state.offense[String(c.baseId)]===i)o.selected=true;sel.appendChild(o)}sel.onchange=()=>setOffense(String(c.baseId),+sel.value);lab.appendChild(sel);$('offense-controls').appendChild(lab)});
}
function setOffense(baseId,n){const other=Object.keys(state.offense).find(k=>k!==baseId&&state.offense[k]===n),old=state.offense[baseId];state.offense[baseId]=n;if(other)state.offense[other]=old;renderLineupTools()}
function rosterPayload(){return{cards:state.slots.map(s=>state.roster[s.id].id),slots:state.slots.map(s=>({id:s.id,label:s.label,group:s.group,starter:s.starter,rotation:s.rotation})),offense:state.offense,boostedCards:[...state.boostedCards],boostCount:state.boostedCards.size}}
function loadPayload(p){
 if(!p||!Array.isArray(p.cards)||p.cards.length!==12)return false;const migratedIds=p.cards.map(id=>legacyCardMap[id]||id),loaded=migratedIds.map(id=>byId.get(id));if(loaded.some(x=>!x)){toast('One or more cards from this older save are no longer in the pool.');return false}p={...p,cards:migratedIds};
 state.slots=(p.slots&&p.slots.length===12)?p.slots:makeSlots();state.roster={};state.slots.forEach((s,i)=>state.roster[s.id]=loaded[i]);state.boostLocked=true;state.boostedSlots=new Set();state.boostedCards=new Set(p.boostedCards||[]);state.offense=p.offense||{};state.pendingPulls={};normalizeOffense();renderRoster();$('save-team').disabled=false;return true;
}
function h2h(card,defender){if(!defender)return null;const key=[slug(card.name),slug(defender.name)].sort().join('|');const recent=card.recentCard?REAL.h2hRecent?.[key]:null,raw=recent||REAL.h2h?.[key];if(!Array.isArray(raw)||raw.length<4)return null;return{gp:Number(raw[0])||0,ppg:Number(raw[1])||0,rpg:Number(raw[2])||0,apg:Number(raw[3])||0,effective:Number(raw[4])||Number(raw[0])||0,recent:Boolean(recent)}}
function playerLine(card,min,opt=3,defender=null,r=null){
 r=r||Math.random;const s=card.stats||{},ref=Number(s.mpg)>8?Number(s.mpg):24,scale=clamp(min/ref,.2,1.35),usage=[0,1.14,1.07,1,.94,.89][opt]||1;let p=Number(s.ppg)||0,reb=Number(s.rpg)||0,ast=Number(s.apg)||0;const sample=h2h(card,defender);
 if(sample&&sample.gp>=2){const rawW=(sample.recent?sample.effective:sample.gp)/((sample.recent?sample.effective:sample.gp)+(sample.recent?8:18)),cap=card.recentCard?.40:.24,w=Math.min(cap,rawW);p=p*(1-w)+sample.ppg*w;reb=reb*(1-w)+sample.rpg*w;ast=ast*(1-w)+sample.apg*w}
 const vol=.86+r()*.30,pts=Math.max(0,Math.round(p*scale*usage*vol)),rr=Math.max(0,Math.round(reb*scale*(.88+r()*.24))),aa=Math.max(0,Math.round(ast*scale*(.87+r()*.26)));return{name:card.name,version:card.versionLabel,min,pts,reb:rr,ast:aa};
}
function defaultPlan(roster){const starters=roster.slots.filter(s=>s.starter),defense={};starters.forEach((s,i)=>defense[s.id]=starters[i].id);return{offense:roster.offense||{},defense}}
function simulate(rosterA,rosterB,planA,planB,seed){
 const r=rng(seed),ca=rosterA.cards.map(id=>byId.get(id)),cb=rosterB.cards.map(id=>byId.get(id)),ma=rotationMinutes(rosterA),mb=rotationMinutes(rosterB);
 function side(cardsX,mins,rosterX,planX,cardsOpp,rosterOpp,oppPlan){return cardsX.map((c,i)=>{let def=null;if(i<5){const attSlot=rosterX.slots[i].id,defenderSlot=Object.keys(oppPlan.defense||{}).find(k=>oppPlan.defense[k]===attSlot);if(defenderSlot){const di=rosterOpp.slots.findIndex(s=>s.id===defenderSlot);def=cardsOpp[di]}}const opt=i<5?(planX.offense?.[String(c.baseId)]||3):3;return playerLine(c,mins[i],opt,def,r)})}
 let la=side(ca,ma,rosterA,planA,cb,rosterB,planB),lb=side(cb,mb,rosterB,planB,ca,rosterA,planA),sa=la.reduce((x,y)=>x+y.pts,0),sb=lb.reduce((x,y)=>x+y.pts,0);if(sa===sb){if(r()>.5){la[0].pts++;sa++}else{lb[0].pts++;sb++}}
 function qs(total){const w=[.23+r()*.05,.23+r()*.05,.23+r()*.05],a=w.map(x=>Math.round(total*x));a.push(total-a.reduce((x,y)=>x+y,0));return a}
 return{a:{score:sa,lines:la,q:qs(sa)},b:{score:sb,lines:lb,q:qs(sb)}};
}
function buildCpuRoster(seed){
 const r=rng(seed),used=new Set(),slots=makeSlots(),boostCount=Math.floor(r()*4),boosted=new Set(shuffle(slots.map(s=>s.id),r).slice(0,boostCount)),result=[],boostedCards=[];
 for(const s of slots){const opts=drawOptionsForSlot(s,used,boosted.has(s.id),`${seed}-${s.id}`);if(!opts.length)continue;const sorted=[...opts].sort((a,b)=>cardValue(b)-cardValue(a)),c=r()<.72?sorted[0]:pick(opts,r);used.add(String(c.baseId));result.push(c.id);if(boosted.has(s.id))boostedCards.push(c.id)}
 const roster={cards:result,slots,offense:{},boostedCards,boostCount};result.slice(0,5).map(id=>byId.get(id)).sort((a,b)=>cardValue(b)-cardValue(a)).forEach((c,i)=>roster.offense[String(c.baseId)]=i+1);return roster;
}
function ensureReady(){if(Object.keys(state.roster).length!==12){toast('Open all 12 roster spots first.');return false}return true}
function setupOpponent(roster,label,mode){state.opponent=roster;state.mode=mode;$('matchup-section').classList.remove('hidden');$('matchup-section').scrollIntoView({behavior:'smooth'});const my=rosterPayload(),opp=roster;if(!Object.keys(state.defense).length){my.slots.slice(0,5).forEach((s,i)=>state.defense[s.id]=opp.slots[i].id)}$('away-label').textContent=label;renderDefenseControls()}
function renderDefenseControls(){const my=rosterPayload(),opp=state.opponent,myStar=my.slots.slice(0,5),oppStar=opp.slots.slice(0,5);$('defense-controls').innerHTML='';myStar.forEach((s,i)=>{const c=byId.get(my.cards[i]),lab=document.createElement('label');lab.textContent=`${c.name} guards`;const sel=document.createElement('select');oppStar.forEach((os,j)=>{const oc=byId.get(opp.cards[j]),o=document.createElement('option');o.value=os.id;o.textContent=oc.name;if(state.defense[s.id]===os.id)o.selected=true;sel.appendChild(o)});sel.onchange=()=>uniqueDefense(s.id,sel.value);lab.appendChild(sel);$('defense-controls').appendChild(lab)})}
function uniqueDefense(slot,target){const old=state.defense[slot],other=Object.keys(state.defense).find(k=>k!==slot&&state.defense[k]===target);state.defense[slot]=target;if(other)state.defense[other]=old;renderDefenseControls()}
function startCpu(){if(!ensureReady())return;setupOpponent(buildCpuRoster('cpu-'+Date.now()),'CPU','cpu')}
function lockGameplan(){if(!state.opponent)return;const mine=rosterPayload(),planA={offense:state.offense,defense:state.defense};if(state.mode==='cpu'){state.series={mine,opp:state.opponent,planA,planB:defaultPlan(state.opponent),winsA:0,winsB:0,game:1,bestOf:1};openGame()}else if(state.online){submitOnlinePlan(planA)}}
function openGame(){$('matchup-section').classList.add('hidden');$('game-section').classList.remove('hidden');$('box-score-wrap').classList.add('hidden');$('home-score').textContent='0';$('away-score').textContent='0';$('game-state').textContent='READY';$('line-score').innerHTML='';$('simulate-game').disabled=false;$('simulate-game').textContent=state.series?.bestOf===7?`Simulate Game ${state.series.game}`:'Simulate game';$('game-section').scrollIntoView({behavior:'smooth'})}
function renderGameResult(g){$('home-score').textContent=g.a.score;$('away-score').textContent=g.b.score;$('game-state').textContent='FINAL';$('line-score').innerHTML=['Q1','Q2','Q3','Q4','FINAL'].map((q,i)=>`<div class="quarter-cell"><span>${q}</span><strong>${i<4?g.a.q[i]+'–'+g.b.q[i]:g.a.score+'–'+g.b.score}</strong></div>`).join('');const tr=x=>`<tr><td>${x.name}<small>${x.version}</small></td><td>${x.min}</td><td>${x.pts}</td><td>${x.reb}</td><td>${x.ast}</td></tr>`;$('home-box').innerHTML=g.a.lines.map(tr).join('');$('away-box').innerHTML=g.b.lines.map(tr).join('');$('box-score-wrap').classList.remove('hidden')}
function simClick(){if(state.series?.bestOf===7&&state.online){readyOnlineGame();return}const s=state.series;if(!s)return;const g=simulate(s.mine,s.opp,s.planA,s.planB,'ppp-'+Date.now());renderGameResult(g);$('simulate-game').disabled=true}
function teamPower(roster){const cs=roster.cards.map(id=>byId.get(id)),mins=rotationMinutes(roster);let p=0;cs.forEach((c,i)=>{const s=c.stats||{},ref=Number(s.mpg)>8?Number(s.mpg):24,sc=clamp(mins[i]/ref,.2,1.35),opt=i<5?(Number(roster.offense?.[String(c.baseId)])||3):3,usage=[0,1.12,1.06,1,.95,.9][opt]||1;p+=((Number(s.ppg)||0)*usage+.30*(Number(s.rpg)||0)+.46*(Number(s.apg)||0))*sc});return p}
function seasonAverages(roster){const r=rng('stats-'+roster.cards.join('|')),mins=rotationMinutes(roster),rows=roster.cards.map((id,i)=>{const c=byId.get(id),s=c.stats||{},ref=Number(s.mpg)>8?Number(s.mpg):24,scale=mins[i]?clamp(mins[i]/ref,.2,1.35):0,opt=i<5?(Number(roster.offense?.[String(c.baseId)])||3):3,usage=i<5?([0,1.14,1.07,1,.94,.89][opt]||1):[1.04,1,.96,.9,.84][Math.max(0,i-5)]||.84,seasonVar=.96+r()*.08;return{name:c.name,version:c.versionLabel,playstyle:c.playstyle,min:mins[i],ppg:(Number(s.ppg)||0)*scale*usage*seasonVar,rpg:(Number(s.rpg)||0)*scale*(.98+r()*.04),apg:(Number(s.apg)||0)*scale*(i<5?([0,1.08,1.04,1,.96,.92][opt]||1):.92+r()*.08)}});return rows}
function renderSeasonStats(rows){$('season-stats-body').innerHTML=rows.map(x=>`<tr><td>${x.name}<small>${x.version} · ${x.playstyle||''}</small></td><td>${x.min||'RES'}</td><td>${x.ppg.toFixed(1)}</td><td>${x.rpg.toFixed(1)}</td><td>${x.apg.toFixed(1)}</td></tr>`).join('')}
function simSeason(){
 if(!ensureReady())return;const roster=rosterPayload(),power=teamPower(roster),r=rng('season-'+roster.cards.join('|')+'|'+roster.boostCount),league=DATA.league||[],schedule=[];for(let rep=0;rep<2;rep++)schedule.push(...league);schedule.push(...shuffle(league,r).slice(0,22));let wins=0;for(const [,w,l] of schedule){const wp=w/(w+l),oppPower=145+(wp-.5)*42,chance=1/(1+Math.exp(-(power-oppPower)/12.5));if(r()<clamp(chance,.008,.992))wins++}const losses=82-wins,label=seasonLabel(wins);$('season-record').textContent=`${wins}–${losses}`;$('season-label').textContent=`${label} Season`;$('season-copy').textContent=seasonCopy(label,wins);$('season-boost-note').textContent=`${roster.boostCount} boost${roster.boostCount===1?'':'s'} used`;$('season-meter-fill').style.width=`${wins/82*100}%`;renderSeasonStats(seasonAverages(roster));$('season-result').classList.remove('hidden');$('season-result').scrollIntoView({behavior:'smooth'});saveHistory({roster,record:`${wins}-${losses}`,label,boostCount:roster.boostCount,when:Date.now()},true)
}
function seasonLabel(w){if(w===82)return'Perfect';if(w>=74)return'Elite';if(w>=68)return'Amazing';if(w>=60)return'Great';if(w>=51)return'Good';if(w>=42)return'Decent';if(w>=31)return'Mid';if(w>=21)return'Wack';if(w>=11)return'Trash';return'Abysmal'}
function seasonCopy(l,w){const m={Perfect:'82–0. Perfect season. Nothing else to say.',Elite:'Elite season. This roster owned the league.',Amazing:'Amazing season and a true title-level team.',Great:'Great season with a dominant regular season.',Good:'Good season. This roster clearly worked.',Decent:'Decent season with more wins than losses.',Mid:'Middle of the pack. Nothing special, nothing disastrous.',Wack:'Too many holes to keep up with the league.',Trash:'The pulls did not come together.',Abysmal:'Burn the tape and open another pack.'};return m[l]||`${w} wins.`}
function loadHistory(){try{const v2=localStorage.getItem('hooploop_ppp_history_v2');if(v2)return JSON.parse(v2);return JSON.parse(localStorage.getItem('hooploop_ppp_history_v1')||'[]')}catch{return[]}}
function saveHistory(item,silent=false){const key=item.roster.cards.join('|'),arr=state.history.filter(x=>x.roster.cards.join('|')!==key);arr.unshift(item);state.history=arr.slice(0,5);localStorage.setItem('hooploop_ppp_history_v2',JSON.stringify(state.history));renderHistory();if(!silent)toast('Team saved to history.')}
function renderHistory(){$('history-grid').innerHTML='';if(!state.history.length){$('history-grid').innerHTML='<div class="history-card"><strong>No teams yet.</strong><small>Your saved teams and season records will appear here.</small></div>';return}state.history.forEach((h,i)=>{const el=document.createElement('div');el.className='history-card';const names=h.roster.cards.slice(0,5).map(id=>byId.get(id)?.name).filter(Boolean),boosts=h.boostCount??h.roster?.boostCount??h.roster?.boostedCards?.length??0;el.innerHTML=`<strong>Team ${i+1}</strong><div class="record">${h.record||'Saved'}</div><small>${boosts} boost${boosts===1?'':'s'} · ${h.label?h.label+' Season · ':''}${names.join(', ')}</small><button class="secondary-button" style="margin-top:10px" type="button">Load</button>`;el.querySelector('button').onclick=()=>{loadPayload(h.roster);$('builder-section').scrollIntoView({behavior:'smooth'})};$('history-grid').appendChild(el)})}
function toast(msg){$('build-status').textContent=msg;setTimeout(()=>{if(Object.keys(state.roster).length===12)$('build-status').textContent='Roster complete. Arrange the rotation and set your offense order.'},2300)}
// ---------- online ----------
let sb=null,poll=null;
function initSupabase(){const c=window.HOOPLOOP_CONFIG||{};if(window.supabase&&c.SUPABASE_URL&&c.SUPABASE_ANON_KEY)sb=window.supabase.createClient(c.SUPABASE_URL,c.SUPABASE_ANON_KEY)}
async function rpc(name,args={}){if(!sb)throw new Error('Log in / Supabase setup required.');const{data,error}=await sb.rpc(name,args);if(error)throw error;return data}
async function startFriend(){if(!ensureOnline())return;$('friend-box').classList.remove('hidden')}
function ensureOnline(){if(!sb){toast('Online setup is required.');return false}return true}
async function sendFriend(){try{const row=await rpc('ppp_create_friend_match',{p_friend_username:$('friend-username').value.trim()});enterOnline(row,'friend')}catch(e){$('online-message').textContent=e.message}}
async function startRandom(){if(!ensureOnline())return;try{const row=await rpc('ppp_find_random_match');enterOnline(row,'random')}catch(e){toast(e.message)}}
function enterOnline(row,type){state.online={id:row.id,type,row};$('friend-box').classList.add('hidden');$('online-room').classList.remove('hidden');$('room-status').textContent=row.status==='searching'?'Finding opponent…':row.status==='invited'?'Invite sent':'Build room';$('room-message').textContent='When the match starts, both players get five minutes to build a fresh team.';if(row.status==='building'){resetBuilder('online-'+row.id);state.online={id:row.id,type,row};startBuildClock(row.build_deadline)}startPoll()}
function startBuildClock(deadline){clearInterval(state.onlineTimer);const tick=()=>{const ms=new Date(deadline)-Date.now(),sec=Math.max(0,Math.ceil(ms/1000));$('build-clock').textContent=`${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;if(sec<=0){clearInterval(state.onlineTimer);autoFinishOnline()}};tick();state.onlineTimer=setInterval(tick,500);$('submit-online-team').classList.remove('hidden')}
async function autoFinishOnline(){if(Object.keys(state.roster).length<12){if(!state.boostLocked){state.boostLocked=true;updateBoost()}for(const s of state.slots){if(!state.roster[s.id]){const used=new Set(Object.values(state.roster).map(c=>String(c.baseId))),boosted=state.boostedSlots.has(s.id),opts=drawOptionsForSlot(s,used,boosted,`auto-${state.online?.id}-${s.id}`),c=[...opts].sort((a,b)=>cardValue(b)-cardValue(a))[0];if(c){state.roster[s.id]=c;if(boosted)state.boostedCards.add(c.id)}}}renderRoster()}await submitOnlineTeam()}
async function submitOnlineTeam(){if(!ensureReady())return;try{const row=await rpc('ppp_submit_roster',{p_match_id:state.online.id,p_roster:rosterPayload()});$('submit-online-team').classList.add('hidden');if(row.status==='configuring'){state.online.row={...row,status:'building'};await beginOnlineConfig(row)}else{state.online.row=row;$('room-message').textContent='Team submitted. Waiting for the other roster.'}}catch(e){$('room-message').textContent=e.message}}
async function submitOnlinePlan(plan){try{const row=await rpc('ppp_submit_plan',{p_match_id:state.online.id,p_plan:plan});$('matchup-section').classList.add('hidden');$('online-room').classList.remove('hidden');if(row.status==='series'){state.online.row={...row,status:'configuring'};await enterSeriesRow(row)}else{state.online.row=row;$('room-message').textContent='Gameplan locked. Waiting for opponent.'}}catch(e){toast(e.message)}}
async function readyOnlineGame(){try{await rpc('ppp_ready_game',{p_match_id:state.online.id});$('simulate-game').disabled=true;$('game-state').textContent='WAITING';$('series-state').textContent='Both players must click simulate.'}catch(e){toast(e.message)}}
async function beginOnlineConfig(row){clearInterval(state.onlineTimer);const{data:{user}}=await sb.auth.getUser(),mineHost=user&&user.id===row.host_id,oppPayload=mineHost?row.guest_roster:row.host_roster;state.defense={};setupOpponent(oppPayload,'OPPONENT','online')}
async function enterSeriesRow(row){const{data:{user}}=await sb.auth.getUser(),host=user&&user.id===row.host_id;state.series={mine:host?row.host_roster:row.guest_roster,opp:host?row.guest_roster:row.host_roster,planA:host?row.host_plan:row.guest_plan,planB:host?row.guest_plan:row.host_plan,winsA:host?row.host_wins:row.guest_wins,winsB:host?row.guest_wins:row.host_wins,game:row.game_no,bestOf:7,host};state.online.row=row;openGame();$('series-state').textContent=`Series ${state.series.winsA}–${state.series.winsB}`}
async function pollMatch(){if(!sb||!state.online)return;const{data,error}=await sb.from('ppp_matches').select('*').eq('id',state.online.id).single();if(error||!data)return;const old=state.online.row||{},row=data;state.online.row=row;if(row.status==='building'&&old.status!=='building'){resetBuilder('online-'+row.id);state.online={id:row.id,type:state.online.type,row};startBuildClock(row.build_deadline);$('room-status').textContent='5-minute build';$('room-message').textContent='Build in any order. Submit early if you finish.'}if(row.status==='configuring'&&old.status!=='configuring')await beginOnlineConfig(row);if(row.status==='series'&&old.status!=='series')await enterSeriesRow(row);if(row.status==='series'&&row.host_game_ready&&row.guest_game_ready&&row.game_no===old.game_no){const{data:{user}}=await sb.auth.getUser();if(user&&user.id===row.host_id){const g=simulate(row.host_roster,row.guest_roster,row.host_plan,row.guest_plan,`${row.id}-game-${row.game_no}`);try{await rpc('ppp_record_game',{p_match_id:row.id,p_game_no:row.game_no,p_host_score:g.a.score,p_guest_score:g.b.score})}catch{}}}if((row.game_log?.length||0)!==(old.game_log?.length||0)&&row.game_log?.length){const last=row.game_log[row.game_log.length-1],hostSide=state.series?.host,g=simulate(row.host_roster,row.guest_roster,row.host_plan,row.guest_plan,`${row.id}-game-${last.game_no}`),view=hostSide?g:{a:g.b,b:g.a};renderGameResult(view);if(state.series){state.series.winsA=hostSide?row.host_wins:row.guest_wins;state.series.winsB=hostSide?row.guest_wins:row.host_wins;state.series.game=row.game_no;$('series-state').textContent=`Series ${state.series.winsA}–${state.series.winsB}`;if(row.status==='series'){$('simulate-game').disabled=false;$('simulate-game').textContent=`Simulate Game ${row.game_no}`}}}if(row.status==='finished'&&old.status!=='finished'){$('game-state').textContent=(state.series?.winsA>state.series?.winsB)?'SERIES WIN':'SERIES LOSS';$('simulate-game').disabled=true;$('series-state').textContent=`Final series ${state.series?.winsA||0}–${state.series?.winsB||0}`}}
function startPoll(){clearInterval(poll);poll=setInterval(pollMatch,1200);pollMatch()}
async function checkIncoming(){if(!sb||state.online)return;try{const{data:{user}}=await sb.auth.getUser();if(!user)return;const{data}=await sb.from('ppp_matches').select('*').eq('guest_id',user.id).eq('status','invited').order('created_at',{ascending:false}).limit(1);if(data&&data[0]){state.online={id:data[0].id,type:'friend',row:data[0]};$('online-room').classList.remove('hidden');$('room-status').textContent='Pack, Pull, Play invite';$('room-message').textContent='A friend challenged you to a best-of-seven.';$('accept-invite').classList.remove('hidden');startPoll()}}catch{}}
async function acceptInvite(){try{const row=await rpc('ppp_accept_match',{p_match_id:state.online.id});$('accept-invite').classList.add('hidden');state.online.row={...row,status:'invited'};await pollMatch()}catch(e){$('room-message').textContent=e.message}}
// events
$('lock-boosts').onclick=()=>{if(state.boostLocked)return;state.boostLocked=true;updateBoost();$('build-status').textContent=`${state.boostedSlots.size} boost${state.boostedSlots.size===1?'':'s'} locked. Open the 12 mystery cards in any order.`;renderRoster()};
$('new-team').onclick=()=>resetBuilder();$('save-team').onclick=()=>saveHistory({roster:rosterPayload(),record:null,label:null,boostCount:state.boostedCards.size,when:Date.now()});$('jump-builder').onclick=()=>$('builder-section').scrollIntoView({behavior:'smooth'});$('open-history-top').onclick=()=>$('history-section').scrollIntoView({behavior:'smooth'});$('close-pull').onclick=()=>$('pull-modal').classList.add('hidden');
[...document.querySelectorAll('.mode-card')].forEach(b=>b.onclick=()=>{const m=b.dataset.mode;if(m==='season')simSeason();if(m==='cpu')startCpu();if(m==='friend')startFriend();if(m==='random')startRandom()});$('send-friend-series').onclick=sendFriend;$('accept-invite').onclick=acceptInvite;$('submit-online-team').onclick=submitOnlineTeam;$('lock-gameplan').onclick=lockGameplan;$('simulate-game').onclick=simClick;$('season-new-team').onclick=()=>{resetBuilder();$('builder-section').scrollIntoView({behavior:'smooth'})};
initSupabase();resetBuilder();renderHistory();checkIncoming();
})();
