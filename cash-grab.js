'use strict';

const DATA = window.HOOPLOOP_CASH_GRAB_DATA || { current: [], allTime: [] };
const CONFIG = window.HOOPLOOP_CONFIG || {};
const $ = id => document.getElementById(id);
const qsa = selector => [...document.querySelectorAll(selector)];
const STORAGE = 'hooploop_cash_grab_v3';
const BUDGET = 15;
const ROSTER_SIZE = 5;
const LAUNCH_DATE = '2026-08-08';
const GAUNTLET = [
  [1,1,1,1,1], [1,1,1,2,2], [2,2,2,2,2], [2,2,2,3,3], [2,3,3,3,3],
  [3,3,3,3,3], [3,3,3,4,4], [4,4,4,4,4], [4,4,4,5,5], [5,5,5,5,5]
];
const WEIGHTS = { fit:.50, talent:.30, versatility:.20 };
const SNAKE = [0,1,1,0,0,1,1,0,0,1];
const ONLINE_READY = Boolean(window.supabase && /^https:\/\/.+\.supabase\.co$/i.test(String(CONFIG.SUPABASE_URL || '')) && String(CONFIG.SUPABASE_ANON_KEY || '').length > 20 && !String(CONFIG.SUPABASE_ANON_KEY).includes('PASTE_'));
const db = ONLINE_READY ? window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } }) : null;

const state = {
  mode:'current', boardType:'daily', selectedDate:'', boardNonce:0, board:[], selected:[],
  quickWins:0, quickLosses:0, bestRound:0,
  gauntletRound:0, gauntletActive:false, gauntletCleared:0, gauntletFailedRound:null,
  gauntletTotals:{for:0,against:0}, gauntletTeam:[], officialDaily:false, dailyRunId:null, dailyAttemptUsed:false,
  currentBattle:null, currentOpponent:null,
  user:null, profile:null, onlineChannel:null,
  draft:null
};

function escapeHtml(value=''){return String(value).replace(/[&<>'"]/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c]));}
function clamp(v,min,max){return Math.min(max,Math.max(min,v));}
function average(values){return values.length ? values.reduce((a,b)=>a+b,0)/values.length : 0;}
function round(v,n=0){const f=10**n;return Math.round(v*f)/f;}
function sum(values){return values.reduce((a,b)=>a+b,0);}
function shuffle(items, rand=Math.random){const arr=[...items];for(let i=arr.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;}
function hashString(text){let h=2166136261>>>0;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function seededRandom(seedText){let a=hashString(seedText)||1;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function normal(rand=Math.random){let u=0,v=0;while(!u)u=rand();while(!v)v=rand();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
function formatDate(date){return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));}
function chicagoDate(){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const get=t=>parts.find(p=>p.type===t)?.value;return `${get('year')}-${get('month')}-${get('day')}`;}
function shiftDate(date,days){const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
function normName(value=''){return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');}
function playersForMode(mode=state.mode){return mode==='alltime'?DATA.allTime:DATA.current;}
function allPlayers(){return [...DATA.current,...DATA.allTime];}
function playerById(id){return allPlayers().find(p=>p.id===id);}
function pricePool(mode,price){return playersForMode(mode).filter(p=>p.price===price);}
function usedBudget(team=state.selected){return team.reduce((s,p)=>s+p.price,0);}
function ids(team){return team.map(p=>p.id);}
function boardIds(){return state.board.map(p=>p.id);}
function currentBoardKey(){return state.boardType==='daily'?`${state.selectedDate}|${state.mode}`:`random|${state.mode}|${hashString(boardIds().join('|'))}`;}
function isToday(){return state.selectedDate===chicagoDate();}
function isPast(){return state.selectedDate<chicagoDate();}

function loadLocal(){
  try{
    const saved=JSON.parse(localStorage.getItem(STORAGE)||'{}');
    state.quickWins=Number(saved.quickWins)||0; state.quickLosses=Number(saved.quickLosses)||0; state.bestRound=Number(saved.bestRound)||0;
  }catch{}
}
function saveLocal(){try{localStorage.setItem(STORAGE,JSON.stringify({quickWins:state.quickWins,quickLosses:state.quickLosses,bestRound:state.bestRound}));}catch{}}
function localDailyKey(){return `hooploop_cg_daily_${state.selectedDate}_${state.mode}`;}
function localDailyUsed(){try{return localStorage.getItem(localDailyKey())==='1';}catch{return false;}}
function markLocalDailyUsed(){try{localStorage.setItem(localDailyKey(),'1');}catch{}}

function chooseBoardFive(pool,rand){
  const guards=shuffle(pool.filter(p=>p.group==='G'),rand).slice(0,2);
  const forwards=shuffle(pool.filter(p=>p.group==='F'),rand).slice(0,2);
  const centers=shuffle(pool.filter(p=>p.group==='C'),rand).slice(0,1);
  if(guards.length<2||forwards.length<2||centers.length<1)throw new Error('A price tier does not have enough G-G-F-F-C players.');
  return [...guards,...forwards,...centers];
}
function generateBoard(mode=state.mode, boardType=state.boardType, nonce=state.boardNonce, date=state.selectedDate){
  const seedBase=boardType==='daily'?`cashgrab-v3|${date}|${mode}`:`cashgrab-v3|random|${mode}|${Date.now()}|${nonce}|${Math.random()}`;
  const board=[];
  for(let price=1;price<=5;price++){
    const rand=seededRandom(`${seedBase}|$${price}`);
    board.push(...chooseBoardFive(pricePool(mode,price),rand));
  }
  return board;
}
function setBoard(board){
  state.board=[...board];state.selected=[];state.gauntletActive=false;state.gauntletRound=0;state.gauntletCleared=0;state.gauntletFailedRound=null;state.gauntletTotals={for:0,against:0};state.gauntletTeam=[];state.officialDaily=false;state.dailyRunId=null;
  renderAll();checkDailyAttempt();
}
function makeBoard(){setBoard(generateBoard());}

function renderBoard(){
  const root=$('price-board');root.innerHTML='';
  for(let price=1;price<=5;price++){
    const col=document.createElement('section');col.className='price-column';
    const players=state.board.filter(p=>p.price===price);
    col.innerHTML=`<div class="price-heading"><strong>$${price}</strong><span>G · G · F · F · C</span></div>`;
    players.forEach(player=>{
      const selected=state.selected.some(p=>p.id===player.id);
      const disabled=!selected&&(state.selected.length>=5||usedBudget()+player.price>15);
      const b=document.createElement('button');b.type='button';b.className=`player-card${selected?' selected':''}`;b.disabled=disabled;
      b.innerHTML=`<div class="player-topline"><strong>${escapeHtml(player.name)}</strong><span class="price-chip">$${player.price}</span></div><div class="player-meta"><span class="position-row-badge">${player.group}</span><span>${player.pos}</span><span>${escapeHtml(player.archetype)}</span></div>`;
      b.onclick=()=>togglePlayer(player);col.appendChild(b);
    });
    root.appendChild(col);
  }
}
function togglePlayer(player){
  const idx=state.selected.findIndex(p=>p.id===player.id);
  if(idx>=0)state.selected.splice(idx,1);else{
    if(state.selected.length>=5)return toast('Your lineup already has five players.');
    if(usedBudget()+player.price>15)return toast('That pick would put you over $15.');
    state.selected.push(player);
  }
  renderAll();
}

function teamMetrics(team){
  if(!team.length)return{fit:0,talent:0,versatility:0,power:0,grade:'--',notes:[]};
  const guards=team.filter(p=>p.group==='G').length,forwards=team.filter(p=>p.group==='F').length,centers=team.filter(p=>p.group==='C').length;
  const shooting=average(team.map(p=>p.shooting)),nonShooters=team.filter(p=>p.shooting<68).length;
  const makers=[...team].sort((a,b)=>b.playmaking-a.playmaking).map(p=>p.playmaking);const creation=(makers[0]||0)*.62+(makers[1]||0)*.26+(makers[2]||0)*.12;
  const perimeter=average(team.map(p=>p.perimeterDefense));const rim=Math.max(...team.map(p=>p.rimDefense));const defense=perimeter*.58+rim*.42;
  const reb=average([...team].sort((a,b)=>b.rebounding-a.rebounding).slice(0,3).map(p=>p.rebounding));const offball=average(team.map(p=>p.offBall));
  const usages=team.map(p=>p.usage),highUsage=usages.filter(v=>v>=90).length;
  const shape=(guards>=1?22:0)+(centers>=1?23:0)+(forwards>=1?14:0)+(guards>=2&&guards<=3?15:0)+(forwards>=1&&forwards<=3?10:0)+(new Set(team.map(p=>p.group)).size===3?16:0);
  const usageBalance=clamp(94-Math.max(0,highUsage-2)*16+(Math.max(...usages)>=85?5:-8),40,100);
  const spacing=clamp(shooting-nonShooters*5+team.filter(p=>p.shooting>=90).length*3,32,100);
  const fit=clamp(shape*.17+spacing*.20+creation*.16+defense*.18+reb*.10+offball*.10+usageBalance*.09,25,99);
  const talent=average(team.map(p=>p.scoring*.16+p.shooting*.09+p.playmaking*.10+p.perimeterDefense*.10+p.rimDefense*.10+p.rebounding*.09+p.finishing*.10+p.athleticism*.06+p.offBall*.07+p.versatility*.13));
  const skillSpread=average(team.map(p=>Math.max(p.shooting,p.playmaking,p.perimeterDefense,p.rimDefense,p.rebounding, p.finishing)));
  const roleDiversity=new Set(team.map(p=>p.archetype)).size;
  const versatility=clamp(average(team.map(p=>p.versatility))*.78+skillSpread*.12+roleDiversity*2,25,99);
  const power=fit*.50+talent*.30+versatility*.20;
  const grade=power>=94?'S':power>=90?'A+':power>=86?'A':power>=82?'B+':power>=78?'B':power>=73?'C+':'C';const notes=[];
  if(guards>=2&&forwards>=1&&centers>=1)notes.push('Strong lineup balance');else if(!centers)notes.push('No true center');else if(!guards)notes.push('No true guard');
  if(shooting>=88)notes.push('Elite spacing');else if(nonShooters>=2)notes.push('Crowded spacing');
  if(creation>=90)notes.push('Multiple creators');else if(creation<76)notes.push('Limited creation');
  if(defense>=90)notes.push('Elite defensive ceiling');if(reb>=90)notes.push('Strong rebounding');if(highUsage>=4)notes.push('Several ball-dominant scorers');if(offball>=92)notes.push('Excellent off-ball fit');
  return{fit:round(fit),talent:round(talent),versatility:round(versatility),power:round(power,1),grade,notes};
}

function renderTeam(){
  const cost=usedBudget();$('budget-left').textContent=`$${15-cost}`;$('roster-count').textContent=`${state.selected.length} / 5`;$('team-cost').textContent=`$${cost} / $15`;$('budget-meter').style.width=`${cost/15*100}%`;
  $('selected-team').innerHTML=Array.from({length:5},(_,i)=>state.selected[i]?`<div class="selected-slot filled"><strong>${escapeHtml(state.selected[i].name)}</strong><span>$${state.selected[i].price} · ${state.selected[i].pos} · ${escapeHtml(state.selected[i].archetype)}</span></div>`:`<div class="selected-slot"><strong>Open spot</strong><span>Choose from the board</span></div>`).join('');
  const complete=state.selected.length===5;$('team-title').textContent=complete?'Your five are ready.':'Choose five players.';
  $('team-analysis').classList.toggle('hidden',!complete);$('fit-notes').classList.toggle('hidden',!complete);
  if(complete){const m=teamMetrics(state.selected);$('fit-score').textContent=m.fit;$('talent-score').textContent=m.talent;$('versatility-score').textContent=m.versatility;$('team-grade').textContent=m.grade;$('fit-notes').innerHTML=m.notes.map(n=>`<span class="fit-note">${escapeHtml(n)}</span>`).join('');}
  $('bot-match').disabled=!complete;$('start-gauntlet').disabled=!complete;
  $('quick-record').textContent=`Record: ${state.quickWins}–${state.quickLosses}`;$('gauntlet-best').textContent=state.bestRound?`Practice best: Round ${state.bestRound}`:'Practice best: Not started';
  updateGauntletButton();
}
function renderAll(){
  renderBoard();renderTeam();renderGauntletMap();
  $('shuffle-board').classList.toggle('hidden',state.boardType!=='random');$('daily-date-controls').classList.toggle('hidden',state.boardType!=='daily');
  $('board-label').textContent=state.boardType==='daily'?`DAILY · ${formatDate(state.selectedDate)}`:'RANDOM BOARD';
  qsa('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===state.mode));qsa('[data-board-type]').forEach(b=>b.classList.toggle('active',b.dataset.boardType===state.boardType));
  $('daily-date').value=state.selectedDate;$('next-day').disabled=state.selectedDate>=chicagoDate();
  renderDailyStatus();
}
function renderDailyStatus(){
  const el=$('daily-status');
  if(state.boardType!=='daily'){el.classList.add('hidden');return;}el.classList.remove('hidden');
  if(isToday()) el.innerHTML=state.dailyAttemptUsed?`<strong>Today's official attempt is used.</strong> You can still practice this board, but the leaderboard result is locked.`:`<strong>One official attempt available.</strong> Your Daily score is the furthest Gauntlet round you clear.`;
  else el.innerHTML=`<strong>Archive · ${formatDate(state.selectedDate)}</strong> This board is practice-only. The official standings for this date are locked.`;
}
function updateGauntletButton(){
  const btn=$('start-gauntlet'),head=$('gauntlet-heading'),copy=$('gauntlet-copy');
  if(state.boardType==='random'){head.textContent='Practice Gauntlet';copy.textContent='Unlimited Gauntlet runs on your Random board.';btn.textContent='Start Practice Gauntlet';return;}
  if(isToday()&&!state.dailyAttemptUsed&&state.user){head.textContent='Daily Gauntlet';copy.textContent='One official attempt today. Furthest round is your Daily score.';btn.textContent='Start Official Daily';}
  else if(isToday()&&!state.user){head.textContent='Daily Gauntlet';copy.textContent='Log in for one official leaderboard attempt. Guest runs are practice.';btn.textContent='Practice Gauntlet';}
  else {head.textContent=isToday()?'Daily Gauntlet':'Archived Daily';copy.textContent=isToday()?'Your official attempt is locked. Practice as much as you want.':'Replay this old Daily board for practice.';btn.textContent='Practice Gauntlet';}
}

function playerTalent(p){return p.scoring*.16+p.shooting*.09+p.playmaking*.10+p.perimeterDefense*.10+p.rimDefense*.10+p.rebounding*.09+p.finishing*.10+p.athleticism*.06+p.offBall*.07+p.versatility*.13;}
function opponentDefense(team){return average(team.map(p=>p.perimeterDefense*.58+p.rimDefense*.42));}
function allocInteger(total,weights){if(total<=0)return weights.map(()=>0);const s=sum(weights)||1;const raw=weights.map(w=>total*w/s),base=raw.map(Math.floor);let rem=total-sum(base);const order=raw.map((v,i)=>[v-base[i],i]).sort((a,b)=>b[0]-a[0]);for(let k=0;k<rem;k++)base[order[k%order.length][1]]++;return base;}
function splitQuarters(total,rand){const weights=[1+normal(rand)*.08,1+normal(rand)*.08,1+normal(rand)*.08,1+normal(rand)*.08].map(v=>Math.max(.65,v));return allocInteger(total,weights);}
function shootingCombo(points,p,opp,rand){
  const targetFT=clamp(.11+(p.finishing-70)/420+(p.usage-75)/700,.07,.28);const target3=clamp(.18+(p.shooting-70)/300-(p.finishing-75)/850,.09,.42);
  let best=null;
  for(let ft=0;ft<=Math.min(points,14);ft++)for(let threes=0;threes<=Math.floor((points-ft)/3);threes++){
    const rem=points-ft-threes*3;if(rem<0||rem%2)continue;const twos=rem/2;
    const score=Math.abs(ft/Math.max(1,points)-targetFT)+Math.abs((threes*3)/Math.max(1,points)-target3)+(rand()*.015);
    if(!best||score<best.score)best={ftm:ft,threeM:threes,twoM:twos,score};
  }
  best=best||{ftm:0,threeM:0,twoM:Math.floor(points/2)};
  const threePct=clamp(.28+(p.shooting-65)*.0031-(average(opp.map(x=>x.perimeterDefense))-75)*.0011,.25,.53);
  const twoPct=clamp(.42+(p.finishing-65)*.0030+(p.scoring-70)*.0012-(Math.max(...opp.map(x=>x.rimDefense))-75)*.0013,.38,.72);
  const threeA=Math.max(best.threeM,Math.round(best.threeM/Math.max(.2,threePct)+Math.max(0,normal(rand)*1.2)));
  const twoA=Math.max(best.twoM,Math.round(best.twoM/Math.max(.3,twoPct)+Math.max(0,normal(rand)*1.5)));
  const fta=Math.max(best.ftm,Math.round(best.ftm/clamp(.72+(p.shooting-70)*.0015,.68,.92)));
  return{fgm:best.threeM+best.twoM,fga:threeA+twoA,threeM:best.threeM,threeA,ftm:best.ftm,fta};
}
function playerBox(team,opp,totalScore,metrics,rand){
  const usageWeights=team.map(p=>Math.max(10,(p.usage*.43+p.scoring*.28+p.shooting*.11+p.finishing*.10+p.playmaking*.08)-54));
  const points=allocInteger(totalScore,usageWeights.map((w,i)=>w*(.90+rand()*.20)*(1+(team[i].scoring-80)/250)));
  const fgm=[];const rows=[];
  for(let i=0;i<team.length;i++){
    const p=team[i],shoot=shootingCombo(points[i],p,opp,rand);fgm.push(shoot.fgm);
    rows.push({player:p,min:40,pts:points[i],...shoot,reb:0,ast:0,stl:0,blk:0,to:0});
  }
  const teamFgm=sum(fgm);
  const rebWeights=team.map(p=>(p.rebounding*.7+(p.group==='C'?28:p.group==='F'?12:2))*(.85+rand()*.3));
  const totalReb=clamp(Math.round(28+average(team.map(p=>p.rebounding))*.17+normal(rand)*3),24,52);const rebs=allocInteger(totalReb,rebWeights);
  const astCeil=Math.max(0,Math.round(teamFgm*.82));const astTarget=clamp(Math.round(teamFgm*(.43+(average(team.map(p=>p.playmaking))-65)*.004+metrics.fit*.0015)+normal(rand)*2),6,astCeil);
  const asts=allocInteger(astTarget,team.map(p=>Math.max(2,p.playmaking-48)*(p.group==='G'?1.18:1)));
  rows.forEach((r,i)=>{const p=team[i];r.reb=rebs[i];r.ast=asts[i];r.stl=clamp(Math.round((p.perimeterDefense-58)/28+rand()*1.35),0,4);r.blk=clamp(Math.round((p.rimDefense-62)/25+(p.group==='C'?.55:p.group==='F'?.2:0)+rand()*.9),0,5);r.to=clamp(Math.round((p.usage+p.playmaking)/75+rand()*1.8-(metrics.fit-75)/30),0,7);});
  return rows;
}
function simulateGame(teamA,teamB,seedText=''){
  const rand=seedText?seededRandom(seedText):Math.random;const a=teamMetrics(teamA),b=teamMetrics(teamB);
  const chance=clamp(1/(1+Math.exp(-(a.power-b.power)/6.2)),.07,.93),aWins=rand()<chance;
  const commonPace=clamp(80+normal(rand)*3.8,71,90);
  const offenseA=average(teamA.map(p=>p.scoring*.31+p.shooting*.23+p.finishing*.18+p.playmaking*.15+p.offBall*.13));
  const offenseB=average(teamB.map(p=>p.scoring*.31+p.shooting*.23+p.finishing*.18+p.playmaking*.15+p.offBall*.13));
  const defA=opponentDefense(teamA),defB=opponentDefense(teamB);
  const ortgA=102+(offenseA-75)*.43+(a.fit-75)*.24+(a.versatility-75)*.08-(defB-75)*.22+normal(rand)*4.5;
  const ortgB=102+(offenseB-75)*.43+(b.fit-75)*.24+(b.versatility-75)*.08-(defA-75)*.22+normal(rand)*4.5;
  let scoreA=Math.max(70,Math.round(commonPace*ortgA/100));let scoreB=Math.max(70,Math.round(commonPace*ortgB/100));
  if(aWins&&scoreA<=scoreB)scoreA=scoreB+1+Math.floor(rand()*7);if(!aWins&&scoreB<=scoreA)scoreB=scoreA+1+Math.floor(rand()*7);
  const quartersA=splitQuarters(scoreA,rand),quartersB=splitQuarters(scoreB,rand);
  const boxA=playerBox(teamA,teamB,scoreA,a,rand),boxB=playerBox(teamB,teamA,scoreB,b,rand);
  return{a,b,aWins,scoreA,scoreB,quartersA,quartersB,boxA,boxB,gameMinutes:40,seed:seedText||null};
}
function rosterHtml(team){return team.map(p=>`<div class="match-player"><strong>${escapeHtml(p.name)}</strong><span>$${p.price} · ${p.pos} · ${escapeHtml(p.archetype)}</span></div>`).join('');}
function totalRow(rows){return{fgm:sum(rows.map(r=>r.fgm)),fga:sum(rows.map(r=>r.fga)),threeM:sum(rows.map(r=>r.threeM)),threeA:sum(rows.map(r=>r.threeA)),ftm:sum(rows.map(r=>r.ftm)),fta:sum(rows.map(r=>r.fta)),reb:sum(rows.map(r=>r.reb)),ast:sum(rows.map(r=>r.ast)),stl:sum(rows.map(r=>r.stl)),blk:sum(rows.map(r=>r.blk)),to:sum(rows.map(r=>r.to)),pts:sum(rows.map(r=>r.pts))};}
function boxTable(label,rows){const t=totalRow(rows);return`<article class="box-score-card"><h3>${escapeHtml(label)}</h3><table class="box-score"><thead><tr><th>PLAYER</th><th>MIN</th><th>FG</th><th>3PT</th><th>FT</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TO</th><th>PTS</th></tr></thead><tbody>${rows.map(r=>`<tr><td><strong>${escapeHtml(r.player.name)}</strong><br><small>${r.player.pos} · ${escapeHtml(r.player.archetype)}</small></td><td>40</td><td>${r.fgm}-${r.fga}</td><td>${r.threeM}-${r.threeA}</td><td>${r.ftm}-${r.fta}</td><td>${r.reb}</td><td>${r.ast}</td><td>${r.stl}</td><td>${r.blk}</td><td>${r.to}</td><td><strong>${r.pts}</strong></td></tr>`).join('')}<tr><td>TEAM</td><td>200</td><td>${t.fgm}-${t.fga}</td><td>${t.threeM}-${t.threeA}</td><td>${t.ftm}-${t.fta}</td><td>${t.reb}</td><td>${t.ast}</td><td>${t.stl}</td><td>${t.blk}</td><td>${t.to}</td><td>${t.pts}</td></tr></tbody></table><div class="box-note">Five-player lineup · every player logged 40 minutes · stamina and injuries are not simulated.</div></article>`;}
function renderGame(result,teamA,teamB,labelA='YOU',labelB='CPU'){
  $('line-score-wrap').innerHTML=`<table class="line-score"><thead><tr><th>TEAM</th><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th><th>FINAL</th></tr></thead><tbody><tr><td>${escapeHtml(labelA)}</td>${result.quartersA.map(q=>`<td>${q}</td>`).join('')}<td><strong>${result.scoreA}</strong></td></tr><tr><td>${escapeHtml(labelB)}</td>${result.quartersB.map(q=>`<td>${q}</td>`).join('')}<td><strong>${result.scoreB}</strong></td></tr></tbody></table>`;
  $('box-score-shell').innerHTML=boxTable(labelA,result.boxA)+boxTable(labelB,result.boxB);
}
function showBattle(teamA,teamB,result,{type='quick',title='5v5 matchup',opponentLabel='CPU',scroll=true}={}){
  state.currentOpponent=teamB;state.currentBattle={type,result,teamA,teamB};$('matchup-section').classList.remove('hidden');$('matchup-kicker').textContent=type==='gauntlet'?`GAUNTLET · ROUND ${state.gauntletRound}`:'5V5 · 40 MINUTES';$('matchup-title').textContent=title;
  $('your-match-roster').innerHTML=rosterHtml(teamA);$('opponent-match-roster').innerHTML=rosterHtml(teamB);$('opponent-label').textContent=opponentLabel;$('your-power').textContent=result.a.power;$('opponent-power').textContent=result.b.power;$('final-score').textContent=`${result.scoreA}–${result.scoreB}`;
  renderGame(result,teamA,teamB,'YOU',opponentLabel);renderResult();if(scroll)$('matchup-section').scrollIntoView({behavior:'smooth',block:'start'});
}
function renderResult(){
  const {result,type}=state.currentBattle,won=result.aWins;$('result-card').classList.remove('hidden');$('result-title').textContent=won?'Win.':'Loss.';$('result-kicker').textContent=won?'WIN':'LOSS';
  $('comparison-grid').innerHTML=`<div><span>FIT</span><strong>${result.a.fit} vs ${result.b.fit}</strong></div><div><span>TALENT</span><strong>${result.a.talent} vs ${result.b.talent}</strong></div><div><span>VERSATILITY</span><strong>${result.a.versatility} vs ${result.b.versatility}</strong></div>`;
  if(type==='quick'){won?state.quickWins++:state.quickLosses++;saveLocal();$('result-next').textContent='Back to builder';$('result-rematch').classList.remove('hidden');}
  else if(type==='gauntlet'){
    state.gauntletTotals.for+=result.scoreA;state.gauntletTotals.against+=result.scoreB;
    if(won){state.gauntletCleared=state.gauntletRound;if(!state.officialDaily){state.bestRound=Math.max(state.bestRound,state.gauntletRound);saveLocal();}if(state.gauntletRound===10){state.gauntletActive=false;$('result-next').textContent='Gauntlet cleared';finalizeGauntlet();}else $('result-next').textContent=`Continue to Round ${state.gauntletRound+1}`;}
    else{state.gauntletFailedRound=state.gauntletRound;state.gauntletActive=false;if(!state.officialDaily){state.bestRound=Math.max(state.bestRound,state.gauntletRound-1);saveLocal();}$('result-next').textContent='Back to builder';finalizeGauntlet();}
    $('result-rematch').classList.add('hidden');renderGauntletMap();
  }else{$('result-next').textContent='Back to builder';$('result-rematch').classList.add('hidden');}
  renderTeam();
}

function buildOpponentFromPrices(prices,excludeIds=[],seed=''){
  const rand=seed?seededRandom(seed):Math.random;const excluded=new Set(excludeIds);const wantedGroups=['G','G','F','F','C'];
  const permutations=[];
  function perm(arr,l=0){if(l===arr.length){permutations.push([...arr]);return;}const seen=new Set();for(let i=l;i<arr.length;i++){if(seen.has(arr[i]))continue;seen.add(arr[i]);[arr[l],arr[i]]=[arr[i],arr[l]];perm(arr,l+1);[arr[l],arr[i]]=[arr[i],arr[l]];}}
  perm([...prices]);
  for(const priceOrder of shuffle(permutations,rand)){
    const team=[],used=new Set(excluded);let ok=true;
    for(let i=0;i<5;i++){
      const pool=shuffle(pricePool(state.mode,priceOrder[i]).filter(p=>p.group===wantedGroups[i]&&!used.has(p.id)),rand);if(!pool.length){ok=false;break;}team.push(pool[0]);used.add(pool[0].id);
    }
    if(ok)return team;
  }
  const team=[],used=new Set(excluded);for(const price of prices){const pool=shuffle(pricePool(state.mode,price).filter(p=>!used.has(p.id)),rand);if(!pool.length)continue;team.push(pool[0]);used.add(pool[0].id);}return team;
}
function randomBotTeam(excludeIds=[],seed=''){
  const rand=seed?seededRandom(seed):Math.random;const pool=playersForMode().filter(p=>!excludeIds.includes(p.id));let best=null;
  for(let i=0;i<1800;i++){
    const g=shuffle(pool.filter(p=>p.group==='G'),rand).slice(0,2),f=shuffle(pool.filter(p=>p.group==='F'),rand).slice(0,2),c=shuffle(pool.filter(p=>p.group==='C'),rand).slice(0,1),team=[...g,...f,...c];if(team.length<5)continue;const cost=usedBudget(team);if(cost<=15&&cost>=10){if(!best||Math.abs(14-cost)<Math.abs(14-best.cost))best={team,cost};if(cost>=13&&rand()<.15)break;}
  }
  return best?.team||shuffle(pool,rand).slice(0,5);
}
function playBot(){if(state.selected.length!==5)return toast('Build a five-player team first.');const opp=randomBotTeam(ids(state.selected));const result=simulateGame(state.selected,opp);showBattle(state.selected,opp,result,{type:'quick',title:'Your five vs. a CPU lineup',opponentLabel:'CPU'});}
function gauntletOpponent(round){const seed=state.boardType==='daily'?`cg-gauntlet|${state.selectedDate}|${state.mode}|${round}`:'';return buildOpponentFromPrices(GAUNTLET[round-1],ids(state.gauntletTeam),seed);}
async function startGauntlet(){
  if(state.selected.length!==5)return toast('Build a five-player team first.');
  state.officialDaily=false;state.dailyRunId=null;
  if(state.boardType==='daily'&&isToday()&&state.user&&!state.dailyAttemptUsed){
    const ok=await reserveDailyRun();if(!ok)return;state.officialDaily=true;
  }else if(state.boardType==='daily'&&isToday()&&!state.user&&!localDailyUsed()){markLocalDailyUsed();}
  state.gauntletActive=true;state.gauntletTeam=[...state.selected];state.gauntletRound=1;state.gauntletCleared=0;state.gauntletFailedRound=null;state.gauntletTotals={for:0,against:0};renderGauntletMap();playGauntletRound();
}
function playGauntletRound(){
  const opp=gauntletOpponent(state.gauntletRound);const seed=state.boardType==='daily'?`cg-game|${state.selectedDate}|${state.mode}|${state.gauntletRound}|${ids(state.gauntletTeam).slice().sort().join(',')}`:'';const result=simulateGame(state.gauntletTeam,opp,seed);showBattle(state.gauntletTeam,opp,result,{type:'gauntlet',title:`Gauntlet Round ${state.gauntletRound} of 10`,opponentLabel:`ROUND ${state.gauntletRound}`});
}
async function finalizeGauntlet(){
  if(!state.officialDaily||!state.dailyRunId)return;
  const cleared=state.gauntletCleared,failed=state.gauntletFailedRound;const diff=state.gauntletTotals.for-state.gauntletTotals.against;
  const {error}=await db.rpc('finish_cash_grab_daily_run',{p_run_id:state.dailyRunId,p_rounds_cleared:cleared,p_failed_round:failed,p_point_diff:diff,p_points_for:state.gauntletTotals.for,p_points_against:state.gauntletTotals.against});
  if(error)toast('Daily score save failed',error.message);else{state.dailyAttemptUsed=true;toast('Daily score saved',`Round ${cleared}${cleared===10?' · Gauntlet cleared':''}`);renderDailyStatus();updateGauntletButton();}
  state.officialDaily=false;state.dailyRunId=null;
}
function nextResultAction(){
  if(!state.currentBattle)return;if(state.currentBattle.type==='quick'||state.currentBattle.type==='draft')return $('builder').scrollIntoView({behavior:'smooth'});
  if(state.currentBattle.type==='gauntlet'){
    if(state.currentBattle.result.aWins&&state.gauntletRound<10){state.gauntletRound++;playGauntletRound();}else $('builder').scrollIntoView({behavior:'smooth'});
  }
}
function renderGauntletMap(){$('gauntlet-map').innerHTML=GAUNTLET.map((_,i)=>{const r=i+1;let status='',mark='';if(r<=state.gauntletCleared){status=' completed';mark='✓';}else if(r===state.gauntletFailedRound){status=' failed';mark='×';}else if(state.gauntletActive&&r===state.gauntletRound){status=' current';mark='•';}return`<div class="gauntlet-step${status}"><span>${r}</span><strong>${mark}</strong></div>`;}).join('');}

async function initOnline(){
  if(!db){updateOnlineStatus();return;}const {data}=await db.auth.getSession();state.user=data.session?.user||null;if(state.user){const{data:p}=await db.from('profiles').select('id,username').eq('id',state.user.id).maybeSingle();state.profile=p||null;}
  updateOnlineStatus();await checkDailyAttempt();await refreshChallengeCount();db.auth.onAuthStateChange(async(_,session)=>{state.user=session?.user||null;state.profile=null;if(state.user){const{data:p}=await db.from('profiles').select('id,username').eq('id',state.user.id).maybeSingle();state.profile=p||null;}updateOnlineStatus();checkDailyAttempt();refreshChallengeCount();});
}
function updateOnlineStatus(){const el=$('online-status');if(!ONLINE_READY){el.textContent='Online draft setup needed';el.className='online-status offline';}else if(!state.user){el.textContent='Log in for real-player drafts';el.className='online-status';}else{el.textContent=`Online as ${state.profile?.username||'player'}`;el.className='online-status online';}}
function requireOnline(){if(!ONLINE_READY){toast('Online Cash Grab is not connected.','Run the Cash Grab v3 Supabase migration.');return false;}if(!state.user){toast('Log in first.','Use your HoopLoop account to play real-player drafts or record a Daily score.');return false;}return true;}
async function checkDailyAttempt(){
  state.dailyAttemptUsed=localDailyUsed();
  if(db&&state.user&&state.boardType==='daily'&&isToday()){
    const {data}=await db.from('cash_grab_daily_runs').select('id,status').eq('user_id',state.user.id).eq('challenge_date',state.selectedDate).eq('pool_mode',state.mode).maybeSingle();state.dailyAttemptUsed=Boolean(data);
  }
  renderDailyStatus();updateGauntletButton();
}
async function reserveDailyRun(){
  if(!requireOnline())return false;
  const {data,error}=await db.rpc('start_cash_grab_daily_run',{p_challenge_date:state.selectedDate,p_pool_mode:state.mode,p_board_key:currentBoardKey(),p_roster:ids(state.selected)});
  if(error){state.dailyAttemptUsed=true;renderDailyStatus();updateGauntletButton();toast('Official attempt unavailable',error.message);return false;}state.dailyRunId=data.id;state.dailyAttemptUsed=true;renderDailyStatus();updateGauntletButton();return true;
}
async function openDailyLeaderboard(){
  if(state.boardType!=='daily')return toast('Choose the Daily Board first.');
  if(!ONLINE_READY)return toast('Leaderboard needs the online setup.');
  const {data,error}=await db.from('cash_grab_daily_runs').select('id,user_id,challenge_date,pool_mode,roster,rounds_cleared,failed_round,point_diff,points_for,points_against,completed_at,profile:profiles(username)').eq('challenge_date',state.selectedDate).eq('pool_mode',state.mode).eq('status','finished').order('rounds_cleared',{ascending:false}).order('point_diff',{ascending:false}).order('points_for',{ascending:false}).order('completed_at',{ascending:true}).limit(100);
  if(error)return toast('Could not load Daily standings',error.message);const rows=data||[];const locked=isPast();const champion=rows[0];
  const champHtml=locked&&champion?`<div class="daily-champion"><span class="overline">DAILY CHAMPION</span><h3>${escapeHtml(champion.profile?.username||'HoopLoop player')}</h3><p>Cleared ${champion.rounds_cleared}/10 rounds · ${champion.point_diff>=0?'+':''}${champion.point_diff} point differential</p><div class="lineup-tags">${(champion.roster||[]).map(id=>playerById(id)).filter(Boolean).map(p=>`<span>${escapeHtml(p.name)}</span>`).join('')}</div></div>`:'';
  openModal(`<span class="overline">${locked?'FINAL':'LIVE'} DAILY STANDINGS</span><h2>${formatDate(state.selectedDate)} · ${state.mode==='current'?'Current':'All-Time'}</h2>${champHtml}<div class="daily-leaderboard-list">${rows.length?rows.slice(0,30).map((r,i)=>`<div class="leaderboard-row${locked&&i===0?' champion':''}"><strong>${i+1}</strong><span><strong>${escapeHtml(r.profile?.username||'Player')}</strong><small>${r.rounds_cleared===10?'Gauntlet cleared':`Eliminated R${r.failed_round||r.rounds_cleared+1}`}</small></span><strong>${r.rounds_cleared}/10</strong><strong>${r.point_diff>=0?'+':''}${r.point_diff}</strong></div>`).join(''):'<p class="modal-note">No official scores yet.</p>'}</div>`);
}

async function acceptedFriends(){if(!state.user)return[];const{data,error}=await db.from('friendships').select('requester_id,addressee_id,requester:profiles!friendships_requester_id_fkey(id,username),addressee:profiles!friendships_addressee_id_fkey(id,username)').eq('status','accepted');if(error)return[];return(data||[]).map(r=>r.requester_id===state.user.id?r.addressee:r.requester).filter(Boolean);}
function boardPayload(){return state.board.map(p=>({id:p.id,price:p.price}));}
async function openFriendDraft(){if(!requireOnline())return;const friends=await acceptedFriends();openModal(`<span class="overline">SNAKE DRAFT</span><h2>Invite a friend.</h2><p>They will draft against you from this exact 25-player board.</p><div class="challenge-list">${friends.length?friends.map(f=>`<button class="challenge-person" data-draft-friend="${escapeHtml(f.username)}"><span>${escapeHtml(f.username)}</span><strong>Invite</strong></button>`).join(''):'<p class="modal-note">No accepted friends yet.</p>'}</div>`);qsa('[data-draft-friend]').forEach(btn=>btn.onclick=()=>createFriendDraft(btn.dataset.draftFriend));}
async function createFriendDraft(username){const{data,error}=await db.rpc('create_cash_grab_friend_draft',{p_friend_username:username,p_board_type:state.boardType,p_pool_mode:state.mode,p_board_key:currentBoardKey(),p_board:boardPayload()});if(error)return toast('Draft invite failed',error.message);closeModal();subscribeDraft(data.id);toast('Draft invite sent',`${username} can accept from Draft Battles.`);refreshChallengeCount();}
async function findRandomDraft(){if(!requireOnline())return;const{data,error}=await db.rpc('join_cash_grab_random_draft',{p_board_type:state.boardType,p_pool_mode:state.mode,p_board_key:currentBoardKey(),p_board:boardPayload()});if(error)return toast('Matchmaking failed',error.message);if(data.status==='waiting'){openModal(`<span class="overline">RANDOM DRAFT</span><h2>Searching…</h2><p>Your draft room is waiting for another HoopLoop player.</p><div class="search-pulse"><span></span><span></span><span></span></div><button class="secondary-button wide" id="cancel-draft-search">Cancel</button>`);$('cancel-draft-search').onclick=async()=>{await db.rpc('cancel_cash_grab_draft',{p_draft_id:data.id});stopOnlineChannel();closeModal();};subscribeDraft(data.id);}else{closeModal();loadOnlineDraft(data);}}
async function refreshChallengeCount(){const el=$('challenge-count');if(!el||!state.user||!db){if(el)el.classList.add('hidden');return;}const{count}=await db.from('cash_grab_drafts').select('*',{count:'exact',head:true}).eq('opponent_id',state.user.id).eq('match_type','friend').eq('status','invited');el.textContent=count?String(count):'';el.classList.toggle('hidden',!count);}
async function openDraftBattles(){if(!requireOnline())return;const{data,error}=await db.from('cash_grab_drafts').select('*,host:profiles!cash_grab_drafts_host_id_fkey(username),opponent:profiles!cash_grab_drafts_opponent_id_fkey(username)').or(`host_id.eq.${state.user.id},opponent_id.eq.${state.user.id}`).order('created_at',{ascending:false}).limit(30);if(error)return toast('Could not load drafts',error.message);const rows=data||[];openModal(`<span class="overline">CASH GRAB DRAFTS</span><h2>Draft Battles.</h2><div class="challenge-list">${rows.length?rows.map(d=>draftChallengeRow(d)).join(''):'<p class="modal-note">No draft battles yet.</p>'}</div>`);qsa('[data-accept-draft]').forEach(b=>b.onclick=()=>acceptFriendDraft(b.dataset.acceptDraft));qsa('[data-open-draft]').forEach(b=>b.onclick=()=>{const d=rows.find(x=>x.id===b.dataset.openDraft);closeModal();loadOnlineDraft(d);});qsa('[data-cancel-draft]').forEach(b=>b.onclick=async()=>{await db.rpc('cancel_cash_grab_draft',{p_draft_id:b.dataset.cancelDraft});openDraftBattles();});}
function draftChallengeRow(d){const incoming=d.opponent_id===state.user.id,other=incoming?d.host?.username:(d.opponent?.username||'Random opponent');let action='';if(incoming&&d.status==='invited')action=`<span class="row-actions"><button class="small-action" data-accept-draft="${d.id}">Accept</button><button class="small-action secondary" data-cancel-draft="${d.id}">Decline</button></span>`;else if(['drafting','ready','finished'].includes(d.status))action=`<button class="small-action" data-open-draft="${d.id}">${d.status==='finished'?'View':'Open'}</button>`;else action=`<button class="small-action secondary" data-cancel-draft="${d.id}">${d.status}</button>`;return`<div class="challenge-row"><span><strong>${escapeHtml(other)}</strong><small>${d.board_type==='daily'?'Daily':'Random'} · ${d.pool_mode}</small></span>${action}</div>`;}
async function acceptFriendDraft(id){const{data,error}=await db.rpc('accept_cash_grab_friend_draft',{p_draft_id:id});if(error)return toast('Could not accept draft',error.message);closeModal();loadOnlineDraft(data);}
function stopOnlineChannel(){if(state.onlineChannel&&db)db.removeChannel(state.onlineChannel);state.onlineChannel=null;}
function subscribeDraft(id){if(!db)return;stopOnlineChannel();state.onlineChannel=db.channel(`cg-draft-${id}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'cash_grab_drafts',filter:`id=eq.${id}`},payload=>{const d=payload.new;if(d.status==='cancelled'){stopOnlineChannel();closeModal();toast('Draft ended.');return;}if(['drafting','ready','finished'].includes(d.status)){closeModal();loadOnlineDraft(d);}}).subscribe();}
function onlineDraftSides(d){const host=state.user?.id===d.host_id;return{youPicks:(host?d.host_picks:d.opponent_picks)||[],oppPicks:(host?d.opponent_picks:d.host_picks)||[],yourBudget:host?d.host_budget:d.opponent_budget,oppBudget:host?d.opponent_budget:d.host_budget,yourTurn:d.turn_user===state.user?.id,host};}
function loadOnlineDraft(d){const board=(d.board||[]).map(x=>playerById(x.id||x)).filter(Boolean);if(board.length!==25)return toast('Draft board could not be loaded.');state.draft={kind:'online',row:d,board};$('draft-section').classList.remove('hidden');renderDraft();subscribeDraft(d.id);$('draft-section').scrollIntoView({behavior:'smooth',block:'start'});if(d.status==='ready')finalizeOnlineDraftIfNeeded();if(d.status==='finished')showFinishedOnlineDraft(d);}
async function makeOnlineDraftPick(player){const d=state.draft?.row;if(!d||d.status!=='drafting')return;const sides=onlineDraftSides(d);if(!sides.yourTurn)return toast('Wait for your turn.');if(!canDraftPick(player,'you'))return toast('That pick would make it impossible to finish under $15.');const{data,error}=await db.rpc('make_cash_grab_draft_pick',{p_draft_id:d.id,p_player_id:player.id});if(error)return toast('Pick failed',error.message);state.draft.row=data;renderDraft();if(data.status==='ready')finalizeOnlineDraftIfNeeded();}
async function finalizeOnlineDraftIfNeeded(){const d=state.draft?.row;if(!d||d.status!=='ready')return;const host=(d.host_picks||[]).map(x=>playerById(x.id||x)).filter(Boolean),opp=(d.opponent_picks||[]).map(x=>playerById(x.id||x)).filter(Boolean);if(host.length!==5||opp.length!==5)return;const result=simulateGame(host,opp,`draft|${d.id}|${d.resolution_seed||d.id}`);const payload=serializeResult(result);const{data,error}=await db.rpc('finalize_cash_grab_draft',{p_draft_id:d.id,p_host_score:result.scoreA,p_opponent_score:result.scoreB,p_result:payload});if(!error){state.draft.row=data;showFinishedOnlineDraft(data);}}
function serializeResult(r){return{scoreA:r.scoreA,scoreB:r.scoreB,quartersA:r.quartersA,quartersB:r.quartersB,boxA:r.boxA.map(x=>({...x,player:x.player.id})),boxB:r.boxB.map(x=>({...x,player:x.player.id})),a:r.a,b:r.b};}
function hydrateResult(raw,teamA,teamB){return{scoreA:raw.scoreA,scoreB:raw.scoreB,quartersA:raw.quartersA,quartersB:raw.quartersB,boxA:(raw.boxA||[]).map(x=>({...x,player:playerById(x.player)})),boxB:(raw.boxB||[]).map(x=>({...x,player:playerById(x.player)})),a:raw.a||teamMetrics(teamA),b:raw.b||teamMetrics(teamB),aWins:raw.scoreA>raw.scoreB};}
function showFinishedOnlineDraft(d){const sides=onlineDraftSides(d),host=(d.host_picks||[]).map(x=>playerById(x.id||x)).filter(Boolean),opp=(d.opponent_picks||[]).map(x=>playerById(x.id||x)).filter(Boolean);if(host.length!==5||opp.length!==5||!d.result)return;const raw=d.result,result=hydrateResult(raw,host,opp);const you=sides.host?host:opp,them=sides.host?opp:host;if(!sides.host){const swapped={...result,scoreA:result.scoreB,scoreB:result.scoreA,quartersA:result.quartersB,quartersB:result.quartersA,boxA:result.boxB,boxB:result.boxA,a:result.b,b:result.a,aWins:result.scoreB>result.scoreA};showBattle(you,them,swapped,{type:'draft',title:'Snake Draft Battle',opponentLabel:'OPPONENT'});}else showBattle(you,them,result,{type:'draft',title:'Snake Draft Battle',opponentLabel:'OPPONENT'});}

function startCpuDraft(){state.draft={kind:'cpu',board:[...state.board],first:Math.random()<.5?0:1,pickNumber:0,you:[],opp:[]};$('draft-section').classList.remove('hidden');renderDraft();$('draft-section').scrollIntoView({behavior:'smooth',block:'start'});runCpuTurns();}
function draftOwner(d,index=d.pickNumber){return SNAKE[index]===0?d.first:1-d.first;}
function priceCounts(players){const counts={1:0,2:0,3:0,4:0,5:0};players.forEach(p=>counts[p.price]++);return counts;}
function allocationOptions(slots,budget,counts){const out=[];function walk(price,leftSlots,leftBudget,vec){if(price===6){if(leftSlots===0)out.push({...vec});return;}for(let n=0;n<=Math.min(counts[price]||0,leftSlots,Math.floor(leftBudget/price));n++){vec[price]=n;walk(price+1,leftSlots-n,leftBudget-n*price,vec);}delete vec[price];}walk(1,slots,budget,{});return out;}
function jointDraftFeasible(aPicks,bPicks,remainingPlayers){const aSlots=5-aPicks.length,bSlots=5-bPicks.length;if(aSlots<0||bSlots<0)return false;const aBudget=15-usedBudget(aPicks),bBudget=15-usedBudget(bPicks);if(aBudget<0||bBudget<0)return false;const counts=priceCounts(remainingPlayers),aOpts=allocationOptions(aSlots,aBudget,counts),bOpts=allocationOptions(bSlots,bBudget,counts);for(const a of aOpts)for(const b of bOpts){let ok=true;for(let price=1;price<=5;price++)if((a[price]||0)+(b[price]||0)>(counts[price]||0)){ok=false;break;}if(ok)return true;}return false;}
function draftCurrentPicks(side){const d=state.draft;if(d.kind==='cpu')return side==='you'?d.you:d.opp;const s=onlineDraftSides(d.row);return side==='you'?s.youPicks.map(x=>playerById(x.id||x)).filter(Boolean):s.oppPicks.map(x=>playerById(x.id||x)).filter(Boolean);}
function canDraftPick(player,side='you'){const d=state.draft;if(!d)return false;const your=draftCurrentPicks(side),other=draftCurrentPicks(side==='you'?'opp':'you');const used=new Set([...your,...other].map(p=>p.id));if(used.has(player.id)||your.length>=5||usedBudget(your)+player.price>15)return false;const next=[...your,player],remaining=d.board.filter(p=>!used.has(p.id)&&p.id!==player.id);return jointDraftFeasible(next,other,remaining);}
function cpuPickCandidate(){const d=state.draft,legal=d.board.filter(p=>canDraftPick(p,'opp'));if(!legal.length)return null;return legal.map(p=>{const m=teamMetrics([...d.opp,p]);const priceValue=playerTalent(p)/(p.price+.65);return{p,score:m.power*.82+playerTalent(p)*.13+priceValue*.05+Math.random()*2.5};}).sort((a,b)=>b.score-a.score)[0].p;}
function runCpuTurns(){const d=state.draft;if(!d||d.kind!=='cpu'||d.pickNumber>=10)return;if(draftOwner(d)===1){const p=cpuPickCandidate();if(!p)return toast('CPU draft could not find a legal pick.');d.opp.push(p);d.pickNumber++;renderDraft();if(d.pickNumber>=10)return finishCpuDraft();setTimeout(runCpuTurns,260);}}
function makeCpuDraftPick(player){const d=state.draft;if(!d||d.kind!=='cpu'||draftOwner(d)!==0)return;if(!canDraftPick(player,'you'))return toast('That pick would make it impossible to finish five players under $15.');d.you.push(player);d.pickNumber++;renderDraft();if(d.pickNumber>=10)return finishCpuDraft();runCpuTurns();}
function finishCpuDraft(){const d=state.draft,result=simulateGame(d.you,d.opp,`cpu-draft|${Date.now()}|${ids(d.you).join(',')}`);showBattle(d.you,d.opp,result,{type:'draft',title:'Snake Draft vs. CPU',opponentLabel:'CPU'});}
function renderDraft(){
  const d=state.draft;if(!d)return;let you=[],opp=[],yourBudget=15,oppBudget=15,yourTurn=false,pickNumber=0,status='drafting',oppName='CPU',allPicked=[];
  if(d.kind==='cpu'){you=d.you;opp=d.opp;yourBudget=15-usedBudget(you);oppBudget=15-usedBudget(opp);yourTurn=d.pickNumber<10&&draftOwner(d)===0;pickNumber=d.pickNumber;allPicked=[...you,...opp].map(p=>p.id);oppName='CPU';}
  else{const row=d.row,s=onlineDraftSides(row);you=s.youPicks.map(x=>playerById(x.id||x)).filter(Boolean);opp=s.oppPicks.map(x=>playerById(x.id||x)).filter(Boolean);yourBudget=s.yourBudget;oppBudget=s.oppBudget;yourTurn=s.yourTurn;pickNumber=row.pick_number;status=row.status;allPicked=[...(row.host_picks||[]),...(row.opponent_picks||[])].map(x=>x.id||x);oppName='OPPONENT';}
  $('draft-your-budget').textContent=`$${yourBudget}`;$('draft-opp-budget').textContent=`$${oppBudget}`;$('draft-your-picks').textContent=`${you.length} / 5`;$('draft-opp-picks').textContent=`${opp.length} / 5`;$('draft-pick-label').textContent=pickNumber<10?`PICK ${pickNumber+1}`:'DRAFT COMPLETE';$('draft-turn-label').textContent=status==='finished'?'FINAL':pickNumber>=10?'SIMULATING':yourTurn?'YOUR PICK':'OPPONENT PICK';$('draft-opponent-name').textContent=oppName;
  $('draft-your-roster').innerHTML=you.length?you.map(p=>`<div class="draft-pick"><strong>${escapeHtml(p.name)}</strong><span>$${p.price} · ${p.pos}</span></div>`).join(''):'<div class="draft-pick"><span>No picks yet</span></div>';$('draft-opp-roster').innerHTML=opp.length?opp.map(p=>`<div class="draft-pick"><strong>${escapeHtml(p.name)}</strong><span>$${p.price} · ${p.pos}</span></div>`).join(''):'<div class="draft-pick"><span>No picks yet</span></div>';
  $('draft-status').textContent=pickNumber<10?(yourTurn?'Choose any affordable player. Picks can block your opponent.':'Waiting for the opponent’s pick…'):'Both five-player teams are complete.';
  $('draft-board').innerHTML=[1,2,3,4,5].map(price=>`<section class="draft-price-column"><h4>$${price}</h4>${d.board.filter(p=>p.price===price).map(p=>{const picked=allPicked.includes(p.id);const legal=yourTurn&&!picked&&canDraftPick(p,'you');return`<button class="draft-player${picked?' picked':''}${yourTurn?' your-turn':''}" data-draft-player="${p.id}" ${!legal?'disabled':''}><strong>${escapeHtml(p.name)}</strong><span>${p.group} · ${p.pos} · ${escapeHtml(p.archetype)}</span></button>`;}).join('')}</section>`).join('');
  qsa('[data-draft-player]').forEach(b=>b.onclick=()=>{const p=playerById(b.dataset.draftPlayer);d.kind==='cpu'?makeCpuDraftPick(p):makeOnlineDraftPick(p);});
}
function leaveDraft(){stopOnlineChannel();state.draft=null;$('draft-section').classList.add('hidden');$('builder').scrollIntoView({behavior:'smooth'});}

function openHow(){openModal(`<span class="overline">CASH GRAB RULES</span><h2>Five players. Forty minutes.</h2><ul class="modal-list"><li><strong>$15 virtual budget</strong><br>Build five players. You may finish under budget, never over.</li><li><strong>5v5, 40 minutes</strong><br>There are no substitutes, stamina penalties, or injuries. Every player logs 40 minutes.</li><li><strong>50% Fit · 30% Talent · 20% Versatility</strong><br>Fit is the largest team-strength factor, but the box score shows how the game actually played out.</li><li><strong>Daily</strong><br>One official Gauntlet attempt per logged-in account. Past boards stay playable as practice.</li><li><strong>Snake Draft Battles</strong><br>First pick is random: P1, P2, P2, P1, P1, P2, P2, P1, P1, P2. A player can only be drafted once.</li></ul>`);}
function openModal(html){$('modal-content').innerHTML=html;$('modal-backdrop').classList.remove('hidden');}
function closeModal(){$('modal-backdrop').classList.add('hidden');}
function toast(title,message=''){const el=document.createElement('div');el.className='toast';el.innerHTML=`<strong>${escapeHtml(title)}</strong>${message?`<span>${escapeHtml(message)}</span>`:''}`;$('toast-region').appendChild(el);setTimeout(()=>el.remove(),4200);}

function bind(){
  $('jump-board').onclick=()=>$('builder').scrollIntoView({behavior:'smooth'});$('how-button').onclick=openHow;$('modal-close').onclick=closeModal;$('modal-backdrop').onclick=e=>{if(e.target===$('modal-backdrop'))closeModal();};
  qsa('[data-mode]').forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;makeBoard();});qsa('[data-board-type]').forEach(b=>b.onclick=()=>{state.boardType=b.dataset.boardType;makeBoard();});
  $('prev-day').onclick=()=>{state.selectedDate=shiftDate(state.selectedDate,-1);if(state.selectedDate<LAUNCH_DATE)state.selectedDate=LAUNCH_DATE;makeBoard();};$('next-day').onclick=()=>{if(state.selectedDate<chicagoDate()){state.selectedDate=shiftDate(state.selectedDate,1);makeBoard();}};$('daily-date').onchange=e=>{let d=e.target.value||chicagoDate();if(d<LAUNCH_DATE)d=LAUNCH_DATE;if(d>chicagoDate())d=chicagoDate();state.selectedDate=d;makeBoard();};
  $('clear-team').onclick=()=>{state.selected=[];state.gauntletActive=false;renderAll();};$('shuffle-board').onclick=()=>{state.boardNonce++;makeBoard();};$('bot-match').onclick=playBot;$('start-gauntlet').onclick=startGauntlet;$('daily-leaderboard').onclick=openDailyLeaderboard;
  $('cpu-draft').onclick=startCpuDraft;$('invite-friend').onclick=openFriendDraft;$('random-player').onclick=findRandomDraft;$('challenges-button').onclick=openDraftBattles;$('leave-draft').onclick=leaveDraft;
  $('back-to-builder').onclick=()=>$('builder').scrollIntoView({behavior:'smooth'});$('result-next').onclick=nextResultAction;$('result-rematch').onclick=playBot;
}
async function init(){loadLocal();state.selectedDate=chicagoDate();bind();makeBoard();await initOnline();}
document.addEventListener('DOMContentLoaded',init);
