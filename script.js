'use strict';

const PUZZLES = [
  {
    id: '2026-08-01', number: 1, date: 'August 1, 2026', shortDate: 'Aug 1',
    rounds: [
      { initials: ['D','W'], hintAnswer: 'Derrick White' },
      { initials: ['L','J'], hintAnswer: 'LeBron James' },
      { initials: ['M','B'], hintAnswer: 'Mike Bibby' }
    ],
    demoScores: [
      { username: 'Evan1n0', timeMs: 23480, submittedAt: '2026-08-01T11:10:00Z', hints: 0 },
      { username: 'ChetGPT', timeMs: 23590, submittedAt: '2026-08-01T11:15:00Z', hints: 0 },
      { username: 'HoopMaster', timeMs: 24010, submittedAt: '2026-08-01T11:19:00Z', hints: 0 },
      { username: 'BucketsOnly', timeMs: 26940, submittedAt: '2026-08-01T11:26:00Z', hints: 0 },
      { username: 'StatSavant', timeMs: 31120, submittedAt: '2026-08-01T11:41:00Z', hints: 1 }
    ]
  },
  {
    id: '2026-07-31', number: 0, date: 'July 31, 2026', shortDate: 'Jul 31',
    rounds: [
      { initials: ['A','D'], hintAnswer: 'Anthony Davis' },
      { initials: ['J','H'], hintAnswer: 'James Harden' },
      { initials: ['B','W'], hintAnswer: 'Bill Walton' }
    ],
    demoScores: [
      { username: 'StatSavant', timeMs: 20760, submittedAt: '2026-07-31T14:03:00Z', hints: 0 },
      { username: 'Evan1n0', timeMs: 22620, submittedAt: '2026-07-31T14:08:00Z', hints: 0 },
      { username: 'ChetGPT', timeMs: 25310, submittedAt: '2026-07-31T14:15:00Z', hints: 0 }
    ]
  },
  {
    id: '2026-07-30', number: -1, date: 'July 30, 2026', shortDate: 'Jul 30',
    rounds: [
      { initials: ['K','M'], hintAnswer: 'Karl Malone' },
      { initials: ['C','P'], hintAnswer: 'Chris Paul' },
      { initials: ['K','A'], hintAnswer: 'Kareem Abdul-Jabbar' }
    ],
    demoScores: [
      { username: 'HoopMaster', timeMs: 28180, submittedAt: '2026-07-30T15:03:00Z', hints: 0 },
      { username: 'BucketsOnly', timeMs: 30050, submittedAt: '2026-07-30T15:08:00Z', hints: 0 },
      { username: 'ChetGPT', timeMs: 33330, submittedAt: '2026-07-30T15:13:00Z', hints: 1 }
    ]
  }
];

const DEMO_USERS = [
  { username: 'ChetGPT', best: '23.59s' },
  { username: 'HoopMaster', best: '24.01s' },
  { username: 'BucketsOnly', best: '26.94s' },
  { username: 'StatSavant', best: '20.76s' },
  { username: 'Evan1n0', best: '22.62s' }
];

const store = {
  get(key, fallback = null) {
    try { const raw = localStorage.getItem(`hooploop-v4-${key}`); return raw === null ? fallback : JSON.parse(raw); }
    catch { return fallback; }
  },
  set(key, value) { localStorage.setItem(`hooploop-v4-${key}`, JSON.stringify(value)); },
  clearAll() {
    Object.keys(localStorage)
      .filter(key => key.startsWith('hooploop-v4-'))
      .forEach(key => localStorage.removeItem(key));
  }
};

const state = {
  puzzleIndex: 0,
  mode: 'daily',
  started: false,
  finished: false,
  roundIndex: 0,
  gameStart: 0,
  roundStart: 0,
  totalMs: 0,
  roundMs: 0,
  raf: null,
  hintUsedThisRound: false,
  hintsUsed: 0,
  splits: [],
  pendingRun: null,
  gaveUp: false
};

const $ = (id) => document.getElementById(id);
const els = {
  totalTimer: $('total-timer'), roundTimer: $('round-timer'), roundLabel: $('round-label'), puzzleLabel: $('puzzle-label'),
  modeBadge: $('mode-badge'), startScreen: $('start-screen'), playScreen: $('play-screen'), resultScreen: $('result-screen'),
  startCopy: $('start-copy'), guestNote: $('guest-note'), startGame: $('start-game-button'), practice: $('practice-button'),
  initials: $('initials'), progress: $('round-progress'), answerForm: $('answer-form'), input: $('player-answer'),
  answerEntry: document.querySelector('.answer-entry'), feedback: $('feedback'), hint: $('hint-button'), hintPattern: $('hint-pattern'),
  giveUp: $('give-up-button'), resultKicker: $('result-kicker'), resultTime: $('result-time'), resultMessage: $('result-message'),
  splitList: $('split-list'), revealedAnswers: $('revealed-answers'), resultPrimary: $('result-primary-button'), resultReplay: $('result-replay-button'),
  leaderboardRows: $('leaderboard-rows'), archiveGrid: $('archive-grid'), accountLabel: $('account-label'), accountButton: $('account-button'),
  accountCta: $('account-cta'), modalBackdrop: $('modal-backdrop'), modal: $('modal'), modalContent: $('modal-content')
};

function currentPuzzle() { return PUZZLES[state.puzzleIndex]; }
function currentUser() { return store.get('user'); }
function getFriends() { return store.get('friends', []); }
function getRuns() { return store.get('runs', []); }
function formatTime(ms) { return (ms / 1000).toFixed(2); }
function initialsFor(username) { return username.slice(0, 2).toUpperCase(); }
function normalizeName(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '');
}

const PLAYER_DB = (() => {
  const source = window.HOOPLOOP_PLAYER_DATA || { meta: {}, players: [], officialAliases: [] };
  const byInitials = new Map();

  function deriveInitials(firstName, lastName, displayName) {
    let first = String(firstName || '').trim();
    let last = String(lastName || '').trim();
    const words = String(displayName || '').trim().split(/\s+/).filter(Boolean);

    // A couple of NBA records use a blank first-name field. Fall back to the
    // displayed first and final words when the name has at least two words.
    if (!first && words.length >= 2) first = words[0];
    if (!last && words.length >= 2) last = words[words.length - 1];
    if (!first || !last) return null;

    const firstInitial = first.match(/[A-Za-zÀ-ÖØ-öø-ÿĀ-ž]/u)?.[0];
    const lastInitial = last.match(/[A-Za-zÀ-ÖØ-öø-ÿĀ-ž]/u)?.[0];
    if (!firstInitial || !lastInitial) return null;
    return `${normalizeName(firstInitial).slice(0, 1).toUpperCase()}${normalizeName(lastInitial).slice(0, 1).toUpperCase()}`;
  }

  function addName(playerId, firstName, lastName, displayName, active, isAlias = false) {
    const key = deriveInitials(firstName, lastName, displayName);
    const normalized = normalizeName(displayName);
    if (!key || !normalized) return;
    if (!byInitials.has(key)) byInitials.set(key, new Map());
    const bucket = byInitials.get(key);
    if (!bucket.has(normalized)) {
      bucket.set(normalized, { playerId, displayName, active: Boolean(active), isAlias });
    }
  }

  source.players.forEach(([id, first, last, display, active]) => addName(id, first, last, display, active, false));
  source.officialAliases.forEach(alias => addName(alias.playerId, alias.first, alias.last, alias.name, false, true));

  function keyFor(initials) { return `${initials[0]}${initials[1]}`.toUpperCase(); }
  function entriesFor(initials) {
    return [...(byInitials.get(keyFor(initials))?.values() || [])]
      .sort((a, b) => Number(b.active) - Number(a.active) || a.displayName.localeCompare(b.displayName));
  }

  return {
    meta: source.meta,
    namesFor(initials) { return entriesFor(initials).map(entry => entry.displayName); },
    find(initials, submittedName) {
      return byInitials.get(keyFor(initials))?.get(normalizeName(submittedName))?.displayName || null;
    },
    count(initials) { return byInitials.get(keyFor(initials))?.size || 0; },
    validCombinations(minimum = 3) {
      return [...byInitials.entries()]
        .filter(([, names]) => names.size >= minimum)
        .map(([initials, names]) => ({ initials, count: names.size }))
        .sort((a, b) => b.count - a.count || a.initials.localeCompare(b.initials));
    }
  };
})();

function answersForRound(round) { return PLAYER_DB.namesFor(round.initials); }
function buildHint(name) {
  return name.split(' ').map(part => {
    const visible = part.length <= 3 ? 1 : 2;
    return `${part.slice(0, visible).toUpperCase()}${'_'.repeat(Math.max(0, part.length - visible))}`;
  }).join(' ');
}
function scoreKey(puzzleId, username) { return `${puzzleId}:${username.toLowerCase()}`; }
function userRunForPuzzle(puzzleId) {
  const user = currentUser();
  if (!user) return null;
  return getRuns().find(run => run.key === scoreKey(puzzleId, user.username));
}

function setScreen(name) {
  els.startScreen.classList.toggle('hidden', name !== 'start');
  els.playScreen.classList.toggle('hidden', name !== 'play');
  els.resultScreen.classList.toggle('hidden', name !== 'result');
}

function renderAccount() {
  const user = currentUser();
  els.accountLabel.textContent = user ? user.username : 'Log in';
  els.accountCta.textContent = user ? 'Open your profile' : 'Create a free account';
  els.guestNote.textContent = user ? `Signed in as ${user.username}. Your first daily completion is saved.` : 'Playing as guest. Create an account to save your result.';
}

function renderPuzzleHeader() {
  const puzzle = currentPuzzle();
  els.puzzleLabel.textContent = puzzle.number === 1 ? 'DAILY #1 · AUG 1' : `ARCHIVE · ${puzzle.shortDate.toUpperCase()}`;
  const existing = userRunForPuzzle(puzzle.id);
  if (existing) {
    els.startCopy.textContent = `Your saved daily score is ${formatTime(existing.timeMs)} seconds. Replay it in practice mode anytime.`;
    els.startGame.textContent = 'View saved result';
    els.practice.classList.remove('hidden');
  } else {
    els.startCopy.textContent = puzzle.number === 1 ? 'Everyone receives the same three initial combinations.' : `Play the original ${puzzle.date} challenge and join its leaderboard.`;
    els.startGame.textContent = puzzle.number === 1 ? 'Start daily' : 'Play archive puzzle';
    els.practice.classList.add('hidden');
  }
  els.roundLabel.textContent = 'Ready when you are';
  els.modeBadge.textContent = 'DAILY';
  els.totalTimer.textContent = '0.00';
  setScreen('start');
}

function renderArchive() {
  els.archiveGrid.innerHTML = '';
  PUZZLES.forEach((puzzle, index) => {
    const run = userRunForPuzzle(puzzle.id);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `archive-card${index === state.puzzleIndex ? ' active' : ''}`;
    button.innerHTML = `
      <div class="archive-card__top">
        <span class="archive-card__date">${puzzle.date}</span>
        <span class="archive-card__status">${run ? `${formatTime(run.timeMs)}s` : index === 0 ? 'Today' : 'Open'}</span>
      </div>
      <h3>${puzzle.number === 1 ? 'Daily #1' : `Archive ${Math.abs(puzzle.number)}`}</h3>
      <p>Three rounds · ${puzzle.rounds.reduce((sum, r) => sum + answersForRound(r).length, 0)} possible answers</p>
      <span class="archive-card__arrow">↗</span>`;
    button.addEventListener('click', () => selectPuzzle(index));
    els.archiveGrid.appendChild(button);
  });
}

function selectPuzzle(index) {
  stopTimer();
  Object.assign(state, { puzzleIndex: index, started: false, finished: false, roundIndex: 0, totalMs: 0, roundMs: 0, splits: [], hintsUsed: 0, pendingRun: null });
  renderPuzzleHeader();
  renderArchive();
  renderLeaderboard();
  document.querySelector('.game-shell').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function getLeaderboardEntries() {
  const puzzle = currentPuzzle();
  const entries = [...puzzle.demoScores.map(s => ({ ...s, demo: true }))];
  getRuns().filter(run => run.puzzleId === puzzle.id && run.valid).forEach(run => {
    const exists = entries.some(e => e.username.toLowerCase() === run.username.toLowerCase());
    if (!exists) entries.push({ username: run.username, timeMs: run.timeMs, submittedAt: run.submittedAt, hints: run.hints });
  });
  return entries.sort((a, b) => a.timeMs - b.timeMs || new Date(a.submittedAt) - new Date(b.submittedAt));
}

function renderLeaderboard(limit = 5, target = els.leaderboardRows) {
  const user = currentUser();
  const entries = getLeaderboardEntries();
  target.innerHTML = '';
  entries.slice(0, limit).forEach((entry, index) => {
    const row = document.createElement('div');
    const isYou = user && entry.username.toLowerCase() === user.username.toLowerCase();
    row.className = `leaderboard-row${isYou ? ' current-user-row' : ''}`;
    row.innerHTML = `
      <span class="rank-number">${String(index + 1).padStart(2, '0')}</span>
      <span class="player-cell"><span class="avatar">${initialsFor(entry.username)}</span><span><strong>${escapeHtml(entry.username)}${isYou ? ' (You)' : ''}</strong><small>${entry.hints ? `${entry.hints} hint${entry.hints > 1 ? 's' : ''} used` : 'No hints'}</small></span></span>
      <span class="time-cell">${formatTime(entry.timeMs)}<small>s</small></span>`;
    target.appendChild(row);
  });
}

function renderProgress() {
  els.progress.innerHTML = '';
  currentPuzzle().rounds.forEach((_, index) => {
    const bar = document.createElement('span');
    if (index < state.roundIndex) bar.className = 'done';
    if (index === state.roundIndex) bar.className = 'current';
    els.progress.appendChild(bar);
  });
}

function startGame(mode = 'daily') {
  const existing = userRunForPuzzle(currentPuzzle().id);
  if (mode === 'daily' && existing) {
    showSavedResult(existing);
    return;
  }
  stopTimer();
  Object.assign(state, {
    mode, started: true, finished: false, roundIndex: 0, gameStart: performance.now(), roundStart: performance.now(),
    totalMs: 0, roundMs: 0, hintUsedThisRound: false, hintsUsed: 0, splits: [], pendingRun: null, gaveUp: false
  });
  els.modeBadge.textContent = mode.toUpperCase();
  setScreen('play');
  renderRound();
  state.raf = requestAnimationFrame(tick);
}

function renderRound() {
  const round = currentPuzzle().rounds[state.roundIndex];
  state.roundStart = performance.now();
  state.roundMs = 0;
  state.hintUsedThisRound = false;
  els.roundLabel.textContent = `Round ${state.roundIndex + 1} of ${currentPuzzle().rounds.length}`;
  els.initials.children[0].textContent = round.initials[0];
  els.initials.children[1].textContent = round.initials[1];
  els.input.value = '';
  els.feedback.textContent = '';
  els.feedback.classList.remove('correct');
  els.hintPattern.classList.add('hidden');
  els.hintPattern.textContent = '';
  els.hint.disabled = true;
  els.hint.innerHTML = '<span aria-hidden="true">◔</span> Hint in 30s';
  renderProgress();
  requestAnimationFrame(() => els.input.focus());
}

function tick(now) {
  if (!state.started || state.finished) return;
  state.totalMs = now - state.gameStart;
  state.roundMs = now - state.roundStart;
  els.totalTimer.textContent = formatTime(state.totalMs);
  els.roundTimer.textContent = `${formatTime(state.roundMs)}s`;
  if (!state.hintUsedThisRound) {
    const secondsLeft = Math.max(0, Math.ceil((30000 - state.roundMs) / 1000));
    els.hint.disabled = state.roundMs < 30000;
    els.hint.innerHTML = state.roundMs >= 30000 ? '<span aria-hidden="true">◔</span> Show hint' : `<span aria-hidden="true">◔</span> Hint in ${secondsLeft}s`;
  }
  state.raf = requestAnimationFrame(tick);
}

function stopTimer() { if (state.raf) cancelAnimationFrame(state.raf); state.raf = null; }

function submitAnswer(event) {
  event.preventDefault();
  if (!state.started || state.finished) return;
  const submitted = normalizeName(els.input.value);
  if (!submitted) { showFeedback('Type a player name first.', false); return; }
  const round = currentPuzzle().rounds[state.roundIndex];
  const matchingName = PLAYER_DB.find(round.initials, submitted);
  if (!matchingName) {
    showFeedback('That player name does not match this initials set.', false);
    els.answerEntry.classList.remove('shake');
    void els.answerEntry.offsetWidth;
    els.answerEntry.classList.add('shake');
    els.input.select();
    return;
  }
  const split = { round: state.roundIndex + 1, answer: matchingName, timeMs: performance.now() - state.roundStart, hint: state.hintUsedThisRound };
  state.splits.push(split);
  showFeedback(`Correct — ${matchingName}`, true);
  els.initials.classList.add('success');
  setTimeout(() => els.initials.classList.remove('success'), 380);
  if (state.roundIndex >= currentPuzzle().rounds.length - 1) {
    setTimeout(() => finishGame(false), 320);
  } else {
    setTimeout(() => { state.roundIndex += 1; renderRound(); }, 380);
  }
}

function showFeedback(message, correct) {
  els.feedback.textContent = message;
  els.feedback.classList.toggle('correct', Boolean(correct));
}

function useHint() {
  if (state.roundMs < 30000 || state.hintUsedThisRound) return;
  state.hintUsedThisRound = true;
  state.hintsUsed += 1;
  const round = currentPuzzle().rounds[state.roundIndex];
  els.hintPattern.textContent = buildHint(round.hintAnswer);
  els.hintPattern.classList.remove('hidden');
  els.hint.disabled = true;
  els.hint.innerHTML = '<span aria-hidden="true">✓</span> Hint used';
  showFeedback('The hint shows one valid answer. Any matching player still counts.', true);
  els.input.focus();
}

function confirmGiveUp() {
  const round = currentPuzzle().rounds[state.roundIndex];
  openModal(`
    <span class="overline">END THIS RUN?</span>
    <h2>Give up on ${round.initials.join('')}?</h2>
    <p>This run will not enter the leaderboard. We’ll reveal every accepted player for the current initials.</p>
    <div class="confirm-actions">
      <button class="secondary-button" id="cancel-give-up" type="button">Keep playing</button>
      <button class="primary-button" id="confirm-give-up" type="button">Reveal answers</button>
    </div>`);
  $('cancel-give-up').addEventListener('click', closeModal);
  $('confirm-give-up').addEventListener('click', () => { closeModal(); finishGame(true); });
}

function finishGame(gaveUp) {
  stopTimer();
  state.finished = true;
  state.started = false;
  state.gaveUp = gaveUp;
  state.totalMs = performance.now() - state.gameStart;
  els.totalTimer.textContent = formatTime(state.totalMs);
  setScreen('result');
  els.splitList.innerHTML = '';
  state.splits.forEach(split => {
    const row = document.createElement('div');
    row.className = 'split-row';
    row.innerHTML = `<span>R${split.round}</span><strong>${escapeHtml(split.answer)}${split.hint ? ' · hint' : ''}</strong><span>${formatTime(split.timeMs)}s</span>`;
    els.splitList.appendChild(row);
  });
  els.revealedAnswers.classList.add('hidden');
  els.revealedAnswers.innerHTML = '';

  if (gaveUp) {
    const round = currentPuzzle().rounds[state.roundIndex];
    els.resultKicker.textContent = 'Run ended';
    els.resultTime.textContent = `Round ${state.roundIndex + 1} revealed`;
    els.resultMessage.textContent = 'This attempt is not eligible for the leaderboard.';
    els.revealedAnswers.innerHTML = `<h4>All accepted ${round.initials.join('')} names</h4><div class="answer-chips">${answersForRound(round).map(name => `<span class="answer-chip">${escapeHtml(name)}</span>`).join('')}</div>`;
    els.revealedAnswers.classList.remove('hidden');
    els.resultPrimary.textContent = 'Try another puzzle';
    els.resultPrimary.onclick = () => { document.querySelector('#archive').scrollIntoView({ behavior: 'smooth' }); };
    els.resultReplay.textContent = 'Restart practice';
    els.resultReplay.onclick = () => startGame('practice');
    return;
  }

  const run = {
    key: currentUser() ? scoreKey(currentPuzzle().id, currentUser().username) : null,
    puzzleId: currentPuzzle().id,
    username: currentUser()?.username || 'Guest',
    timeMs: Math.round(state.totalMs),
    submittedAt: new Date().toISOString(),
    hints: state.hintsUsed,
    splits: state.splits,
    valid: state.mode === 'daily' && Boolean(currentUser())
  };
  state.pendingRun = run;

  if (run.valid && !userRunForPuzzle(run.puzzleId)) {
    const runs = getRuns();
    runs.push(run);
    store.set('runs', runs);
    els.resultKicker.textContent = 'Daily complete';
    els.resultTime.textContent = `${formatTime(run.timeMs)} seconds`;
    els.resultMessage.textContent = `Saved to the ${currentPuzzle().date} leaderboard.`;
  } else if (state.mode === 'practice') {
    els.resultKicker.textContent = 'Practice complete';
    els.resultTime.textContent = `${formatTime(run.timeMs)} seconds`;
    els.resultMessage.textContent = 'Practice runs never replace your official daily result.';
  } else {
    els.resultKicker.textContent = 'Guest run complete';
    els.resultTime.textContent = `${formatTime(run.timeMs)} seconds`;
    els.resultMessage.textContent = 'Create an account now to save this result to the prototype leaderboard.';
  }

  els.resultPrimary.textContent = currentUser() || state.mode === 'practice' ? 'View leaderboard' : 'Save this score';
  els.resultPrimary.onclick = () => {
    if (!currentUser() && state.mode === 'daily') openAccountModal('create', true);
    else openLeaderboardModal();
  };
  els.resultReplay.textContent = 'Practice again';
  els.resultReplay.onclick = () => startGame('practice');
  renderLeaderboard();
  renderArchive();
}

function showSavedResult(run) {
  state.mode = 'daily';
  state.totalMs = run.timeMs;
  state.splits = run.splits || [];
  els.totalTimer.textContent = formatTime(run.timeMs);
  els.modeBadge.textContent = 'SAVED';
  els.roundLabel.textContent = `${currentPuzzle().date} result`;
  setScreen('result');
  els.resultKicker.textContent = 'Official score';
  els.resultTime.textContent = `${formatTime(run.timeMs)} seconds`;
  els.resultMessage.textContent = 'Your first completion remains your leaderboard score.';
  els.splitList.innerHTML = (run.splits || []).map(split => `<div class="split-row"><span>R${split.round}</span><strong>${escapeHtml(split.answer)}${split.hint ? ' · hint' : ''}</strong><span>${formatTime(split.timeMs)}s</span></div>`).join('');
  els.revealedAnswers.classList.add('hidden');
  els.resultPrimary.textContent = 'View leaderboard';
  els.resultPrimary.onclick = openLeaderboardModal;
  els.resultReplay.textContent = 'Practice puzzle';
  els.resultReplay.onclick = () => startGame('practice');
}

function openModal(html) {
  els.modalContent.innerHTML = html;
  els.modalBackdrop.classList.remove('hidden');
  document.body.classList.add('modal-open');
}
function closeModal() {
  els.modalBackdrop.classList.add('hidden');
  document.body.classList.remove('modal-open');
  els.modalContent.innerHTML = '';
}

function openHowToModal() {
  openModal(`
    <span class="overline">NAME RUSH RULES</span>
    <h2>Three names. One clock.</h2>
    <p>Each round shows a first-name initial and last-name initial. Type any accepted NBA player whose exact name matches both letters.</p>
    <p class="modal-note">Database loaded: ${PLAYER_DB.meta.playerCount?.toLocaleString?.() || PLAYER_DB.meta.playerCount || 0} NBA-listed players plus ${PLAYER_DB.meta.aliasCount || 0} official former playing names.</p>
    <div class="account-benefits" style="padding:8px 0 0;color:#101113">
      <div style="border-color:#d9d7d0"><span>01</span><strong>The clock never stops</strong><p>It runs continuously across all three rounds.</p></div>
      <div style="border-color:#d9d7d0"><span>02</span><strong>Hints reset each round</strong><p>After 30 seconds on one set, reveal part of one valid name.</p></div>
      <div style="border-color:#d9d7d0"><span>03</span><strong>Exact spelling counts</strong><p>Capitalization, punctuation, spaces, and accent marks are flexible. The letters and full official name still need to be correct.</p></div>
    </div>
    <button class="primary-button" id="modal-play-now" style="width:100%;margin-top:20px" type="button">Play today</button>`);
  $('modal-play-now').addEventListener('click', () => { closeModal(); startGame('daily'); });
}

function openAccountModal(initialMode = 'create', savePending = false) {
  if (currentUser()) { openProfileModal(); return; }
  openModal(`
    <span class="overline">LOCAL PROTOTYPE ACCOUNT</span>
    <h2>Join HoopLoop.</h2>
    <p>This prototype stores your username and results only in this browser. Real secure accounts come with the backend build.</p>
    <div class="modal-tabs">
      <button class="modal-tab ${initialMode === 'create' ? 'active' : ''}" id="create-tab" type="button">Create account</button>
      <button class="modal-tab ${initialMode === 'login' ? 'active' : ''}" id="login-tab" type="button">Log in</button>
    </div>
    <form class="modal-form" id="account-form">
      <label for="username-input">Username</label>
      <input id="username-input" maxlength="18" pattern="[A-Za-z0-9_]+" placeholder="Example: Evan1n0" required />
      <button class="primary-button" id="account-submit" type="submit">${initialMode === 'create' ? 'Create account' : 'Log in'}</button>
    </form>
    <div class="modal-note">Usernames may use letters, numbers, and underscores. Authentication is simulated for this playable prototype.</div>`);
  let mode = initialMode;
  const setMode = next => {
    mode = next;
    $('create-tab').classList.toggle('active', mode === 'create');
    $('login-tab').classList.toggle('active', mode === 'login');
    $('account-submit').textContent = mode === 'create' ? 'Create account' : 'Log in';
  };
  $('create-tab').addEventListener('click', () => setMode('create'));
  $('login-tab').addEventListener('click', () => setMode('login'));
  $('account-form').addEventListener('submit', event => {
    event.preventDefault();
    const username = $('username-input').value.trim();
    if (!/^[A-Za-z0-9_]{3,18}$/.test(username)) {
      $('username-input').setCustomValidity('Use 3–18 letters, numbers, or underscores.');
      $('username-input').reportValidity();
      return;
    }
    store.set('user', { username, createdAt: new Date().toISOString(), mode });
    if (savePending && state.pendingRun) savePendingRun(username);
    closeModal();
    renderAll();
  });
  requestAnimationFrame(() => $('username-input').focus());
}

function savePendingRun(username) {
  const run = state.pendingRun;
  if (!run || run.puzzleId !== currentPuzzle().id || state.mode !== 'daily') return;
  if (getRuns().some(item => item.key === scoreKey(run.puzzleId, username))) return;
  const updated = { ...run, key: scoreKey(run.puzzleId, username), username, valid: true };
  const runs = getRuns();
  runs.push(updated);
  store.set('runs', runs);
  state.pendingRun = updated;
}

function openProfileModal() {
  const user = currentUser();
  if (!user) { openAccountModal('create'); return; }
  const runs = getRuns().filter(run => run.username.toLowerCase() === user.username.toLowerCase() && run.valid);
  const best = runs.length ? Math.min(...runs.map(run => run.timeMs)) : null;
  openModal(`
    <span class="overline">PLAYER PROFILE</span>
    <h2>${escapeHtml(user.username)}</h2>
    <p>Your local HoopLoop prototype profile.</p>
    <div class="hero-facts" style="max-width:none;margin:28px 0 8px">
      <div><strong>${runs.length}</strong><span>saved scores</span></div>
      <div><strong>${best ? formatTime(best) : '--'}</strong><span>best seconds</span></div>
      <div><strong>${getFriends().length}</strong><span>friends</span></div>
    </div>
    <button class="primary-button" id="profile-friends" style="width:100%;margin-top:24px" type="button">Manage friends</button>
    <button class="secondary-button" id="logout-button" style="width:100%;margin-top:10px" type="button">Log out</button>
    <button class="danger-text-button" id="reset-local-button" style="width:100%;margin-top:14px" type="button">Reset all local Version 4 data</button>`);
  $('profile-friends').addEventListener('click', openFriendsModal);
  $('logout-button').addEventListener('click', () => { store.set('user', null); closeModal(); renderAll(); });
  $('reset-local-button').addEventListener('click', () => {
    const confirmed = window.confirm('Reset your Version 4 account, friends, and saved scores in this browser? This cannot be undone.');
    if (!confirmed) return;
    store.clearAll();
    closeModal();
    renderAll();
  });
}

function openLeaderboardModal() {
  const entries = getLeaderboardEntries();
  openModal(`
    <span class="overline">${currentPuzzle().date.toUpperCase()}</span>
    <h2>Full leaderboard.</h2>
    <p>Sorted by the precise total time, then by the earliest submission when two results are identical.</p>
    <div class="modal-leaderboard" id="modal-leaderboard"></div>`);
  const target = $('modal-leaderboard');
  renderLeaderboard(entries.length, target);
}

function openFriendsModal() {
  if (!currentUser()) { openAccountModal('create'); return; }
  openModal(`
    <span class="overline">FRIENDS</span>
    <h2>Find your competition.</h2>
    <p>Search a prototype username, add them, and compare their public scores.</p>
    <form class="modal-form" id="friend-search-form">
      <label for="friend-search-input">Search username</label>
      <div class="answer-entry"><input id="friend-search-input" placeholder="Try ChetGPT" /><button class="primary-button" type="submit">Search</button></div>
    </form>
    <div id="friend-search-results"></div>
    <h3 style="margin:28px 0 8px">Your friends</h3>
    <div id="friend-list"></div>`);
  renderFriendList();
  $('friend-search-form').addEventListener('submit', event => {
    event.preventDefault();
    const query = $('friend-search-input').value.trim().toLowerCase();
    const results = DEMO_USERS.filter(user => user.username.toLowerCase().includes(query) && user.username.toLowerCase() !== currentUser().username.toLowerCase());
    const container = $('friend-search-results');
    container.innerHTML = results.length ? results.map(user => friendResultHtml(user)).join('') : '<p class="modal-note">No matching prototype player found.</p>';
    container.querySelectorAll('[data-add-friend]').forEach(button => button.addEventListener('click', () => addFriend(button.dataset.addFriend)));
  });
}

function friendResultHtml(user) {
  const added = getFriends().includes(user.username);
  return `<div class="friend-search-result"><span class="friend-meta"><span class="avatar">${initialsFor(user.username)}</span><span><strong>${escapeHtml(user.username)}</strong><small>Best daily: ${user.best}</small></span></span><button class="small-action" data-add-friend="${escapeHtml(user.username)}" ${added ? 'disabled' : ''}>${added ? 'Added' : 'Add friend'}</button></div>`;
}
function addFriend(username) {
  const friends = getFriends();
  if (!friends.includes(username)) { friends.push(username); store.set('friends', friends); }
  openFriendsModal();
}
function renderFriendList() {
  const container = $('friend-list');
  if (!container) return;
  const friends = getFriends();
  container.innerHTML = friends.length ? friends.map(username => {
    const user = DEMO_USERS.find(item => item.username === username) || { username, best: '--' };
    return `<div class="friend-row"><span class="friend-meta"><span class="avatar">${initialsFor(username)}</span><span><strong>${escapeHtml(username)}</strong><small>Best daily: ${user.best}</small></span></span><button class="small-action" data-remove-friend="${escapeHtml(username)}">Remove</button></div>`;
  }).join('') : '<p class="modal-note">No friends added yet. Search for ChetGPT, HoopMaster, BucketsOnly, or StatSavant.</p>';
  container.querySelectorAll('[data-remove-friend]').forEach(button => button.addEventListener('click', () => {
    store.set('friends', getFriends().filter(name => name !== button.dataset.removeFriend));
    renderFriendList();
  }));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
}

function renderBuildStatus() {
  const status = document.getElementById('build-status');
  if (!status) return;
  const count = Number(PLAYER_DB.meta.playerCount || 0).toLocaleString();
  const aliases = Number(PLAYER_DB.meta.aliasCount || 0).toLocaleString();
  status.textContent = `Version ${PLAYER_DB.meta.buildVersion || '4.0.0'} · ${count} players · ${aliases} official former names`;
}

function renderAll() {
  renderBuildStatus();
  renderAccount();
  renderPuzzleHeader();
  renderLeaderboard();
  renderArchive();
}

$('hero-play-button').addEventListener('click', () => { document.querySelector('.game-shell').scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => startGame('daily'), 300); });
$('how-to-button').addEventListener('click', openHowToModal);
els.startGame.addEventListener('click', () => startGame('daily'));
els.practice.addEventListener('click', () => startGame('practice'));
els.answerForm.addEventListener('submit', submitAnswer);
els.hint.addEventListener('click', useHint);
els.giveUp.addEventListener('click', confirmGiveUp);
els.accountButton.addEventListener('click', () => currentUser() ? openProfileModal() : openAccountModal('login'));
els.accountCta.addEventListener('click', () => currentUser() ? openProfileModal() : openAccountModal('create'));
$('friends-nav').addEventListener('click', openFriendsModal);
$('view-all-leaderboard').addEventListener('click', openLeaderboardModal);
$('modal-close').addEventListener('click', closeModal);
els.modalBackdrop.addEventListener('click', event => { if (event.target === els.modalBackdrop) closeModal(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !els.modalBackdrop.classList.contains('hidden')) closeModal(); });

if ((PLAYER_DB.meta.playerCount || 0) < 5000) {
  console.error('HoopLoop database failed to load completely.', PLAYER_DB.meta);
  document.body.classList.add('database-load-error');
  const startButton = document.getElementById('start-game-button');
  if (startButton) {
    startButton.disabled = true;
    startButton.textContent = 'Database failed to load';
  }
}

renderAll();

console.info('HoopLoop Version 4 player database', PLAYER_DB.meta);
PUZZLES.forEach(puzzle => puzzle.rounds.forEach(round => {
  const count = PLAYER_DB.count(round.initials);
  if (count < 3) console.warn(`Initials ${round.initials.join('')} only have ${count} accepted names.`);
}));
