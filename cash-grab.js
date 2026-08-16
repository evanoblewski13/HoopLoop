'use strict';
// Cash Grab v7.1 — full box scores + quarter-by-quarter presentation

const DATA = window.HOOPLOOP_CASH_GRAB_DATA || { current: [], allTime: [] };
const REAL = window.HOOPLOOP_CASH_GRAB_REAL_DATA || { meta:{}, profiles:{}, h2h:{} };
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
  draft:null, draftTimer:null, hof:[], lineupConfig:[], gauntletConfig:[],
  pendingBattle:null, gameTimer:null
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
  state.board=[...board];state.selected=[];state.lineupConfig=[];state.gauntletConfig=[];state.gauntletActive=false;state.gauntletRound=0;state.gauntletCleared=0;state.gauntletFailedRound=null;state.gauntletTotals={for:0,against:0};state.gauntletTeam=[];state.officialDaily=false;state.dailyRunId=null;
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
      b.innerHTML=`<div class="player-topline"><strong>${escapeHtml(player.name)}</strong><span class="price-chip">$${player.price}</span></div><div class="player-meta"><span class="position-row-badge">${player.group}</span><span>${player.pos}</span></div>`;
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

function renderTeam(){
  const cost=usedBudget();$('budget-left').textContent=`$${15-cost}`;$('roster-count').textContent=`${state.selected.length} / 5`;$('team-cost').textContent=`$${cost} / $15`;$('budget-meter').style.width=`${cost/15*100}%`;
  const complete=state.selected.length===5;
  $('selected-team').innerHTML=Array.from({length:5},(_,i)=>state.selected[i]?`<div class="selected-slot filled"><strong>${escapeHtml(state.selected[i].name)}</strong><span>$${state.selected[i].price} · ${state.selected[i].pos}</span></div>`:`<div class="selected-slot"><strong>Open spot</strong><span>Choose from the board</span></div>`).join('');
  $('team-title').textContent=complete?'Five ready.':'Choose five players.';
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
const POINT_ROLE={1:1.18,2:1.09,3:1.00,4:.91,5:.82};
const AST_ROLE={1:1.10,2:1.05,3:1.00,4:.95,5:.90};
const REB_ROLE={1:1.03,2:1.01,3:1.00,4:.99,5:.97};
const TOV_ROLE={1:1.16,2:1.08,3:1.00,4:.93,5:.87};
const GAME_PACE=1.04;
const QUARTER_DELAY=1400;
function realProfile(p){return REAL.profiles?.[p?.id]||null;}
function productionValue(p){const r=realProfile(p);return r?(Number(r.ppg)||0)+(Number(r.rpg)||0)+(Number(r.apg)||0):0;}
function naturalOrder(team){return [...team].sort((a,b)=>(POS_RANK[a.pos]??2)-(POS_RANK[b.pos]??2)||productionValue(b)-productionValue(a)||a.name.localeCompare(b.name));}
function autoLineupConfig(team,opponent=[]){
  const options=[...team].sort((a,b)=>productionValue(b)-productionValue(a));const optionMap=new Map(options.map((p,i)=>[p.id,i+1]));
  const mine=naturalOrder(team),theirs=naturalOrder(opponent);
  return mine.map((p,i)=>({id:p.id,option:optionMap.get(p.id)||3,guard:theirs[i]?.id||null}));
}
function validLineupConfig(team,config,opponent=[]){
  if(team.length!==5||opponent.length!==5||!Array.isArray(config)||config.length!==5)return false;
  const mine=new Set(team.map(p=>p.id)),theirs=new Set(opponent.map(p=>p.id));
  return config.every(x=>mine.has(x.id)&&theirs.has(x.guard)&&Number.isInteger(Number(x.option))&&Number(x.option)>=1&&Number(x.option)<=5)
    &&new Set(config.map(x=>x.id)).size===5&&new Set(config.map(x=>x.guard)).size===5&&new Set(config.map(x=>Number(x.option))).size===5;
}
function normalizedLineupConfig(team,config,opponent=[]){return validLineupConfig(team,config,opponent)?config.map(x=>({id:x.id,guard:x.guard,option:Number(x.option)})):autoLineupConfig(team,opponent);}
function setConfigValue(config,id,field,value){const current=config.find(x=>x.id===id);if(!current)return config;const parsed=field==='option'?Number(value):value;const other=config.find(x=>x.id!==id&&x[field]===parsed);const old=current[field];current[field]=parsed;if(other)other[field]=old;return config;}
function matchupControlHtml(team,opponent,config,locked=false,prefix='battle'){
  const cfg=normalizedLineupConfig(team,config,opponent),rows=new Map(cfg.map(x=>[x.id,x]));
  return naturalOrder(team).map(p=>{const row=rows.get(p.id);return`<div class="lineup-control-row"><div class="lineup-control-player"><strong>${escapeHtml(p.name)}</strong><span>${p.pos} · $${p.price}</span></div><label>DEFEND<select data-${prefix}-guard="${p.id}" ${locked?'disabled':''}>${naturalOrder(opponent).map(o=>`<option value="${o.id}" ${o.id===row.guard?'selected':''}>${escapeHtml(o.name)} · ${o.pos}</option>`).join('')}</select></label><label>OFFENSE<select data-${prefix}-option="${p.id}" ${locked?'disabled':''}>${[1,2,3,4,5].map(x=>`<option value="${x}" ${x===row.option?'selected':''}>#${x}</option>`).join('')}</select></label></div>`;}).join('');
}
function normalizeKey(name=''){return String(name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');}
function h2hSample(offender,defender){const raw=REAL.h2h?.[`${normalizeKey(offender?.name)}|${normalizeKey(defender?.name)}`];if(!Array.isArray(raw)||raw.length<4)return null;return{gp:Number(raw[0])||0,ppg:Number(raw[1])||0,rpg:Number(raw[2])||0,apg:Number(raw[3])||0};}
function expectedAgainst(offender,defender,option=3){
  const base=realProfile(offender)||{ppg:0,rpg:0,apg:0};const sample=h2hSample(offender,defender);const basePpg=Math.max(.1,Number(base.ppg)||0);let ppg=basePpg,rpg=Number(base.rpg)||0,apg=Number(base.apg)||0,weight=0;
  if(sample&&sample.gp>=3){weight=Math.min(.60,sample.gp/(sample.gp+15));ppg=ppg*(1-weight)+sample.ppg*weight;rpg=rpg*(1-weight)+sample.rpg*weight;apg=apg*(1-weight)+sample.apg*weight;}
  const matchRatio=clamp(ppg/basePpg,.72,1.32);
  return{ppg:ppg*(POINT_ROLE[option]||1),rpg:rpg*(REB_ROLE[option]||1),apg:apg*(AST_ROLE[option]||1),matchRatio,h2hGames:sample?.gp||0,h2hWeight:weight};
}
function sampleCount(mean,rand,kind='count'){
  const base=Math.max(0,mean);const sd=kind==='reb'?Math.max(1.4,base*.30):kind==='ast'?Math.max(1.2,base*.32):kind==='stl'||kind==='blk'?Math.max(.65,Math.sqrt(base+.2)*.72):kind==='tov'?Math.max(.8,Math.sqrt(base+.4)*.85):Math.max(.75,Math.sqrt(base+.3)*.78);
  const cap=kind==='reb'?32:kind==='ast'?24:kind==='stl'?8:kind==='blk'?9:kind==='tov'?10:10;return clamp(Math.round(base+normal(rand)*sd),0,cap);
}
function sampleAttempts(mean,rand,min=0,max=45){const base=Math.max(0,mean);return clamp(Math.round(base+normal(rand)*Math.max(1,Math.sqrt(base)*.75)),min,max);}
function binomial(n,p,rand){let made=0,prob=clamp(Number(p)||0,0,1);for(let i=0;i<n;i++)if(rand()<prob)made++;return made;}
function pct(m,a,fallback){return a>0?m/a:fallback;}
function minuteScale(profile){const mpg=Number(profile?.mpg)||33;return clamp(40/mpg,1.04,1.31);}
function simulatePlayerLine(player,defender,option,exp,rand){
  const b=realProfile(player)||{};const minScale=minuteScale(b);const matchupVolume=clamp(Math.sqrt(exp.matchRatio||1),.88,1.12);const matchupEff=clamp(1+(Number(exp.matchRatio||1)-1)*.22,.94,1.06);const usage=POINT_ROLE[option]||1;
  const baseFga=Math.max(3,Number(b.fga)||((Number(b.ppg)||8)/1.42));const baseTpa=clamp(Number(b.tpa)||baseFga*.34,0,baseFga);const baseFta=Math.max(.6,Number(b.fta)||((Number(b.ppg)||8)*.18));
  const fga=sampleAttempts(baseFga*minScale*GAME_PACE*usage*matchupVolume,rand,2,42);const tpa=clamp(sampleAttempts(baseTpa*minScale*GAME_PACE*usage*matchupVolume,rand,0,25),0,fga);const twoa=fga-tpa;const fta=sampleAttempts(baseFta*minScale*GAME_PACE*(.82+.18*usage)*matchupVolume,rand,0,24);
  const baseTpp=pct(Number(b.tpm)||0,Number(b.tpa)||0,.355);const baseTwo=pct((Number(b.fgm)||0)-(Number(b.tpm)||0),(Number(b.fga)||0)-(Number(b.tpa)||0),.525);const baseFtp=pct(Number(b.ftm)||0,Number(b.fta)||0,.775);
  const tpm=binomial(tpa,clamp(baseTpp*matchupEff,.22,.52),rand),twom=binomial(twoa,clamp(baseTwo*matchupEff,.35,.72),rand),ftm=binomial(fta,clamp(baseFtp,.48,.96),rand);const fgm=tpm+twom;const pts=3*tpm+2*twom+ftm;
  const rebMean=Math.max(0,exp.rpg*minScale*GAME_PACE),reb=sampleCount(rebMean,rand,'reb');const baseOreb=Math.max(0,Number(b.oreb)||0),baseDreb=Math.max(0,Number(b.dreb)||0),orebShare=(baseOreb+baseDreb)>0?clamp(baseOreb/(baseOreb+baseDreb),.06,.48):.22;const oreb=binomial(reb,orebShare,rand),dreb=reb-oreb;
  const ast=sampleCount(Math.max(0,exp.apg*minScale*GAME_PACE),rand,'ast'),stl=sampleCount((Number(b.spg)||.8)*minScale,rand,'stl'),blk=sampleCount((Number(b.bpg)||.45)*minScale,rand,'blk'),tov=sampleCount((Number(b.tov)||2.0)*minScale*(TOV_ROLE[option]||1),rand,'tov'),pf=clamp(sampleCount((Number(b.pf)||2.3)*minScale,rand,'pf'),0,6);
  return{player,defender,option,min:40,fgm,fga,tpm,tpa,ftm,fta,oreb,dreb,reb,ast,stl,blk,tov,pf,pts,h2hGames:exp.h2hGames,h2hWeight:exp.h2hWeight};
}
function splitQuarters(total,rand){const weights=[1+normal(rand)*.12,1+normal(rand)*.12,1+normal(rand)*.12,1+normal(rand)*.12].map(v=>Math.max(.4,v));const s=sum(weights)||1,raw=weights.map(w=>total*w/s),out=raw.map(Math.floor);let left=total-sum(out);const order=raw.map((v,i)=>[v-out[i],i]).sort((a,b)=>b[0]-a[0]);for(let i=0;i<left;i++)out[order[i%4][1]]++;return out;}
function simulateSide(team,opponent,configTeam,configOpp,rand){
  const mine=normalizedLineupConfig(team,configTeam,opponent),theirs=normalizedLineupConfig(opponent,configOpp,team);const mineMap=new Map(mine.map(x=>[x.id,x]));
  return naturalOrder(team).map(p=>{const row=mineMap.get(p.id),defenderRow=theirs.find(x=>x.guard===p.id),defender=playerById(defenderRow?.id)||naturalOrder(opponent)[0],exp=expectedAgainst(p,defender,row.option);return simulatePlayerLine(p,defender,row.option,exp,rand);});
}
function simulateGame(teamA,teamB,seedText='',configA=null,configB=null){
  const rand=seedText?seededRandom(seedText):Math.random,lineupA=normalizedLineupConfig(teamA,configA,teamB),lineupB=normalizedLineupConfig(teamB,configB,teamA),boxA=simulateSide(teamA,teamB,lineupA,lineupB,rand),boxB=simulateSide(teamB,teamA,lineupB,lineupA,rand);let scoreA=sum(boxA.map(r=>r.pts)),scoreB=sum(boxB.map(r=>r.pts));
  if(scoreA===scoreB){const rows=rand()<.5?boxA:boxB,who=rows[Math.floor(rand()*rows.length)];who.fta++;who.ftm++;who.pts++;if(rows===boxA)scoreA++;else scoreB++;}
  const quartersA=splitQuarters(scoreA,rand),quartersB=splitQuarters(scoreB,rand);return{aWins:scoreA>scoreB,scoreA,scoreB,quartersA,quartersB,segmentsA:[...quartersA],segmentsB:[...quartersB],boxA,boxB,lineupA,lineupB,gameMinutes:40,seed:seedText||null};
}
function rosterHtml(team,config,opponent){const cfg=normalizedLineupConfig(team,config,opponent),byId=new Map(cfg.map(x=>[x.id,x]));return naturalOrder(team).map(p=>`<div class="match-player"><strong>${escapeHtml(p.name)}</strong><span>${p.pos} · $${p.price} · OFF #${byId.get(p.id)?.option||3}</span></div>`).join('');}
function boxTable(label,rows){return`<article class="box-score-card"><h3>${escapeHtml(label)}</h3><table class="box-score"><thead><tr><th>PLAYER</th><th>MIN</th><th>FG</th><th>3PT</th><th>FT</th><th>OREB</th><th>DREB</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TO</th><th>PF</th><th>PTS</th></tr></thead><tbody>${rows.map(r=>`<tr><td><strong>${escapeHtml(r.player.name)}</strong><br><small>${r.player.pos} · OFF #${r.option}</small></td><td>${r.min??40}</td><td>${r.fgm??0}-${r.fga??0}</td><td>${r.tpm??0}-${r.tpa??0}</td><td>${r.ftm??0}-${r.fta??0}</td><td>${r.oreb??0}</td><td>${r.dreb??Math.max(0,(r.reb??0)-(r.oreb??0))}</td><td>${r.reb??0}</td><td>${r.ast??0}</td><td>${r.stl??0}</td><td>${r.blk??0}</td><td>${r.tov??0}</td><td>${r.pf??0}</td><td><strong>${r.pts??0}</strong></td></tr>`).join('')}</tbody></table></article>`;}
function renderLineScore(result,labelA='YOU',labelB='CPU',completedQuarters=4,liveA=result.scoreA,liveB=result.scoreB){
  const a=result.quartersA.map((q,i)=>i<completedQuarters?q:'—'),b=result.quartersB.map((q,i)=>i<completedQuarters?q:'—');$('line-score-wrap').innerHTML=`<table class="line-score"><thead><tr><th>TEAM</th><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th><th>SCORE</th></tr></thead><tbody><tr><td>${escapeHtml(labelA)}</td>${a.map(q=>`<td>${q}</td>`).join('')}<td><strong>${liveA}</strong></td></tr><tr><td>${escapeHtml(labelB)}</td>${b.map(q=>`<td>${q}</td>`).join('')}<td><strong>${liveB}</strong></td></tr></tbody></table>`;}
function renderGame(result,teamA,teamB,labelA='YOU',labelB='CPU'){renderLineScore(result,labelA,labelB,4,result.scoreA,result.scoreB);$('box-score-shell').innerHTML=boxTable(labelA,result.boxA)+boxTable(labelB,result.boxB);}
function stopGameTimer(){if(state.gameTimer){clearTimeout(state.gameTimer);clearInterval(state.gameTimer);state.gameTimer=null;}}
function bindPendingControls(){const p=state.pendingBattle;if(!p||p.locked)return;qsa('[data-battle-guard]').forEach(el=>el.onchange=()=>{setConfigValue(p.configA,el.dataset.battleGuard,'guard',el.value);renderPendingControls();});qsa('[data-battle-option]').forEach(el=>el.onchange=()=>{setConfigValue(p.configA,el.dataset.battleOption,'option',Number(el.value));renderPendingControls();});}
function renderPendingControls(){const p=state.pendingBattle;if(!p)return;$('matchup-strip').classList.remove('hidden');$('matchup-strip').innerHTML=matchupControlHtml(p.teamA,p.teamB,p.configA,Boolean(p.locked),'battle');bindPendingControls();}
function prepareBattle(teamA,teamB,{type='quick',title='5v5 game',opponentLabel='CPU',seed='',configA=null,configB=null,resolvedResult=null,locked=false,autoStart=false,scroll=true}={}){
  stopGameTimer();const a=normalizedLineupConfig(teamA,configA,teamB),b=normalizedLineupConfig(teamB,configB,teamA);state.pendingBattle={teamA,teamB,type,title,opponentLabel,seed,configA:a,configB:b,resolvedResult,locked};state.currentOpponent=teamB;state.currentBattle=null;
  $('matchup-section').classList.remove('hidden');$('matchup-kicker').textContent=type==='gauntlet'?`GAUNTLET · ROUND ${state.gauntletRound}`:'5V5 · 40 MINUTES';$('matchup-title').textContent=title;$('your-match-roster').innerHTML=rosterHtml(teamA,a,teamB);$('opponent-match-roster').innerHTML=rosterHtml(teamB,b,teamA);$('opponent-label').textContent=opponentLabel;$('final-score').textContent='0–0';$('game-clock').textContent='READY';$('line-score-wrap').innerHTML='';$('box-score-shell').innerHTML='';$('result-card').classList.add('hidden');renderPendingControls();const btn=$('simulate-game');btn.disabled=false;btn.textContent=resolvedResult?'Watch game':'Simulate game';if(scroll)$('matchup-section').scrollIntoView({behavior:'smooth',block:'start'});if(autoStart)setTimeout(startPendingSimulation,250);
}
function startPendingSimulation(){
  const p=state.pendingBattle;if(!p||state.gameTimer)return;const result=p.resolvedResult||simulateGame(p.teamA,p.teamB,p.seed,p.configA,p.configB);result.lineupA=normalizedLineupConfig(p.teamA,result.lineupA||p.configA,p.teamB);result.lineupB=normalizedLineupConfig(p.teamB,result.lineupB||p.configB,p.teamA);state.currentBattle={type:p.type,result,teamA:p.teamA,teamB:p.teamB,opponentLabel:p.opponentLabel,processed:false};$('simulate-game').disabled=true;$('matchup-strip').classList.add('hidden');$('box-score-shell').innerHTML='';let completed=0,liveA=0,liveB=0;$('game-clock').textContent='Q1';$('final-score').textContent='0–0';renderLineScore(result,'YOU',p.opponentLabel,0,0,0);
  const advance=()=>{liveA+=result.quartersA[completed]||0;liveB+=result.quartersB[completed]||0;completed++;$('final-score').textContent=`${liveA}–${liveB}`;renderLineScore(result,'YOU',p.opponentLabel,completed,liveA,liveB);if(completed>=4){stopGameTimer();$('game-clock').textContent='FINAL';renderGame(result,p.teamA,p.teamB,'YOU',p.opponentLabel);renderResult();return;}$('game-clock').textContent=completed===2?'HALFTIME':`END Q${completed}`;state.gameTimer=setTimeout(()=>{$('game-clock').textContent=`Q${completed+1}`;state.gameTimer=setTimeout(advance,QUARTER_DELAY*.72);},QUARTER_DELAY*.28);};
  state.gameTimer=setTimeout(advance,QUARTER_DELAY);
}
function renderResult(){
  if(!state.currentBattle)return;const battle=state.currentBattle,{result,type}=battle,won=result.aWins;$('result-card').classList.remove('hidden');$('result-title').textContent=won?'WIN':'LOSS';$('result-kicker').textContent='FINAL';
  if(battle.processed)return;battle.processed=true;
  if(type==='quick'){won?state.quickWins++:state.quickLosses++;saveLocal();$('result-next').textContent='Back to builder';$('result-rematch').classList.remove('hidden');}
  else if(type==='gauntlet'){state.gauntletTotals.for+=result.scoreA;state.gauntletTotals.against+=result.scoreB;if(won){state.gauntletCleared=state.gauntletRound;if(!state.officialDaily){state.bestRound=Math.max(state.bestRound,state.gauntletRound);saveLocal();}if(state.gauntletRound===10){state.gauntletActive=false;$('result-next').textContent='Gauntlet cleared';finalizeGauntlet();}else $('result-next').textContent=`Round ${state.gauntletRound+1}`;}else{state.gauntletFailedRound=state.gauntletRound;state.gauntletActive=false;if(!state.officialDaily){state.bestRound=Math.max(state.bestRound,state.gauntletRound-1);saveLocal();}$('result-next').textContent='Back to builder';finalizeGauntlet();}$('result-rematch').classList.add('hidden');renderGauntletMap();}
  else{$('result-next').textContent='Back to builder';$('result-rematch').classList.add('hidden');}renderTeam();
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
function playBot(){if(state.selected.length!==5)return toast('Build a five-player team first.');const opp=randomBotTeam(ids(state.selected));prepareBattle(state.selected,opp,{type:'quick',title:'Your five vs. CPU',opponentLabel:'CPU',seed:`bot|${Date.now()}|${ids(state.selected).join(',')}`});}
function gauntletOpponent(round){const seed=state.boardType==='daily'?`cg-gauntlet|${state.selectedDate}|${state.mode}|${round}`:'';return buildOpponentFromPrices(GAUNTLET[round-1],ids(state.gauntletTeam),seed);}
async function startGauntlet(){
  if(state.selected.length!==5)return toast('Build a five-player team first.');
  state.officialDaily=false;state.dailyRunId=null;
  if(state.boardType==='daily'&&isToday()&&state.user&&!state.dailyAttemptUsed){
    const ok=await reserveDailyRun();if(!ok)return;state.officialDaily=true;
  }else if(state.boardType==='daily'&&isToday()&&!state.user&&!localDailyUsed()){markLocalDailyUsed();}
  state.gauntletActive=true;state.gauntletTeam=[...state.selected];state.gauntletConfig=[];state.gauntletRound=1;state.gauntletCleared=0;state.gauntletFailedRound=null;state.gauntletTotals={for:0,against:0};renderGauntletMap();playGauntletRound();
}
function playGauntletRound(){
  const opp=gauntletOpponent(state.gauntletRound),seed=state.boardType==='daily'?`cg-game|${state.selectedDate}|${state.mode}|${state.gauntletRound}|${ids(state.gauntletTeam).slice().sort().join(',')}`:`cg-practice|${Date.now()}|${state.gauntletRound}`;prepareBattle(state.gauntletTeam,opp,{type:'gauntlet',title:`Gauntlet Round ${state.gauntletRound} of 10`,opponentLabel:`ROUND ${state.gauntletRound}`,seed});
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
async function loadHallOfFame(){renderHallOfFame();if(!db||!state.user)return;try{const{data,error}=await db.from('cash_grab_hof').select('pool_mode,board_type,roster,rounds_cleared,point_diff,points_for,points_against,achieved_at').eq('user_id',state.user.id).order('rounds_cleared',{ascending:false}).order('point_diff',{ascending:false}).order('points_for',{ascending:false}).limit(5);if(error)throw error;if(data){state.hof=data.map(e=>({...e,key:`${e.pool_mode}|${(e.roster||[]).slice().sort().join('|')}`}));saveLocal();renderHallOfFame();}}catch(e){/* HOF migration may not be installed yet; local HOF still works */}}
async function recordHallOfFame(){const entry=hofEntry();mergeLocalHof(entry);if(!db||!state.user)return;try{const{error}=await db.rpc('record_cash_grab_hof',{p_pool_mode:entry.pool_mode,p_board_type:entry.board_type,p_roster:entry.roster,p_rounds_cleared:entry.rounds_cleared,p_point_diff:entry.point_diff,p_points_for:entry.points_for,p_points_against:entry.points_against});if(!error)await loadHallOfFame();}catch{}}

async function initOnline(){
  if(!db){updateOnlineStatus();return;}const {data}=await db.auth.getSession();state.user=data.session?.user||null;if(state.user){const{data:p}=await db.from('profiles').select('id,username').eq('id',state.user.id).maybeSingle();state.profile=p||null;}
  updateOnlineStatus();await checkDailyAttempt();await refreshChallengeCount();await loadHallOfFame();db.auth.onAuthStateChange(async(_,session)=>{state.user=session?.user||null;state.profile=null;if(state.user){const{data:p}=await db.from('profiles').select('id,username').eq('id',state.user.id).maybeSingle();state.profile=p||null;}updateOnlineStatus();checkDailyAttempt();refreshChallengeCount();loadHallOfFame();});
}
function updateOnlineStatus(){const el=$('online-status');if(!ONLINE_READY){el.textContent='Online draft setup needed';el.className='online-status offline';}else if(!state.user){el.textContent='Log in for real-player drafts';el.className='online-status';}else{el.textContent=`Online as ${state.profile?.username||'player'}`;el.className='online-status online';}}
function requireOnline(){if(!ONLINE_READY){toast('Online Cash Grab is not connected.','Install the existing Cash Grab v5 backend.');return false;}if(!state.user){toast('Log in first.','Use your HoopLoop account to play real-player drafts or record a Daily score.');return false;}return true;}
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
function draftChallengeRow(d){const incoming=d.opponent_id===state.user.id,other=incoming?d.host?.username:(d.opponent?.username||'Random opponent');let action='';if(incoming&&d.status==='invited')action=`<span class="row-actions"><button class="small-action" data-accept-draft="${d.id}">Accept</button><button class="small-action secondary" data-cancel-draft="${d.id}">Decline</button></span>`;else if(['drafting','configuring','ready','finished'].includes(d.status))action=`<button class="small-action" data-open-draft="${d.id}">${d.status==='finished'?'View':'Open'}</button>`;else action=`<button class="small-action secondary" data-cancel-draft="${d.id}">${d.status}</button>`;return`<div class="challenge-row"><span><strong>${escapeHtml(other)}</strong><small>${d.board_type==='daily'?'Daily':'Random'} · ${d.pool_mode}</small></span>${action}</div>`;}
async function acceptFriendDraft(id){const{data,error}=await db.rpc('accept_cash_grab_friend_draft',{p_draft_id:id});if(error)return toast('Could not accept draft',error.message);closeModal();loadOnlineDraft(data);}
function stopDraftTimer(){if(state.draftTimer){clearInterval(state.draftTimer);state.draftTimer=null;}const clock=$('draft-clock');if(clock)clock.classList.add('hidden');}
function stopOnlineChannel(){if(state.onlineChannel&&db)db.removeChannel(state.onlineChannel);state.onlineChannel=null;stopDraftTimer();}
function subscribeDraft(id){
  if(!db)return;stopOnlineChannel();
  state.onlineChannel=db.channel(`cg-draft-${id}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'cash_grab_drafts',filter:`id=eq.${id}`},payload=>{
    const d=payload.new;if(d.status==='cancelled'){stopOnlineChannel();state.draft=null;$('draft-section').classList.add('hidden');toast('Draft ended.');return;}
    if(state.draft?.kind==='online'&&state.draft.row?.id===d.id){state.draft.row=d;renderDraft();if(d.status==='ready')finalizeOnlineDraftIfNeeded();if(d.status==='finished')showFinishedOnlineDraft(d);}
  }).subscribe();
  startDraftTimer();
}
function onlineDraftSides(d){const host=state.user?.id===d.host_id;return{youPicks:(host?d.host_picks:d.opponent_picks)||[],oppPicks:(host?d.opponent_picks:d.host_picks)||[],yourBudget:host?d.host_budget:d.opponent_budget,oppBudget:host?d.opponent_budget:d.host_budget,yourTurn:d.turn_user===state.user?.id,host,yourLineup:host?d.host_lineup:d.opponent_lineup,oppLineup:host?d.opponent_lineup:d.host_lineup};}
function loadOnlineDraft(d){
  const board=(d.board||[]).map(x=>playerById(x.id||x)).filter(Boolean);if(board.length!==25)return toast('Draft board could not be loaded.');
  const same=state.draft?.kind==='online'&&state.draft.row?.id===d.id,localConfig=same?state.draft.localConfig:null;
  state.draft={kind:'online',row:d,board,localConfig,timeoutBusy:false};$('draft-section').classList.remove('hidden');renderDraft();subscribeDraft(d.id);$('draft-section').scrollIntoView({behavior:'smooth',block:'start'});if(d.status==='ready')finalizeOnlineDraftIfNeeded();if(d.status==='finished')showFinishedOnlineDraft(d);
}
async function tickDraftTimer(){
  const d=state.draft,clock=$('draft-clock'),value=$('draft-clock-value');if(!d||d.kind!=='online'||d.row.status!=='drafting'){if(clock)clock.classList.add('hidden');return;}
  const sides=onlineDraftSides(d.row),label=clock?.querySelector('span');clock.classList.remove('hidden');if(label)label.textContent=sides.yourTurn?'YOUR CLOCK':'OPPONENT CLOCK';
  if(!d.row.turn_deadline){value.textContent='60';clock.classList.remove('urgent');return;}
  const ms=new Date(d.row.turn_deadline).getTime()-Date.now(),seconds=Math.max(0,Math.ceil(ms/1000));value.textContent=`${seconds}s`;clock.classList.toggle('urgent',seconds<=10);
  if(ms<=0&&!d.timeoutBusy){d.timeoutBusy=true;const{data,error}=await db.rpc('timeout_cash_grab_draft_pick',{p_draft_id:d.row.id});d.timeoutBusy=false;if(error){if(!/not expired|not accepting/i.test(error.message||''))console.warn(error.message);return;}if(data){d.row=data;renderDraft();}}
}
function startDraftTimer(){stopDraftTimer();state.draftTimer=setInterval(tickDraftTimer,500);tickDraftTimer();}
async function makeOnlineDraftPick(player){const d=state.draft?.row;if(!d||d.status!=='drafting')return;const sides=onlineDraftSides(d);if(!sides.yourTurn)return toast('Wait for your turn.');if(!canDraftPick(player,'you'))return toast('That pick would make it impossible to finish under $15.');const{data,error}=await db.rpc('make_cash_grab_draft_pick',{p_draft_id:d.id,p_player_id:player.id});if(error)return toast('Pick failed',error.message);state.draft.row=data;renderDraft();}
function draftLineupControlsHtml(team,opponent,config,locked=false){return matchupControlHtml(team,opponent,config,locked,'draft');}
function renderDraftLineupSetup(){
  const d=state.draft,section=$('draft-lineup-setup');if(!d||(d.kind==='online'&&d.row.status==='finished')){section.classList.add('hidden');return;}let team=[],opponent=[],locked=false,status='';
  if(d.kind==='cpu'){team=d.you;opponent=d.opp;if(team.length!==5||opponent.length!==5){section.classList.add('hidden');return;}d.localConfig=normalizedLineupConfig(team,d.localConfig,opponent);status='Set defense. Set offense order.';}
  else{const sides=onlineDraftSides(d.row);team=sides.youPicks.map(x=>playerById(x.id||x)).filter(Boolean);opponent=sides.oppPicks.map(x=>playerById(x.id||x)).filter(Boolean);if(team.length!==5||opponent.length!==5){section.classList.add('hidden');return;}const server=Array.isArray(sides.yourLineup)?sides.yourLineup:null;locked=validLineupConfig(team,server,opponent);d.localConfig=normalizedLineupConfig(team,locked?server:d.localConfig,opponent);status=locked?(d.row.status==='ready'?'Both locked.':'Locked. Waiting…'):'Set defense. Set offense order.';}
  section.classList.remove('hidden');$('draft-lineup-controls').innerHTML=draftLineupControlsHtml(team,opponent,d.localConfig,locked);$('draft-lineup-status').textContent=status;const btn=$('submit-draft-lineup');btn.disabled=locked;btn.textContent=d.kind==='cpu'?'Play game':locked?'Locked':'Lock lineup';
  qsa('[data-draft-guard]').forEach(el=>{el.onchange=()=>{setConfigValue(d.localConfig,el.dataset.draftGuard,'guard',el.value);renderDraftLineupSetup();};});qsa('[data-draft-option]').forEach(el=>{el.onchange=()=>{setConfigValue(d.localConfig,el.dataset.draftOption,'option',Number(el.value));renderDraftLineupSetup();};});
}
async function submitDraftLineup(){
  const d=state.draft;if(!d)return;if(d.kind==='cpu')return finishCpuDraft();const sides=onlineDraftSides(d.row),team=sides.youPicks.map(x=>playerById(x.id||x)).filter(Boolean),opponent=sides.oppPicks.map(x=>playerById(x.id||x)).filter(Boolean);if(!validLineupConfig(team,d.localConfig,opponent))return toast('Finish your lineup setup first.');const{data,error}=await db.rpc('submit_cash_grab_draft_lineup',{p_draft_id:d.row.id,p_lineup:d.localConfig});if(error)return toast('Lineup could not be locked',error.message);d.row=data;renderDraft();if(data.status==='ready')finalizeOnlineDraftIfNeeded();
}
async function finalizeOnlineDraftIfNeeded(){const d=state.draft?.row;if(!d||d.status!=='ready')return;const host=(d.host_picks||[]).map(x=>playerById(x.id||x)).filter(Boolean),opp=(d.opponent_picks||[]).map(x=>playerById(x.id||x)).filter(Boolean);if(host.length!==5||opp.length!==5||!validLineupConfig(host,d.host_lineup,opp)||!validLineupConfig(opp,d.opponent_lineup,host))return;const result=simulateGame(host,opp,`draft|${d.id}|${d.resolution_seed||d.id}`,d.host_lineup,d.opponent_lineup),payload=serializeResult(result);const{data,error}=await db.rpc('finalize_cash_grab_draft',{p_draft_id:d.id,p_host_score:result.scoreA,p_opponent_score:result.scoreB,p_result:payload});if(!error&&data){state.draft.row=data;showFinishedOnlineDraft(data);}}
function serializeResult(r){return{scoreA:r.scoreA,scoreB:r.scoreB,quartersA:r.quartersA,quartersB:r.quartersB,segmentsA:r.segmentsA,segmentsB:r.segmentsB,lineupA:r.lineupA,lineupB:r.lineupB,boxA:r.boxA.map(x=>({...x,player:x.player.id,defender:x.defender?.id||null})),boxB:r.boxB.map(x=>({...x,player:x.player.id,defender:x.defender?.id||null}))};}
function hydrateResult(raw,teamA,teamB){const lineupA=normalizedLineupConfig(teamA,raw.lineupA,teamB),lineupB=normalizedLineupConfig(teamB,raw.lineupB,teamA),boxA=(raw.boxA||[]).map(x=>({...x,player:playerById(x.player),defender:playerById(x.defender)})).filter(x=>x.player&&x.defender),boxB=(raw.boxB||[]).map(x=>({...x,player:playerById(x.player),defender:playerById(x.defender)})).filter(x=>x.player&&x.defender);return{scoreA:raw.scoreA,scoreB:raw.scoreB,quartersA:raw.quartersA,quartersB:raw.quartersB,segmentsA:raw.segmentsA||raw.quartersA.flatMap(q=>[0,0,0,q]),segmentsB:raw.segmentsB||raw.quartersB.flatMap(q=>[0,0,0,q]),boxA,boxB,lineupA,lineupB,aWins:raw.scoreA>raw.scoreB};}
function showFinishedOnlineDraft(d){const sides=onlineDraftSides(d),host=(d.host_picks||[]).map(x=>playerById(x.id||x)).filter(Boolean),opp=(d.opponent_picks||[]).map(x=>playerById(x.id||x)).filter(Boolean);if(host.length!==5||opp.length!==5||!d.result)return;stopDraftTimer();const result=hydrateResult(d.result,host,opp);if(!sides.host){const swapped={...result,scoreA:result.scoreB,scoreB:result.scoreA,quartersA:result.quartersB,quartersB:result.quartersA,segmentsA:result.segmentsB,segmentsB:result.segmentsA,boxA:result.boxB,boxB:result.boxA,lineupA:result.lineupB,lineupB:result.lineupA,aWins:result.scoreB>result.scoreA};prepareBattle(opp,host,{type:'draft',title:'Snake Draft Battle',opponentLabel:'OPPONENT',configA:swapped.lineupA,configB:swapped.lineupB,resolvedResult:swapped,locked:true});}else prepareBattle(host,opp,{type:'draft',title:'Snake Draft Battle',opponentLabel:'OPPONENT',configA:result.lineupA,configB:result.lineupB,resolvedResult:result,locked:true});}

function startCpuDraft(){stopDraftTimer();state.draft={kind:'cpu',board:[...state.board],first:Math.random()<.5?0:1,pickNumber:0,you:[],opp:[],localConfig:null};$('draft-section').classList.remove('hidden');renderDraft();$('draft-section').scrollIntoView({behavior:'smooth',block:'start'});runCpuTurns();}
function draftOwner(d,index=d.pickNumber){return SNAKE[index]===0?d.first:1-d.first;}
function priceCounts(players){const counts={1:0,2:0,3:0,4:0,5:0};players.forEach(p=>counts[p.price]++);return counts;}
function allocationOptions(slots,budget,counts){const out=[];function walk(price,leftSlots,leftBudget,vec){if(price===6){if(leftSlots===0)out.push({...vec});return;}for(let n=0;n<=Math.min(counts[price]||0,leftSlots,Math.floor(leftBudget/price));n++){vec[price]=n;walk(price+1,leftSlots-n,leftBudget-n*price,vec);}delete vec[price];}walk(1,slots,budget,{});return out;}
function jointDraftFeasible(aPicks,bPicks,remainingPlayers){const aSlots=5-aPicks.length,bSlots=5-bPicks.length;if(aSlots<0||bSlots<0)return false;const aBudget=15-usedBudget(aPicks),bBudget=15-usedBudget(bPicks);if(aBudget<0||bBudget<0)return false;const counts=priceCounts(remainingPlayers),aOpts=allocationOptions(aSlots,aBudget,counts),bOpts=allocationOptions(bSlots,bBudget,counts);for(const a of aOpts)for(const b of bOpts){let ok=true;for(let price=1;price<=5;price++)if((a[price]||0)+(b[price]||0)>(counts[price]||0)){ok=false;break;}if(ok)return true;}return false;}
function draftCurrentPicks(side){const d=state.draft;if(d.kind==='cpu')return side==='you'?d.you:d.opp;const s=onlineDraftSides(d.row);return side==='you'?s.youPicks.map(x=>playerById(x.id||x)).filter(Boolean):s.oppPicks.map(x=>playerById(x.id||x)).filter(Boolean);}
function canDraftPick(player,side='you'){const d=state.draft;if(!d)return false;const your=draftCurrentPicks(side),other=draftCurrentPicks(side==='you'?'opp':'you');const used=new Set([...your,...other].map(p=>p.id));if(used.has(player.id)||your.length>=5||usedBudget(your)+player.price>15)return false;const next=[...your,player],remaining=d.board.filter(p=>!used.has(p.id)&&p.id!==player.id);return jointDraftFeasible(next,other,remaining);}
function cpuPickCandidate(){const d=state.draft,legal=d.board.filter(p=>canDraftPick(p,'opp'));if(!legal.length)return null;return legal.map(p=>({p,score:productionValue(p)/(p.price+.75)+Math.random()*2.2})).sort((a,b)=>b.score-a.score)[0].p;}
function runCpuTurns(){const d=state.draft;if(!d||d.kind!=='cpu'||d.pickNumber>=10)return;if(draftOwner(d)===1){const p=cpuPickCandidate();if(!p)return toast('CPU draft could not find a legal pick.');d.opp.push(p);d.pickNumber++;renderDraft();if(d.pickNumber>=10)return;setTimeout(runCpuTurns,260);}}
function makeCpuDraftPick(player){const d=state.draft;if(!d||d.kind!=='cpu'||draftOwner(d)!==0)return;if(!canDraftPick(player,'you'))return toast('That pick would make it impossible to finish five players under $15.');d.you.push(player);d.pickNumber++;renderDraft();if(d.pickNumber>=10)return;runCpuTurns();}
function finishCpuDraft(){const d=state.draft;if(!d||d.you.length!==5||d.opp.length!==5)return;d.localConfig=normalizedLineupConfig(d.you,d.localConfig,d.opp);const oppConfig=autoLineupConfig(d.opp,d.you),result=simulateGame(d.you,d.opp,`cpu-draft|${Date.now()}|${ids(d.you).join(',')}`,d.localConfig,oppConfig);prepareBattle(d.you,d.opp,{type:'draft',title:'Snake Draft vs. CPU',opponentLabel:'CPU',configA:d.localConfig,configB:oppConfig,resolvedResult:result,locked:true,autoStart:true});}
function renderDraft(){
  const d=state.draft;if(!d)return;let you=[],opp=[],yourBudget=15,oppBudget=15,yourTurn=false,pickNumber=0,status='drafting',oppName='CPU',allPicked=[];
  if(d.kind==='cpu'){you=d.you;opp=d.opp;yourBudget=15-usedBudget(you);oppBudget=15-usedBudget(opp);yourTurn=d.pickNumber<10&&draftOwner(d)===0;pickNumber=d.pickNumber;status=pickNumber>=10?'configuring':'drafting';allPicked=[...you,...opp].map(p=>p.id);oppName='CPU';}
  else{const row=d.row,s=onlineDraftSides(row);you=s.youPicks.map(x=>playerById(x.id||x)).filter(Boolean);opp=s.oppPicks.map(x=>playerById(x.id||x)).filter(Boolean);yourBudget=s.yourBudget;oppBudget=s.oppBudget;yourTurn=row.status==='drafting'&&s.yourTurn;pickNumber=row.pick_number;status=row.status;allPicked=[...(row.host_picks||[]),...(row.opponent_picks||[])].map(x=>x.id||x);oppName='OPPONENT';}
  $('draft-your-budget').textContent=`$${yourBudget}`;$('draft-opp-budget').textContent=`$${oppBudget}`;$('draft-your-picks').textContent=`${you.length} / 5`;$('draft-opp-picks').textContent=`${opp.length} / 5`;$('draft-pick-label').textContent=pickNumber<10?`PICK ${pickNumber+1}`:'DRAFT COMPLETE';$('draft-turn-label').textContent=status==='finished'?'FINAL':status==='configuring'||status==='ready'?'SET LINEUPS':yourTurn?'YOUR PICK':'OPPONENT PICK';$('draft-opponent-name').textContent=oppName;
  $('draft-your-roster').innerHTML=you.length?you.map(p=>`<div class="draft-pick"><strong>${escapeHtml(p.name)}</strong><span>$${p.price} · ${p.pos}</span></div>`).join(''):'<div class="draft-pick"><span>No picks yet</span></div>';$('draft-opp-roster').innerHTML=opp.length?opp.map(p=>`<div class="draft-pick"><strong>${escapeHtml(p.name)}</strong><span>$${p.price} · ${p.pos}</span></div>`).join(''):'<div class="draft-pick"><span>No picks yet</span></div>';
  $('draft-status').textContent=status==='drafting'?(d.kind==='cpu'?(yourTurn?'Choose any affordable player.':'CPU is making its pick…'):(yourTurn?'Choose any affordable player. You have 60 seconds.':'Stay here—the board updates automatically when your opponent picks.')):(status==='configuring'||status==='ready'?'Draft complete. Set defense and offense order.':'Draft complete.');
  const drafting=status==='drafting'&&pickNumber<10;$('draft-board').classList.toggle('hidden',!drafting);$('draft-board').innerHTML=drafting?[1,2,3,4,5].map(price=>`<section class="draft-price-column"><h4>$${price}</h4>${d.board.filter(p=>p.price===price).map(p=>{const picked=allPicked.includes(p.id);const legal=yourTurn&&!picked&&canDraftPick(p,'you');return`<button class="draft-player${picked?' picked':''}${yourTurn?' your-turn':''}" data-draft-player="${p.id}" ${!legal?'disabled':''}><strong>${escapeHtml(p.name)}</strong><span>${p.group} · ${p.pos}</span></button>`;}).join('')}</section>`).join(''):'';
  qsa('[data-draft-player]').forEach(b=>b.onclick=()=>{const p=playerById(b.dataset.draftPlayer);d.kind==='cpu'?makeCpuDraftPick(p):makeOnlineDraftPick(p);});renderDraftLineupSetup();if(d.kind==='online')tickDraftTimer();else $('draft-clock').classList.add('hidden');
}
function leaveDraft(){stopOnlineChannel();state.draft=null;$('draft-section').classList.add('hidden');$('draft-lineup-setup').classList.add('hidden');$('builder').scrollIntoView({behavior:'smooth'});}

function openHow(){openModal(`<span class="overline">CASH GRAB</span><h2>Five players. $15.</h2><ul class="modal-list"><li>Set defensive assignments.</li><li>Rank offense #1 through #5.</li><li>Play four 10-minute quarters.</li></ul>`);}
function openModal(html){$('modal-content').innerHTML=html;$('modal-backdrop').classList.remove('hidden');}
function closeModal(){$('modal-backdrop').classList.add('hidden');}
function toast(title,message=''){const el=document.createElement('div');el.className='toast';el.innerHTML=`<strong>${escapeHtml(title)}</strong>${message?`<span>${escapeHtml(message)}</span>`:''}`;$('toast-region').appendChild(el);setTimeout(()=>el.remove(),4200);}

function bind(){
  $('jump-board').onclick=()=>$('builder').scrollIntoView({behavior:'smooth'});$('how-button').onclick=openHow;$('modal-close').onclick=closeModal;$('modal-backdrop').onclick=e=>{if(e.target===$('modal-backdrop'))closeModal();};
  qsa('[data-mode]').forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;makeBoard();});qsa('[data-board-type]').forEach(b=>b.onclick=()=>{state.boardType=b.dataset.boardType;makeBoard();});
  $('prev-day').onclick=()=>{state.selectedDate=shiftDate(state.selectedDate,-1);if(state.selectedDate<LAUNCH_DATE)state.selectedDate=LAUNCH_DATE;makeBoard();};$('next-day').onclick=()=>{if(state.selectedDate<chicagoDate()){state.selectedDate=shiftDate(state.selectedDate,1);makeBoard();}};$('daily-date').onchange=e=>{let d=e.target.value||chicagoDate();if(d<LAUNCH_DATE)d=LAUNCH_DATE;if(d>chicagoDate())d=chicagoDate();state.selectedDate=d;makeBoard();};
  $('clear-team').onclick=()=>{state.selected=[];state.lineupConfig=[];state.gauntletActive=false;state.pendingBattle=null;stopGameTimer();renderAll();};$('shuffle-board').onclick=()=>{state.boardNonce++;makeBoard();};$('bot-match').onclick=playBot;$('start-gauntlet').onclick=startGauntlet;$('daily-leaderboard').onclick=openDailyLeaderboard;
  $('cpu-draft').onclick=startCpuDraft;$('invite-friend').onclick=openFriendDraft;$('random-player').onclick=findRandomDraft;$('challenges-button').onclick=openDraftBattles;$('leave-draft').onclick=leaveDraft;$('submit-draft-lineup').onclick=submitDraftLineup;
  $('simulate-game').onclick=startPendingSimulation;$('back-to-builder').onclick=()=>{stopGameTimer();$('builder').scrollIntoView({behavior:'smooth'});};$('result-next').onclick=nextResultAction;$('result-rematch').onclick=playBot;
}
async function init(){loadLocal();state.selectedDate=chicagoDate();bind();makeBoard();renderHallOfFame();await initOnline();}
document.addEventListener('DOMContentLoaded',init);
