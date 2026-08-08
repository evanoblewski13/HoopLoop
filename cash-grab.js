'use strict';

const DATA = window.HOOPLOOP_CASH_GRAB_DATA || { current: [], allTime: [] };
const CONFIG = window.HOOPLOOP_CONFIG || {};
const $ = id => document.getElementById(id);
const qsa = selector => [...document.querySelectorAll(selector)];
const STORAGE = 'hooploop_cash_grab_v3'; // kept for seamless v3 -> v4 local-history migration
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
  draft:null, hof:[]
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
    state.quickWins=Number(saved.quickWins)||0; state.quickLosses=Number(saved.quickLosses)||0; state.bestRound=Number(saved.bestRound)||0; state.hof=Array.isArray(saved.hof)?saved.hof:[];
  }catch{}
}
function saveLocal(){try{localStorage.setItem(STORAGE,JSON.stringify({quickWins:state.quickWins,quickLosses:state.quickLosses,bestRound:state.bestRound,hof:state.hof}));}catch{}}
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

const SLOT_LABELS=['PG','SG','SF','PF','C'];
const POS_RANK={PG:0,SG:1,SF:2,PF:3,C:4};
function orderedLineup(team){return [...team].sort((a,b)=>(POS_RANK[a.pos]??2)-(POS_RANK[b.pos]??2)||b.perimeterDefense-a.perimeterDefense||b.scoring-a.scoring).map((player,i)=>({player,slot:SLOT_LABELS[i]}));}
function matchupPairs(teamA,teamB){const a=orderedLineup(teamA),b=orderedLineup(teamB);return a.map((x,i)=>({slot:x.slot,a:x.player,b:b[i].player}));}
function playerTalent(p){return p.scoring*.16+p.shooting*.09+p.playmaking*.10+p.perimeterDefense*.10+p.rimDefense*.10+p.rebounding*.09+p.finishing*.10+p.athleticism*.06+p.offBall*.07+p.versatility*.13;}
function matchupDefense(p,slot){const i=SLOT_LABELS.indexOf(slot);const per=[.88,.82,.66,.43,.24][i]??.6;return p.perimeterDefense*per+p.rimDefense*(1-per);}
function matchupOffense(p,slot){const i=SLOT_LABELS.indexOf(slot);const creation=[.20,.16,.11,.06,.04][i]??.1;return p.scoring*.34+p.shooting*.18+p.finishing*.20+p.athleticism*.08+p.playmaking*creation+p.offBall*(.20-creation);}
function matchupAdvantage(offender,defender,slot){return clamp((matchupOffense(offender,slot)-matchupDefense(defender,slot))/17,-1.35,1.35);}
function allocInteger(total,weights){if(total<=0)return weights.map(()=>0);const s=sum(weights)||1;const raw=weights.map(w=>total*w/s),base=raw.map(Math.floor);let rem=total-sum(base);const order=raw.map((v,i)=>[v-base[i],i]).sort((a,b)=>b[0]-a[0]);for(let k=0;k<rem;k++)base[order[k%order.length][1]]++;return base;}
function allocWithFloor(total,weights,floorEach=0,cap=999){const n=weights.length,base=Array(n).fill(Math.min(floorEach,Math.floor(total/n)));let left=total-sum(base);if(left<=0)return base;let add=allocInteger(left,weights);for(let i=0;i<n;i++)base[i]+=add[i];let guard=0;while(base.some(v=>v>cap)&&guard++<30){let overflow=0;for(let i=0;i<n;i++)if(base[i]>cap){overflow+=base[i]-cap;base[i]=cap;}if(!overflow)break;const eligible=weights.map((w,i)=>base[i]<cap?w:0);const extra=allocInteger(overflow,eligible);for(let i=0;i<n;i++)base[i]+=extra[i];}return base;}
function sampleMakes(attempts,pct,rand){let made=0;for(let i=0;i<attempts;i++)if(rand()<pct)made++;return made;}
function splitQuarters(total,rand){const weights=[1+normal(rand)*.10,1+normal(rand)*.10,1+normal(rand)*.10,1+normal(rand)*.10].map(v=>Math.max(.58,v));return allocInteger(total,weights);}
function possessionProfile(team,opp,metrics,oppMetrics,possessions,rand){
  const play=average(team.map(p=>p.playmaking)),oppPressure=average(opp.map(p=>p.perimeterDefense)),reb=average(team.map(p=>p.rebounding)),oppReb=average(opp.map(p=>p.rebounding)),finish=average(team.map(p=>p.finishing)),usage=average(team.map(p=>p.usage)),oppRim=Math.max(...opp.map(p=>p.rimDefense));
  const turnovers=clamp(Math.round(13.2+(oppPressure-78)*.055-(play-78)*.070-(metrics.fit-78)*.035+normal(rand)*2.15),6,22);
  const oreb=clamp(Math.round(9.0+(reb-78)*.095-(oppReb-78)*.055+normal(rand)*2.3),3,18);
  const fta=clamp(Math.round(19+(finish-78)*.105+(usage-82)*.035-(oppRim-78)*.045+normal(rand)*3.9),7,38);
  const fga=clamp(Math.round(possessions+oreb-turnovers-.44*fta),66,104);
  return{possessions,turnovers,oreb,fta,fga};
}
function explosionFactor(p,adv,rand){
  const star=clamp((p.scoring-78)/20,0,1);let factor=Math.exp(normal(rand)*.18)*(1+adv*.10);let eruption=0;
  if(rand()<.025+star*.065+Math.max(0,adv)*.035){factor*=1.28+rand()*.42;eruption=1;}
  if(rand()<.004+star*.012+Math.max(0,adv)*.010){factor*=1.30+rand()*.35;eruption=2;}
  return{factor:clamp(factor,.48,2.45),eruption};
}
function primaryBox(team,opp,metrics,oppMetrics,profile,rand){
  const mine=orderedLineup(team),theirs=orderedLineup(opp);const contexts=mine.map((x,i)=>{const d=theirs[i].player,adv=matchupAdvantage(x.player,d,x.slot),boom=explosionFactor(x.player,adv,rand);return{...x,defender:d,adv,...boom};});
  const shotWeights=contexts.map(c=>Math.max(5,(c.player.usage*.40+c.player.scoring*.30+c.player.shooting*.10+c.player.finishing*.10+c.player.playmaking*.06+c.player.offBall*.04)-55)*c.factor*(1+c.adv*.075));
  const fga=allocWithFloor(profile.fga,shotWeights,4,42);
  const foulWeights=contexts.map(c=>Math.max(4,c.player.finishing*.42+c.player.usage*.34+c.player.scoring*.15+c.player.athleticism*.09-55)*Math.sqrt(c.factor)*(1+Math.max(-.3,c.adv)*.06));
  const fta=allocInteger(profile.fta,foulWeights);
  const toWeights=contexts.map(c=>Math.max(3,c.player.usage*.50+(100-c.player.playmaking)*.28+c.player.scoring*.12-36));
  const tos=allocInteger(profile.turnovers,toWeights);
  const orebWeights=contexts.map(c=>Math.max(2,c.player.rebounding+(c.player.pos==='C'?24:c.player.pos==='PF'?13:c.player.pos==='SF'?5:0)));
  const orebs=allocInteger(profile.oreb,orebWeights);
  const edge=clamp((metrics.power-oppMetrics.power)*.00115,-.025,.025);
  return contexts.map((c,i)=>{
    const p=c.player,hot=normal(rand)*.022+(c.eruption?(.012+c.eruption*.009):0);const threeRate=clamp(.22+(p.shooting-p.finishing)*.0048+(p.pos==='PG'||p.pos==='SG'?.055:p.pos==='C'?-.05:0),.10,.67);
    const threeA=clamp(Math.round(fga[i]*threeRate+normal(rand)*1.05),0,fga[i]),twoA=fga[i]-threeA;
    const def=matchupDefense(c.defender,c.slot);const threePct=clamp(.255+(p.shooting-60)*.00325-(def-76)*.00135+edge+c.adv*.010+hot,.20,.58);const twoPct=clamp(.425+(p.finishing-60)*.0030+(p.scoring-72)*.0012-(def-76)*.00115+edge+c.adv*.012+hot,.34,.77);const ftPct=clamp(.66+(p.shooting-55)*.00265+normal(rand)*.015,.58,.95);
    const threeM=sampleMakes(threeA,threePct,rand),twoM=sampleMakes(twoA,twoPct,rand),ftm=sampleMakes(fta[i],ftPct,rand);const pts=threeM*3+twoM*2+ftm;
    return{player:p,slot:c.slot,defender:c.defender,advantage:round(c.adv,2),eruption:c.eruption,min:40,pts,fgm:threeM+twoM,fga:fga[i],threeM,threeA,ftm,fta:fta[i],oreb:orebs[i],dreb:0,reb:orebs[i],ast:0,stl:0,blk:0,to:tos[i]};
  });
}
function fillSecondary(rows,oppRows,team,opp,metrics,oppMetrics,rand){
  const oppMisses=sum(oppRows.map(r=>r.fga-r.fgm)),oppOreb=sum(oppRows.map(r=>r.oreb));const drebTotal=Math.max(0,oppMisses-oppOreb);
  const dreb=allocInteger(drebTotal,rows.map(r=>Math.max(3,r.player.rebounding+(r.player.pos==='C'?26:r.player.pos==='PF'?14:r.player.pos==='SF'?6:0))*(.78+rand()*.48)));
  const teamFgm=sum(rows.map(r=>r.fgm));const assistRate=clamp(.48+(average(team.map(p=>p.playmaking))-75)*.0035+(metrics.fit-75)*.0020,.38,.80);const astTarget=clamp(Math.round(teamFgm*assistRate+normal(rand)*1.8),5,teamFgm);const ast=allocInteger(astTarget,rows.map(r=>Math.max(3,r.player.playmaking-45)*(r.player.pos==='PG'?1.28:r.player.pos==='SG'?1.08:1)*(.72+rand()*.58)));
  const oppTO=sum(oppRows.map(r=>r.to));const stealTarget=clamp(Math.round(oppTO*clamp(.48+(average(team.map(p=>p.perimeterDefense))-75)*.003,.32,.75)),2,Math.min(oppTO,13));const stl=allocInteger(stealTarget,rows.map(r=>Math.max(2,r.player.perimeterDefense-45)*(.65+rand()*.70)));
  const oppTwoMisses=sum(oppRows.map(r=>(r.fga-r.threeA)-(r.fgm-r.threeM)));const blockTarget=clamp(Math.round(2.4+(Math.max(...team.map(p=>p.rimDefense))-75)*.075+normal(rand)*1.4),0,Math.min(10,Math.max(0,oppTwoMisses)));const blk=allocInteger(blockTarget,rows.map(r=>Math.max(2,r.player.rimDefense-48)*(r.player.pos==='C'?1.45:r.player.pos==='PF'?1.18:1)*(.60+rand()*.78)));
  rows.forEach((r,i)=>{r.dreb=dreb[i];r.reb=r.oreb+r.dreb;r.ast=ast[i];r.stl=stl[i];r.blk=blk[i];});
}
function simulateGame(teamA,teamB,seedText=''){
  const rand=seedText?seededRandom(seedText):Math.random;const a=teamMetrics(teamA),b=teamMetrics(teamB);const possessions=clamp(Math.round(87+normal(rand)*4.2),76,98);
  const profileA=possessionProfile(teamA,teamB,a,b,possessions,rand),profileB=possessionProfile(teamB,teamA,b,a,possessions,rand);
  const boxA=primaryBox(teamA,teamB,a,b,profileA,rand),boxB=primaryBox(teamB,teamA,b,a,profileB,rand);fillSecondary(boxA,boxB,teamA,teamB,a,b,rand);fillSecondary(boxB,boxA,teamB,teamA,b,a,rand);
  let scoreA=sum(boxA.map(r=>r.pts)),scoreB=sum(boxB.map(r=>r.pts));
  if(scoreA===scoreB){const winner=rand()<.5?boxA:boxB;const row=winner[Math.floor(rand()*winner.length)];row.fta++;row.ftm++;row.pts++;if(winner===boxA)scoreA++;else scoreB++;}
  const quartersA=splitQuarters(scoreA,rand),quartersB=splitQuarters(scoreB,rand);return{a,b,aWins:scoreA>scoreB,scoreA,scoreB,quartersA,quartersB,boxA,boxB,gameMinutes:40,possessions,profileA,profileB,seed:seedText||null};
}
function rosterHtml(team){return orderedLineup(team).map(({player:p,slot})=>`<div class="match-player"><span class="matchup-slot">${slot}</span><strong>${escapeHtml(p.name)}</strong><span>${p.pos} · $${p.price} · ${escapeHtml(p.archetype)}</span></div>`).join('');}
function totalRow(rows){return{fgm:sum(rows.map(r=>r.fgm)),fga:sum(rows.map(r=>r.fga)),threeM:sum(rows.map(r=>r.threeM)),threeA:sum(rows.map(r=>r.threeA)),ftm:sum(rows.map(r=>r.ftm)),fta:sum(rows.map(r=>r.fta)),oreb:sum(rows.map(r=>r.oreb)),reb:sum(rows.map(r=>r.reb)),ast:sum(rows.map(r=>r.ast)),stl:sum(rows.map(r=>r.stl)),blk:sum(rows.map(r=>r.blk)),to:sum(rows.map(r=>r.to)),pts:sum(rows.map(r=>r.pts))};}
function boxTable(label,rows){const t=totalRow(rows);return`<article class="box-score-card"><h3>${escapeHtml(label)}</h3><table class="box-score"><thead><tr><th>POS</th><th>PLAYER</th><th>MIN</th><th>FG</th><th>3PT</th><th>FT</th><th>ORB</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TO</th><th>PTS</th></tr></thead><tbody>${rows.map(r=>`<tr><td><strong>${r.slot}</strong></td><td><strong>${escapeHtml(r.player.name)}</strong><br><small>${r.player.pos} · vs ${escapeHtml(r.defender.name)}</small></td><td>40</td><td>${r.fgm}-${r.fga}</td><td>${r.threeM}-${r.threeA}</td><td>${r.ftm}-${r.fta}</td><td>${r.oreb}</td><td>${r.reb}</td><td>${r.ast}</td><td>${r.stl}</td><td>${r.blk}</td><td>${r.to}</td><td><strong>${r.pts}</strong></td></tr>`).join('')}<tr><td></td><td>TEAM</td><td>200</td><td>${t.fgm}-${t.fga}</td><td>${t.threeM}-${t.threeA}</td><td>${t.ftm}-${t.fta}</td><td>${t.oreb}</td><td>${t.reb}</td><td>${t.ast}</td><td>${t.stl}</td><td>${t.blk}</td><td>${t.to}</td><td>${t.pts}</td></tr></tbody></table><div class="box-note">Rows are ordered PG → SG → SF → PF → C to show the direct matchup. FGA differences are driven by the shared possession count, turnovers, offensive rebounds, and free throws. Every player logs 40 minutes; stamina and injuries are not simulated.</div></article>`;}
function gameStory(result,labelA='YOU',labelB='CPU'){
  const ta=totalRow(result.boxA),tb=totalRow(result.boxB),all=[...result.boxA.map(r=>({...r,side:labelA})),...result.boxB.map(r=>({...r,side:labelB}))];const top=[...all].sort((x,y)=>y.pts-x.pts)[0];const notes=[];
  if(top)notes.push(`<strong>${escapeHtml(top.player.name)}</strong> led the game with ${top.pts} points on ${top.fgm}-${top.fga} shooting against ${escapeHtml(top.defender.name)}.`);
  const fgaGap=ta.fga-tb.fga;if(Math.abs(fgaGap)>=3){const leader=fgaGap>0?labelA:labelB,a=fgaGap>0?ta:tb,b=fgaGap>0?tb:ta;notes.push(`<strong>${escapeHtml(leader)}</strong> created ${Math.abs(fgaGap)} more field-goal attempts (${a.oreb} ORB, ${a.to} TO vs ${b.oreb} ORB, ${b.to} TO).`);}
  const cold=[...all].filter(r=>r.fga>=12).sort((x,y)=>(x.fgm/x.fga)-(y.fgm/y.fga))[0];if(cold&&(cold.fgm/cold.fga)<.36)notes.push(`<strong>${escapeHtml(cold.defender.name)}</strong> helped hold ${escapeHtml(cold.player.name)} to ${cold.fgm}-${cold.fga} from the field in their direct ${cold.slot} matchup.`);
  return notes.slice(0,3).map(n=>`<div class="story-note">${n}</div>`).join('');
}
function renderGame(result,teamA,teamB,labelA='YOU',labelB='CPU'){
  $('matchup-strip').innerHTML=matchupPairs(teamA,teamB).map(m=>`<div class="matchup-pair"><strong>${m.slot}</strong><span>${escapeHtml(m.a.name)}</span><em>vs</em><span>${escapeHtml(m.b.name)}</span></div>`).join('');
  $('game-story').innerHTML=gameStory(result,labelA,labelB);
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
  await recordHallOfFame();
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

function hofRosterKey(team){return ids(team).slice().sort().join('|');}
function hofEntry(){return{key:`${state.mode}|${hofRosterKey(state.gauntletTeam)}`,pool_mode:state.mode,board_type:state.boardType,date:state.selectedDate,roster:ids(state.gauntletTeam).slice().sort(),rounds_cleared:state.gauntletCleared,point_diff:state.gauntletTotals.for-state.gauntletTotals.against,points_for:state.gauntletTotals.for,points_against:state.gauntletTotals.against,achieved_at:new Date().toISOString()};}
function hofBetter(a,b){return (a.rounds_cleared-b.rounds_cleared)||(a.point_diff-b.point_diff)||(a.points_for-b.points_for);}
function mergeLocalHof(entry){const found=state.hof.findIndex(x=>x.key===entry.key);if(found<0)state.hof.push(entry);else if(hofBetter(entry,state.hof[found])>0)state.hof[found]=entry;state.hof.sort((a,b)=>hofBetter(b,a)||String(a.achieved_at).localeCompare(String(b.achieved_at)));state.hof=state.hof.slice(0,5);saveLocal();renderHallOfFame();}
function hofNames(entry){return (entry.roster||[]).map(id=>playerById(id)?.name||id);}
function renderHallOfFame(){const root=$('hof-list');if(!root)return;if(!state.hof.length){root.innerHTML='<div class="hof-empty">Complete a Gauntlet run to put your first lineup in the Hall of Five.</div>';return;}root.innerHTML=state.hof.map((e,i)=>`<article class="hof-card"><div class="hof-rank">${i+1}</div><div><span class="overline">${escapeHtml((e.pool_mode||'current').toUpperCase())} · ${e.board_type==='daily'?'DAILY':'RANDOM'}</span><h3>${e.rounds_cleared>=10?'GAUNTLET CLEARED':`ROUND ${e.rounds_cleared}`}</h3><p>${hofNames(e).map(escapeHtml).join(' · ')}</p><small>${e.point_diff>=0?'+':''}${e.point_diff} point diff · ${e.points_for}-${e.points_against} aggregate</small></div></article>`).join('');}
async function loadHallOfFame(){renderHallOfFame();if(!db||!state.user)return;try{const{data,error}=await db.from('cash_grab_hof').select('pool_mode,board_type,roster,rounds_cleared,point_diff,points_for,points_against,achieved_at').eq('user_id',state.user.id).order('rounds_cleared',{ascending:false}).order('point_diff',{ascending:false}).order('points_for',{ascending:false}).limit(5);if(error)throw error;if(data){state.hof=data.map(e=>({...e,key:`${e.pool_mode}|${(e.roster||[]).slice().sort().join('|')}`}));saveLocal();renderHallOfFame();}}catch(e){/* v4 migration may not be installed yet; local HOF still works */}}
async function recordHallOfFame(){const entry=hofEntry();mergeLocalHof(entry);if(!db||!state.user)return;try{const{error}=await db.rpc('record_cash_grab_hof',{p_pool_mode:entry.pool_mode,p_board_type:entry.board_type,p_roster:entry.roster,p_rounds_cleared:entry.rounds_cleared,p_point_diff:entry.point_diff,p_points_for:entry.points_for,p_points_against:entry.points_against});if(!error)await loadHallOfFame();}catch{}}

async function initOnline(){
  if(!db){updateOnlineStatus();return;}const {data}=await db.auth.getSession();state.user=data.session?.user||null;if(state.user){const{data:p}=await db.from('profiles').select('id,username').eq('id',state.user.id).maybeSingle();state.profile=p||null;}
  updateOnlineStatus();await checkDailyAttempt();await refreshChallengeCount();await loadHallOfFame();db.auth.onAuthStateChange(async(_,session)=>{state.user=session?.user||null;state.profile=null;if(state.user){const{data:p}=await db.from('profiles').select('id,username').eq('id',state.user.id).maybeSingle();state.profile=p||null;}updateOnlineStatus();checkDailyAttempt();refreshChallengeCount();loadHallOfFame();});
}
function updateOnlineStatus(){const el=$('online-status');if(!ONLINE_READY){el.textContent='Online draft setup needed';el.className='online-status offline';}else if(!state.user){el.textContent='Log in for real-player drafts';el.className='online-status';}else{el.textContent=`Online as ${state.profile?.username||'player'}`;el.className='online-status online';}}
function requireOnline(){if(!ONLINE_READY){toast('Online Cash Grab is not connected.','Run the Cash Grab v4 Supabase migration.');return false;}if(!state.user){toast('Log in first.','Use your HoopLoop account to play real-player drafts or record a Daily score.');return false;}return true;}
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
function serializeResult(r){return{scoreA:r.scoreA,scoreB:r.scoreB,quartersA:r.quartersA,quartersB:r.quartersB,boxA:r.boxA.map(x=>({...x,player:x.player.id,defender:x.defender?.id||null})),boxB:r.boxB.map(x=>({...x,player:x.player.id,defender:x.defender?.id||null})),a:r.a,b:r.b};}
function hydrateResult(raw,teamA,teamB){const oa=orderedLineup(teamA),ob=orderedLineup(teamB);const ha=(raw.boxA||[]).map((x,i)=>({...x,player:playerById(x.player)||oa[i]?.player,slot:x.slot||oa[i]?.slot||SLOT_LABELS[i],defender:playerById(x.defender)||ob[i]?.player}));const hb=(raw.boxB||[]).map((x,i)=>({...x,player:playerById(x.player)||ob[i]?.player,slot:x.slot||ob[i]?.slot||SLOT_LABELS[i],defender:playerById(x.defender)||oa[i]?.player}));return{scoreA:raw.scoreA,scoreB:raw.scoreB,quartersA:raw.quartersA,quartersB:raw.quartersB,boxA:ha,boxB:hb,a:raw.a||teamMetrics(teamA),b:raw.b||teamMetrics(teamB),aWins:raw.scoreA>raw.scoreB};}
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
async function init(){loadLocal();state.selectedDate=chicagoDate();bind();makeBoard();renderHallOfFame();await initOnline();}
document.addEventListener('DOMContentLoaded',init);
