'use strict';

const BUILD_VERSION = '9.0.0';
const DATA = window.HOOPLOOP_SBC_DATA || { meta: {}, players: [] };
const CONFIG = window.HOOPLOOP_CONFIG || {};
const ONLINE_CONFIGURED = /^https:\/\/.+\.supabase\.co$/i.test(CONFIG.SUPABASE_URL || '')
  && Boolean(CONFIG.SUPABASE_ANON_KEY)
  && !String(CONFIG.SUPABASE_ANON_KEY).includes('PASTE_');
const db = ONLINE_CONFIGURED && window.supabase
  ? window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY)
  : null;

const $ = (id) => document.getElementById(id);
const ROLE_LABELS = { start: 'START', bench: 'BENCH', cut: 'CUT' };
const MODE_LABELS = { modern: 'Modern', allstars: 'All-Stars', random: 'Random' };
const POSITION_LABELS = { all: 'All Positions', guards: 'Guards', forwards: 'Forwards', bigs: 'Bigs' };
const MODES = ['modern', 'allstars', 'random'];
const POSITIONS = ['all', 'guards', 'forwards', 'bigs'];
const SBC_LAUNCH_DATE = CONFIG.SBC_LAUNCH_DATE || '2026-08-02';

const state = {
  session: null,
  profile: null,
  dailyDate: todayISO(),
  dailyPuzzle: null,
  dailyResults: null,
  daily: makeBoardState(),
  playgroundMode: 'modern',
  playgroundPosition: 'all',
  playground: makeBoardState(),
  authMode: 'login'
};

function makeBoardState() {
  return {
    players: [],
    assignments: { start: null, bench: null, cut: null },
    locked: false
  };
}

function escapeHTML(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function todayISO() {
  const zone = CONFIG.DAILY_TIME_ZONE || 'America/Chicago';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function parseISO(dateString) {
  return new Date(`${dateString}T12:00:00`);
}

function dateISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftDate(dateString, amount) {
  const date = parseISO(dateString);
  date.setDate(date.getDate() + amount);
  return dateISO(date);
}

function dayDifference(start, end) {
  return Math.round((parseISO(end) - parseISO(start)) / 86400000);
}

function formatDate(dateString, options = {}) {
  return new Intl.DateTimeFormat('en-US', {
    month: options.short ? 'short' : 'long',
    day: 'numeric',
    year: options.year === false ? undefined : 'numeric'
  }).format(parseISO(dateString));
}

function hash32(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededUnit(value) {
  return (hash32(value) + 1) / 4294967297;
}

function initials(name) {
  return String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-US');
}

function formatStat(value) {
  return value === null || value === undefined || Number.isNaN(Number(value)) ? '—' : Number(value).toFixed(1);
}

function isEligible(player, mode, position) {
  const modeMatch = mode === 'modern'
    ? player.active
    : mode === 'allstars'
      ? player.allStarSelections > 0
      : player.randomEligible;
  if (!modeMatch) return false;
  if (position === 'all') return true;
  return Array.isArray(player.positionGroups) && player.positionGroups.includes(position);
}

function poolFor(mode, position) {
  return DATA.players.filter((player) => isEligible(player, mode, position));
}

function recognitionWeight(player, mode) {
  const games = Number(player.games || 0);
  const stars = Number(player.allStarSelections || 0);
  const scoring = Number(player.ppg || 0);
  let weight = 1 + Math.log1p(games) * 1.6 + stars * 5 + Math.min(scoring, 30) * .22;
  if (player.active) weight += 3;
  if (mode === 'random') weight = 1 + Math.log1p(games) * .65 + stars * 2.2 + (player.active ? 1.5 : 0);
  return Math.max(1, weight);
}

function deterministicRank(pool, seed, mode) {
  return pool
    .map((player) => {
      const u = Math.max(.0000001, seededUnit(`${seed}:${player.id}`));
      return { player, key: -Math.log(u) / recognitionWeight(player, mode) };
    })
    .sort((a, b) => a.key - b.key)
    .map((entry) => entry.player);
}

function selectDailyPlayers(mode, position, seed) {
  const pool = poolFor(mode, position);
  if (pool.length < 3) throw new Error('This daily player pool does not contain three eligible players.');

  if (position === 'all') {
    const picked = [];
    const groups = ['guards', 'forwards', 'bigs'];
    groups.forEach((group, index) => {
      const candidates = deterministicRank(
        pool.filter((player) => player.positionGroups?.includes(group) && !picked.some((item) => item.id === player.id)),
        `${seed}:${group}:${index}`,
        mode
      );
      if (candidates[0]) picked.push(candidates[0]);
    });
    if (picked.length < 3) {
      deterministicRank(pool, `${seed}:fallback`, mode).forEach((player) => {
        if (picked.length < 3 && !picked.some((item) => item.id === player.id)) picked.push(player);
      });
    }
    return picked.slice(0, 3);
  }

  return deterministicRank(pool, seed, mode).slice(0, 3);
}

function randomWeightedPlayer(pool, mode, excluded = new Set()) {
  const available = pool.filter((player) => !excluded.has(player.id));
  let total = 0;
  const weighted = available.map((player) => {
    const weight = recognitionWeight(player, mode);
    total += weight;
    return { player, cumulative: total };
  });
  let target = Math.random() * total;
  for (const item of weighted) {
    if (target <= item.cumulative) return item.player;
  }
  return weighted.at(-1)?.player;
}

function selectRandomPlayers(mode, position) {
  const pool = poolFor(mode, position);
  if (pool.length < 3) throw new Error('This filter does not contain three eligible players.');
  const selected = [];
  const used = new Set();
  while (selected.length < 3) {
    const player = randomWeightedPlayer(pool, mode, used);
    if (!player) break;
    selected.push(player);
    used.add(player.id);
  }
  return selected;
}

function getDailyPuzzle(dateString) {
  const launch = SBC_LAUNCH_DATE;
  const index = Math.max(0, dayDifference(launch, dateString));
  const mode = MODES[index % MODES.length];
  const position = POSITIONS[Math.floor(index / MODES.length) % POSITIONS.length];
  const seed = `hooploop-sbc-v8:${dateString}:${mode}:${position}`;
  const players = selectDailyPlayers(mode, position, seed);
  const signature = `sbc8-${dateString}-${mode}-${position}-${players.map((player) => player.id).join('-')}`;
  return { date: dateString, number: index + 1, mode, position, players, signature };
}

function assignmentComplete(assignments) {
  const ids = Object.values(assignments).filter(Boolean);
  return ids.length === 3 && new Set(ids).size === 3;
}

function roleForPlayer(assignments, playerId) {
  return Object.keys(assignments).find((role) => Number(assignments[role]) === Number(playerId)) || null;
}

function playerById(board, id) {
  return board.players.find((player) => Number(player.id) === Number(id));
}

function assignmentNames(board) {
  return Object.fromEntries(Object.entries(board.assignments).map(([role, id]) => [role, playerById(board, id)?.name || 'Unassigned']));
}

function careerYears(player) {
  if (!player.fromYear && !player.toYear) return 'Career years unavailable';
  const end = player.active ? 'Present' : (player.toYear || '—');
  return `${player.fromYear || '—'}–${end}`;
}

function roleButtons(player, boardName, locked) {
  return Object.keys(ROLE_LABELS).map((role) => `
    <button class="role-button" data-board="${boardName}" data-player-id="${player.id}" data-role="${role}" type="button" ${locked ? 'disabled' : ''}>
      ${ROLE_LABELS[role]}
    </button>`).join('');
}

function playerCard(player, boardName, assignments, locked) {
  const assignedRole = roleForPlayer(assignments, player.id);
  const classes = ['player-card', assignedRole ? `assigned-${assignedRole}` : ''].filter(Boolean).join(' ');
  const allStarBadge = player.allStarSelections > 0
    ? `<span class="card-badge orange">★ ${player.allStarSelections}× ALL-STAR</span>`
    : '';
  const activeBadge = player.active ? '<span class="card-badge">ACTIVE</span>' : '';
  return `
    <article class="${classes}" data-card-player="${player.id}">
      <div class="card-image-wrap">
        <img class="player-headshot" src="${escapeHTML(player.headshot)}" alt="${escapeHTML(player.name)}" loading="lazy" referrerpolicy="no-referrer" />
        <div class="player-fallback" aria-hidden="true">${escapeHTML(initials(player.name))}</div>
        <div class="card-badges">${activeBadge}${allStarBadge}</div>
        <div class="role-stamp">${assignedRole ? ROLE_LABELS[assignedRole][0] : ''}</div>
      </div>
      <div class="card-copy">
        <h3>${escapeHTML(player.name)}</h3>
        <div class="player-subline">${escapeHTML(player.position || 'Position unavailable')} · ${escapeHTML(careerYears(player))}</div>
        <div class="player-stats">
          <div><strong>${formatStat(player.ppg)}</strong><span>PPG</span></div>
          <div><strong>${formatStat(player.rpg)}</strong><span>RPG</span></div>
          <div><strong>${formatStat(player.apg)}</strong><span>APG</span></div>
          <div><strong>${player.games ? formatNumber(player.games) : '—'}</strong><span>GAMES</span></div>
        </div>
      </div>
      <div class="role-buttons">${roleButtons(player, boardName, locked)}</div>
    </article>`;
}

function renderBoard(boardName) {
  const board = state[boardName];
  const grid = $(`${boardName}-player-grid`);
  const tray = $(`${boardName}-lineup-tray`);
  const submit = boardName === 'daily' ? $('submit-daily') : $('submit-playground');
  if (!grid || !tray || !submit) return;

  grid.innerHTML = board.players.map((player) => playerCard(player, boardName, board.assignments, board.locked)).join('');
  grid.querySelectorAll('.player-headshot').forEach((image) => {
    image.addEventListener('error', () => image.closest('.card-image-wrap')?.classList.add('image-failed'), { once: true });
  });

  Object.keys(ROLE_LABELS).forEach((role) => {
    const value = tray.querySelector(`[data-role="${role}"] strong`);
    if (value) value.textContent = playerById(board, board.assignments[role])?.name || 'Unassigned';
  });

  grid.querySelectorAll('.role-button').forEach((button) => {
    const playerId = Number(button.dataset.playerId);
    const role = button.dataset.role;
    button.classList.toggle('active', Number(board.assignments[role]) === playerId);
    button.addEventListener('click', () => assignRole(boardName, playerId, role));
  });

  submit.disabled = board.locked || !assignmentComplete(board.assignments);
  if (boardName === 'daily') submit.textContent = state.session ? 'Lock in official lineup' : 'Lock in guest lineup';
}

function assignRole(boardName, playerId, role) {
  const board = state[boardName];
  if (board.locked) return;
  const assignments = board.assignments;
  const currentRole = roleForPlayer(assignments, playerId);
  const displacedPlayer = assignments[role];

  if (currentRole === role) {
    assignments[role] = null;
  } else {
    assignments[role] = playerId;
    if (currentRole) assignments[currentRole] = displacedPlayer || null;
  }

  if (boardName === 'playground') $('playground-result').classList.add('hidden');
  renderBoard(boardName);
}

function toast(message, type = '') {
  const node = document.createElement('div');
  node.className = `toast ${type}`.trim();
  node.textContent = message;
  $('toast-region').appendChild(node);
  setTimeout(() => node.remove(), 4200);
}

function setDailyMessage(message, type = '') {
  const node = $('daily-message');
  node.textContent = message;
  node.className = `board-message ${type}`.trim();
}

function openModal(html) {
  $('modal-content').innerHTML = html;
  $('modal-backdrop').classList.remove('hidden');
}

function closeModal() {
  $('modal-backdrop').classList.add('hidden');
  $('modal-content').innerHTML = '';
}

function showHowItWorks() {
  openModal(`
    <span class="overline">HOW TO PLAY</span>
    <h2 id="modal-title">Start one. Bench one. Cut one.</h2>
    <p>Use the three role buttons beneath each card. Every role can be assigned once, and assigning an occupied role will swap or remove the previous choice.</p>
    <p><strong>Daily:</strong> one official saved lineup per account and date. After you submit, HoopLoop shows the percentage of fans who started, benched, or cut each player.</p>
    <p><strong>Playground:</strong> unlimited generated matchups using Modern, All-Stars, or Random player pools and your selected position filter.</p>
    <button class="primary-button wide" type="button" id="modal-play">Play today</button>`);
  $('modal-play').onclick = () => { closeModal(); document.querySelector('.game-section').scrollIntoView({ behavior: 'smooth' }); };
}

function authModal(mode = 'login', message = '') {
  state.authMode = mode;
  const title = mode === 'register' ? 'Create your HoopLoop account' : 'Log in to HoopLoop';
  openModal(`
    <span class="overline">HOOPLOOP ACCOUNT</span>
    <h2 id="modal-title">${title}</h2>
    <p>${message || 'Save Daily votes and keep your choices connected to your HoopLoop profile.'}</p>
    <div class="auth-tabs">
      <button class="${mode === 'login' ? 'active' : ''}" data-auth-tab="login" type="button">Log in</button>
      <button class="${mode === 'register' ? 'active' : ''}" data-auth-tab="register" type="button">Create account</button>
    </div>
    <form class="auth-form" id="auth-form">
      ${mode === 'register' ? '<label>Username<input id="auth-username" required minlength="3" maxlength="18" pattern="[A-Za-z0-9_]+" autocomplete="username" placeholder="3–18 letters, numbers, or underscores" /></label>' : ''}
      <label>Email<input id="auth-email" type="email" required autocomplete="email" /></label>
      <label>Password<input id="auth-password" type="password" required minlength="6" autocomplete="${mode === 'register' ? 'new-password' : 'current-password'}" /></label>
      <button class="primary-button wide" type="submit">${mode === 'register' ? 'Create account' : 'Log in'}</button>
    </form>`);

  document.querySelectorAll('[data-auth-tab]').forEach((button) => {
    button.onclick = () => authModal(button.dataset.authTab);
  });
  $('auth-form').onsubmit = handleAuthSubmit;
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  if (!db) return toast('Supabase is not configured on this site.', 'error');
  const email = $('auth-email').value.trim();
  const password = $('auth-password').value;
  const button = event.submitter;
  button.disabled = true;
  button.textContent = 'Working…';
  try {
    if (state.authMode === 'register') {
      const username = $('auth-username').value.trim();
      const redirect = `${location.origin}${location.pathname.replace(/start-bench-cut\.html$/, '')}start-bench-cut.html`;
      const { data, error } = await db.auth.signUp({
        email,
        password,
        options: { data: { username }, emailRedirectTo: redirect }
      });
      if (error) throw error;
      closeModal();
      if (data.session) toast('Account created and logged in.', 'success');
      else toast('Account created. Check your email to confirm it.', 'success');
    } else {
      const { error } = await db.auth.signInWithPassword({ email, password });
      if (error) throw error;
      closeModal();
      toast('Logged in.', 'success');
    }
  } catch (error) {
    toast(error.message || 'Account request failed.', 'error');
    button.disabled = false;
    button.textContent = state.authMode === 'register' ? 'Create account' : 'Log in';
  }
}

function accountModal() {
  if (!state.session) return authModal('login');
  const accent = state.profile?.accent_color || window.HoopLoopTheme?.current?.() || 'orange';
  const accentMarkup = window.HoopLoopTheme ? window.HoopLoopTheme.optionsMarkup(accent) : '';
  openModal(`
    <span class="overline">YOUR HOOPLOOP</span>
    <h2 id="modal-title">${escapeHTML(state.profile?.username || 'Signed in')}</h2>
    <p>${escapeHTML(state.session.user.email || '')}</p>
    <p>Your Start, Bench, Cut Daily votes are saved with this account and remain available across devices.</p>
    <div class="accent-picker"><span>HoopLoop accent color</span><div class="accent-options">${accentMarkup}</div></div>
    <button class="secondary-button wide" id="sign-out-button" type="button">Sign out</button>`);
  document.querySelectorAll('[data-accent-choice]').forEach(button => button.onclick = async () => {
    const color = button.dataset.accentChoice;
    window.HoopLoopTheme?.apply(color);
    document.querySelectorAll('[data-accent-choice]').forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
    const { error } = await db.from('profiles').update({ accent_color: color, updated_at: new Date().toISOString() }).eq('id', state.session.user.id);
    if (!error && state.profile) state.profile.accent_color = color;
    toast(error ? 'Color saved on this browser.' : 'Accent color saved.');
  });
  $('sign-out-button').onclick = async () => {
    await db.auth.signOut();
    closeModal();
    toast('Signed out.');
  };
}

async function loadProfile() {
  state.profile = null;
  if (!db || !state.session) return;
  const { data } = await db.from('profiles').select('*').eq('id', state.session.user.id).maybeSingle();
  state.profile = data || null;
  if (state.profile?.accent_color && window.HoopLoopTheme) window.HoopLoopTheme.apply(state.profile.accent_color);
}

function updateAccountUI() {
  const button = $('account-button');
  if (state.session) {
    button.classList.add('logged-in');
    $('account-label').textContent = state.profile?.username || 'Account';
  } else {
    button.classList.remove('logged-in');
    $('account-label').textContent = 'Log in';
  }
  if (!ONLINE_CONFIGURED) $('setup-banner').classList.remove('hidden');
}

async function initializeAuth() {
  if (!db) {
    updateAccountUI();
    return;
  }
  const { data } = await db.auth.getSession();
  state.session = data.session;
  await loadProfile();
  updateAccountUI();

  db.auth.onAuthStateChange(async (_event, session) => {
    state.session = session;
    await loadProfile();
    updateAccountUI();
    await loadDailyPuzzle(state.dailyDate, { keepScroll: true });
  });
}

function dailyGuestKey(dateString) {
  return `hooploop_v8_sbc_guest_${dateString}`;
}

function saveGuestVote() {
  localStorage.setItem(dailyGuestKey(state.dailyDate), JSON.stringify({
    signature: state.dailyPuzzle.signature,
    assignments: state.daily.assignments
  }));
}

function loadGuestVote() {
  try {
    const saved = JSON.parse(localStorage.getItem(dailyGuestKey(state.dailyDate)) || 'null');
    return saved?.signature === state.dailyPuzzle.signature ? saved.assignments : null;
  } catch {
    return null;
  }
}

async function fetchDailyResults() {
  if (!db) return { totalVotes: 0, roles: {}, lineups: [] };
  const { data, error } = await db.rpc('get_sbc_daily_results', {
    p_puzzle_date: state.dailyPuzzle.date,
    p_puzzle_signature: state.dailyPuzzle.signature
  });
  if (error) throw error;
  return data || { totalVotes: 0, roles: {}, lineups: [] };
}

async function fetchMyDailyVote() {
  if (!db || !state.session) return null;
  const { data, error } = await db.rpc('get_my_sbc_daily_vote', { p_puzzle_date: state.dailyPuzzle.date });
  if (error) throw error;
  return data;
}

function setDailyLabels() {
  const puzzle = state.dailyPuzzle;
  const today = todayISO();
  $('daily-date').textContent = puzzle.date === today ? `Today · ${formatDate(puzzle.date, { year: false })}` : formatDate(puzzle.date);
  $('daily-number').textContent = `Daily #${puzzle.number}`;
  $('daily-mode-label').textContent = MODE_LABELS[puzzle.mode];
  $('daily-position-label').textContent = POSITION_LABELS[puzzle.position];
  $('previous-day').disabled = puzzle.date <= SBC_LAUNCH_DATE;
  $('next-day').disabled = puzzle.date >= today;
}

async function loadDailyPuzzle(dateString, options = {}) {
  const launch = SBC_LAUNCH_DATE;
  const today = todayISO();
  if (dateString < launch) dateString = launch;
  if (dateString > today) dateString = today;
  state.dailyDate = dateString;
  state.dailyPuzzle = getDailyPuzzle(dateString);
  state.daily = makeBoardState();
  state.daily.players = state.dailyPuzzle.players;
  state.dailyResults = null;
  $('daily-results').classList.add('hidden');
  setDailyLabels();
  setDailyMessage('Choose a role beneath each player.');
  renderBoard('daily');

  try {
    state.dailyResults = await fetchDailyResults();
    $('daily-vote-count').textContent = `${formatNumber(state.dailyResults.totalVotes)} vote${state.dailyResults.totalVotes === 1 ? '' : 's'}`;

    const myVote = await fetchMyDailyVote();
    if (myVote && myVote.puzzleSignature === state.dailyPuzzle.signature) {
      state.daily.assignments = {
        start: Number(myVote.startPlayerId),
        bench: Number(myVote.benchPlayerId),
        cut: Number(myVote.cutPlayerId)
      };
      state.daily.locked = true;
      setDailyMessage('Your official lineup is saved.', 'success');
      renderBoard('daily');
      showDailyResults(state.dailyResults);
    } else {
      const guest = loadGuestVote();
      if (guest) {
        state.daily.assignments = { ...guest };
        if (!state.session) {
          state.daily.locked = true;
          setDailyMessage('Guest lineup saved on this browser. Log in to count it officially.', 'success');
          renderBoard('daily');
          showDailyResults(state.dailyResults, true);
        } else {
          setDailyMessage('Your guest lineup is ready. Submit it to save your official vote.', 'success');
          renderBoard('daily');
        }
      }
    }
  } catch (error) {
    console.error(error);
    $('daily-vote-count').textContent = 'Offline results';
    setDailyMessage('The matchup is playable, but community voting still needs the Version 8 SQL migration.', 'error');
    $('setup-banner').classList.remove('hidden');
  }

  if (!options.keepScroll) document.querySelector('.game-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function submitDaily() {
  if (!assignmentComplete(state.daily.assignments) || state.daily.locked) return;
  const originalText = $('submit-daily').textContent;
  $('submit-daily').disabled = true;
  $('submit-daily').textContent = 'Saving…';

  try {
    if (db && state.session) {
      const { data, error } = await db.rpc('submit_sbc_daily_vote', {
        p_puzzle_date: state.dailyPuzzle.date,
        p_puzzle_signature: state.dailyPuzzle.signature,
        p_start_player_id: state.daily.assignments.start,
        p_bench_player_id: state.daily.assignments.bench,
        p_cut_player_id: state.daily.assignments.cut
      });
      if (error) throw error;
      const saved = data?.vote;
      if (saved?.puzzleSignature === state.dailyPuzzle.signature) {
        state.daily.assignments = {
          start: Number(saved.startPlayerId),
          bench: Number(saved.benchPlayerId),
          cut: Number(saved.cutPlayerId)
        };
      }
      state.dailyResults = data?.results || await fetchDailyResults();
      state.daily.locked = true;
      localStorage.removeItem(dailyGuestKey(state.dailyDate));
      setDailyMessage(data?.inserted ? 'Your official lineup is locked in.' : 'Your first official lineup remains locked in.', 'success');
      toast(data?.inserted ? 'Official Daily vote saved.' : 'Your original Daily vote was kept.', 'success');
    } else {
      saveGuestVote();
      state.dailyResults = await fetchDailyResults().catch(() => ({ totalVotes: 0, roles: {}, lineups: [] }));
      state.daily.locked = true;
      setDailyMessage('Guest lineup saved on this browser. Create an account to count it officially.', 'success');
      toast('Guest result saved locally. Log in to make it official.');
    }

    $('daily-vote-count').textContent = `${formatNumber(state.dailyResults.totalVotes)} vote${state.dailyResults.totalVotes === 1 ? '' : 's'}`;
    renderBoard('daily');
    showDailyResults(state.dailyResults, !state.session);
  } catch (error) {
    console.error(error);
    toast(error.message || 'The Daily vote could not be saved.', 'error');
    $('submit-daily').disabled = false;
    $('submit-daily').textContent = originalText;
  }
}

function percent(count, total) {
  return total > 0 ? Math.round((Number(count || 0) / total) * 100) : 0;
}

function resultBar(role, count, total) {
  const value = percent(count, total);
  return `<div class="result-bar ${role}">
    <div class="result-bar-label"><span>${ROLE_LABELS[role]}</span><strong>${value}%</strong></div>
    <div class="result-bar-track"><div class="result-bar-fill" style="width:${value}%"></div></div>
  </div>`;
}

function showDailyResults(results, guest = false) {
  const total = Number(results?.totalVotes || 0);
  const assignment = state.daily.assignments;
  const exact = (results?.lineups || []).find((lineup) =>
    Number(lineup.startPlayerId) === Number(assignment.start)
    && Number(lineup.benchPlayerId) === Number(assignment.bench)
    && Number(lineup.cutPlayerId) === Number(assignment.cut));
  $('exact-match-percent').textContent = `${percent(exact?.count || 0, total)}%`;
  $('results-title').textContent = total
    ? guest ? 'Community results — your guest vote is not counted.' : 'Here’s how everyone voted.'
    : 'You are among the first to make the call.';

  $('community-results').innerHTML = state.daily.players.map((player) => {
    const counts = results?.roles?.[String(player.id)] || {};
    return `<article class="community-player">
      <div class="community-player-name"><span>${escapeHTML(initials(player.name))}</span>${escapeHTML(player.name)}</div>
      ${resultBar('start', counts.start, total)}
      ${resultBar('bench', counts.bench, total)}
      ${resultBar('cut', counts.cut, total)}
    </article>`;
  }).join('');
  $('daily-results').classList.remove('hidden');
}

function showArchive() {
  const launch = SBC_LAUNCH_DATE;
  const today = todayISO();
  const days = [];
  let cursor = today;
  while (cursor >= launch && days.length < 365) {
    days.push(cursor);
    cursor = shiftDate(cursor, -1);
  }
  openModal(`
    <span class="overline">DAILY ARCHIVE</span>
    <h2 id="modal-title">Every Start, Bench, Cut</h2>
    <p>Choose any previous Daily. Archived votes remain open, so new players can still make the call and compare results.</p>
    <div class="archive-list">
      ${days.map((date) => {
        const puzzle = getDailyPuzzle(date);
        return `<button class="archive-item ${date === state.dailyDate ? 'active' : ''}" data-archive-date="${date}" type="button">
          <strong>${date === today ? 'Today' : formatDate(date)}</strong>
          <span>#${puzzle.number} · ${MODE_LABELS[puzzle.mode]} · ${POSITION_LABELS[puzzle.position]}</span>
        </button>`;
      }).join('')}
    </div>`);
  document.querySelectorAll('[data-archive-date]').forEach((button) => {
    button.onclick = () => {
      closeModal();
      loadDailyPuzzle(button.dataset.archiveDate);
    };
  });
}

function currentPoolSummary() {
  const pool = poolFor(state.playgroundMode, state.playgroundPosition);
  const unknown = DATA.players.filter((player) => isEligible(player, state.playgroundMode, 'all') && (!player.positionGroups || player.positionGroups.includes('all'))).length;
  $('pool-note').textContent = `${formatNumber(pool.length)} eligible players in this filter.${state.playgroundPosition === 'all' && unknown ? ` ${formatNumber(unknown)} players with unavailable position data remain available in All Positions.` : ''}`;
  $('playground-mode-label').textContent = `${MODE_LABELS[state.playgroundMode].toUpperCase()} · ${POSITION_LABELS[state.playgroundPosition].toUpperCase()}`;
}

function generatePlayground(scroll = false) {
  try {
    state.playground = makeBoardState();
    state.playground.players = selectRandomPlayers(state.playgroundMode, state.playgroundPosition);
    $('playground-result').classList.add('hidden');
    renderBoard('playground');
    currentPoolSummary();
    if (scroll) document.querySelector('.playground-board').scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (error) {
    toast(error.message, 'error');
  }
}

function submitPlayground() {
  if (!assignmentComplete(state.playground.assignments) || state.playground.locked) return;
  state.playground.locked = true;
  renderBoard('playground');
  const names = assignmentNames(state.playground);
  $('playground-result-copy').textContent = `Start ${names.start}, bench ${names.bench}, cut ${names.cut}.`;
  $('playground-result').classList.remove('hidden');
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied to clipboard.', 'success');
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
    toast('Copied to clipboard.', 'success');
  }
}

function shareDaily() {
  const names = assignmentNames(state.daily);
  const exact = $('exact-match-percent').textContent;
  copyText(`HoopLoop Start, Bench, Cut #${state.dailyPuzzle.number}\nSTART: ${names.start}\nBENCH: ${names.bench}\nCUT: ${names.cut}\n${exact} made my exact lineup\n${location.href}`);
}

function sharePlayground() {
  const names = assignmentNames(state.playground);
  copyText(`HoopLoop Start, Bench, Cut\nSTART: ${names.start}\nBENCH: ${names.bench}\nCUT: ${names.cut}\n${location.href}`);
}

function bindControls() {
  $('account-button').onclick = accountModal;
  $('modal-close').onclick = closeModal;
  $('modal-backdrop').addEventListener('click', (event) => { if (event.target === $('modal-backdrop')) closeModal(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModal(); });
  $('how-it-works').onclick = showHowItWorks;
  $('jump-daily').onclick = () => document.querySelector('.game-section').scrollIntoView({ behavior: 'smooth' });
  $('previous-day').onclick = () => loadDailyPuzzle(shiftDate(state.dailyDate, -1));
  $('next-day').onclick = () => loadDailyPuzzle(shiftDate(state.dailyDate, 1));
  $('daily-date-button').onclick = showArchive;
  $('open-archive').onclick = showArchive;
  $('change-daily-date').onclick = showArchive;
  $('submit-daily').onclick = submitDaily;
  $('share-daily').onclick = shareDaily;

  document.querySelectorAll('[data-mode]').forEach((button) => {
    button.onclick = () => {
      document.querySelectorAll('[data-mode]').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      state.playgroundMode = button.dataset.mode;
      currentPoolSummary();
    };
  });
  document.querySelectorAll('[data-position]').forEach((button) => {
    button.onclick = () => {
      document.querySelectorAll('[data-position]').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      state.playgroundPosition = button.dataset.position;
      currentPoolSummary();
    };
  });
  $('generate-matchup').onclick = () => generatePlayground(true);
  $('shuffle-matchup').onclick = () => generatePlayground();
  $('next-matchup').onclick = () => generatePlayground();
  $('submit-playground').onclick = submitPlayground;
  $('share-playground').onclick = sharePlayground;
}

function setBuildStatus() {
  const meta = DATA.meta || {};
  $('active-count').textContent = formatNumber(meta.activeCount);
  $('allstar-count').textContent = formatNumber(meta.allStarCount);
  $('eligible-count').textContent = formatNumber(meta.randomEligibleCount);
  $('build-status').textContent = `Version ${BUILD_VERSION} · ${formatNumber(meta.playerCount)} SBC players · ${ONLINE_CONFIGURED ? 'online voting connected' : 'offline setup mode'}`;
}

async function initialize() {
  bindControls();
  setBuildStatus();
  if (!DATA.players?.length) {
    toast('The Start, Bench, Cut player database did not load.', 'error');
    return;
  }
  currentPoolSummary();
  generatePlayground();
  await initializeAuth();
  await loadDailyPuzzle(state.dailyDate, { keepScroll: true });
}

initialize().catch((error) => {
  console.error(error);
  toast(error.message || 'Start, Bench, Cut could not initialize.', 'error');
});
