'use strict';

const CONFIG = window.HOOPLOOP_CONFIG || {};
const BUILD_VERSION = '7.1.0';
const HINT_INTERVAL_MS = 20000;
const LAUNCH_DATE = CONFIG.LAUNCH_DATE || '2026-08-01';
const DAILY_TIME_ZONE = CONFIG.DAILY_TIME_ZONE || 'America/Chicago';
const ONLINE_CONFIGURED = Boolean(
  window.supabase &&
  /^https:\/\/.+\.supabase\.co$/i.test(String(CONFIG.SUPABASE_URL || '')) &&
  !String(CONFIG.SUPABASE_ANON_KEY || '').includes('PASTE_') &&
  String(CONFIG.SUPABASE_ANON_KEY || '').length > 40
);
const db = ONLINE_CONFIGURED
  ? window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null;

const $ = id => document.getElementById(id);
const qsa = selector => [...document.querySelectorAll(selector)];
const localStore = {
  get(key, fallback = null) {
    try {
      const value = localStorage.getItem(`hooploop-v7-${key}`);
      return value === null ? fallback : JSON.parse(value);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(`hooploop-v7-${key}`, JSON.stringify(value)); } catch { /* storage can be blocked */ }
  },
  remove(key) { try { localStorage.removeItem(`hooploop-v7-${key}`); } catch { /* ignore */ } },
  clear() {
    Object.keys(localStorage)
      .filter(key => key.startsWith('hooploop-v7-'))
      .forEach(key => localStorage.removeItem(key));
  }
};

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '');
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
}
function formatTime(ms) { return (Math.max(0, Number(ms) || 0) / 1000).toFixed(2); }
function initialsFor(username) { return String(username || '?').slice(0, 2).toUpperCase(); }
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function siteBaseUrl() { return window.location.href.split('#')[0].split('?')[0].replace(/[^/]*$/, ''); }
function dateFromKey(key) { return new Date(`${key}T12:00:00Z`); }
function dateKeyFromDate(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: DAILY_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date).reduce((acc, part) => { acc[part.type] = part.value; return acc; }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function todayKey() { return dateKeyFromDate(new Date()); }
function addDays(key, amount) {
  const date = dateFromKey(key);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
function daysBetween(start, end) { return Math.floor((dateFromKey(end) - dateFromKey(start)) / 86400000); }
function prettyDate(key, options = {}) {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: options.short ? 'short' : 'long', day: 'numeric', year: options.year === false ? undefined : 'numeric' }).format(dateFromKey(key));
}
function hashString(input) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) { h ^= input.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function seededRandom(seedText) {
  let seed = hashString(seedText) || 1;
  return () => {
    seed += 0x6D2B79F5;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(items, rng = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const PLAYER_DB = (() => {
  const source = window.HOOPLOOP_PLAYER_DATA || { meta: {}, players: [], officialAliases: [] };
  const byInitials = new Map();

  function deriveInitials(firstName, lastName, displayName) {
    let first = String(firstName || '').trim();
    let last = String(lastName || '').trim();
    const words = String(displayName || '').trim().split(/\s+/).filter(Boolean);
    if (!first && words.length >= 2) first = words[0];
    if (!last && words.length >= 2) last = words[words.length - 1];
    if (!first || !last) return null;
    const firstInitial = first.match(/[A-Za-zÀ-ÖØ-öø-ÿĀ-ž]/u)?.[0];
    const lastInitial = last.match(/[A-Za-zÀ-ÖØ-öø-ÿĀ-ž]/u)?.[0];
    if (!firstInitial || !lastInitial) return null;
    return `${normalizeName(firstInitial).slice(0,1).toUpperCase()}${normalizeName(lastInitial).slice(0,1).toUpperCase()}`;
  }

  function addName(playerId, firstName, lastName, displayName, active, isAlias = false) {
    const key = deriveInitials(firstName, lastName, displayName);
    const normalized = normalizeName(displayName);
    if (!key || !normalized) return;
    if (!byInitials.has(key)) byInitials.set(key, new Map());
    const bucket = byInitials.get(key);
    if (!bucket.has(normalized)) bucket.set(normalized, { playerId, displayName, active: Boolean(active), isAlias });
  }

  source.players.forEach(([id, first, last, display, active]) => addName(id, first, last, display, active));
  source.officialAliases.forEach(alias => addName(alias.playerId, alias.first, alias.last, alias.name, false, true));

  function entriesForKey(key) {
    return [...(byInitials.get(key)?.values() || [])]
      .sort((a,b) => Number(b.active) - Number(a.active) || a.displayName.localeCompare(b.displayName));
  }
  const groups = [...byInitials.keys()].map(key => {
    const entries = entriesForKey(key);
    return { key, initials: [key[0], key[1]], entries, count: entries.length, activeCount: entries.filter(item => item.active).length };
  });

  return {
    meta: source.meta,
    find(initials, submitted) {
      const key = Array.isArray(initials) ? initials.join('').toUpperCase() : String(initials).toUpperCase();
      return byInitials.get(key)?.get(normalizeName(submitted)) || null;
    },
    namesFor(initials) {
      const key = Array.isArray(initials) ? initials.join('').toUpperCase() : String(initials).toUpperCase();
      return entriesForKey(key).map(item => item.displayName);
    },
    group(key) { return groups.find(group => group.key === key) || null; },
    groups(minimum = 3) { return groups.filter(group => group.count >= minimum); }
  };
})();

function hintAnswerForGroup(group, rng = Math.random) {
  const active = group.entries.filter(entry => entry.active && !entry.isAlias);
  const pool = active.length ? active : group.entries.filter(entry => !entry.isAlias);
  return (pool.length ? pool : group.entries)[Math.floor(rng() * (pool.length || group.entries.length))]?.displayName || group.entries[0]?.displayName;
}
function buildHint(name, visibleCount = 2) {
  return String(name || '').split(' ').map(part => {
    const punctuation = part.match(/^[^A-Za-z0-9]*/)?.[0] || '';
    const core = part.slice(punctuation.length);
    const visible = Math.min(core.length, Math.max(1, visibleCount));
    return `${punctuation}${core.slice(0, visible).toUpperCase()}${'_'.repeat(Math.max(0, core.length - visible))}`;
  }).join(' ');
}
function answerReviewMarkup(rounds, heading = 'Other valid answers') {
  const items = (rounds || []).map((round, index) => {
    const key = Array.isArray(round.initials) ? round.initials.join('') : String(round.initials || round.key || '').toUpperCase();
    if (!key) return '';
    const names = PLAYER_DB.namesFor(key);
    const submitted = normalizeName(round.answer || '');
    const chips = names.map(name => {
      const used = submitted && normalizeName(name) === submitted;
      return `<span class="answer-chip${used ? ' answer-chip--used' : ''}"${used ? ' title="Your answer"' : ''}>${escapeHtml(name)}</span>`;
    }).join('');
    return `<details class="answer-review-item"><summary><span><small>Round ${String(index + 1).padStart(2,'0')}</small><strong>${escapeHtml(key)}</strong></span><span>${names.length} valid name${names.length === 1 ? '' : 's'}</span><span class="answer-review-chevron" aria-hidden="true">⌄</span></summary><div class="answer-chips">${chips}</div></details>`;
  }).filter(Boolean).join('');
  if (!items) return '';
  return `<div class="answer-review-header"><h4>${escapeHtml(heading)}</h4><p>Open any round to see every accepted NBA name for those initials. Your submitted answer is highlighted.</p></div><div class="answer-review-list">${items}</div>`;
}
function renderAnswerReview(target, rounds, heading) {
  if (!target) return;
  const markup = answerReviewMarkup(rounds, heading);
  target.innerHTML = markup;
  target.classList.toggle('hidden', !markup);
}
function generateDailyPuzzle(dateKey) {
  const rng = seededRandom(`hooploop-daily-v7:${dateKey}`);
  const candidates = shuffle(PLAYER_DB.groups(5), rng);
  const selected = candidates.slice(0, 3);
  return {
    dateKey,
    number: daysBetween(LAUNCH_DATE, dateKey) + 1,
    rounds: selected.map(group => ({ initials: group.initials, key: group.key, hintAnswer: hintAnswerForGroup(group, rng), answerCount: group.count })),
    signature: selected.map(group => group.key).join('-')
  };
}
function practicePool(difficulty) {
  const all = PLAYER_DB.groups(3);
  const filters = {
    rookie: group => group.count >= 12 && group.activeCount >= 2,
    starter: group => group.count >= 8 && group.activeCount >= 1,
    allstar: group => group.count >= 5 && group.count <= 18,
    mvp: group => group.count >= 3 && group.count <= 7
  };
  const pool = all.filter(filters[difficulty] || filters.starter);
  return pool.length >= 25 ? pool : all;
}
function generatePracticeRounds(difficulty, count) {
  const pool = shuffle(practicePool(difficulty));
  const wanted = Math.max(1, Number(count) || 3);
  const rounds = [];
  for (let i = 0; i < wanted; i += 1) {
    const group = pool[i % pool.length];
    rounds.push({ initials: group.initials, key: group.key, hintAnswer: hintAnswerForGroup(group), answerCount: group.count });
  }
  return rounds;
}
function generateRaceRounds() {
  const pool = shuffle(PLAYER_DB.groups(5).filter(group => group.activeCount >= 1 || group.count >= 8));
  return pool.slice(0,3).map(group => ({ initials: group.initials.join(''), hintAnswer: hintAnswerForGroup(group), answerCount: group.count }));
}

const els = {
  setupBanner: $('setup-banner'), setupHelp: $('setup-help-button'), accountButton: $('account-button'), accountLabel: $('account-label'), accountCta: $('account-cta'),
  totalTimer: $('total-timer'), roundTimer: $('round-timer'), roundLabel: $('round-label'), puzzleLabel: $('puzzle-label'), gameTitle: $('game-title'), modeBadge: $('mode-badge'),
  startScreen: $('start-screen'), playScreen: $('play-screen'), resultScreen: $('result-screen'), startTitle: $('start-title'), startCopy: $('start-copy'), guestNote: $('guest-note'), startGame: $('start-game-button'),
  initials: $('initials'), progress: $('round-progress'), answerForm: $('answer-form'), input: $('player-answer'), answerEntry: document.querySelector('#answer-form .answer-entry'), feedback: $('feedback'), hint: $('hint-button'), hintPattern: $('hint-pattern'), giveUp: $('give-up-button'),
  resultKicker: $('result-kicker'), resultTime: $('result-time'), resultMessage: $('result-message'), splitList: $('split-list'), sessionSummary: $('session-summary'), revealedAnswers: $('revealed-answers'), resultPrimary: $('result-primary-button'), resultReplay: $('result-replay-button'),
  leaderboardRows: $('leaderboard-rows'), archiveGrid: $('archive-grid'), archiveMore: $('archive-more-button'), practiceStats: $('practice-stats'), practiceNote: $('practice-record-note'),
  modalBackdrop: $('modal-backdrop'), modalContent: $('modal-content'), toastRegion: $('toast-region'),
  raceOverlay: $('race-overlay'), raceStatus: $('race-status'), raceCountdown: $('race-countdown'), raceGame: $('race-game'), raceFinish: $('race-finish'), raceYouName: $('race-you-name'), raceYouAvatar: $('race-you-avatar'), raceOpponentName: $('race-opponent-name'), raceOpponentAvatar: $('race-opponent-avatar'), raceYouPips: $('race-you-pips'), raceOpponentPips: $('race-opponent-pips'), raceRoundLabel: $('race-round-label'), raceRoundTime: $('race-round-time'), raceInitials: $('race-initials'), raceHintPattern: $('race-hint-pattern'), raceAnswerForm: $('race-answer-form'), raceAnswer: $('race-answer'), raceFeedback: $('race-feedback'), raceHint: $('race-hint-button'), raceResultKicker: $('race-result-kicker'), raceResultTitle: $('race-result-title'), raceResultCopy: $('race-result-copy'), raceAnswerReview: $('race-answer-review'), inviteCount: $('invite-count')
};

const state = {
  session: null,
  selectedDate: todayKey() < LAUNCH_DATE ? LAUNCH_DATE : todayKey(),
  archiveCount: 9,
  leaderboardScope: 'global',
  user: null,
  profile: null,
  ownScores: new Map(),
  pendingDaily: localStore.get('pending-daily'),
  animation: null,
  leaderboardChannel: null,
  friendsCache: [],
  race: null,
  raceChannel: null,
  inviteChannel: null,
  practiceConfig: { difficulty: 'rookie', length: '3', hints: true }
};

function toast(title, message = '', type = '') {
  const node = document.createElement('div');
  node.className = `toast ${type}`.trim();
  node.innerHTML = `<strong>${escapeHtml(title)}</strong>${message ? `<span>${escapeHtml(message)}</span>` : ''}`;
  els.toastRegion.appendChild(node);
  setTimeout(() => node.remove(), 4300);
}
function setScreen(screen) {
  els.startScreen.classList.toggle('hidden', screen !== 'start');
  els.playScreen.classList.toggle('hidden', screen !== 'play');
  els.resultScreen.classList.toggle('hidden', screen !== 'result');
}
function stopAnimation() { if (state.animation) cancelAnimationFrame(state.animation); state.animation = null; }
function currentRound() { return state.session?.rounds[state.session.roundIndex] || null; }
function renderProgress() {
  els.progress.innerHTML = '';
  const count = state.session?.rounds.length || 3;
  for (let i = 0; i < count; i += 1) {
    const bar = document.createElement('span');
    if (i < state.session.roundIndex) bar.className = 'done';
    else if (i === state.session.roundIndex) bar.className = 'current';
    els.progress.appendChild(bar);
  }
}
function renderAccount() {
  els.accountLabel.textContent = state.profile?.username || 'Log in';
  els.accountCta.textContent = state.profile ? 'Open your profile' : 'Create a free account';
  els.guestNote.textContent = state.profile
    ? `Signed in as ${state.profile.username}. Your first daily completion is saved online.`
    : 'Playing as guest. Create an account to save your result online.';
}
function renderBuildStatus() {
  const count = Number(PLAYER_DB.meta.playerCount || 0).toLocaleString();
  $('build-status').textContent = `Version ${BUILD_VERSION} · ${count} players · ${ONLINE_CONFIGURED ? 'online backend connected' : 'offline setup mode'}`;
  els.setupBanner.classList.toggle('hidden', ONLINE_CONFIGURED);
}
function puzzleForSelectedDate() { return generateDailyPuzzle(state.selectedDate); }
async function ownScoreForDate(dateKey) {
  if (!db || !state.user) return null;
  if (state.ownScores.has(dateKey)) return state.ownScores.get(dateKey);
  const { data, error } = await db.from('daily_scores').select('*').eq('user_id', state.user.id).eq('puzzle_date', dateKey).maybeSingle();
  if (error) { console.warn(error); return null; }
  state.ownScores.set(dateKey, data || null);
  return data || null;
}
async function renderPuzzleHeader() {
  const puzzle = puzzleForSelectedDate();
  const isToday = state.selectedDate === todayKey();
  els.puzzleLabel.textContent = `${isToday ? 'DAILY' : 'ARCHIVE'} #${puzzle.number} · ${prettyDate(state.selectedDate, { short: true, year: false }).toUpperCase()}`;
  els.gameTitle.textContent = 'Name Rush';
  els.modeBadge.textContent = 'DAILY';
  els.totalTimer.textContent = '0.00';
  els.roundLabel.textContent = 'Ready when you are';
  els.startTitle.textContent = isToday ? 'Today’s challenge is waiting.' : `${prettyDate(state.selectedDate)} challenge.`;
  els.startCopy.textContent = 'Everyone receives the same three initial combinations.';
  els.startGame.disabled = false;
  els.startGame.textContent = isToday ? 'Start daily' : 'Play archive puzzle';
  setScreen('start');
  if (state.user) {
    const score = await ownScoreForDate(state.selectedDate);
    if (score) {
      els.startCopy.textContent = `Your official score is ${formatTime(score.time_ms)} seconds. You can still replay this puzzle in Practice Mode.`;
      els.startGame.textContent = 'View saved result';
    }
  }
}

function startSession({ mode, rounds, difficulty = null, endless = false, hintsEnabled = true }) {
  stopAnimation();
  state.session = {
    mode, rounds: [...rounds], difficulty, endless, hintsEnabled,
    startedAt: performance.now(), roundStartedAt: performance.now(), roundIndex: 0,
    elapsedMs: 0, roundMs: 0, splits: [], hintsUsed: 0, hintUsedThisRound: false,
    correctCount: 0, skippedCount: 0, invalid: false, pendingSave: false
  };
  els.modeBadge.textContent = mode.toUpperCase();
  els.gameTitle.textContent = mode === 'practice' ? 'Practice' : 'Name Rush';
  els.giveUp.textContent = mode === 'daily' ? 'Give up' : endless ? 'End session' : 'Skip round';
  setScreen('play');
  renderRound();
  state.animation = requestAnimationFrame(tickSession);
}
async function startDaily() {
  const score = await ownScoreForDate(state.selectedDate);
  if (score) { showSavedDaily(score); return; }
  const puzzle = puzzleForSelectedDate();
  startSession({ mode: 'daily', rounds: puzzle.rounds, hintsEnabled: true });
}
function startPracticeFromConfig() {
  const lengthValue = state.practiceConfig.length;
  const endless = lengthValue === 'endless';
  const count = endless ? 25 : Number(lengthValue);
  const rounds = generatePracticeRounds(state.practiceConfig.difficulty, count);
  document.querySelector('.game-shell').scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => startSession({ mode: 'practice', rounds, difficulty: state.practiceConfig.difficulty, endless, hintsEnabled: state.practiceConfig.hints }), 250);
}
function renderRound() {
  const session = state.session;
  const round = currentRound();
  session.roundStartedAt = performance.now();
  session.roundMs = 0;
  session.hintUsedThisRound = false;
  els.roundLabel.textContent = session.endless ? `Round ${session.roundIndex + 1} · Endless` : `Round ${session.roundIndex + 1} of ${session.rounds.length}`;
  els.initials.children[0].textContent = round.initials[0];
  els.initials.children[1].textContent = round.initials[1];
  els.input.value = '';
  els.feedback.textContent = '';
  els.feedback.classList.remove('correct');
  els.hintPattern.textContent = '';
  els.hintPattern.classList.add('hidden');
  els.hint.disabled = true;
  els.hint.classList.toggle('hidden', !session.hintsEnabled);
  els.hint.innerHTML = '<span aria-hidden="true">◔</span> Hint in 20s';
  renderProgress();
  requestAnimationFrame(() => els.input.focus());
}
function tickSession(now) {
  const session = state.session;
  if (!session) return;
  session.elapsedMs = now - session.startedAt;
  session.roundMs = now - session.roundStartedAt;
  els.totalTimer.textContent = formatTime(session.elapsedMs);
  els.roundTimer.textContent = `${formatTime(session.roundMs)}s`;
  if (session.hintsEnabled && !session.hintUsedThisRound) {
    const remaining = Math.max(0, Math.ceil((HINT_INTERVAL_MS - session.roundMs) / 1000));
    els.hint.disabled = remaining > 0;
    els.hint.innerHTML = remaining > 0 ? `<span aria-hidden="true">◔</span> Hint in ${remaining}s` : '<span aria-hidden="true">◔</span> Use hint';
  }
  state.animation = requestAnimationFrame(tickSession);
}
function useSessionHint() {
  const session = state.session;
  if (!session || session.roundMs < HINT_INTERVAL_MS || session.hintUsedThisRound) return;
  session.hintUsedThisRound = true;
  session.hintsUsed += 1;
  els.hintPattern.textContent = buildHint(currentRound().hintAnswer, 2);
  els.hintPattern.classList.remove('hidden');
  els.hint.disabled = true;
  els.hint.textContent = 'Hint used';
}
function flashAnswer(correct, message) {
  els.feedback.textContent = message;
  els.feedback.classList.toggle('correct', correct);
  if (correct) {
    els.initials.classList.add('success');
    setTimeout(() => els.initials.classList.remove('success'), 420);
  } else {
    els.answerEntry.classList.remove('shake');
    void els.answerEntry.offsetWidth;
    els.answerEntry.classList.add('shake');
  }
}
function submitSessionAnswer(event) {
  event.preventDefault();
  const session = state.session;
  if (!session) return;
  const submitted = els.input.value.trim();
  if (!submitted) { flashAnswer(false, 'Type a full player name.'); return; }
  const match = PLAYER_DB.find(currentRound().initials, submitted);
  if (!match) { flashAnswer(false, 'That exact NBA name does not match these initials.'); return; }
  flashAnswer(true, `Correct — ${match.displayName}`);
  session.correctCount += 1;
  session.splits.push({
    initials: currentRound().initials.join(''), answer: match.displayName,
    timeMs: Math.round(session.roundMs), hinted: session.hintUsedThisRound, skipped: false
  });
  setTimeout(advanceSessionRound, 350);
}
function advanceSessionRound() {
  const session = state.session;
  if (!session) return;
  session.roundIndex += 1;
  if (session.endless && session.roundIndex >= session.rounds.length - 3) {
    session.rounds.push(...generatePracticeRounds(session.difficulty, 10));
  }
  if (!session.endless && session.roundIndex >= session.rounds.length) finishSession();
  else renderRound();
}
function sessionGiveUp() {
  const session = state.session;
  if (!session) return;
  if (session.mode === 'daily') {
    if (!window.confirm('Give up this daily attempt? Your result will not enter the leaderboard.')) return;
    session.invalid = true;
    session.skippedCount += 1;
    session.splits.push({ initials: currentRound().initials.join(''), answer: null, timeMs: Math.round(session.roundMs), hinted: session.hintUsedThisRound, skipped: true });
    finishSession(true);
    return;
  }
  if (session.endless) {
    if (session.correctCount === 0 || window.confirm('End this endless practice session?')) finishSession();
    return;
  }
  session.skippedCount += 1;
  session.splits.push({ initials: currentRound().initials.join(''), answer: null, timeMs: Math.round(session.roundMs), hinted: session.hintUsedThisRound, skipped: true });
  flashAnswer(false, 'Round skipped. All valid answers will be available in your review.');
  setTimeout(advanceSessionRound, 650);
}
async function finishSession(gaveUp = false) {
  stopAnimation();
  const session = state.session;
  if (!session) return;
  session.elapsedMs = performance.now() - session.startedAt;
  setScreen('result');
  els.totalTimer.textContent = formatTime(session.elapsedMs);
  els.resultTime.textContent = `${formatTime(session.elapsedMs)} seconds`;
  els.splitList.innerHTML = session.splits.map((split, index) => `<div class="split-row"><span>${String(index+1).padStart(2,'0')}</span><strong>${escapeHtml(split.initials)} · ${escapeHtml(split.answer || 'Skipped')}</strong><span>${formatTime(split.timeMs)}s</span></div>`).join('');
  els.sessionSummary.classList.add('hidden');
  els.revealedAnswers.classList.add('hidden');

  if (session.mode === 'daily') {
    els.resultKicker.textContent = gaveUp ? 'Daily ended' : 'Daily complete';
    if (gaveUp || session.invalid) {
      els.resultMessage.textContent = 'Giving up ends the official attempt without a leaderboard score. You can review every accepted answer below.';
    } else {
      const run = {
        puzzleDate: state.selectedDate,
        signature: puzzleForSelectedDate().signature,
        timeMs: Math.round(session.elapsedMs), hintsUsed: session.hintsUsed, splits: session.splits
      };
      if (state.user && db) await saveDailyRun(run);
      else {
        state.pendingDaily = run;
        localStore.set('pending-daily', run);
        els.resultMessage.textContent = 'Create or log into an account to save this result online.';
      }
    }
    els.resultPrimary.textContent = state.user ? 'View leaderboard' : 'Save this score';
    els.resultPrimary.onclick = () => state.user ? openLeaderboardModal() : openAccountModal('create');
    els.resultReplay.textContent = 'Play practice';
    els.resultReplay.onclick = () => document.querySelector('#practice').scrollIntoView({ behavior:'smooth' });
  } else {
    els.resultKicker.textContent = session.endless ? 'Endless session complete' : `${session.difficulty} practice complete`;
    const completed = session.correctCount + session.skippedCount;
    const average = session.correctCount ? session.splits.filter(split => !split.skipped).reduce((sum, split) => sum + split.timeMs, 0) / session.correctCount : 0;
    const best = session.splits.filter(split => !split.skipped).reduce((min, split) => Math.min(min, split.timeMs), Infinity);
    els.resultMessage.textContent = `${session.correctCount} solved, ${session.skippedCount} skipped, ${session.hintsUsed} hints used.`;
    els.sessionSummary.innerHTML = `<div class="stat-grid"><div><strong>${session.correctCount}/${completed}</strong><span>solved</span></div><div><strong>${average ? formatTime(average) : '--'}</strong><span>average seconds</span></div><div><strong>${Number.isFinite(best) ? formatTime(best) : '--'}</strong><span>fastest round</span></div><div><strong>${session.hintsUsed}</strong><span>hints</span></div></div>`;
    els.sessionSummary.classList.remove('hidden');
    await savePracticeSession({ difficulty: session.difficulty, roundCount: completed, correctCount: session.correctCount, timeMs: Math.round(session.elapsedMs), bestRoundMs: Number.isFinite(best) ? Math.round(best) : null, hintsUsed: session.hintsUsed });
    els.resultPrimary.textContent = 'Practice records';
    els.resultPrimary.onclick = () => document.querySelector('#practice').scrollIntoView({ behavior:'smooth' });
    els.resultReplay.textContent = 'Run it back';
    els.resultReplay.onclick = startPracticeFromConfig;
  }
  renderAnswerReview(els.revealedAnswers, session.splits);
}
async function saveDailyRun(run) {
  const { data, error } = await db.rpc('submit_daily_score', {
    p_puzzle_date: run.puzzleDate,
    p_puzzle_signature: run.signature,
    p_time_ms: run.timeMs,
    p_hints_used: run.hintsUsed,
    p_round_splits: run.splits
  });
  if (error) {
    els.resultMessage.textContent = error.message.includes('already') ? 'Your official score for this day was already saved.' : `Score could not be saved: ${error.message}`;
    toast('Score not saved', error.message, 'error');
    return;
  }
  state.ownScores.set(run.puzzleDate, data);
  state.pendingDaily = null;
  localStore.remove('pending-daily');
  els.resultMessage.textContent = 'Your official score is now on the online leaderboard.';
  toast('Score saved', `${formatTime(run.timeMs)} seconds`, 'success');
  await loadLeaderboard();
  renderArchive();
}
function showSavedDaily(score) {
  stopAnimation();
  state.session = null;
  setScreen('result');
  els.resultKicker.textContent = 'Official score saved';
  els.resultTime.textContent = `${formatTime(score.time_ms)} seconds`;
  els.resultMessage.textContent = 'Only your first official completion is ranked. Practice mode remains unlimited.';
  const splits = Array.isArray(score.round_splits) ? score.round_splits : [];
  els.splitList.innerHTML = splits.map((split,index) => `<div class="split-row"><span>${String(index+1).padStart(2,'0')}</span><strong>${escapeHtml(split.initials)} · ${escapeHtml(split.answer || 'Completed')}</strong><span>${formatTime(split.timeMs)}s</span></div>`).join('');
  els.resultPrimary.textContent = 'View leaderboard';
  els.resultPrimary.onclick = openLeaderboardModal;
  els.resultReplay.textContent = 'Play practice';
  els.resultReplay.onclick = () => document.querySelector('#practice').scrollIntoView({ behavior:'smooth' });
  els.sessionSummary.classList.add('hidden');
  renderAnswerReview(els.revealedAnswers, splits);
}

function renderLeaderboardRows(entries, target = els.leaderboardRows, limit = 8) {
  target.innerHTML = '';
  if (!entries.length) { target.innerHTML = '<div class="empty-row">No official scores yet. The first completed run can take the top spot.</div>'; return; }
  entries.slice(0, limit).forEach((entry,index) => {
    const username = entry.profiles?.username || entry.username || 'Player';
    const row = document.createElement('div');
    row.className = `leaderboard-row${state.profile?.username?.toLowerCase() === String(username).toLowerCase() ? ' current-user-row' : ''}`;
    row.innerHTML = `<span class="rank-number">${String(index+1).padStart(2,'0')}</span><span class="player-cell"><span class="avatar">${escapeHtml(initialsFor(username))}</span><span><strong>${escapeHtml(username)}</strong><small>${entry.hints_used ? `${entry.hints_used} hint${entry.hints_used === 1 ? '' : 's'} used` : 'No hints'}</small></span></span><span class="time-cell">${formatTime(entry.time_ms)}<small>s</small></span>`;
    target.appendChild(row);
  });
}
async function getFriendIds() {
  if (!db || !state.user) return [];
  const { data, error } = await db.from('friendships').select('requester_id,addressee_id').eq('status','accepted');
  if (error) return [];
  return [...new Set((data || []).map(row => row.requester_id === state.user.id ? row.addressee_id : row.requester_id))];
}
async function loadLeaderboard(limit = 50) {
  if (!db) { renderLeaderboardRows([]); return []; }
  els.leaderboardRows.innerHTML = '<div class="empty-row">Loading online scores…</div>';
  let query = db.from('daily_scores').select('user_id,time_ms,hints_used,submitted_at,profiles(username)').eq('puzzle_date', state.selectedDate).order('time_ms', { ascending:true }).order('submitted_at', { ascending:true }).limit(limit);
  if (state.leaderboardScope === 'friends') {
    if (!state.user) { renderLeaderboardRows([]); return []; }
    const ids = [state.user.id, ...(await getFriendIds())];
    query = query.in('user_id', ids);
  }
  const { data, error } = await query;
  if (error) { renderLeaderboardRows([]); toast('Leaderboard error', error.message, 'error'); return []; }
  renderLeaderboardRows(data || []);
  return data || [];
}
function subscribeLeaderboard() {
  if (!db) return;
  if (state.leaderboardChannel) db.removeChannel(state.leaderboardChannel);
  state.leaderboardChannel = db.channel(`daily-${state.selectedDate}`)
    .on('postgres_changes', { event:'INSERT', schema:'public', table:'daily_scores', filter:`puzzle_date=eq.${state.selectedDate}` }, loadLeaderboard)
    .subscribe();
}
async function openLeaderboardModal() {
  const entries = await loadLeaderboard(200);
  openModal(`<span class="overline">${prettyDate(state.selectedDate).toUpperCase()}</span><h2>Full leaderboard.</h2><p>Official first completions, sorted by exact time and then submission order.</p><div class="modal-leaderboard" id="modal-leaderboard"></div>`);
  renderLeaderboardRows(entries, $('modal-leaderboard'), 200);
}

function archiveDates() {
  const today = todayKey() < LAUNCH_DATE ? LAUNCH_DATE : todayKey();
  const maxDays = daysBetween(LAUNCH_DATE, today) + 1;
  const count = Math.min(state.archiveCount, maxDays);
  return Array.from({ length: count }, (_, index) => addDays(today, -index));
}
async function renderArchive() {
  els.archiveGrid.innerHTML = '';
  for (const dateKey of archiveDates()) {
    const puzzle = generateDailyPuzzle(dateKey);
    const score = state.ownScores.get(dateKey);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `archive-card${dateKey === state.selectedDate ? ' active' : ''}`;
    card.innerHTML = `<div class="archive-card__top"><span class="archive-card__date">${escapeHtml(prettyDate(dateKey))}</span><span class="archive-card__status">${score ? `${formatTime(score.time_ms)}s` : dateKey === todayKey() ? 'Today' : 'Open'}</span></div><h3>Daily #${puzzle.number}</h3><p>${puzzle.rounds.map(round => round.key).join(' · ')}</p><span class="archive-card__arrow">↗</span>`;
    card.addEventListener('click', async () => {
      state.selectedDate = dateKey;
      if (state.user) await ownScoreForDate(dateKey);
      await renderPuzzleHeader();
      await loadLeaderboard();
      subscribeLeaderboard();
      renderArchive();
      document.querySelector('.game-shell').scrollIntoView({ behavior:'smooth', block:'center' });
    });
    els.archiveGrid.appendChild(card);
  }
}

async function savePracticeSession(record) {
  const local = localStore.get('practice-sessions', []);
  local.push({ ...record, createdAt: new Date().toISOString() });
  localStore.set('practice-sessions', local.slice(-250));
  if (db && state.user) {
    const { error } = await db.from('practice_sessions').insert({
      user_id: state.user.id, difficulty: record.difficulty, round_count: record.roundCount,
      correct_count: record.correctCount, time_ms: record.timeMs, best_round_ms: record.bestRoundMs, hints_used: record.hintsUsed
    });
    if (error) toast('Practice record not synced', error.message, 'error');
  }
  await loadPracticeStats();
}
async function loadPracticeStats() {
  let sessions = localStore.get('practice-sessions', []);
  if (db && state.user) {
    const { data } = await db.from('practice_sessions').select('*').eq('user_id', state.user.id).order('created_at', { ascending:false }).limit(500);
    if (data) sessions = data.map(row => ({ roundCount:row.round_count, correctCount:row.correct_count, timeMs:row.time_ms, bestRoundMs:row.best_round_ms }));
  }
  const totalSolved = sessions.reduce((sum,item) => sum + Number(item.correctCount || 0), 0);
  const bestAverage = sessions.reduce((best,item) => item.correctCount ? Math.min(best, item.timeMs / item.correctCount) : best, Infinity);
  const fastest = sessions.reduce((best,item) => item.bestRoundMs ? Math.min(best,item.bestRoundMs) : best, Infinity);
  const values = [sessions.length, Number.isFinite(bestAverage) ? `${formatTime(bestAverage)}s` : '--', Number.isFinite(fastest) ? `${formatTime(fastest)}s` : '--', totalSolved];
  [...els.practiceStats.children].forEach((node,index) => { const strong = node.querySelector('strong'); if (strong) strong.textContent = values[index]; });
  els.practiceNote.textContent = state.user ? 'Synced to your HoopLoop account.' : 'Guest records are saved only in this browser. Log in to sync across devices.';
}

function openModal(html) { els.modalContent.innerHTML = html; els.modalBackdrop.classList.remove('hidden'); document.body.classList.add('modal-open'); }
function closeModal() { els.modalBackdrop.classList.add('hidden'); document.body.classList.remove('modal-open'); }
function openSetupHelp() {
  openModal(`<span class="overline">ONE-TIME ONLINE SETUP</span><h2>Connect Supabase.</h2><p>The code is ready, but GitHub Pages cannot create a database by itself.</p><ol class="setup-list"><li>Create a free Supabase project.</li><li>Run <code>supabase/setup.sql</code> in its SQL Editor.</li><li>Paste the Project URL and anon key into <code>config.js</code>.</li><li>Push the changed files to GitHub.</li></ol><p class="modal-note">The detailed screenshots and checks are in ONLINE-SETUP.md.</p>`);
}
function openHowTo() {
  openModal(`<span class="overline">HOW NAME RUSH WORKS</span><h2>Any matching player counts.</h2><p>Type the full official NBA name of any player matching the displayed first and last initials. Capitalization, spacing, punctuation, and accent marks are normalized; misspellings are not.</p><div class="account-benefits light-benefits"><div><span>01</span><strong>Daily</strong><p>Three shared initials and one official leaderboard score per account.</p></div><div><span>02</span><strong>Practice</strong><p>Custom difficulty, session length, hints, and personal records.</p></div><div><span>03</span><strong>Race</strong><p>First player through the same three initials wins. Hints grow every 20 seconds and give-up is disabled.</p></div></div>`);
}

async function loadProfile() {
  if (!db || !state.user) { state.profile = null; renderAccount(); return; }
  const { data, error } = await db.from('profiles').select('*').eq('id', state.user.id).single();
  if (error) { console.warn(error); state.profile = null; }
  else state.profile = data;
  renderAccount();
}
async function checkUsernameAvailable(username) {
  const { data } = await db.from('profiles').select('id').eq('username', username).maybeSingle();
  return !data;
}
function accountFormHtml(mode) {
  if (mode === 'login') return `<form class="modal-form" id="auth-form"><label for="auth-email">Email</label><input id="auth-email" type="email" required autocomplete="email" /><label for="auth-password">Password</label><input id="auth-password" type="password" minlength="8" required autocomplete="current-password" /><div id="auth-message" class="form-error"></div><button class="primary-button" type="submit">Log in</button><button class="text-button" id="forgot-password" type="button">Forgot password?</button></form>`;
  return `<form class="modal-form" id="auth-form"><label for="auth-username">Username</label><input id="auth-username" maxlength="18" pattern="[A-Za-z0-9_]{3,18}" required autocomplete="username" placeholder="Evan1n0" /><label for="auth-email">Email</label><input id="auth-email" type="email" required autocomplete="email" /><label for="auth-password">Password</label><input id="auth-password" type="password" minlength="8" required autocomplete="new-password" /><div id="auth-message" class="form-error"></div><button class="primary-button" type="submit">Create account</button></form>`;
}
function openAccountModal(initialMode = 'create') {
  if (!ONLINE_CONFIGURED) { openSetupHelp(); return; }
  let mode = initialMode;
  const render = () => {
    openModal(`<span class="overline">HOOPLOOP ACCOUNT</span><h2>${mode === 'create' ? 'Join the leaderboard.' : 'Welcome back.'}</h2><p>Use an email, password, and unique public username.</p><div class="modal-tabs"><button class="modal-tab ${mode === 'create' ? 'active' : ''}" id="create-tab" type="button">Create account</button><button class="modal-tab ${mode === 'login' ? 'active' : ''}" id="login-tab" type="button">Log in</button></div>${accountFormHtml(mode)}<p class="modal-note">Passwords are handled by Supabase Auth. HoopLoop never stores your password in its own tables.</p>`);
    $('create-tab').onclick = () => { mode = 'create'; render(); };
    $('login-tab').onclick = () => { mode = 'login'; render(); };
    $('auth-form').onsubmit = async event => {
      event.preventDefault();
      const message = $('auth-message');
      message.textContent = '';
      const email = $('auth-email').value.trim();
      const password = $('auth-password').value;
      const submit = event.submitter;
      submit.disabled = true;
      submit.textContent = mode === 'create' ? 'Creating…' : 'Logging in…';
      try {
        if (mode === 'create') {
          const username = $('auth-username').value.trim();
          if (!/^[A-Za-z0-9_]{3,18}$/.test(username)) throw new Error('Use 3–18 letters, numbers, or underscores for the username.');
          if (!(await checkUsernameAvailable(username))) throw new Error('That username is already taken.');
          const { data, error } = await db.auth.signUp({ email, password, options: { data: { username }, emailRedirectTo: siteBaseUrl() } });
          if (error) throw error;
          if (!data.session) {
            message.className = 'form-success';
            message.textContent = 'Account created. Check your email to confirm it, then log in.';
            submit.textContent = 'Email sent';
            return;
          }
        } else {
          const { error } = await db.auth.signInWithPassword({ email, password });
          if (error) throw error;
        }
        closeModal();
      } catch (error) {
        message.className = 'form-error';
        message.textContent = error.message;
        submit.disabled = false;
        submit.textContent = mode === 'create' ? 'Create account' : 'Log in';
      }
    };
    const forgot = $('forgot-password');
    if (forgot) forgot.onclick = openForgotPassword;
  };
  render();
}
function openForgotPassword() {
  openModal(`<span class="overline">PASSWORD RESET</span><h2>Check your inbox.</h2><p>Enter your account email and Supabase will send a secure reset link.</p><form class="modal-form" id="reset-form"><label for="reset-email">Email</label><input id="reset-email" type="email" required /><div id="reset-message" class="form-error"></div><button class="primary-button" type="submit">Send reset link</button></form>`);
  $('reset-form').onsubmit = async event => {
    event.preventDefault();
    const { error } = await db.auth.resetPasswordForEmail($('reset-email').value.trim(), { redirectTo: siteBaseUrl() });
    $('reset-message').className = error ? 'form-error' : 'form-success';
    $('reset-message').textContent = error ? error.message : 'Reset email sent.';
  };
}
function openPasswordUpdate() {
  openModal(`<span class="overline">NEW PASSWORD</span><h2>Choose a new password.</h2><form class="modal-form" id="password-update-form"><label for="new-password">New password</label><input id="new-password" type="password" minlength="8" required /><div id="password-update-message" class="form-error"></div><button class="primary-button" type="submit">Update password</button></form>`);
  $('password-update-form').onsubmit = async event => {
    event.preventDefault();
    const { error } = await db.auth.updateUser({ password: $('new-password').value });
    $('password-update-message').className = error ? 'form-error' : 'form-success';
    $('password-update-message').textContent = error ? error.message : 'Password updated. You can close this window.';
  };
}
async function openProfileModal() {
  if (!state.profile) { openAccountModal('login'); return; }
  const [{ count: scoreCount }, { data: practice }, friendIds] = await Promise.all([
    db.from('daily_scores').select('*', { count:'exact', head:true }).eq('user_id', state.user.id),
    db.from('practice_sessions').select('correct_count,best_round_ms').eq('user_id', state.user.id).limit(500),
    getFriendIds()
  ]);
  const bestPractice = (practice || []).reduce((best,row) => row.best_round_ms ? Math.min(best,row.best_round_ms) : best, Infinity);
  openModal(`<span class="overline">PLAYER PROFILE</span><h2>${escapeHtml(state.profile.username)}</h2><p>${escapeHtml(state.user.email || '')}</p><div class="profile-grid"><div><strong>${scoreCount || 0}</strong><span>daily scores</span></div><div><strong>${friendIds.length}</strong><span>friends</span></div><div><strong>${Number.isFinite(bestPractice) ? formatTime(bestPractice) : '--'}</strong><span>practice best</span></div></div><div class="inline-actions"><button class="primary-button" id="profile-friends" type="button">Friends</button><button class="secondary-button" id="profile-races" type="button">Race invites</button></div><button class="secondary-button wide" id="logout-button" style="margin-top:10px" type="button">Log out</button><button class="danger-text-button wide" id="clear-local-button" type="button">Clear local Version 7 practice data</button>`);
  $('profile-friends').onclick = openFriendsModal;
  $('profile-races').onclick = openRaceInvitations;
  $('logout-button').onclick = async () => { await db.auth.signOut(); closeModal(); };
  $('clear-local-button').onclick = () => { if (window.confirm('Clear local guest practice records and any pending guest score?')) { localStore.clear(); state.pendingDaily = null; loadPracticeStats(); toast('Local data cleared'); } };
}
async function trySavePendingDaily() {
  const pending = localStore.get('pending-daily');
  if (!pending || !state.user || !db) return;
  const existing = await ownScoreForDate(pending.puzzleDate);
  if (existing) { localStore.remove('pending-daily'); state.pendingDaily = null; return; }
  await saveDailyRun(pending);
}

async function loadFriendships() {
  if (!db || !state.user) return [];
  const { data, error } = await db.from('friendships').select('id,status,requester_id,addressee_id,created_at,requester:profiles!friendships_requester_id_fkey(id,username),addressee:profiles!friendships_addressee_id_fkey(id,username)').order('created_at', { ascending:false });
  if (error) { toast('Friends error', error.message, 'error'); return []; }
  state.friendsCache = data || [];
  return state.friendsCache;
}
function friendshipOther(row) { return row.requester_id === state.user.id ? row.addressee : row.requester; }
async function openFriendsModal() {
  if (!state.user) { openAccountModal('login'); return; }
  const rows = await loadFriendships();
  const incoming = rows.filter(row => row.status === 'pending' && row.addressee_id === state.user.id);
  const outgoing = rows.filter(row => row.status === 'pending' && row.requester_id === state.user.id);
  const accepted = rows.filter(row => row.status === 'accepted');
  openModal(`<span class="overline">FRIENDS</span><h2>Build your competition.</h2><p>Search by exact username, manage requests, compare scores, and start a race.</p><form class="modal-form" id="friend-search-form"><label for="friend-search">Username</label><div class="answer-entry"><input id="friend-search" placeholder="Search HoopLoop username" /><button class="primary-button" type="submit">Search</button></div></form><div id="friend-search-results"></div><div class="request-section"><h3>Incoming requests</h3><div id="incoming-list">${incoming.length ? incoming.map(friendRequestHtml).join('') : '<p class="modal-note">No incoming requests.</p>'}</div></div><div class="request-section"><h3>Your friends</h3><div id="accepted-list">${accepted.length ? accepted.map(friendAcceptedHtml).join('') : '<p class="modal-note">No accepted friends yet.</p>'}</div></div><div class="request-section"><h3>Sent requests</h3><div>${outgoing.length ? outgoing.map(row => `<div class="request-row"><span class="friend-meta"><span class="avatar">${initialsFor(friendshipOther(row)?.username)}</span><span><strong>${escapeHtml(friendshipOther(row)?.username)}</strong><small>Request pending</small></span></span><span class="status-pill">Pending</span></div>`).join('') : '<p class="modal-note">No sent requests.</p>'}</div></div>`);
  $('friend-search-form').onsubmit = searchFriends;
  wireFriendActions();
}
function friendRequestHtml(row) {
  const person = friendshipOther(row);
  return `<div class="request-row"><span class="friend-meta"><span class="avatar">${initialsFor(person?.username)}</span><span><strong>${escapeHtml(person?.username)}</strong><small>Sent you a request</small></span></span><span class="row-actions"><button class="small-action" data-accept-friend="${row.id}">Accept</button><button class="small-action secondary" data-decline-friend="${row.id}">Decline</button></span></div>`;
}
function friendAcceptedHtml(row) {
  const person = friendshipOther(row);
  return `<div class="request-row"><span class="friend-meta"><span class="avatar">${initialsFor(person?.username)}</span><span><strong>${escapeHtml(person?.username)}</strong><small>Accepted friend</small></span></span><span class="row-actions"><button class="small-action" data-race-friend="${escapeHtml(person?.username)}">Race</button><button class="small-action secondary" data-remove-friend="${row.id}">Remove</button></span></div>`;
}
async function searchFriends(event) {
  event.preventDefault();
  const query = $('friend-search').value.trim();
  const target = $('friend-search-results');
  if (query.length < 2) { target.innerHTML = '<p class="modal-note">Enter at least two characters.</p>'; return; }
  const { data, error } = await db.from('profiles').select('id,username').ilike('username', `%${query}%`).neq('id', state.user.id).limit(12);
  if (error) { target.innerHTML = `<p class="modal-note">${escapeHtml(error.message)}</p>`; return; }
  target.innerHTML = (data || []).length ? data.map(person => `<div class="friend-search-result"><span class="friend-meta"><span class="avatar">${initialsFor(person.username)}</span><strong>${escapeHtml(person.username)}</strong></span><button class="small-action" data-add-username="${escapeHtml(person.username)}">Add friend</button></div>`).join('') : '<p class="modal-note">No matching users.</p>';
  target.querySelectorAll('[data-add-username]').forEach(button => button.onclick = async () => {
    const { error: sendError } = await db.rpc('send_friend_request_by_username', { p_username: button.dataset.addUsername });
    if (sendError) toast('Request not sent', sendError.message, 'error');
    else { toast('Friend request sent', button.dataset.addUsername, 'success'); openFriendsModal(); }
  });
}
function wireFriendActions() {
  qsa('[data-accept-friend]').forEach(button => button.onclick = async () => { const { error } = await db.rpc('respond_friend_request', { p_friendship_id:button.dataset.acceptFriend, p_accept:true }); if (error) toast('Could not accept', error.message,'error'); else openFriendsModal(); });
  qsa('[data-decline-friend]').forEach(button => button.onclick = async () => { await db.rpc('respond_friend_request', { p_friendship_id:button.dataset.declineFriend, p_accept:false }); openFriendsModal(); });
  qsa('[data-remove-friend]').forEach(button => button.onclick = async () => { if (window.confirm('Remove this friend?')) { await db.rpc('remove_friend', { p_friendship_id:button.dataset.removeFriend }); openFriendsModal(); } });
  qsa('[data-race-friend]').forEach(button => button.onclick = () => createFriendRace(button.dataset.raceFriend));
}

async function updateInviteCount() {
  if (!db || !state.user) { els.inviteCount.classList.add('hidden'); return; }
  const { count } = await db.from('race_matches').select('*', { count:'exact', head:true }).eq('opponent_id', state.user.id).eq('status','invited');
  const amount = count || 0;
  els.inviteCount.textContent = amount;
  els.inviteCount.classList.toggle('hidden', amount === 0);
}
function subscribeInvites() {
  if (!db || !state.user) return;
  if (state.inviteChannel) db.removeChannel(state.inviteChannel);
  state.inviteChannel = db.channel(`invites-${state.user.id}`)
    .on('postgres_changes', { event:'*', schema:'public', table:'race_matches', filter:`opponent_id=eq.${state.user.id}` }, updateInviteCount)
    .on('postgres_changes', { event:'*', schema:'public', table:'friendships' }, () => { updateInviteCount(); })
    .subscribe();
}
async function openRaceInvitations() {
  if (!state.user) { openAccountModal('login'); return; }
  const { data, error } = await db.from('race_matches').select('*,host:profiles!race_matches_host_id_fkey(username)').eq('opponent_id', state.user.id).eq('status','invited').order('created_at', { ascending:false });
  if (error) { toast('Invitations error', error.message,'error'); return; }
  openModal(`<span class="overline">RACE INVITATIONS</span><h2>Who wants next?</h2><p>Accepting starts a synchronized five-second countdown.</p><div id="race-invite-list">${(data || []).length ? data.map(match => `<div class="invite-row"><span class="friend-meta"><span class="avatar">${initialsFor(match.host?.username)}</span><span><strong>${escapeHtml(match.host?.username)}</strong><small>Three-round Name Rush race</small></span></span><span class="row-actions"><button class="small-action" data-accept-race="${match.id}">Accept</button><button class="small-action secondary" data-decline-race="${match.id}">Decline</button></span></div>`).join('') : '<p class="modal-note">No pending race invitations.</p>'}</div>`);
  qsa('[data-accept-race]').forEach(button => button.onclick = async () => {
    const { data: match, error: acceptError } = await db.rpc('accept_race', { p_match_id:button.dataset.acceptRace });
    if (acceptError) toast('Could not accept race', acceptError.message,'error');
    else { closeModal(); openRaceRoom(match); }
  });
  qsa('[data-decline-race]').forEach(button => button.onclick = async () => { await db.rpc('decline_or_leave_race', { p_match_id:button.dataset.declineRace }); openRaceInvitations(); });
}
async function quickMatch() {
  if (!state.user) { openAccountModal('login'); return; }
  const button = $('quick-match-button');
  button.disabled = true; button.textContent = 'Searching…';
  const { data: match, error } = await db.rpc('join_random_race', { p_rounds:generateRaceRounds() });
  button.disabled = false; button.textContent = 'Find quick match';
  if (error) { toast('Matchmaking error', error.message,'error'); return; }
  openRaceRoom(match);
}
async function chooseFriendRace() {
  if (!state.user) { openAccountModal('login'); return; }
  const rows = (await loadFriendships()).filter(row => row.status === 'accepted');
  openModal(`<span class="overline">FRIEND RACE</span><h2>Choose your opponent.</h2><p>They will receive a race invitation and can accept when ready.</p><div>${rows.length ? rows.map(row => { const person = friendshipOther(row); return `<div class="request-row"><span class="friend-meta"><span class="avatar">${initialsFor(person.username)}</span><strong>${escapeHtml(person.username)}</strong></span><button class="small-action" data-challenge-name="${escapeHtml(person.username)}">Challenge</button></div>`; }).join('') : '<p class="modal-note">Add and accept a friend before sending a direct challenge.</p>'}</div>`);
  qsa('[data-challenge-name]').forEach(button => button.onclick = () => createFriendRace(button.dataset.challengeName));
}
async function createFriendRace(username) {
  if (!state.user) return;
  const { data: match, error } = await db.rpc('create_friend_race', { p_friend_username:username, p_rounds:generateRaceRounds() });
  if (error) { toast('Challenge not sent', error.message,'error'); return; }
  closeModal();
  toast('Race invitation sent', username, 'success');
  openRaceRoom(match);
}
function renderRacePips(target, progress) {
  target.innerHTML = [0,1,2].map(index => `<span class="${index < progress ? 'done' : ''}"></span>`).join('');
}
async function fetchRaceDetails(matchId) {
  const { data, error } = await db.from('race_matches').select('*,host:profiles!race_matches_host_id_fkey(id,username),opponent:profiles!race_matches_opponent_id_fkey(id,username),winner:profiles!race_matches_winner_id_fkey(id,username)').eq('id',matchId).single();
  if (error) throw error;
  return data;
}
async function fetchRaceProgress(matchId) {
  const { data } = await db.from('race_progress').select('*').eq('match_id',matchId);
  return data || [];
}
async function openRaceRoom(matchInput) {
  if (!state.user) return;
  closeModal();
  let match = await fetchRaceDetails(matchInput.id || matchInput);
  const rounds = (match.rounds || []).map(item => ({ initials:String(item.initials).split(''), key:String(item.initials), hintAnswer:item.hintAnswer, answerCount:item.answerCount }));
  state.race = { match, rounds, roundIndex:0, roundStartedAt:null, hintsUsed:0, hintLevel:0, raf:null, started:false, progress:[], answers:[] };
  els.raceOverlay.classList.remove('hidden');
  els.raceFinish.classList.add('hidden');
  els.raceGame.classList.add('hidden');
  els.raceCountdown.classList.add('hidden');
  await refreshRaceRoom();
  subscribeRace(match.id);
  if (match.status === 'active') beginRaceCountdown();
}
async function refreshRaceRoom() {
  if (!state.race) return;
  const match = await fetchRaceDetails(state.race.match.id);
  const progress = await fetchRaceProgress(match.id);
  state.race.match = match;
  state.race.progress = progress;
  const isHost = match.host_id === state.user.id;
  const opponent = isHost ? match.opponent : match.host;
  els.raceYouName.textContent = state.profile?.username || 'You';
  els.raceYouAvatar.textContent = initialsFor(state.profile?.username || 'You');
  els.raceOpponentName.textContent = opponent?.username || (match.match_type === 'random' ? 'Searching…' : 'Invitation pending…');
  els.raceOpponentAvatar.textContent = initialsFor(opponent?.username || '?');
  const own = progress.find(item => item.user_id === state.user.id);
  const other = progress.find(item => item.user_id !== state.user.id);
  renderRacePips(els.raceYouPips, own?.round_index || 0);
  renderRacePips(els.raceOpponentPips, other?.round_index || 0);
  if (match.status === 'waiting') els.raceStatus.textContent = 'Searching for opponent';
  else if (match.status === 'invited') els.raceStatus.textContent = 'Waiting for friend';
  else if (match.status === 'active') els.raceStatus.textContent = 'Race active';
  else if (match.status === 'finished') showRaceFinished(match, progress);
  else if (match.status === 'cancelled') showRaceCancelled();
}
function subscribeRace(matchId) {
  if (state.raceChannel) db.removeChannel(state.raceChannel);
  state.raceChannel = db.channel(`race-${matchId}`)
    .on('postgres_changes', { event:'UPDATE', schema:'public', table:'race_matches', filter:`id=eq.${matchId}` }, async payload => {
      if (!state.race) return;
      state.race.match = { ...state.race.match, ...payload.new };
      await refreshRaceRoom();
      if (payload.new.status === 'active' && !state.race.started) beginRaceCountdown();
    })
    .on('postgres_changes', { event:'*', schema:'public', table:'race_progress', filter:`match_id=eq.${matchId}` }, refreshRaceRoom)
    .subscribe();
}
function beginRaceCountdown() {
  const race = state.race;
  if (!race || race.started || !race.match.starts_at) return;
  race.started = true;
  els.raceCountdown.classList.remove('hidden');
  const loop = () => {
    if (!state.race) return;
    const remaining = Date.parse(race.match.starts_at) - Date.now();
    if (remaining <= 0) { els.raceCountdown.classList.add('hidden'); startRaceGameplay(); return; }
    els.raceCountdown.textContent = Math.max(1, Math.ceil(remaining / 1000));
    requestAnimationFrame(loop);
  };
  loop();
}
function startRaceGameplay() {
  const race = state.race;
  if (!race || race.match.status !== 'active') return;
  els.raceGame.classList.remove('hidden');
  race.roundIndex = Math.max(0, race.progress.find(item => item.user_id === state.user.id)?.round_index || 0);
  race.roundStartedAt = performance.now();
  race.hintLevel = 0;
  renderRaceRound();
  race.raf = requestAnimationFrame(tickRace);
}
function renderRaceRound() {
  const race = state.race;
  if (!race || race.roundIndex >= 3) return;
  const round = race.rounds[race.roundIndex];
  race.roundStartedAt = performance.now(); race.hintLevel = 0;
  els.raceRoundLabel.textContent = `Round ${race.roundIndex + 1} of 3`;
  els.raceInitials.children[0].textContent = round.initials[0];
  els.raceInitials.children[1].textContent = round.initials[1];
  els.raceAnswer.value = ''; els.raceFeedback.textContent = '';
  els.raceHintPattern.classList.add('hidden'); els.raceHintPattern.textContent = '';
  els.raceHint.disabled = true; els.raceHint.textContent = 'Hint in 20s';
  requestAnimationFrame(() => els.raceAnswer.focus());
}
function tickRace(now) {
  const race = state.race;
  if (!race || race.match.status !== 'active' || race.roundIndex >= 3) return;
  const roundMs = now - race.roundStartedAt;
  els.raceRoundTime.textContent = `${formatTime(roundMs)}s`;
  const available = Math.floor(roundMs / HINT_INTERVAL_MS);
  if (available > race.hintLevel) {
    els.raceHint.disabled = false;
    els.raceHint.textContent = `Use hint ${race.hintLevel + 1}${available > race.hintLevel + 1 ? ` of ${available}` : ''}`;
  } else {
    const next = Math.ceil((HINT_INTERVAL_MS - (roundMs % HINT_INTERVAL_MS)) / 1000);
    els.raceHint.disabled = true;
    els.raceHint.textContent = `Next hint in ${next}s`;
  }
  race.raf = requestAnimationFrame(tickRace);
}
function useRaceHint() {
  const race = state.race;
  if (!race) return;
  const available = Math.floor((performance.now() - race.roundStartedAt) / HINT_INTERVAL_MS);
  if (available <= race.hintLevel) return;
  race.hintLevel += 1; race.hintsUsed += 1;
  els.raceHintPattern.textContent = buildHint(race.rounds[race.roundIndex].hintAnswer, 1 + race.hintLevel);
  els.raceHintPattern.classList.remove('hidden');
}
async function submitRaceAnswer(event) {
  event.preventDefault();
  const race = state.race;
  if (!race || race.match.status !== 'active') return;
  const match = PLAYER_DB.find(race.rounds[race.roundIndex].initials, els.raceAnswer.value.trim());
  if (!match) { els.raceFeedback.textContent = 'That name does not match.'; return; }
  els.raceFeedback.classList.add('correct');
  els.raceFeedback.textContent = `Correct — ${match.displayName}`;
  race.answers.push({ initials: race.rounds[race.roundIndex].initials.join(''), answer: match.displayName });
  race.roundIndex += 1;
  const elapsed = Math.max(0, Date.now() - Date.parse(race.match.starts_at));
  const finished = race.roundIndex >= 3;
  const { data: updated, error } = await db.rpc('submit_race_progress', { p_match_id:race.match.id, p_round_index:race.roundIndex, p_elapsed_ms:elapsed, p_hints_used:race.hintsUsed, p_finished:finished });
  if (error) { toast('Race update failed', error.message,'error'); return; }
  race.match = updated;
  renderRacePips(els.raceYouPips, race.roundIndex);
  if (finished) {
    cancelAnimationFrame(race.raf);
    await refreshRaceRoom();
  } else setTimeout(renderRaceRound, 250);
}
function showRaceFinished(match, progress) {
  if (!state.race) return;
  if (state.race.raf) cancelAnimationFrame(state.race.raf);
  els.raceGame.classList.add('hidden'); els.raceCountdown.classList.add('hidden'); els.raceFinish.classList.remove('hidden');
  const won = match.winner_id === state.user.id;
  const winner = match.winner?.username || (won ? state.profile?.username : els.raceOpponentName.textContent);
  const winnerProgress = progress.find(item => item.user_id === match.winner_id);
  els.raceResultKicker.textContent = won ? 'Victory' : 'Race complete';
  els.raceResultTitle.textContent = won ? 'You win!' : `${winner} wins`;
  els.raceResultCopy.textContent = winnerProgress?.elapsed_ms ? `Winning time: ${formatTime(winnerProgress.elapsed_ms)} seconds.` : 'The first verified finish reached the database first.';
  const reviewRounds = state.race.rounds.map(round => {
    const own = state.race.answers.find(answer => answer.initials === round.initials.join(''));
    return { initials: round.initials.join(''), answer: own?.answer || null };
  });
  renderAnswerReview(els.raceAnswerReview, reviewRounds, 'Race answer review');
}
function showRaceCancelled() {
  els.raceGame.classList.add('hidden'); els.raceCountdown.classList.add('hidden'); els.raceFinish.classList.remove('hidden');
  els.raceResultKicker.textContent = 'Race cancelled'; els.raceResultTitle.textContent = 'No result'; els.raceResultCopy.textContent = 'This room is no longer active.';
  if (els.raceAnswerReview) { els.raceAnswerReview.innerHTML = ''; els.raceAnswerReview.classList.add('hidden'); }
}
async function closeRaceRoom() {
  if (!state.race) { els.raceOverlay.classList.add('hidden'); return; }
  const active = ['active','waiting','invited'].includes(state.race.match.status);
  if (active && !window.confirm(state.race.match.status === 'active' ? 'Leave this race and forfeit?' : 'Cancel or leave this race room?')) return;
  if (active && db) await db.rpc('decline_or_leave_race', { p_match_id:state.race.match.id });
  if (state.race.raf) cancelAnimationFrame(state.race.raf);
  if (state.raceChannel) db.removeChannel(state.raceChannel);
  state.raceChannel = null; state.race = null;
  els.raceOverlay.classList.add('hidden');
}

async function initializeOnline() {
  if (!db) { renderAccount(); return; }
  const { data: { session } } = await db.auth.getSession();
  state.user = session?.user || null;
  await loadProfile();
  db.auth.onAuthStateChange(async (event, sessionData) => {
    state.user = sessionData?.user || null;
    state.ownScores.clear();
    await loadProfile();
    if (event === 'PASSWORD_RECOVERY') openPasswordUpdate();
    if (state.user) {
      await trySavePendingDaily();
      subscribeInvites();
      await updateInviteCount();
    } else {
      state.profile = null;
      if (state.inviteChannel) db.removeChannel(state.inviteChannel);
      state.inviteChannel = null;
    }
    await renderPuzzleHeader();
    await loadLeaderboard();
    await loadPracticeStats();
    renderArchive();
  });
  if (state.user) {
    await trySavePendingDaily();
    subscribeInvites();
    await updateInviteCount();
  }
}

function wireStaticControls() {
  $('hero-play-button').onclick = () => { document.querySelector('.game-shell').scrollIntoView({ behavior:'smooth', block:'center' }); setTimeout(startDaily, 280); };
  els.startGame.onclick = startDaily;
  els.answerForm.onsubmit = submitSessionAnswer;
  els.hint.onclick = useSessionHint;
  els.giveUp.onclick = sessionGiveUp;
  $('how-to-button').onclick = openHowTo;
  els.setupHelp.onclick = openSetupHelp;
  els.accountButton.onclick = () => state.profile ? openProfileModal() : openAccountModal('login');
  els.accountCta.onclick = () => state.profile ? openProfileModal() : openAccountModal('create');
  $('friends-nav').onclick = openFriendsModal;
  $('race-nav').onclick = () => document.querySelector('#race').scrollIntoView({ behavior:'smooth' });
  $('view-all-leaderboard').onclick = openLeaderboardModal;
  $('quick-match-button').onclick = quickMatch;
  $('friend-race-button').onclick = chooseFriendRace;
  $('race-invites-button').onclick = openRaceInvitations;
  $('modal-close').onclick = closeModal;
  els.modalBackdrop.onclick = event => { if (event.target === els.modalBackdrop) closeModal(); };
  $('race-close').onclick = closeRaceRoom;
  $('race-rematch-button').onclick = async () => { await closeRaceRoom(); if (!state.race) quickMatch(); };
  els.raceAnswerForm.onsubmit = submitRaceAnswer;
  els.raceHint.onclick = useRaceHint;
  els.archiveMore.onclick = () => { state.archiveCount += 9; renderArchive(); };

  qsa('#practice-difficulty .choice').forEach(button => button.onclick = () => {
    qsa('#practice-difficulty .choice').forEach(item => item.classList.toggle('active', item === button));
    state.practiceConfig.difficulty = button.dataset.value;
  });
  qsa('#practice-length button').forEach(button => button.onclick = () => {
    qsa('#practice-length button').forEach(item => item.classList.toggle('active', item === button));
    state.practiceConfig.length = button.dataset.value;
  });
  $('practice-hints').onchange = event => { state.practiceConfig.hints = event.target.checked; };
  $('start-practice-button').onclick = startPracticeFromConfig;
  qsa('[data-board]').forEach(button => button.onclick = async () => {
    if (button.dataset.board === 'friends' && !state.user) { openAccountModal('login'); return; }
    qsa('[data-board]').forEach(item => item.classList.toggle('active', item === button));
    state.leaderboardScope = button.dataset.board;
    await loadLeaderboard();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (!els.raceOverlay.classList.contains('hidden')) closeRaceRoom();
      else if (!els.modalBackdrop.classList.contains('hidden')) closeModal();
    }
  });
}

async function init() {
  wireStaticControls();
  renderBuildStatus();
  if ((PLAYER_DB.meta.playerCount || 0) < 5000) {
    document.body.classList.add('database-load-error');
    els.startGame.disabled = true;
    els.startGame.textContent = 'Database failed to load';
    toast('Player database failed to load', 'Confirm players-data.js is in the repository root.', 'error');
  }
  await initializeOnline();
  await renderPuzzleHeader();
  await loadLeaderboard();
  subscribeLeaderboard();
  await loadPracticeStats();
  await renderArchive();
  console.info('HoopLoop Version 7', { database:PLAYER_DB.meta, online:ONLINE_CONFIGURED, timezone:DAILY_TIME_ZONE });
}

init().catch(error => {
  console.error(error);
  toast('HoopLoop could not finish loading', error.message, 'error');
});
