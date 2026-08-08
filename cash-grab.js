'use strict';

const DATA = window.HOOPLOOP_CASH_GRAB_DATA || { current: [], allTime: [] };
const CONFIG = window.HOOPLOOP_CONFIG || {};
const $ = id => document.getElementById(id);
const qsa = selector => [...document.querySelectorAll(selector)];
const STORAGE = 'hooploop_cash_grab_v2';
const OLD_STORAGE = 'hooploop_cash_grab_v1';
const BUDGET = 15;
const ROSTER_SIZE = 5;
const GAUNTLET = [
  [1,1,1,1,1], [1,1,1,2,2], [2,2,2,2,2], [2,2,2,3,3], [2,3,3,3,3],
  [3,3,3,3,3], [3,3,3,4,4], [4,4,4,4,4], [4,4,4,5,5], [5,5,5,5,5]
];
const WEIGHTS = { fit:.50, talent:.30, versatility:.20 };
const ONLINE_READY = Boolean(window.supabase && /^https:\/\/.+\.supabase\.co$/i.test(String(CONFIG.SUPABASE_URL || '')) && String(CONFIG.SUPABASE_ANON_KEY || '').length > 20 && !String(CONFIG.SUPABASE_ANON_KEY).includes('PASTE_'));
const db = ONLINE_READY ? window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } }) : null;

const state = {
  mode:'current', boardType:'daily', board:[], selected:[], quickWins:0, quickLosses:0,
  gauntletRound:0, gauntletActive:false, gauntletCleared:0, gauntletFailedRound:null,
  currentOpponent:null, currentBattle:null, boardNonce:0,
  user:null, profile:null, challengeContext:null, onlineChannel:null
};

function escapeHtml(value=''){return String(value).replace(/[&<>'"]/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c]));}
function clamp(v,min,max){return Math.min(max,Math.max(min,v));}
function average(values){return values.length ? values.reduce((a,b)=>a+b,0)/values.length : 0;}
function round(v,n=0){const f=10**n;return Math.round(v*f)/f;}
function shuffle(items, rand=Math.random){const arr=[...items];for(let i=arr.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;}
function hashString(text){let h=2166136261>>>0;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function seededRandom(seedText){let a=hashString(seedText)||1;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function chicagoDate(){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const get=t=>parts.find(p=>p.type===t)?.value;return `${get('year')}-${get('month')}-${get('day')}`;}
function allPlayers(){return [...DATA.current,...DATA.allTime];}
function normName(value=''){return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');}
function playerById(id){return allPlayers().find(p=>p.id===id);}
function usedBudget(){return state.selected.reduce((sum,p)=>sum+p.price,0);}
function pricePool(mode,price){if(mode==='current')return DATA.current.filter(p=>p.price===price);if(mode==='alltime')return DATA.allTime.filter(p=>p.price===price);return [...DATA.current,...DATA.allTime].filter(p=>p.price===price);}

function loadLocal(){
  try{
    const saved=JSON.parse(localStorage.getItem(STORAGE)||localStorage.getItem(OLD_STORAGE)||'{}');
    state.quickWins=Number(saved.quickWins)||0; state.quickLosses=Number(saved.quickLosses)||0; state.bestRound=Number(saved.bestRound)||0;
  }catch{state.bestRound=0;}
}
function saveLocal(){try{localStorage.setItem(STORAGE,JSON.stringify({quickWins:state.quickWins,quickLosses:state.quickLosses,bestRound:state.bestRound||0}));}catch{}}

function chooseFiveBalanced(pool, rand){
  const guards=shuffle(pool.filter(p=>p.group==='G'),rand);
  const others=shuffle(pool.filter(p=>p.group!=='G'),rand);
  let guardCount=rand()<.5?2:3;
  guardCount=Math.min(guardCount,guards.length);
  let otherCount=5-guardCount;
  if(others.length<otherCount){guardCount=Math.min(5,guards.length);otherCount=5-guardCount;}
  const picks=[...guards.slice(0,guardCount),...others.slice(0,otherCount)];
  if(picks.length<5){const used=new Set(picks.map(p=>p.id));picks.push(...shuffle(pool.filter(p=>!used.has(p.id)),rand).slice(0,5-picks.length));}
  return shuffle(picks,rand).slice(0,5);
}
function generateBoard(mode=state.mode, boardType=state.boardType, nonce=state.boardNonce){
  const seedBase=boardType==='daily'?`cashgrab|${chicagoDate()}|${mode}`:`cashgrab|random|${Date.now()}|${nonce}|${Math.random()}`;
  const board=[],usedNames=new Set();
  for(let price=1;price<=5;price++){
    let pool=pricePool(mode,price).filter(p=>!usedNames.has(normName(p.name)));
    const rand=seededRandom(`${seedBase}|${price}`);
    const chosen=chooseFiveBalanced(pool,rand);
    chosen.forEach(p=>usedNames.add(normName(p.name)));
    board.push(...chosen);
  }
  return board;
}
function setBoard(board,{mode=state.mode,boardType=state.boardType,challenge=null}={}){
  state.mode=mode;state.boardType=boardType;state.board=[...board];state.selected=[];state.gauntletActive=false;state.gauntletRound=0;state.gauntletCleared=0;state.gauntletFailedRound=null;state.challengeContext=challenge;
  renderAll();
}
function makeBoard(){setBoard(generateBoard());}

function renderBoard(){
  const board=$('price-board');board.innerHTML='';
  for(let price=1;price<=5;price++){
    const col=document.createElement('section');col.className='price-column';
    const players=state.board.filter(p=>p.price===price);
    col.innerHTML=`<div class="price-heading"><strong>$${price}</strong><span>${players.length} OPTIONS</span></div>`;
    players.forEach(player=>{
      const selected=state.selected.some(p=>p.id===player.id);const disabled=!selected&&(state.selected.length>=ROSTER_SIZE||usedBudget()+player.price>BUDGET);
      const b=document.createElement('button');b.type='button';b.className=`player-card${selected?' selected':''}`;b.disabled=disabled;
      b.innerHTML=`<div class="player-topline"><strong>${escapeHtml(player.name)}</strong><span class="price-chip">$${player.price}</span></div><div class="player-meta"><span>${player.pos}</span><span>${escapeHtml(player.archetype)}</span>${state.mode==='mixed'?`<span>${player.era==='current'?'CURRENT':'ALL-TIME'}</span>`:''}</div>`;
      b.onclick=()=>togglePlayer(player);col.appendChild(b);
    });board.appendChild(col);
  }
}
function togglePlayer(player){
  const idx=state.selected.findIndex(p=>p.id===player.id);
  if(idx>=0)state.selected.splice(idx,1);else{
    if(state.selected.length>=ROSTER_SIZE)return toast('Five roster spots are already filled.');
    if(usedBudget()+player.price>BUDGET)return toast('That player would put you over $15.');
    state.selected.push(player);
  }
  renderAll();
}
function teamMetrics(team){
  if(!team.length)return{fit:0,talent:0,versatility:0,power:0,grade:'--',notes:[]};
  const guards=team.filter(p=>p.group==='G').length,forwards=team.filter(p=>p.group==='F').length,bigs=team.filter(p=>p.group==='B').length;
  const shooting=average(team.map(p=>p.shooting)),nonShooters=team.filter(p=>p.shooting<68).length;
  const makers=[...team].sort((a,b)=>b.playmaking-a.playmaking).map(p=>p.playmaking);const creation=(makers[0]||0)*.62+(makers[1]||0)*.26+(makers[2]||0)*.12;
  const perimeter=average(team.map(p=>p.perimeterDefense));const rim=Math.max(...team.map(p=>p.rimDefense));const defense=perimeter*.58+rim*.42;
  const reb=average([...team].sort((a,b)=>b.rebounding-a.rebounding).slice(0,3).map(p=>p.rebounding));const offball=average(team.map(p=>p.offBall));
  const usages=team.map(p=>p.usage),highUsage=usages.filter(v=>v>=90).length;
  const positionBalance=(guards>=1?30:0)+(bigs>=1?30:0)+(forwards>=1?15:0)+(guards>=2&&guards<=3?15:0)+(new Set(team.map(p=>p.group)).size===3?10:0);
  const usageBalance=clamp(92-Math.max(0,highUsage-2)*15+(Math.max(...usages)>=85?6:-10),45,100);
  const spacing=clamp(shooting-nonShooters*5+team.filter(p=>p.shooting>=90).length*3,35,100);
  const fit=clamp(positionBalance*.17+spacing*.20+creation*.17+defense*.18+reb*.10+offball*.10+usageBalance*.08,25,99);
  const talent=average(team.map(p=>p.scoring*.16+p.shooting*.09+p.playmaking*.10+p.perimeterDefense*.10+p.rimDefense*.10+p.rebounding*.09+p.finishing*.10+p.athleticism*.06+p.offBall*.07+p.versatility*.13));
  const versatility=average(team.map(p=>p.versatility));const power=fit*WEIGHTS.fit+talent*WEIGHTS.talent+versatility*WEIGHTS.versatility;
  const grade=power>=94?'S':power>=90?'A+':power>=86?'A':power>=82?'B+':power>=78?'B':power>=73?'C+':'C';const notes=[];
  if(guards>=2&&guards<=3&&bigs>=1)notes.push('Balanced lineup shape');else if(!bigs)notes.push('No true big hurts interior matchups');else if(!guards)notes.push('No true guard limits creation');
  if(shooting>=88)notes.push('Elite spacing');else if(nonShooters>=2)notes.push('Spacing can get cramped');
  if(creation>=90)notes.push('High-end playmaking');else if(creation<76)notes.push('Creation could stall');
  if(defense>=90)notes.push('High-level defensive ceiling');if(reb>=90)notes.push('Controls the glass');if(highUsage>=4)notes.push('Too many ball-dominant scorers');if(offball>=92)notes.push('Excellent off-ball compatibility');
  return{fit:round(fit),talent:round(talent),versatility:round(versatility),power:round(power,1),grade,notes};
}
function renderTeam(){
  const cost=usedBudget(),left=BUDGET-cost;$('budget-left').textContent=`$${left}`;$('roster-count').textContent=`${state.selected.length} / 5`;$('team-cost').textContent=`$${cost} / $15`;$('budget-meter').style.width=`${cost/BUDGET*100}%`;
  $('selected-team').innerHTML=Array.from({length:5},(_,i)=>state.selected[i]?`<div class="selected-slot filled"><strong>${escapeHtml(state.selected[i].name)}</strong><span>$${state.selected[i].price} · ${state.selected[i].pos} · ${escapeHtml(state.selected[i].archetype)}</span></div>`:`<div class="selected-slot"><strong>Open spot</strong><span>Choose from the board</span></div>`).join('');
  const complete=state.selected.length===5;$('team-title').textContent=complete?'Your five are ready.':'Choose five players.';
  $('team-analysis').classList.toggle('hidden',!complete);$('fit-notes').classList.toggle('hidden',!complete);$('battle-select').classList.toggle('hidden',!complete);
  if(complete){const m=teamMetrics(state.selected);$('fit-score').textContent=m.fit;$('talent-score').textContent=m.talent;$('versatility-score').textContent=m.versatility;$('team-grade').textContent=m.grade;$('fit-notes').innerHTML=m.notes.map(n=>`<span class="fit-note">${escapeHtml(n)}</span>`).join('');}
  $('quick-record').textContent=`Record: ${state.quickWins}–${state.quickLosses}`;$('gauntlet-best').textContent=state.bestRound?`Best: Round ${state.bestRound}`:'Best: Not started';
  const challengeButton=$('submit-challenge-lineup');
  if(challengeButton){challengeButton.classList.toggle('hidden',!(complete&&state.challengeContext));if(state.challengeContext)challengeButton.textContent=`Submit lineup vs ${state.challengeContext.host?.username||'friend'}`;}
}
function renderAll(){
  renderBoard();renderTeam();renderGauntletMap();
  $('shuffle-board').classList.toggle('hidden',state.boardType!=='random');
  $('board-label').textContent=state.boardType==='daily'?`DAILY · ${chicagoDate()}`:'RANDOM BOARD';
  qsa('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===state.mode));qsa('[data-board-type]').forEach(b=>b.classList.toggle('active',b.dataset.boardType===state.boardType));
}

function randomLegalTeam(mode=state.mode){
  const pool=mode==='current'?DATA.current:mode==='alltime'?DATA.allTime:[...DATA.current,...DATA.allTime];let best=null;
  for(let i=0;i<1200;i++){
    const team=shuffle(pool).slice(0,5),cost=team.reduce((s,p)=>s+p.price,0),guards=team.filter(p=>p.group==='G').length;
    if(cost<=15&&cost>=12&&guards>=1&&guards<=4&&new Set(team.map(p=>p.id)).size===5){if(!best||Math.abs(15-cost)<Math.abs(15-best.cost))best={team,cost};if(cost===15&&Math.random()<.18)break;}
  }
  return best?.team||shuffle(pool.filter(p=>p.price<=3)).slice(0,5);
}
function gauntletOpponent(round){const prices=GAUNTLET[round-1],team=[];prices.forEach(price=>{const available=pricePool(state.mode,price).filter(p=>!team.some(x=>x.id===p.id));const pick=shuffle(available)[0];if(pick)team.push(pick);});return team;}
function matchupAdjustment(offense,defense){const offenseShoot=average(offense.map(p=>p.shooting)),offenseFinish=average(offense.map(p=>p.finishing));const defensePer=average(defense.map(p=>p.perimeterDefense)),defenseRim=Math.max(...defense.map(p=>p.rimDefense));return((offenseShoot-defensePer)*.045)+((offenseFinish-defenseRim)*.035);}
function gaussian(){let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
function simulate(teamA,teamB){
  const a=teamMetrics(teamA),b=teamMetrics(teamB),adjA=matchupAdjustment(teamA,teamB),adjB=matchupAdjustment(teamB,teamA),effA=a.power+adjA,effB=b.power+adjB;
  const chance=clamp(1/(1+Math.exp(-(effA-effB)/6.8)),.08,.92),aWins=Math.random()<chance,pace=gaussian()*4;
  const offenseA=average(teamA.map(p=>p.scoring*.38+p.shooting*.25+p.finishing*.19+p.playmaking*.18)),offenseB=average(teamB.map(p=>p.scoring*.38+p.shooting*.25+p.finishing*.19+p.playmaking*.18));
  let scoreA=Math.round(89+offenseA*.29+a.fit*.055+pace+gaussian()*6),scoreB=Math.round(89+offenseB*.29+b.fit*.055+pace+gaussian()*6);
  if(aWins&&scoreA<=scoreB)scoreA=scoreB+Math.ceil(1+Math.random()*8);if(!aWins&&scoreB<=scoreA)scoreB=scoreA+Math.ceil(1+Math.random()*8);
  return{a,b,effA,effB,chance,aWins,scoreA,scoreB};
}
function rosterHtml(team){return team.map(p=>`<div class="match-player"><strong>${escapeHtml(p.name)}</strong><span>$${p.price} · ${p.pos} · ${escapeHtml(p.archetype)}</span></div>`).join('');}
function startBattle(opponent,type,label){
  state.currentOpponent=opponent;state.currentBattle={type,label};const result=simulate(state.selected,opponent);state.currentBattle.result=result;
  $('matchup-section').classList.remove('hidden');$('matchup-kicker').textContent=type==='gauntlet'?`GAUNTLET · ROUND ${state.gauntletRound}`:'BOT MATCH';$('matchup-title').textContent=label;
  $('your-match-roster').innerHTML=rosterHtml(state.selected);$('opponent-match-roster').innerHTML=rosterHtml(opponent);$('opponent-label').textContent=type==='gauntlet'?`ROUND ${state.gauntletRound}`:'BOT';$('your-power').textContent=result.a.power;$('opponent-power').textContent=result.b.power;$('final-score').textContent=`${result.scoreA}–${result.scoreB}`;renderResult();$('matchup-section').scrollIntoView({behavior:'smooth',block:'start'});
}
function renderResult(){
  const{result,type}=state.currentBattle,won=result.aWins;$('result-card').classList.remove('hidden');$('result-title').textContent=won?'Your lineup wins.':'The opponent takes it.';$('result-kicker').textContent=won?'WIN':'LOSS';
  const edge=result.a.fit-result.b.fit,fitText=Math.abs(edge)<2?'The fit scores were nearly even.':edge>0?'Your lineup had the cleaner basketball fit.':'Their lineup fit together better.';
  $('result-copy').textContent=`${fitText} Fit counts for 50% of team power, talent 30%, and versatility/diversity 20%, before matchup variance.`;
  $('comparison-grid').innerHTML=`<div><span>FIT</span><strong>${result.a.fit} vs ${result.b.fit}</strong></div><div><span>TALENT</span><strong>${result.a.talent} vs ${result.b.talent}</strong></div><div><span>VERSATILITY</span><strong>${result.a.versatility} vs ${result.b.versatility}</strong></div>`;
  if(type==='quick'){won?state.quickWins++:state.quickLosses++;saveLocal();$('result-next').textContent='Back to builder';$('result-rematch').classList.remove('hidden');}
  else{
    if(won){state.gauntletCleared=state.gauntletRound;state.bestRound=Math.max(state.bestRound||0,state.gauntletRound);saveLocal();if(state.gauntletRound===10){state.gauntletActive=false;$('result-next').textContent='Gauntlet conquered';toast('Gauntlet complete!','You cleared all ten rounds.');}else $('result-next').textContent=`Continue to Round ${state.gauntletRound+1}`;}
    else{state.gauntletFailedRound=state.gauntletRound;state.gauntletActive=false;state.bestRound=Math.max(state.bestRound||0,state.gauntletRound-1);saveLocal();$('result-next').textContent='Restart Gauntlet';}
    $('result-rematch').classList.add('hidden');renderGauntletMap();
  }renderTeam();
}
function nextResultAction(){const battle=state.currentBattle;if(!battle)return;if(battle.type==='quick'){$('builder').scrollIntoView({behavior:'smooth'});return;}const won=battle.result.aWins;if(won&&state.gauntletRound<10){state.gauntletRound++;startBattle(gauntletOpponent(state.gauntletRound),'gauntlet',`Round ${state.gauntletRound} of 10`);}else if(!won)startGauntlet();else $('builder').scrollIntoView({behavior:'smooth'});}
function startGauntlet(){if(state.selected.length!==5)return;state.gauntletActive=true;state.gauntletRound=1;state.gauntletCleared=0;state.gauntletFailedRound=null;renderGauntletMap();startBattle(gauntletOpponent(1),'gauntlet','Round 1 of 10');}
function renderGauntletMap(){
  $('gauntlet-map').innerHTML=GAUNTLET.map((_,i)=>{const round=i+1;let status='';let mark='';if(round<=state.gauntletCleared){status=' completed';mark='✓';}else if(round===state.gauntletFailedRound){status=' failed';mark='×';}else if(state.gauntletActive&&round===state.gauntletRound){status=' current';mark='•';}return`<div class="gauntlet-step${status}" title="Round ${round}"><span>${round}</span><strong>${mark}</strong></div>`;}).join('');
}

function boardIds(){return state.board.map(p=>p.id);}
function rosterIds(){return state.selected.map(p=>p.id);}
function metricsPayload(team=state.selected){const m=teamMetrics(team);return{fit:m.fit,talent:m.talent,versatility:m.versatility,power:m.power};}
function currentBoardKey(){return state.boardType==='daily'?`${chicagoDate()}|${state.mode}`:`random|${state.mode}|${hashString(boardIds().join('|'))}`;}
function requireOnline(){if(!ONLINE_READY){toast('Online Cash Grab is not connected.','Run the Cash Grab v2 Supabase migration and keep your existing config.js.');return false;}if(!state.user){toast('Log in first.','Use the Account button on Name Rush, then return to Cash Grab.');return false;}return true;}
async function initOnline(){
  if(!db)return;
  const{data}=await db.auth.getSession();state.user=data.session?.user||null;
  if(state.user){const{data:profile}=await db.from('profiles').select('id,username').eq('id',state.user.id).maybeSingle();state.profile=profile||null;}
  updateOnlineStatus();await refreshChallengeCount();
  db.auth.onAuthStateChange(async(_,session)=>{state.user=session?.user||null;state.profile=null;if(state.user){const{data:p}=await db.from('profiles').select('id,username').eq('id',state.user.id).maybeSingle();state.profile=p||null;}updateOnlineStatus();refreshChallengeCount();});
}
function updateOnlineStatus(){const el=$('online-status');if(!el)return;if(!ONLINE_READY){el.textContent='Online setup needed';el.className='online-status offline';}else if(!state.user){el.textContent='Log in for real-player games';el.className='online-status';}else{el.textContent=`Online as ${state.profile?.username||'player'}`;el.className='online-status online';}}
async function acceptedFriends(){
  if(!state.user)return[];
  const{data,error}=await db.from('friendships').select('id,requester_id,addressee_id,requester:profiles!friendships_requester_id_fkey(id,username),addressee:profiles!friendships_addressee_id_fkey(id,username)').eq('status','accepted');
  if(error)return[];
  return(data||[]).map(row=>row.requester_id===state.user.id?row.addressee:row.requester).filter(Boolean);
}
async function openFriendChallenge(){
  if(!requireOnline())return;const friends=await acceptedFriends();
  openModal(`<span class="overline">REAL PLAYER</span><h2>Invite a friend.</h2><p>They will build a five-player roster from this exact ${state.boardType==='daily'?'Daily':'Random'} board.</p><div class="challenge-list">${friends.length?friends.map(f=>`<button class="challenge-person" data-cg-friend="${escapeHtml(f.username)}"><span>${escapeHtml(f.username)}</span><strong>Challenge</strong></button>`).join(''):'<p class="modal-note">No accepted friends yet. Add friends from Name Rush first.</p>'}</div>`);
  qsa('[data-cg-friend]').forEach(btn=>btn.onclick=()=>createFriendChallenge(btn.dataset.cgFriend));
}
async function createFriendChallenge(username){
  const{data,error}=await db.rpc('create_cash_grab_friend_match',{p_friend_username:username,p_board_type:state.boardType,p_pool_mode:state.mode,p_board_key:currentBoardKey(),p_host_board:boardIds(),p_host_roster:rosterIds(),p_host_metrics:metricsPayload()});
  if(error)return toast('Challenge failed',error.message);closeModal();toast('Challenge sent',`${username} can open Cash Grab and play your board.`);refreshChallengeCount();
}
async function refreshChallengeCount(){
  const countEl=$('challenge-count');if(!countEl)return;if(!state.user){countEl.textContent='';return;}
  const{count}=await db.from('cash_grab_matches').select('*',{count:'exact',head:true}).eq('opponent_id',state.user.id).eq('match_type','friend').eq('status','invited');countEl.textContent=count?String(count):'';countEl.classList.toggle('hidden',!count);
}
async function openChallenges(){
  if(!requireOnline())return;
  const{data,error}=await db.from('cash_grab_matches').select('*,host:profiles!cash_grab_matches_host_id_fkey(username),opponent:profiles!cash_grab_matches_opponent_id_fkey(username)').or(`host_id.eq.${state.user.id},opponent_id.eq.${state.user.id}`).order('created_at',{ascending:false}).limit(20);
  if(error)return toast('Could not load challenges',error.message);
  const rows=data||[];
  openModal(`<span class="overline">CASH GRAB ONLINE</span><h2>Challenges.</h2><div class="challenge-list">${rows.length?rows.map(match=>challengeRow(match)).join(''):'<p class="modal-note">No Cash Grab challenges yet.</p>'}</div>`);
  qsa('[data-play-cg]').forEach(btn=>btn.onclick=()=>loadIncomingChallenge(rows.find(m=>m.id===btn.dataset.playCg)));
  qsa('[data-view-cg]').forEach(btn=>btn.onclick=()=>showOnlineMatch(rows.find(m=>m.id===btn.dataset.viewCg)));
  qsa('[data-decline-cg]').forEach(btn=>btn.onclick=async()=>{await db.rpc('cancel_cash_grab_match',{p_match_id:btn.dataset.declineCg});openChallenges();});
}
function challengeRow(match){
  const incoming=match.opponent_id===state.user.id,other=incoming?match.host?.username:match.opponent?.username||'Random player';
  let action='<span class="status-pill">Waiting</span>';
  if(incoming&&match.status==='invited')action=`<span class="row-actions"><button class="small-action" data-play-cg="${match.id}">Play</button><button class="small-action secondary" data-decline-cg="${match.id}">Decline</button></span>`;
  else if(match.status==='finished')action=`<button class="small-action" data-view-cg="${match.id}">View result</button>`;
  else if(match.status==='cancelled')action='<span class="status-pill">Cancelled</span>';
  return`<div class="challenge-row"><span><strong>${escapeHtml(other)}</strong><small>${match.board_type==='daily'?'Daily':'Random'} · ${match.pool_mode}</small></span>${action}</div>`;
}
function loadIncomingChallenge(match){
  closeModal();const ids=match.host_board||[];const board=ids.map(playerById).filter(Boolean);
  if(board.length!==25)return toast('This challenge uses an older player board and can’t be loaded.');
  setBoard(board,{mode:match.pool_mode,boardType:match.board_type,challenge:match});$('builder').scrollIntoView({behavior:'smooth'});toast('Friend challenge loaded',`Build your five to face ${match.host?.username||'your friend'}.`);
}
async function submitChallengeLineup(){
  if(!state.challengeContext||state.selected.length!==5)return;
  const{data,error}=await db.rpc('submit_cash_grab_friend_lineup',{p_match_id:state.challengeContext.id,p_opponent_roster:rosterIds(),p_opponent_metrics:metricsPayload()});
  if(error)return toast('Could not submit lineup',error.message);state.challengeContext=null;showOnlineMatch(data,true);refreshChallengeCount();
}
async function findRandomPlayer(){
  if(!requireOnline()||state.selected.length!==5)return;
  const{data,error}=await db.rpc('join_cash_grab_random',{p_board_type:state.boardType,p_pool_mode:state.mode,p_board_key:currentBoardKey(),p_board:boardIds(),p_roster:rosterIds(),p_metrics:metricsPayload()});
  if(error)return toast('Matchmaking failed',error.message);
  if(data.status==='finished')return showOnlineMatch(data,true);
  openWaitingMatch(data);
}
function openWaitingMatch(match){
  openModal(`<span class="overline">RANDOM OPPONENT</span><h2>Searching…</h2><p>Your five are queued. Another HoopLoop player using ${match.board_type==='daily'?'the Daily board':'a Random board'} can match with you.</p><div class="search-pulse"><span></span><span></span><span></span></div><button class="secondary-button wide" id="cancel-cg-search" type="button">Cancel search</button>`);
  $('cancel-cg-search').onclick=async()=>{await db.rpc('cancel_cash_grab_match',{p_match_id:match.id});stopOnlineChannel();closeModal();};
  stopOnlineChannel();state.onlineChannel=db.channel(`cash-grab-${match.id}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'cash_grab_matches',filter:`id=eq.${match.id}`},payload=>{if(payload.new.status==='finished'){stopOnlineChannel();closeModal();showOnlineMatch(payload.new,true);}else if(payload.new.status==='cancelled'){stopOnlineChannel();closeModal();toast('Search ended.');}}).subscribe();
}
function stopOnlineChannel(){if(state.onlineChannel&&db)db.removeChannel(state.onlineChannel);state.onlineChannel=null;}
function showOnlineMatch(match,scroll=true){
  const ownHost=match.host_id===state.user?.id;const ownIds=ownHost?match.host_roster:match.opponent_roster,oppIds=ownHost?match.opponent_roster:match.host_roster;
  const own=Array.from(ownIds||[]).map(playerById).filter(Boolean),opp=Array.from(oppIds||[]).map(playerById).filter(Boolean);if(own.length!==5||opp.length!==5)return toast('Match result player data is incomplete.');
  $('matchup-section').classList.remove('hidden');$('matchup-kicker').textContent='REAL PLAYER';$('matchup-title').textContent='HoopLoop player matchup';$('your-match-roster').innerHTML=rosterHtml(own);$('opponent-match-roster').innerHTML=rosterHtml(opp);$('opponent-label').textContent='OPPONENT';
  const ownMetrics=teamMetrics(own),oppMetrics=teamMetrics(opp);$('your-power').textContent=ownMetrics.power;$('opponent-power').textContent=oppMetrics.power;
  const ownScore=ownHost?match.host_score:match.opponent_score,oppScore=ownHost?match.opponent_score:match.host_score;$('final-score').textContent=`${ownScore}–${oppScore}`;
  const won=match.winner_id===state.user?.id;$('result-card').classList.remove('hidden');$('result-kicker').textContent=won?'WIN':'LOSS';$('result-title').textContent=won?'Your lineup wins.':'Your opponent takes it.';$('result-copy').textContent='Real-player result resolved from the two submitted lineups using the same 50/30/20 team model.';$('comparison-grid').innerHTML=`<div><span>FIT</span><strong>${ownMetrics.fit} vs ${oppMetrics.fit}</strong></div><div><span>TALENT</span><strong>${ownMetrics.talent} vs ${oppMetrics.talent}</strong></div><div><span>VERSATILITY</span><strong>${ownMetrics.versatility} vs ${oppMetrics.versatility}</strong></div>`;$('result-next').textContent='Back to builder';$('result-rematch').classList.add('hidden');state.currentBattle={type:'online',result:{aWins:won}};if(scroll)$('matchup-section').scrollIntoView({behavior:'smooth',block:'start'});
}

function openHow(){
  openModal(`<span class="overline">MATCHUP ENGINE</span><h2>Fit comes first.</h2><p>Cash Grab evaluates a lineup in three layers:</p><ul class="modal-list"><li><strong>50% Fit</strong><br>Spacing, creation, lineup shape, perimeter defense, rim protection, rebounding, off-ball value, and usage compatibility.</li><li><strong>30% Talent</strong><br>The basketball ability of the five players.</li><li><strong>20% Versatility / Diversity</strong><br>How many different jobs the lineup can solve.</li></ul><p>The small ability lines from v1 are gone—the archetype tag by each player is the quick scouting preview.</p>`);
}
function openModal(html){$('modal-content').innerHTML=html;$('modal-backdrop').classList.remove('hidden');}
function closeModal(){$('modal-backdrop').classList.add('hidden');}
function toast(title,message=''){const el=document.createElement('div');el.className='toast';el.innerHTML=`<strong>${escapeHtml(title)}</strong>${message?`<span>${escapeHtml(message)}</span>`:''}`;$('toast-region').appendChild(el);setTimeout(()=>el.remove(),3800);}

function init(){
  loadLocal();makeBoard();initOnline();
  $('jump-board').onclick=()=>$('builder').scrollIntoView({behavior:'smooth'});$('how-button').onclick=openHow;$('modal-close').onclick=closeModal;$('modal-backdrop').onclick=e=>{if(e.target===$('modal-backdrop'))closeModal();};
  qsa('[data-mode]').forEach(button=>button.onclick=()=>{state.mode=button.dataset.mode;state.challengeContext=null;makeBoard();});
  qsa('[data-board-type]').forEach(button=>button.onclick=()=>{state.boardType=button.dataset.boardType;state.challengeContext=null;makeBoard();});
  $('clear-team').onclick=()=>{state.selected=[];state.gauntletActive=false;state.challengeContext=null;renderAll();};
  $('shuffle-board').onclick=()=>{state.boardNonce++;state.challengeContext=null;makeBoard();};
  $('bot-match').onclick=()=>startBattle(randomLegalTeam(),'quick',`Your five vs. a ${state.boardType==='daily'?'Daily':'Random'}-mode bot`);
  $('invite-friend').onclick=openFriendChallenge;$('random-player').onclick=findRandomPlayer;$('challenges-button').onclick=openChallenges;$('submit-challenge-lineup').onclick=submitChallengeLineup;$('start-gauntlet').onclick=startGauntlet;
  $('back-to-builder').onclick=()=>$('builder').scrollIntoView({behavior:'smooth'});$('result-next').onclick=()=>{if(state.currentBattle?.type==='online'){$('builder').scrollIntoView({behavior:'smooth'});return;}nextResultAction();};$('result-rematch').onclick=()=>startBattle(randomLegalTeam(),'quick','Your five vs. another bot');
}

document.addEventListener('DOMContentLoaded',init);
