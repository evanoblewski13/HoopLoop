'use strict';

const DATA = window.HOOPLOOP_CASH_GRAB_DATA || { current: [], allTime: [] };
const $ = id => document.getElementById(id);
const qsa = selector => [...document.querySelectorAll(selector)];
const STORAGE = 'hooploop_cash_grab_v1';
const BUDGET = 15;
const ROSTER_SIZE = 5;
const GAUNTLET = [
  [1,1,1,1,1], [1,1,1,2,2], [2,2,2,2,2], [2,2,2,3,3], [2,3,3,3,3],
  [3,3,3,3,3], [3,3,3,4,4], [4,4,4,4,4], [4,4,4,5,5], [5,5,5,5,5]
];

const state = {
  mode: 'current', board: [], selected: [], quickWins: 0, quickLosses: 0,
  gauntletRound: 0, gauntletActive: false, currentOpponent: null, currentBattle: null
};

function loadLocal() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE) || '{}');
    state.quickWins = Number(saved.quickWins) || 0;
    state.quickLosses = Number(saved.quickLosses) || 0;
    state.bestRound = Number(saved.bestRound) || 0;
  } catch { state.bestRound = 0; }
}
function saveLocal() {
  try { localStorage.setItem(STORAGE, JSON.stringify({ quickWins:state.quickWins, quickLosses:state.quickLosses, bestRound:state.bestRound || 0 })); } catch {}
}
function shuffle(items) { const arr = [...items]; for (let i=arr.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; }
function clamp(v,min,max){return Math.min(max,Math.max(min,v));}
function average(values){return values.length ? values.reduce((a,b)=>a+b,0)/values.length : 0;}
function round(v,n=0){const f=10**n; return Math.round(v*f)/f;}
function pricePool(mode, price) {
  if (mode === 'current') return DATA.current.filter(p=>p.price===price);
  if (mode === 'alltime') return DATA.allTime.filter(p=>p.price===price);
  return [...DATA.current,...DATA.allTime].filter(p=>p.price===price);
}
function makeBoard() {
  const rows = [];
  for (let price=1; price<=5; price++) {
    const pool = pricePool(state.mode, price);
    if (state.mode === 'mixed') {
      const current = shuffle(DATA.current.filter(p=>p.price===price)).slice(0,3);
      const all = shuffle(DATA.allTime.filter(p=>p.price===price)).slice(0,2);
      rows.push(...shuffle([...current,...all]));
    } else rows.push(...pool.slice(0,5));
  }
  state.board = rows;
  state.selected = [];
  state.gauntletActive = false;
  state.gauntletRound = 0;
  renderAll();
}
function usedBudget(){return state.selected.reduce((sum,p)=>sum+p.price,0);}
function skillBars(player){
  const markers = [player.shooting, player.playmaking, Math.max(player.perimeterDefense,player.rimDefense), player.rebounding].map(v=>v>=88?'hot':'');
  return markers.map(c=>`<i class="${c}"></i>`).join('');
}
function renderBoard(){
  const board = $('price-board'); board.innerHTML='';
  for(let price=1;price<=5;price++){
    const col=document.createElement('section'); col.className='price-column';
    const players=state.board.filter(p=>p.price===price);
    col.innerHTML=`<div class="price-heading"><strong>$${price}</strong><span>${players.length} OPTIONS</span></div>`;
    players.forEach(player=>{
      const selected=state.selected.some(p=>p.id===player.id);
      const wouldCost=usedBudget()+player.price;
      const disabled=!selected && (state.selected.length>=ROSTER_SIZE || wouldCost>BUDGET);
      const b=document.createElement('button'); b.type='button'; b.className=`player-card${selected?' selected':''}`; b.disabled=disabled;
      b.innerHTML=`<div class="player-topline"><strong>${player.name}</strong><span class="price-chip">$${player.price}</span></div><div class="player-meta"><span>${player.pos}</span><span>${player.archetype}</span>${state.mode==='mixed'?`<span>${player.era==='current'?'CURRENT':'ALL-TIME'}</span>`:''}</div><div class="fit-preview">${skillBars(player)}</div>`;
      b.onclick=()=>togglePlayer(player); col.appendChild(b);
    }); board.appendChild(col);
  }
}
function togglePlayer(player){
  const idx=state.selected.findIndex(p=>p.id===player.id);
  if(idx>=0) state.selected.splice(idx,1);
  else {
    if(state.selected.length>=ROSTER_SIZE) return toast('Five roster spots are already filled.');
    if(usedBudget()+player.price>BUDGET) return toast('That player would put you over $15.');
    state.selected.push(player);
  }
  renderAll();
}
function teamMetrics(team){
  if(!team.length) return {fit:0,talent:0,versatility:0,power:0,grade:'--',notes:[]};
  const guards=team.filter(p=>p.pos==='G').length, forwards=team.filter(p=>p.pos==='F').length, bigs=team.filter(p=>p.pos==='B').length;
  const shooting=average(team.map(p=>p.shooting));
  const nonShooters=team.filter(p=>p.shooting<68).length;
  const makers=[...team].sort((a,b)=>b.playmaking-a.playmaking).map(p=>p.playmaking);
  const creation=(makers[0]||0)*.62+(makers[1]||0)*.26+(makers[2]||0)*.12;
  const perimeter=average(team.map(p=>p.perimeterDefense));
  const rim=Math.max(...team.map(p=>p.rimDefense));
  const defense=perimeter*.58+rim*.42;
  const reb=average([...team].sort((a,b)=>b.rebounding-a.rebounding).slice(0,3).map(p=>p.rebounding));
  const offball=average(team.map(p=>p.offBall));
  const usages=team.map(p=>p.usage); const highUsage=usages.filter(v=>v>=90).length;
  const positionBalance=(guards>=1?34:0)+(bigs>=1?34:0)+(forwards>=1?18:0)+(new Set(team.map(p=>p.pos)).size===3?14:0);
  const usageBalance=clamp(92-Math.max(0,highUsage-2)*15+(Math.max(...usages)>=85?6:-10),45,100);
  const spacing=clamp(shooting-nonShooters*5+(team.filter(p=>p.shooting>=90).length*3),35,100);
  const fit=clamp(positionBalance*.16+spacing*.20+creation*.17+defense*.18+reb*.10+offball*.10+usageBalance*.09,25,99);
  const talent=average(team.map(p=>p.scoring*.16+p.shooting*.09+p.playmaking*.10+p.perimeterDefense*.10+p.rimDefense*.10+p.rebounding*.09+p.finishing*.10+p.athleticism*.06+p.offBall*.07+p.versatility*.13));
  const versatility=average(team.map(p=>p.versatility));
  const power=fit*.60+talent*.31+versatility*.09;
  const grade=power>=94?'S':power>=90?'A+':power>=86?'A':power>=82?'B+':power>=78?'B':power>=73?'C+':'C';
  const notes=[];
  if(positionBalance>=90) notes.push('Balanced size and roles'); else if(!bigs) notes.push('No true big hurts interior matchups'); else if(!guards) notes.push('No true guard limits creation');
  if(shooting>=88) notes.push('Elite spacing'); else if(nonShooters>=2) notes.push('Spacing can get cramped');
  if(creation>=90) notes.push('High-end playmaking'); else if(creation<76) notes.push('Creation could stall');
  if(defense>=90) notes.push('High-level defensive ceiling');
  if(reb>=90) notes.push('Controls the glass');
  if(highUsage>=4) notes.push('Too many ball-dominant scorers');
  if(offball>=92) notes.push('Excellent off-ball compatibility');
  return {fit:round(fit),talent:round(talent),versatility:round(versatility),power:round(power,1),grade,notes};
}
function renderTeam(){
  const cost=usedBudget(), left=BUDGET-cost;
  $('budget-left').textContent=`$${left}`; $('roster-count').textContent=`${state.selected.length} / 5`; $('team-cost').textContent=`$${cost} / $15`; $('budget-meter').style.width=`${cost/BUDGET*100}%`;
  $('selected-team').innerHTML=Array.from({length:5},(_,i)=>state.selected[i]?`<div class="selected-slot filled"><strong>${state.selected[i].name}</strong><span>$${state.selected[i].price} · ${state.selected[i].pos} · ${state.selected[i].archetype}</span></div>`:`<div class="selected-slot"><strong>Open spot</strong><span>Choose from the board</span></div>`).join('');
  const complete=state.selected.length===5;
  $('team-title').textContent=complete?'Your five are ready.':'Choose five players.';
  $('team-analysis').classList.toggle('hidden',!complete); $('fit-notes').classList.toggle('hidden',!complete); $('battle-select').classList.toggle('hidden',!complete);
  if(complete){ const m=teamMetrics(state.selected); $('fit-score').textContent=m.fit; $('talent-score').textContent=m.talent; $('versatility-score').textContent=m.versatility; $('team-grade').textContent=m.grade; $('fit-notes').innerHTML=m.notes.map(n=>`<span class="fit-note">${n}</span>`).join(''); }
  $('quick-record').textContent=`Record: ${state.quickWins}–${state.quickLosses}`;
  $('gauntlet-best').textContent=state.bestRound?`Best: Round ${state.bestRound}`:'Best: Not started';
}
function renderAll(){renderBoard();renderTeam();renderGauntletMap();$('shuffle-mixed').classList.toggle('hidden',state.mode!=='mixed');qsa('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===state.mode));}
function randomLegalTeam(mode=state.mode){
  const pool=mode==='current'?DATA.current:mode==='alltime'?DATA.allTime:[...DATA.current,...DATA.allTime];
  let best=null;
  for(let i=0;i<800;i++){
    const team=shuffle(pool).slice(0,5); const cost=team.reduce((s,p)=>s+p.price,0);
    if(cost<=15 && cost>=12 && new Set(team.map(p=>p.id)).size===5){ if(!best || Math.abs(15-cost)<Math.abs(15-best.cost)) best={team,cost}; if(cost===15 && Math.random()<.16) break; }
  }
  return best?.team || shuffle(pool.filter(p=>p.price<=3)).slice(0,5);
}
function gauntletOpponent(round){
  const prices=GAUNTLET[round-1]; const team=[];
  prices.forEach(price=>{ const available=pricePool(state.mode,price).filter(p=>!team.some(x=>x.id===p.id)); const pick=shuffle(available)[0]; if(pick) team.push(pick); });
  return team;
}
function matchupAdjustment(offense, defense){
  const offenseShoot=average(offense.map(p=>p.shooting)), offenseFinish=average(offense.map(p=>p.finishing));
  const defensePer=average(defense.map(p=>p.perimeterDefense)), defenseRim=Math.max(...defense.map(p=>p.rimDefense));
  return ((offenseShoot-defensePer)*.045)+((offenseFinish-defenseRim)*.035);
}
function gaussian(){let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
function simulate(teamA,teamB){
  const a=teamMetrics(teamA), b=teamMetrics(teamB);
  const adjA=matchupAdjustment(teamA,teamB), adjB=matchupAdjustment(teamB,teamA);
  const effA=a.power+adjA, effB=b.power+adjB;
  const chance=clamp(1/(1+Math.exp(-(effA-effB)/6.8)),.08,.92);
  const aWins=Math.random()<chance;
  const pace=gaussian()*4;
  const offenseA=average(teamA.map(p=>p.scoring*.38+p.shooting*.25+p.finishing*.19+p.playmaking*.18));
  const offenseB=average(teamB.map(p=>p.scoring*.38+p.shooting*.25+p.finishing*.19+p.playmaking*.18));
  let scoreA=Math.round(89+offenseA*.29+a.fit*.055+pace+gaussian()*6);
  let scoreB=Math.round(89+offenseB*.29+b.fit*.055+pace+gaussian()*6);
  if(aWins && scoreA<=scoreB) scoreA=scoreB+Math.ceil(1+Math.random()*8);
  if(!aWins && scoreB<=scoreA) scoreB=scoreA+Math.ceil(1+Math.random()*8);
  return {a,b,effA,effB,chance,aWins,scoreA,scoreB};
}
function rosterHtml(team){return team.map(p=>`<div class="match-player"><strong>${p.name}</strong><span>$${p.price} · ${p.pos} · ${p.archetype}</span></div>`).join('');}
function startBattle(opponent,type,label){
  state.currentOpponent=opponent; state.currentBattle={type,label};
  const result=simulate(state.selected,opponent); state.currentBattle.result=result;
  $('matchup-section').classList.remove('hidden'); $('matchup-kicker').textContent=type==='gauntlet'?`GAUNTLET · ROUND ${state.gauntletRound}`:'QUICK MATCH'; $('matchup-title').textContent=label;
  $('your-match-roster').innerHTML=rosterHtml(state.selected); $('opponent-match-roster').innerHTML=rosterHtml(opponent); $('opponent-label').textContent=type==='gauntlet'?`ROUND ${state.gauntletRound}`:'CPU'; $('your-power').textContent=result.a.power; $('opponent-power').textContent=result.b.power;
  $('final-score').textContent=`${result.scoreA}–${result.scoreB}`; renderResult();
  $('matchup-section').scrollIntoView({behavior:'smooth',block:'start'});
}
function renderResult(){
  const {result,type}=state.currentBattle; const won=result.aWins;
  $('result-card').classList.remove('hidden'); $('result-title').textContent=won?'Your lineup wins.':'The opponent takes it.'; $('result-kicker').textContent=won?'WIN':'LOSS';
  const edge=result.a.fit-result.b.fit; const fitText=Math.abs(edge)<2?'The fit scores were nearly even.':edge>0?'Your lineup had the cleaner basketball fit.':'Their lineup fit together better.';
  $('result-copy').textContent=`${fitText} Fit drives 60% of team power, with talent and versatility deciding the rest before matchup variance.`;
  $('comparison-grid').innerHTML=`<div><span>FIT</span><strong>${result.a.fit} vs ${result.b.fit}</strong></div><div><span>TALENT</span><strong>${result.a.talent} vs ${result.b.talent}</strong></div><div><span>VERSATILITY</span><strong>${result.a.versatility} vs ${result.b.versatility}</strong></div>`;
  if(type==='quick'){ won?state.quickWins++:state.quickLosses++; saveLocal(); $('result-next').textContent='Back to builder'; $('result-rematch').classList.remove('hidden'); }
  else {
    if(won){ state.bestRound=Math.max(state.bestRound||0,state.gauntletRound); saveLocal(); if(state.gauntletRound===10){state.gauntletActive=false;$('result-next').textContent='Gauntlet conquered';toast('Gauntlet complete!','You cleared all ten rounds.');} else $('result-next').textContent=`Continue to Round ${state.gauntletRound+1}`; }
    else { state.gauntletActive=false; state.bestRound=Math.max(state.bestRound||0,state.gauntletRound-1); saveLocal(); $('result-next').textContent='Restart Gauntlet'; }
    $('result-rematch').classList.add('hidden'); renderGauntletMap();
  }
  renderTeam();
}
function nextResultAction(){
  const battle=state.currentBattle;if(!battle)return;
  if(battle.type==='quick'){ $('builder').scrollIntoView({behavior:'smooth'});return; }
  const won=battle.result.aWins;
  if(won && state.gauntletRound<10){state.gauntletRound++;startBattle(gauntletOpponent(state.gauntletRound),'gauntlet',`Round ${state.gauntletRound} of 10`);} else if(!won){startGauntlet();} else $('builder').scrollIntoView({behavior:'smooth'});
}
function startGauntlet(){ if(state.selected.length!==5)return; state.gauntletActive=true; state.gauntletRound=1; renderGauntletMap(); startBattle(gauntletOpponent(1),'gauntlet','Round 1 of 10'); }
function renderGauntletMap(){
  $('gauntlet-map').innerHTML=GAUNTLET.map((prices,i)=>{const round=i+1;const cls=state.gauntletActive&&round===state.gauntletRound?' current':(state.bestRound||0)>=round?' completed':'';const counts=[1,2,3,4,5].map(p=>[p,prices.filter(x=>x===p).length]).filter(x=>x[1]);return `<div class="gauntlet-round${cls}"><span>ROUND ${round}</span><strong>${round===10?'Final Boss':round<=3?'Opening':round<=6?'Pressure':'Elite'}</strong><div class="tier-dots">${counts.map(([p,c])=>`<i>${c}×$${p}</i>`).join('')}</div></div>`;}).join('');
}
function openHow(){
  $('modal-content').innerHTML=`<span class="overline">MATCHUP ENGINE</span><h2 id="modal-title">Fit comes first.</h2><p>Cash Grab is not simply “who spent more.” Every lineup is evaluated in three layers:</p><ul class="modal-list"><li><strong>60% Fit</strong><br>Position balance, spacing, creation, perimeter defense, rim protection, rebounding, off-ball value, and usage compatibility.</li><li><strong>31% Talent</strong><br>The actual basketball skill profile of the five players.</li><li><strong>9% Versatility</strong><br>How many different jobs the lineup can solve.</li></ul><p>A matchup adjustment and normal game variance are added after that, so the better team is favored without being guaranteed to win.</p>`;
  $('modal-backdrop').classList.remove('hidden');
}
function toast(title,message=''){const el=document.createElement('div');el.className='toast';el.innerHTML=`<strong>${title}</strong>${message?`<span>${message}</span>`:''}`;$('toast-region').appendChild(el);setTimeout(()=>el.remove(),3500);}

function init(){
  loadLocal(); makeBoard();
  $('jump-board').onclick=()=>$('builder').scrollIntoView({behavior:'smooth'}); $('how-button').onclick=openHow; $('modal-close').onclick=()=>$('modal-backdrop').classList.add('hidden'); $('modal-backdrop').onclick=e=>{if(e.target===$('modal-backdrop'))$('modal-backdrop').classList.add('hidden');};
  qsa('[data-mode]').forEach(button=>button.onclick=()=>{state.mode=button.dataset.mode;makeBoard();});
  $('clear-team').onclick=()=>{state.selected=[];state.gauntletActive=false;renderAll();}; $('shuffle-mixed').onclick=()=>makeBoard();
  $('quick-match').onclick=()=>startBattle(randomLegalTeam(),'quick','Your five vs. a random $15 roster'); $('start-gauntlet').onclick=startGauntlet;
  $('back-to-builder').onclick=()=>$('builder').scrollIntoView({behavior:'smooth'}); $('result-next').onclick=nextResultAction; $('result-rematch').onclick=()=>startBattle(randomLegalTeam(),'quick','Your five vs. a random $15 roster');
}

document.addEventListener('DOMContentLoaded',init);
