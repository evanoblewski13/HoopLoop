(()=>{
'use strict';
const DATA=window.HOOPLOOP_PPP_DATA||{cards:[],league:[]};
const REAL=window.HOOPLOOP_CASH_GRAB_REAL_DATA||{};
const cards=DATA.cards||[], byId=new Map(cards.map(c=>[c.id,c]));
const $=id=>document.getElementById(id), clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function seedHash(s){let h=2166136261;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let a=seedHash(seed)||1;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function slug(s){return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')}
function shuffle(a,r){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function pick(a,r){return a[Math.floor(r()*a.length)]}
const START_GROUPS=['G','G','F','F','C'];
const MINUTES=[34,34,33,32,32,15,15,15,15,15,0,0];
let state={slots:[],boosted:new Set(),boostLocked:false,roster:{},swap:null,offense:{},history:loadHistory(),mode:null,opponent:null,defense:{},online:null,onlineTimer:null,series:null};
function makeSlots(seed=Date.now()){
 const r=rng(seed), benchGroups=Array.from({length:7},()=>pick(['G','F','C'],r));
 return [
  ...START_GROUPS.map((g,i)=>({id:'s'+i,label:['G1','G2','F1','F2','C'][i],group:g,starter:true,rotation:true,index:i})),
  ...benchGroups.map((g,i)=>({id:'b'+i,label:i<5?`BENCH ${i+1}`:`RESERVE ${i-4}`,group:g,starter:false,rotation:i<5,index:i+5}))
 ];
}
function resetBuilder(seed=Date.now()){
 state.slots=makeSlots(seed);state.boosted=new Set();state.boostLocked=false;state.roster={};state.swap=null;state.offense={};state.opponent=null;state.defense={};state.mode=null;
 $('boost-banner').classList.remove('hidden');$('lineup-tools').classList.add('hidden');$('matchup-section').classList.add('hidden');$('game-section').classList.add('hidden');$('season-result').classList.add('hidden');$('save-team').disabled=true;
 renderRoster(); updateBoost(); $('build-status').textContent='Choose exactly three boosted spots.';
}
function updateBoost(){ $('boost-count').textContent=`${state.boosted.size} / 3 boosts`; $('lock-boosts').disabled=state.boosted.size!==3||state.boostLocked; $('lock-boosts').textContent=state.boostLocked?'Boosts locked':'Lock boosts'; }
function renderRoster(){
 $('starter-slots').innerHTML='';$('bench-slots').innerHTML='';
 for(const s of state.slots){
  const c=state.roster[s.id]; const el=document.createElement('button'); el.type='button'; el.className='roster-slot'+(state.boosted.has(s.id)?' boosted':'')+(state.swap===s.id?' selected-swap':'');
  el.innerHTML=`<div class="slot-top"><span>${s.label} · ${s.group}</span><span class="boost-mark">${state.boosted.has(s.id)?'BOOST':''}</span></div>`+(c?`<div class="player-card-mini"><img src="${c.headshot||''}" alt="" onerror="this.style.visibility='hidden'"><strong>${c.name}</strong><small>${c.versionLabel}<br>${c.pos} · ${Number(c.stats.ppg||0).toFixed(1)} PPG</small></div>`:`<div class="mystery-mark">?</div>`);
  el.onclick=()=>slotClick(s); (s.starter?$('starter-slots'):$('bench-slots')).appendChild(el);
 }
 if(Object.keys(state.roster).length===12) renderLineupTools();
}
function slotClick(s){
 if(!state.boostLocked){ if(state.boosted.has(s.id))state.boosted.delete(s.id); else if(state.boosted.size<3)state.boosted.add(s.id); updateBoost();renderRoster();return; }
 if(!state.roster[s.id]) return openPull(s);
 if(Object.keys(state.roster).length<12)return;
 if(!state.swap){state.swap=s.id;renderRoster();return}
 if(state.swap===s.id){state.swap=null;renderRoster();return}
 const a=state.slots.find(x=>x.id===state.swap), b=s, ca=state.roster[a.id], cb=state.roster[b.id];
 if(a.starter&&!cb.groups.includes(a.group)){toast(`${cb.name} cannot fill ${a.group}.`);return}
 if(b.starter&&!ca.groups.includes(b.group)){toast(`${ca.name} cannot fill ${b.group}.`);return}
 [state.roster[a.id],state.roster[b.id]]=[cb,ca];state.swap=null;renderRoster();
}
function openPull(s){
 const used=new Set(Object.values(state.roster).map(c=>c.baseId)); let pool=cards.filter(c=>!used.has(c.baseId)&&(c.groups.includes(s.group)||(!s.starter&&c.groups.includes('UTIL'))));
 if(state.boosted.has(s.id)) pool=pool.filter(c=>c.boostEligible);
 const r=rng(`${Date.now()}-${s.id}-${Object.keys(state.roster).length}`), opts=[], bases=new Set();
 for(const c of shuffle(pool,r)){if(bases.has(c.baseId))continue;bases.add(c.baseId);opts.push(c);if(opts.length===5)break}
 $('pull-title').textContent=`${s.label} · choose one`;$('pull-overline').textContent=state.boosted.has(s.id)?'BOOSTED PULL':'PULL';$('pull-modal').querySelector('.modal-card').classList.toggle('boosted-modal',state.boosted.has(s.id));
 $('pull-options').innerHTML=''; for(const c of opts){const b=document.createElement('button');b.type='button';b.className='pull-option';b.innerHTML=`<img src="${c.headshot||''}" alt=""><strong>${c.name}</strong><div class="version">${c.versionLabel}</div><div class="stats">${Number(c.stats.ppg||0).toFixed(1)} PPG · ${Number(c.stats.rpg||0).toFixed(1)} RPG · ${Number(c.stats.apg||0).toFixed(1)} APG</div>`;b.onclick=()=>{state.roster[s.id]=c;$('pull-modal').classList.add('hidden');renderRoster();if(Object.keys(state.roster).length===12){$('build-status').textContent='Roster complete. Set your starters and offense order.';$('save-team').disabled=false}};$('pull-options').appendChild(b)}
 $('pull-modal').classList.remove('hidden');
}
function renderLineupTools(){
 $('lineup-tools').classList.remove('hidden');$('boost-banner').classList.add('hidden');
 $('rotation-summary').innerHTML=state.slots.map((s,i)=>`<span>${MINUTES[i]} MIN · ${state.roster[s.id].name}</span>`).join('');
 const starters=state.slots.filter(s=>s.starter).map(s=>state.roster[s.id]);
 if(!Object.keys(state.offense).length){starters.slice().sort((a,b)=>(b.stats.ppg||0)-(a.stats.ppg||0)).forEach((c,i)=>state.offense[c.baseId]=i+1)}
 $('offense-controls').innerHTML=''; starters.forEach(c=>{const lab=document.createElement('label');lab.textContent=c.name;const sel=document.createElement('select');for(let i=1;i<=5;i++){const o=document.createElement('option');o.value=i;o.textContent=`#${i}`;if(state.offense[c.baseId]===i)o.selected=true;sel.appendChild(o)}sel.onchange=()=>setOffense(c.baseId,+sel.value);lab.appendChild(sel);$('offense-controls').appendChild(lab)});
}
function setOffense(baseId,n){const other=Object.keys(state.offense).find(k=>k!==baseId&&state.offense[k]===n), old=state.offense[baseId];state.offense[baseId]=n;if(other)state.offense[other]=old;renderLineupTools()}
function rosterPayload(){return {cards:state.slots.map(s=>state.roster[s.id].id),slots:state.slots.map(s=>({id:s.id,label:s.label,group:s.group,starter:s.starter,rotation:s.rotation})),offense:state.offense}}
function loadPayload(p){if(!p||!Array.isArray(p.cards)||p.cards.length!==12)return false;state.slots=p.slots||makeSlots();state.roster={};state.slots.forEach((s,i)=>state.roster[s.id]=byId.get(p.cards[i]));state.boostLocked=true;state.boosted=new Set();state.offense=p.offense||{};renderRoster();$('save-team').disabled=false;return true}
function playerLine(card,min,opt=3,defender=null,r=null){r=r||Math.random;const s=card.stats||{}, ref=s.mpg&&s.mpg>8?s.mpg:30, scale=min/ref, usage=[0,1.12,1.06,1,0.95,.9][opt]||1;let p=s.ppg||0, reb=s.rpg||0, ast=s.apg||0;
 if(defender){const key=[slug(card.name),slug(defender.name)].sort().join('|');let h=null,gp=0;if(card.version==='Current'&&REAL.h2hRecent&&REAL.h2hRecent[key]){const x=REAL.h2hRecent[key];h={p:x[1],r:x[2],a:x[3]};gp=x[4]||x[0]}else if(REAL.h2h&&REAL.h2h[key]){const x=REAL.h2h[key];h={p:x[1],r:x[2],a:x[3]};gp=x[0]}if(h&&gp>0){const w=Math.min(.42,gp/(gp+10)*.5);p=p*(1-w)+h.p*w;reb=reb*(1-w)+h.r*w;ast=ast*(1-w)+h.a*w}}
 const vol=.80+r()*.42, pts=Math.max(0,Math.round(p*scale*usage*vol)), rr=Math.max(0,Math.round(reb*scale*(.82+r()*.36))), aa=Math.max(0,Math.round(ast*scale*(.8+r()*.4)));return {name:card.name,version:card.versionLabel,min,pts,reb:rr,ast:aa};}
function defaultPlan(roster){const starters=roster.slots.filter(s=>s.starter);const defense={};starters.forEach((s,i)=>defense[s.id]=starters[i].id);return {offense:roster.offense||{},defense}}
function simulate(rosterA,rosterB,planA,planB,seed){const r=rng(seed), ca=rosterA.cards.map(id=>byId.get(id)), cb=rosterB.cards.map(id=>byId.get(id));
 function side(cardsX,rosterX,planX,cardsOpp,rosterOpp,oppPlan){return cardsX.map((c,i)=>{let def=null;if(i<5){const attSlot=rosterX.slots[i].id;const defenderSlot=Object.keys(oppPlan.defense||{}).find(k=>oppPlan.defense[k]===attSlot);if(defenderSlot){const di=rosterOpp.slots.findIndex(s=>s.id===defenderSlot);def=cardsOpp[di]}}return playerLine(c,MINUTES[i],planX.offense?.[c.baseId]||3,def,r)})}
 let la=side(ca,rosterA,planA,cb,rosterB,planB), lb=side(cb,rosterB,planB,ca,rosterA,planA);let sa=la.reduce((x,y)=>x+y.pts,0),sb=lb.reduce((x,y)=>x+y.pts,0);if(sa===sb){if(r()>.5){la[0].pts++;sa++}else{lb[0].pts++;sb++}}
 function qs(total){const w=[.23+r()*.05,.23+r()*.05,.23+r()*.05];const a=w.map(x=>Math.round(total*x));a.push(total-a.reduce((x,y)=>x+y,0));return a}
 return {a:{score:sa,lines:la,q:qs(sa)},b:{score:sb,lines:lb,q:qs(sb)}}}
function randomCpuRoster(seed){const r=rng(seed),used=new Set(),result=[],slots=makeSlots(seed);const boosted=new Set(shuffle(slots.map(s=>s.id),r).slice(0,3));for(const s of slots){let pool=cards.filter(c=>(c.groups.includes(s.group)||(!s.starter&&c.groups.includes('UTIL')))&&!used.has(c.baseId));if(boosted.has(s.id)){const b=pool.filter(c=>c.boostEligible);if(b.length)pool=b}const c=pick(pool,r);used.add(c.baseId);result.push(c.id)}const roster={cards:result,slots,offense:{}};result.slice(0,5).map(id=>byId.get(id)).sort((a,b)=>(b.stats.ppg||0)-(a.stats.ppg||0)).forEach((c,i)=>roster.offense[c.baseId]=i+1);return roster}
function ensureReady(){if(Object.keys(state.roster).length!==12){toast('Open all 12 roster spots first.');return false}return true}
function setupOpponent(roster,label,mode){state.opponent=roster;state.mode=mode;$('matchup-section').classList.remove('hidden');$('matchup-section').scrollIntoView({behavior:'smooth'});const my=rosterPayload(),opp=roster;if(!Object.keys(state.defense).length){my.slots.slice(0,5).forEach((s,i)=>state.defense[s.id]=opp.slots[i].id)}$('away-label').textContent=label;renderDefenseControls();}
function renderDefenseControls(){const my=rosterPayload(),opp=state.opponent,myStar=my.slots.slice(0,5),oppStar=opp.slots.slice(0,5);$('defense-controls').innerHTML='';myStar.forEach((s,i)=>{const c=byId.get(my.cards[i]),lab=document.createElement('label');lab.textContent=`${c.name} guards`;const sel=document.createElement('select');oppStar.forEach((os,j)=>{const oc=byId.get(opp.cards[j]),o=document.createElement('option');o.value=os.id;o.textContent=oc.name;if(state.defense[s.id]===os.id)o.selected=true;sel.appendChild(o)});sel.onchange=()=>uniqueDefense(s.id,sel.value);lab.appendChild(sel);$('defense-controls').appendChild(lab)})}
function uniqueDefense(slot,target){const old=state.defense[slot],other=Object.keys(state.defense).find(k=>k!==slot&&state.defense[k]===target);state.defense[slot]=target;if(other)state.defense[other]=old;renderDefenseControls()}
function startCpu(){if(!ensureReady())return;setupOpponent(randomCpuRoster('cpu-'+Date.now()),'CPU','cpu')}
function lockGameplan(){if(!state.opponent)return;const mine=rosterPayload(), planA={offense:state.offense,defense:state.defense}; if(state.mode==='cpu'){state.series={mine,opp:state.opponent,planA,planB:defaultPlan(state.opponent),winsA:0,winsB:0,game:1,bestOf:1};openGame()} else if(state.online){submitOnlinePlan(planA)} }
function openGame(){$('matchup-section').classList.add('hidden');$('game-section').classList.remove('hidden');$('box-score-wrap').classList.add('hidden');$('home-score').textContent='0';$('away-score').textContent='0';$('game-state').textContent='READY';$('line-score').innerHTML='';$('simulate-game').disabled=false;$('simulate-game').textContent=state.series?.bestOf===7?`Simulate Game ${state.series.game}`:'Simulate game';$('game-section').scrollIntoView({behavior:'smooth'})}
function renderGameResult(g){$('home-score').textContent=g.a.score;$('away-score').textContent=g.b.score;$('game-state').textContent='FINAL';$('line-score').innerHTML=['Q1','Q2','Q3','Q4','FINAL'].map((q,i)=>`<div class="quarter-cell"><span>${q}</span><strong>${i<4?g.a.q[i]+'–'+g.b.q[i]:g.a.score+'–'+g.b.score}</strong></div>`).join('');
 const tr=x=>`<tr><td>${x.name}</td><td>${x.min}</td><td>${x.pts}</td><td>${x.reb}</td><td>${x.ast}</td></tr>`;$('home-box').innerHTML=g.a.lines.map(tr).join('');$('away-box').innerHTML=g.b.lines.map(tr).join('');$('box-score-wrap').classList.remove('hidden');}
function simClick(){if(state.series?.bestOf===7&&state.online){readyOnlineGame();return}const s=state.series;if(!s)return;const g=simulate(s.mine,s.opp,s.planA,s.planB,'ppp-'+Date.now());renderGameResult(g);$('simulate-game').disabled=true;}
function teamPower(roster){const cs=roster.cards.map(id=>byId.get(id));let p=0;cs.forEach((c,i)=>{const s=c.stats||{},ref=s.mpg&&s.mpg>8?s.mpg:30,sc=MINUTES[i]/ref;p+=(s.ppg||0)*sc+(.32*(s.rpg||0)+.5*(s.apg||0))*sc});return p}
function simSeason(){if(!ensureReady())return;const roster=rosterPayload(),power=teamPower(roster),r=rng('season-'+roster.cards.join('|')),league=DATA.league||[],schedule=[];for(let rep=0;rep<2;rep++)schedule.push(...league);schedule.push(...shuffle(league,r).slice(0,22));let wins=0;for(const [name,w,l] of schedule){const wp=w/(w+l),oppPower=124+(wp-.5)*42;const chance=1/(1+Math.exp(-(power-oppPower)/12));if(r()<clamp(chance,.02,.98))wins++}const losses=82-wins,label=seasonLabel(wins);$('season-record').textContent=`${wins}–${losses}`;$('season-label').textContent=`${label} Season`;$('season-copy').textContent=seasonCopy(label,wins);$('season-meter-fill').style.width=`${wins/82*100}%`;$('season-result').classList.remove('hidden');$('season-result').scrollIntoView({behavior:'smooth'});saveHistory({roster,record:`${wins}-${losses}`,label,when:Date.now()},true)}
function seasonLabel(w){if(w===82)return'Perfection';if(w>=74)return'Elite';if(w>=68)return'Amazing';if(w>=60)return'Great';if(w>=51)return'Good';if(w>=42)return'Decent';if(w>=31)return'Mid';if(w>=21)return'Wack';if(w>=11)return'Trash';return'Abysmal'}
function seasonCopy(l,w){const m={Perfection:'You broke the scale. 82–0.',Elite:'An elite season. This roster owned the league.',Amazing:'An amazing season and a true title-level team.',Great:'A great team with a dominant regular season.',Good:'A good season. This roster clearly worked.',Decent:'A decent season with more wins than losses.',Mid:'Exactly where the label says: middle of the pack.',Wack:'Too many holes to keep up with the league.',Trash:'The pulls did not come together.',Abysmal:'Burn the tape and open another pack.'};return m[l]||`${w} wins.`}
function loadHistory(){try{return JSON.parse(localStorage.getItem('hooploop_ppp_history_v1')||'[]')}catch{return[]}}
function saveHistory(item,silent=false){const key=item.roster.cards.join('|'),arr=state.history.filter(x=>x.roster.cards.join('|')!==key);arr.unshift(item);state.history=arr.slice(0,5);localStorage.setItem('hooploop_ppp_history_v1',JSON.stringify(state.history));renderHistory();if(!silent)toast('Team saved to history.')}
function renderHistory(){$('history-grid').innerHTML='';if(!state.history.length){$('history-grid').innerHTML='<div class="history-card"><strong>No teams yet.</strong><small>Your saved teams and season records will appear here.</small></div>';return}state.history.forEach((h,i)=>{const el=document.createElement('div');el.className='history-card';const names=h.roster.cards.slice(0,5).map(id=>byId.get(id)?.name).filter(Boolean);el.innerHTML=`<strong>Team ${i+1}</strong><div class="record">${h.record||'Saved'}</div><small>${h.label?h.label+' Season · ':''}${names.join(', ')}</small><button class="secondary-button" style="margin-top:10px" type="button">Load</button>`;el.querySelector('button').onclick=()=>{loadPayload(h.roster);$('builder-section').scrollIntoView({behavior:'smooth'})};$('history-grid').appendChild(el)})}
function toast(msg){$('build-status').textContent=msg;setTimeout(()=>{if(Object.keys(state.roster).length===12)$('build-status').textContent='Roster complete. Set your starters and offense order.'},2300)}
// ---------- online ----------
let sb=null, poll=null;
function initSupabase(){const c=window.HOOPLOOP_CONFIG||{};if(window.supabase&&c.SUPABASE_URL&&c.SUPABASE_ANON_KEY)sb=window.supabase.createClient(c.SUPABASE_URL,c.SUPABASE_ANON_KEY)}
async function rpc(name,args={}){if(!sb)throw new Error('Log in / Supabase setup required.');const {data,error}=await sb.rpc(name,args);if(error)throw error;return data}
async function startFriend(){if(!ensureOnline())return;$('friend-box').classList.remove('hidden')}
function ensureOnline(){if(!sb){toast('Online setup is required.');return false}return true}
async function sendFriend(){try{const row=await rpc('ppp_create_friend_match',{p_friend_username:$('friend-username').value.trim()});enterOnline(row,'friend')}catch(e){$('online-message').textContent=e.message}}
async function startRandom(){if(!ensureOnline())return;try{const row=await rpc('ppp_find_random_match');enterOnline(row,'random')}catch(e){toast(e.message)}}
function enterOnline(row,type){state.online={id:row.id,type,row};$('friend-box').classList.add('hidden');$('online-room').classList.remove('hidden');$('room-status').textContent=row.status==='searching'?'Finding opponent…':row.status==='invited'?'Invite sent':'Build room';$('room-message').textContent='When the match starts, both players get five minutes to build a fresh team.';if(row.status==='building'){resetBuilder('online-'+row.id);state.online={id:row.id,type,row};startBuildClock(row.build_deadline)}startPoll()}
function startBuildClock(deadline){clearInterval(state.onlineTimer);const tick=()=>{const ms=new Date(deadline)-Date.now(),sec=Math.max(0,Math.ceil(ms/1000));$('build-clock').textContent=`${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;if(sec<=0){clearInterval(state.onlineTimer);autoFinishOnline()}};tick();state.onlineTimer=setInterval(tick,500);$('submit-online-team').classList.remove('hidden')}
async function autoFinishOnline(){if(Object.keys(state.roster).length<12){if(!state.boostLocked){while(state.boosted.size<3)state.boosted.add(pick(state.slots.filter(s=>!state.boosted.has(s.id)),Math.random));state.boostLocked=true}for(const s of state.slots){if(!state.roster[s.id]){const used=new Set(Object.values(state.roster).map(c=>c.baseId));let pool=cards.filter(c=>(c.groups.includes(s.group)||(!s.starter&&c.groups.includes('UTIL')))&&!used.has(c.baseId));if(state.boosted.has(s.id)){const b=pool.filter(c=>c.boostEligible);if(b.length)pool=b}state.roster[s.id]=pool[Math.floor(Math.random()*pool.length)]}}renderRoster()}await submitOnlineTeam()}
async function submitOnlineTeam(){if(!ensureReady())return;try{const row=await rpc('ppp_submit_roster',{p_match_id:state.online.id,p_roster:rosterPayload()});$('submit-online-team').classList.add('hidden');if(row.status==='configuring'){state.online.row={...row,status:'building'};await beginOnlineConfig(row)}else{state.online.row=row;$('room-message').textContent='Team submitted. Waiting for the other roster.'}}catch(e){$('room-message').textContent=e.message}}
async function submitOnlinePlan(plan){try{const row=await rpc('ppp_submit_plan',{p_match_id:state.online.id,p_plan:plan});$('matchup-section').classList.add('hidden');$('online-room').classList.remove('hidden');if(row.status==='series'){state.online.row={...row,status:'configuring'};await enterSeriesRow(row)}else{state.online.row=row;$('room-message').textContent='Gameplan locked. Waiting for opponent.'}}catch(e){toast(e.message)}}
async function readyOnlineGame(){try{await rpc('ppp_ready_game',{p_match_id:state.online.id});$('simulate-game').disabled=true;$('game-state').textContent='WAITING';$('series-state').textContent='Both players must click simulate.'}catch(e){toast(e.message)}}
async function beginOnlineConfig(row){clearInterval(state.onlineTimer);const {data:{user}}=await sb.auth.getUser(),mineHost=user&&user.id===row.host_id,oppPayload=mineHost?row.guest_roster:row.host_roster;state.defense={};setupOpponent(oppPayload,'OPPONENT','online')}
async function enterSeriesRow(row){const {data:{user}}=await sb.auth.getUser(),host=user&&user.id===row.host_id;state.series={mine:host?row.host_roster:row.guest_roster,opp:host?row.guest_roster:row.host_roster,planA:host?row.host_plan:row.guest_plan,planB:host?row.guest_plan:row.host_plan,winsA:host?row.host_wins:row.guest_wins,winsB:host?row.guest_wins:row.host_wins,game:row.game_no,bestOf:7,host};state.online.row=row;openGame();$('series-state').textContent=`Series ${state.series.winsA}–${state.series.winsB}`}
async function pollMatch(){if(!sb||!state.online)return;const {data,error}=await sb.from('ppp_matches').select('*').eq('id',state.online.id).single();if(error||!data)return;const old=state.online.row||{},row=data;state.online.row=row;
 if(row.status==='building'&&old.status!=='building'){resetBuilder('online-'+row.id);state.online={id:row.id,type:state.online.type,row};startBuildClock(row.build_deadline);$('room-status').textContent='5-minute build';$('room-message').textContent='Build in any order. Submit early if you finish.'}
 if(row.status==='configuring'&&old.status!=='configuring'){await beginOnlineConfig(row)}
 if(row.status==='series'&&old.status!=='series'){await enterSeriesRow(row)}
 if(row.status==='series'&&row.host_game_ready&&row.guest_game_ready&&row.game_no===old.game_no){const {data:{user}}=await sb.auth.getUser();if(user&&user.id===row.host_id){const g=simulate(row.host_roster,row.guest_roster,row.host_plan,row.guest_plan,`${row.id}-game-${row.game_no}`);try{await rpc('ppp_record_game',{p_match_id:row.id,p_game_no:row.game_no,p_host_score:g.a.score,p_guest_score:g.b.score})}catch{}}}
 if((row.game_log?.length||0)!==(old.game_log?.length||0)&&row.game_log?.length){const last=row.game_log[row.game_log.length-1],hostSide=state.series?.host;const g=simulate(row.host_roster,row.guest_roster,row.host_plan,row.guest_plan,`${row.id}-game-${last.game_no}`);const view=hostSide?g:{a:g.b,b:g.a};renderGameResult(view);if(state.series){state.series.winsA=hostSide?row.host_wins:row.guest_wins;state.series.winsB=hostSide?row.guest_wins:row.host_wins;state.series.game=row.game_no;$('series-state').textContent=`Series ${state.series.winsA}–${state.series.winsB}`;$('simulate-game').disabled=false;$('simulate-game').textContent=`Simulate Game ${row.game_no}`}}
 if(row.status==='finished'&&old.status!=='finished'){$('game-state').textContent=(state.series?.winsA>state.series?.winsB)?'SERIES WIN':'SERIES LOSS';$('simulate-game').disabled=true;$('series-state').textContent=`Final series ${state.series?.winsA||0}–${state.series?.winsB||0}`}
}
function startPoll(){clearInterval(poll);poll=setInterval(pollMatch,1200);pollMatch()}
async function checkIncoming(){if(!sb||state.online)return;try{const {data:{user}}=await sb.auth.getUser();if(!user)return;const {data}=await sb.from('ppp_matches').select('*').eq('guest_id',user.id).eq('status','invited').order('created_at',{ascending:false}).limit(1);if(data&&data[0]){state.online={id:data[0].id,type:'friend',row:data[0]};$('online-room').classList.remove('hidden');$('room-status').textContent='Pack, Pull, Play invite';$('room-message').textContent='A friend challenged you to a best-of-seven.';$('accept-invite').classList.remove('hidden');startPoll()}}catch{}}
async function acceptInvite(){try{const row=await rpc('ppp_accept_match',{p_match_id:state.online.id});$('accept-invite').classList.add('hidden');state.online.row={...row,status:'invited'};await pollMatch()}catch(e){$('room-message').textContent=e.message}}
// events
$('lock-boosts').onclick=()=>{if(state.boosted.size!==3)return;state.boostLocked=true;updateBoost();$('build-status').textContent='Boosts locked. Open the 12 mystery cards in any order.';renderRoster()};
$('new-team').onclick=()=>resetBuilder();$('save-team').onclick=()=>saveHistory({roster:rosterPayload(),record:null,label:null,when:Date.now()});$('jump-builder').onclick=()=>$('builder-section').scrollIntoView({behavior:'smooth'});$('open-history-top').onclick=()=>$('history-section').scrollIntoView({behavior:'smooth'});$('close-pull').onclick=()=>$('pull-modal').classList.add('hidden');
[...document.querySelectorAll('.mode-card')].forEach(b=>b.onclick=()=>{const m=b.dataset.mode;if(m==='season')simSeason();if(m==='cpu')startCpu();if(m==='friend')startFriend();if(m==='random')startRandom()});$('send-friend-series').onclick=sendFriend;$('accept-invite').onclick=acceptInvite;$('submit-online-team').onclick=submitOnlineTeam;$('lock-gameplan').onclick=lockGameplan;$('simulate-game').onclick=simClick;$('season-new-team').onclick=()=>{resetBuilder();$('builder-section').scrollIntoView({behavior:'smooth'})};
initSupabase();resetBuilder();renderHistory();checkIncoming();
})();
