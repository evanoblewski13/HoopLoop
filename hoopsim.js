(() => {
  'use strict';

  const VERSION = '0.4.0';
  const DB_NAME = 'hoopsim_alpha_db';
  const DB_STORE = 'careers';
  const MAX_SAVES = 6;

  const ATTRIBUTES = [
    ['layup', 'Lay-ups'], ['dunk', 'Dunks'], ['midrange', 'Mid-range'], ['freeThrow', 'Free throw'],
    ['threePoint', '3PT'], ['postMoves', 'Post moves'], ['passing', 'Passing'], ['dribbling', 'Dribbling'],
    ['rebounding', 'Rebounding'], ['interiorDefense', 'Interior defense'], ['perimeterDefense', 'Perimeter defense'],
    ['vertical', 'Vertical'], ['speed', 'Speed'], ['iq', 'IQ'], ['durability', 'Durability']
  ];

  const PLAYSTYLES = {
    'Pure Playmaker': {
      description: 'Elite passer and ball handler with limited scoring, defense, and rebounding.',
      ratings: [58,35,55,65,55,30,92,86,45,48,55,48,72,80,76]
    },
    'Pure Scorer': {
      description: 'Elite scoring package with weak defense, rebounding, and creation for others.',
      ratings: [82,72,84,82,82,70,35,68,25,25,30,58,65,52,70]
    },
    'Lockdown Defender': {
      description: 'Elite defensive foundation with limited offensive polish.',
      ratings: [50,55,42,58,45,45,48,50,65,90,92,70,68,72,50]
    },
    'Offensive Engine': {
      description: 'Strong scorer and passer whose defense and rebounding lag behind.',
      ratings: [72,58,74,72,74,50,82,80,30,28,30,55,68,72,55]
    },
    'Uber Athlete': {
      description: 'Explosive finisher, rebounder, and athlete with weak shooting and playmaking.',
      ratings: [78,92,35,50,30,55,35,48,85,65,55,95,92,40,45]
    },
    'All Around Hooper': {
      description: 'A balanced starting point with no major strength or weakness.',
      ratings: Array(15).fill(60)
    },
    '3&D': {
      description: 'Elite three-point shooting and defense with limited creation and rebounding.',
      ratings: [50,50,55,70,90,35,50,50,35,70,88,55,60,72,70]
    }
  };

  const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];
  const POSITION_HEIGHT = { PG: 75, SG: 77, SF: 79, PF: 81, C: 83 };
  const POSITION_WEIGHT = { PG: 190, SG: 205, SF: 220, PF: 235, C: 250 };
  const FIRST_NAMES = ['Aiden','Andre','Amari','Antonio','Brandon','Bryce','Caleb','Cameron','Cedric','Chris','Darius','Darren','Devin','Donovan','Eli','Elijah','Emmett','Eric','Isaiah','Jabari','Jalen','Jamal','Jared','Jaylen','Jordan','Julian','Kaden','Kai','Kendrick','Kevin','Khalil','Lamar','Malachi','Marcus','Mason','Micah','Miles','Nasir','Noah','Omar','Quentin','Rashad','Reggie','Roman','Samir','Terrence','Tobias','Trevor','Tyrese','Xavier','Zion','Mateo','Luka','Nico','Dante','Dominic','Malik','Desmond','Keon','Kobe','Marcel','Tariq','Javon','Jace','Damian','Ty','Jett','Kellan','Armani','Anthony','Jaxson','Vincent','Sebastian'];
  const LAST_NAMES = ['Adams','Baker','Banks','Bennett','Brooks','Brown','Bryant','Butler','Campbell','Carter','Chambers','Clark','Coleman','Collins','Cook','Cooper','Crawford','Daniels','Davis','Dixon','Edwards','Ellis','Evans','Foster','Franklin','Garcia','Gibson','Gordon','Grant','Green','Hall','Hamilton','Harris','Hayes','Henderson','Hill','Howard','Hughes','Jackson','James','Jefferson','Johnson','Jones','King','Lewis','Long','Marshall','Martin','Matthews','Miller','Mitchell','Moore','Morgan','Morris','Murphy','Nelson','Parker','Peterson','Phillips','Porter','Powell','Price','Reed','Reynolds','Richardson','Rivera','Robinson','Ross','Russell','Sanders','Scott','Simmons','Smith','Stewart','Taylor','Thomas','Thompson','Turner','Walker','Washington','Watson','White','Williams','Wilson','Wright','Young','Stone','Cross','Knight','Fields','Cole','Maddox','Sykes','Holland','Vaughn','Mercer','Rowe','Hawkins','Burke'];
  const INJURY_TYPES = ['ankle sprain','hamstring strain','wrist injury','knee soreness','back tightness','shoulder strain'];
  const EASTER_EGG_NAMES = ['Parker Fontaine','Bryant Wright','Bryan Stender','Beau Lasky','Dominic Kane','Peyton Kane','James Gross','Michael Tushar','Evan Oblewski','Adam Kane','Will Pollack','Josh Pritzl','Gavin Stelter','Jack Seibs','Brian Huo','Michael Tang','Benjamin Fisher'];
  let easterEggQueue = [];
  let draftSession = null;
  let statsSortKey = 'ppg';
  let statsSortDirection = -1;

  const dom = {};
  const creator = {
    step: 'league',
    selectedTeamIds: new Set(),
    attributes: {},
    playerConfig: null,
    leagueConfig: null
  };
  let currentCareer = null;
  let dbPromise = null;
  let toastTimer = null;

  const $ = (id) => document.getElementById(id);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const sanitizeJerseyNumber = (value) => {
    const digits = String(value ?? '').replace(/\D/g, '').slice(0, 2);
    if (!digits) return '0';
    if (digits === '00') return '00';
    return String(clamp(Number(digits), 0, 99));
  };
  const round1 = (value) => Math.round(value * 10) / 10;
  const round3 = (value) => Math.round(value * 1000) / 1000;
  const mean = (values) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
  const sum = (values) => values.reduce((total, value) => total + value, 0);
  const rand = (min = 0, max = 1) => min + Math.random() * (max - min);
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const choose = (items) => items[Math.floor(Math.random() * items.length)];
  const shuffle = (items) => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const uid = (prefix = 'id') => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  const formatDate = (iso) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));
  const formatHeight = (inches) => `${Math.floor(inches / 12)}′${inches % 12}″`;
  const escapeHtml = (text) => String(text ?? '').replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const normalRandom = () => {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const weightedChoice = (entries) => {
    const total = entries.reduce((acc, [, weight]) => acc + weight, 0);
    let roll = Math.random() * total;
    for (const [value, weight] of entries) {
      roll -= weight;
      if (roll <= 0) return value;
    }
    return entries[entries.length - 1][0];
  };
  const binomial = (attempts, probability) => {
    let makes = 0;
    const count = Math.max(0, Math.round(attempts));
    for (let i = 0; i < count; i += 1) if (Math.random() < probability) makes += 1;
    return makes;
  };

  function cacheDom() {
    document.querySelectorAll('[id]').forEach((element) => { dom[element.id] = element; });
  }

  function showToast(message, tone = 'neutral') {
    clearTimeout(toastTimer);
    dom.toast.textContent = message;
    dom.toast.style.background = tone === 'error' ? '#8e1b12' : tone === 'success' ? '#166534' : '#111214';
    dom.toast.classList.remove('hidden');
    toastTimer = setTimeout(() => dom.toast.classList.add('hidden'), 3200);
  }

  function showView(viewId, scroll = true) {
    const alreadyVisible = !$(viewId).classList.contains('hidden');
    ['landing-view', 'creator-view', 'career-view'].forEach((id) => $(id).classList.toggle('hidden', id !== viewId));
    if (scroll && !alreadyVisible) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showCreatorStep(step) {
    creator.step = step;
    ['league', 'player', 'draft'].forEach((name) => {
      $(`${name}-step`).classList.toggle('hidden', name !== step);
      const button = document.querySelector(`.step[data-step="${name}"]`);
      button.classList.toggle('active', name === step);
      button.disabled = name === 'draft' || (name === 'player' && !creator.leagueConfig);
    });
    dom['creator-step-title'].textContent = step === 'league' ? 'Build your league' : step === 'player' ? 'Create your player' : 'Enter the draft';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return dbPromise;
  }

  async function getAllSaves() {
    try {
      const db = await openDb();
      return await new Promise((resolve, reject) => {
        const request = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).getAll();
        request.onsuccess = () => resolve((request.result || []).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(error);
      const fallback = JSON.parse(localStorage.getItem('hoopsim_alpha_saves') || '[]');
      return fallback;
    }
  }

  async function putSave(career) {
    career.updatedAt = new Date().toISOString();
    try {
      const db = await openDb();
      await new Promise((resolve, reject) => {
        const request = db.transaction(DB_STORE, 'readwrite').objectStore(DB_STORE).put(structuredClone(career));
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(error);
      const saves = await getAllSaves();
      const next = saves.filter((save) => save.id !== career.id);
      next.unshift(JSON.parse(JSON.stringify(career)));
      localStorage.setItem('hoopsim_alpha_saves', JSON.stringify(next.slice(0, MAX_SAVES)));
    }
    dom['autosave-status'].textContent = `Saved · ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    refreshContinueButton();
  }

  async function deleteSave(id) {
    try {
      const db = await openDb();
      await new Promise((resolve, reject) => {
        const request = db.transaction(DB_STORE, 'readwrite').objectStore(DB_STORE).delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      const saves = (await getAllSaves()).filter((save) => save.id !== id);
      localStorage.setItem('hoopsim_alpha_saves', JSON.stringify(saves));
    }
  }

  async function getSave(id) {
    const saves = await getAllSaves();
    return saves.find((save) => save.id === id) || null;
  }

  async function refreshContinueButton() {
    const saves = await getAllSaves();
    dom['continue-career-button'].disabled = saves.length === 0;
    dom['continue-career-button'].textContent = saves.length ? `Load a save (${saves.length})` : 'No saves yet';
  }

  function fillSelects() {
    dom['league-size'].innerHTML = Array.from({ length: 22 }, (_, index) => 8 + index * 2)
      .map((size) => `<option value="${size}" ${size === 16 ? 'selected' : ''}>${size} teams</option>`).join('');
    dom['player-playstyle'].innerHTML = Object.keys(PLAYSTYLES).map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');
    const heightOptions = [];
    for (let inches = 65; inches <= 92; inches += 1) heightOptions.push(`<option value="${inches}" ${inches === 75 ? 'selected' : ''}>${formatHeight(inches)}</option>`);
    dom['player-height'].innerHTML = heightOptions.join('');
    updatePlayoffOptions();
  }

  function updatePlayoffOptions() {
    const leagueSize = Number(dom['league-size'].value || 16);
    const valid = [4, 8, 16, 32].filter((size) => size <= leagueSize);
    const previous = Number(dom['playoff-size'].value || 8);
    dom['playoff-size'].innerHTML = valid.map((size) => `<option value="${size}" ${size === previous || (!valid.includes(previous) && size === valid[valid.length - 1]) ? 'selected' : ''}>${size} teams</option>`).join('');
    if (!valid.includes(previous)) dom['playoff-size'].value = String(valid[Math.min(valid.length - 1, 1)] || valid[0]);
    trimTeamSelection();
    renderTeams();
  }

  function autoSelectTeams() {
    const target = Number(dom['league-size'].value);
    creator.selectedTeamIds = new Set(shuffle(window.HOOPSIM_TEAMS).slice(0, target).map((team) => team.id));
    renderTeams();
  }

  function trimTeamSelection() {
    const target = Number(dom['league-size'].value || 16);
    const ids = [...creator.selectedTeamIds];
    if (ids.length > target) creator.selectedTeamIds = new Set(ids.slice(0, target));
  }

  function selectedTeamDefinitions() {
    return window.HOOPSIM_TEAMS.filter((team) => creator.selectedTeamIds.has(team.id));
  }

  function conferenceMapForTeams(teams) {
    const sorted = [...teams].sort((a, b) => a.longitude - b.longitude);
    const halfway = sorted.length / 2;
    const map = new Map();
    sorted.forEach((team, index) => map.set(team.id, index < halfway ? 'West' : 'East'));
    return map;
  }

  function renderTeams() {
    const target = Number(dom['league-size'].value || 16);
    const search = (dom['team-search'].value || '').trim().toLowerCase();
    const selected = selectedTeamDefinitions();
    const conferences = conferenceMapForTeams(selected);
    dom['team-grid'].innerHTML = window.HOOPSIM_TEAMS
      .filter((team) => `${team.name} ${team.city} ${team.state}`.toLowerCase().includes(search))
      .map((team) => {
        const isSelected = creator.selectedTeamIds.has(team.id);
        return `<button class="team-card ${isSelected ? 'selected' : ''}" data-team-id="${team.id}" type="button">
          <span class="team-token">${escapeHtml(team.abbr)}</span>
          <span><strong>${escapeHtml(team.name)}</strong><small>${escapeHtml(team.city)}, ${escapeHtml(team.state)}</small></span>
          ${isSelected ? `<span class="conference-chip">${conferences.get(team.id)}</span>` : ''}
        </button>`;
      }).join('');
    const west = selected.filter((team) => conferences.get(team.id) === 'West').length;
    const east = selected.length - west;
    dom['selected-team-count'].textContent = `${selected.length} / ${target}`;
    dom['west-count'].textContent = west;
    dom['east-count'].textContent = east;
    dom['continue-to-player'].disabled = selected.length !== target;
  }

  function toggleTeam(teamId) {
    const target = Number(dom['league-size'].value);
    if (creator.selectedTeamIds.has(teamId)) creator.selectedTeamIds.delete(teamId);
    else if (creator.selectedTeamIds.size < target) creator.selectedTeamIds.add(teamId);
    else showToast(`You already selected ${target} teams.`, 'error');
    renderTeams();
  }

  function renderAttributeEditor() {
    dom['attribute-grid'].innerHTML = ATTRIBUTES.map(([key, label]) => {
      const value = creator.attributes[key] ?? 60;
      return `<div class="attribute-row" data-attribute="${key}">
        <label for="range-${key}"><span>${label}</span><output id="output-${key}">${value}</output></label>
        <div class="attribute-controls">
          <input id="range-${key}" data-attribute-range="${key}" type="range" min="10" max="99" value="${value}" />
          <input data-attribute-number="${key}" type="number" min="10" max="99" value="${value}" aria-label="${label} rating" />
        </div>
      </div>`;
    }).join('');
    updatePlayerProjection();
  }

  function applyPlaystyleTemplate() {
    const style = dom['player-playstyle'].value;
    const template = PLAYSTYLES[style].ratings;
    ATTRIBUTES.forEach(([key], index) => { creator.attributes[key] = template[index]; });
    renderAttributeEditor();
    showToast(`${style} template applied at 60 OVR.`, 'success');
  }

  function randomizeAttributes() {
    const style = dom['player-playstyle'].value;
    const base = PLAYSTYLES[style].ratings;
    ATTRIBUTES.forEach(([key], index) => { creator.attributes[key] = clamp(Math.round(base[index] + normalRandom() * 9), 10, 99); });
    renderAttributeEditor();
  }

  function setAllAttributes(value) {
    ATTRIBUTES.forEach(([key]) => { creator.attributes[key] = value; });
    renderAttributeEditor();
  }

  function overallFromAttributes(attributes) {
    return Math.round(mean(ATTRIBUTES.map(([key]) => Number(attributes[key] || 10))));
  }

  function projectionForOverall(overall, leagueSize, position) {
    const positionDepth = position === 'C' ? 'Center demand can create larger draft swings.' : position === 'PG' ? 'Point guards receive a small need-based boost.' : 'Team need can move the final selection.';
    let label = 'Likely undrafted';
    if (overall >= 93) label = 'Overwhelming favorite for #1';
    else if (overall >= 88) label = 'Likely #1 pick';
    else if (overall >= 83) label = 'Top 3';
    else if (overall >= 78) label = leagueSize <= 12 ? 'Top half of round' : 'Top 5';
    else if (overall >= 74) label = `Early first round · picks 1–${Math.max(4, Math.ceil(leagueSize * .35))}`;
    else if (overall >= 68) label = `First-round range · picks ${Math.max(2, Math.floor(leagueSize * .2))}–${Math.max(5, Math.ceil(leagueSize * .8))}`;
    else if (overall >= 62) label = 'Late first / fringe draft pick';
    else if (overall >= 56) label = 'Fringe pick / likely undrafted';
    return { label, details: `Projection is relative to a ${leagueSize}-team league. ${positionDepth}`, meter: clamp((overall - 45) / 50 * 100, 4, 100) };
  }

  function updatePlayerProjection() {
    const overall = overallFromAttributes(creator.attributes);
    const projection = projectionForOverall(overall, Number(dom['league-size'].value || 16), dom['player-position'].value || 'PG');
    dom['player-overall'].textContent = overall;
    dom['draft-projection'].textContent = projection.label;
    dom['draft-projection-details'].textContent = projection.details;
    dom['draft-meter-fill'].style.width = `${projection.meter}%`;
    const ranked = ATTRIBUTES.map(([key, label]) => ({ label, value: creator.attributes[key] })).sort((a, b) => b.value - a.value);
    const strongest = ranked.slice(0, 2);
    const weakest = ranked[ranked.length - 1];
    const spread = strongest[0].value - weakest.value;
    dom['projection-factors'].innerHTML = spread === 0
      ? `<li>Perfectly balanced attribute profile</li><li>No single skill controls your draft stock</li><li>Team need and scouting variance matter more</li>`
      : `<li>${escapeHtml(strongest[0].label)} leads your profile at ${strongest[0].value}</li><li>${escapeHtml(strongest[1].label)} supports your draft stock</li><li>${escapeHtml(weakest.label)} is your clearest weakness</li>`;
    const hasName = Boolean(dom['player-name'].value.trim());
    dom['begin-draft-button'].disabled = !hasName;
    dom['player-validation'].textContent = `Current overall: ${overall}. Any rating is allowed; the draft will respond naturally.`;
    dom['player-validation'].classList.remove('error');
  }

  function syncAttribute(key, value) {
    const next = clamp(Number(value) || 10, 10, 99);
    creator.attributes[key] = next;
    const range = document.querySelector(`[data-attribute-range="${key}"]`);
    const number = document.querySelector(`[data-attribute-number="${key}"]`);
    if (range) range.value = next;
    if (number) number.value = next;
    $(`output-${key}`).textContent = next;
    updatePlayerProjection();
  }

  function previewSeasonGamesInput() {
    const rawText = dom['season-games'].value.trim();
    if (!rawText) {
      dom['season-games-help'].textContent = 'Enter a value from 14–99';
      return;
    }
    const raw = Number(rawText);
    if (!Number.isFinite(raw)) {
      dom['season-games-help'].textContent = 'Enter a whole number from 14–99';
    } else if (raw < 14) {
      dom['season-games-help'].textContent = 'Values below 14 will be set to 14';
    } else if (raw > 99) {
      dom['season-games-help'].textContent = 'Values above 99 will be set to 99';
    } else {
      dom['season-games-help'].textContent = `${Math.round(raw)} games selected · allowed range 14–99`;
    }
  }

  function clampSeasonGamesInput() {
    const raw = Number(dom['season-games'].value);
    const games = clamp(Number.isFinite(raw) ? Math.round(raw) : 14, 14, 99);
    dom['season-games'].value = String(games);
    dom['season-games-help'].textContent = `${games} games selected · allowed range 14–99`;
    return games;
  }

  function validateLeagueConfig() {
    const size = Number(dom['league-size'].value);
    const games = clampSeasonGamesInput();
    if (creator.selectedTeamIds.size !== size) {
      showToast(`Select exactly ${size} teams first.`, 'error');
      return false;
    }
    const selected = selectedTeamDefinitions();
    const conferenceMap = conferenceMapForTeams(selected);
    creator.leagueConfig = {
      name: dom['league-name'].value.trim() || 'HoopSim League',
      size,
      games,
      playoffSize: Number(dom['playoff-size'].value),
      seriesLength: Number(dom['series-length'].value),
      injuriesEnabled: dom['injuries-enabled'].checked,
      teams: selected.map((team) => ({ ...team, conference: conferenceMap.get(team.id) }))
    };
    return true;
  }

  function gatherPlayerConfig() {
    const name = dom['player-name'].value.trim() || 'Rookie Player';
    const overall = overallFromAttributes(creator.attributes);
    return {
      name,
      age: clamp(Number(dom['player-age'].value), 18, 30),
      position: dom['player-position'].value,
      playstyle: dom['player-playstyle'].value,
      height: Number(dom['player-height'].value),
      weight: clamp(Number(dom['player-weight'].value), 140, 400),
      jerseyNumber: sanitizeJerseyNumber(dom['player-jersey'].value),
      attributes: { ...creator.attributes },
      overall
    };
  }

  function prepareEasterEggQueue(existingNames = new Set()) {
    easterEggQueue = [];
    if (Math.random() < .32) {
      const available = EASTER_EGG_NAMES.filter((name) => !existingNames.has(name));
      if (available.length) easterEggQueue.push(choose(available));
      if (Math.random() < .10) {
        const remaining = available.filter((name) => !easterEggQueue.includes(name));
        if (remaining.length) easterEggQueue.push(choose(remaining));
      }
    }
  }

  function fakeName(existingNames) {
    let name = '';
    while (easterEggQueue.length) {
      const candidate = easterEggQueue.shift();
      if (!existingNames.has(candidate)) {
        existingNames.add(candidate);
        return candidate;
      }
    }
    do name = `${choose(FIRST_NAMES)} ${choose(LAST_NAMES)}`; while (existingNames.has(name));
    existingNames.add(name);
    return name;
  }

  function adjustAttributesToTarget(attributes, target) {
    const copy = { ...attributes };
    let guard = 0;
    while (overallFromAttributes(copy) !== target && guard < 1000) {
      const current = overallFromAttributes(copy);
      const direction = current < target ? 1 : -1;
      const keys = ATTRIBUTES.map(([key]) => key).filter((key) => direction > 0 ? copy[key] < 99 : copy[key] > 10);
      if (!keys.length) break;
      copy[choose(keys)] += direction;
      guard += 1;
    }
    return copy;
  }

  function generatedAttributes(playstyle, targetOverall) {
    const base = PLAYSTYLES[playstyle].ratings;
    const shift = targetOverall - 60;
    const attrs = {};
    ATTRIBUTES.forEach(([key], index) => { attrs[key] = clamp(Math.round(base[index] + shift + normalRandom() * 4.5), 10, 99); });
    return adjustAttributesToTarget(attrs, targetOverall);
  }

  function createStats() {
    return { games:0, starts:0, minutes:0, points:0, rebounds:0, assists:0, steals:0, blocks:0, turnovers:0, fgm:0, fga:0, threeM:0, threeA:0, ftm:0, fta:0, fouls:0 };
  }

  function createGeneratedPlayer({ name, age, position, playstyle, targetOverall, teamId = null, rookie = false, existingNames }) {
    const height = clamp(Math.round(POSITION_HEIGHT[position] + normalRandom() * 2), 67, 90);
    const weight = clamp(Math.round(POSITION_WEIGHT[position] + normalRandom() * 16), 150, 360);
    const attributes = generatedAttributes(playstyle, targetOverall);
    const contractYears = rookie ? 4 : weightedChoice([[3,3],[4,5],[5,4],[2,1],[1,.5]]);
    return {
      id: uid('player'), name: name || fakeName(existingNames), age, position, playstyle, height, weight,
      attributes, overall: overallFromAttributes(attributes), teamId, isUser: false, isRookie: rookie,
      contractYears, contractLength: contractYears,
      role: 'Reserve', projectedMinutes: 0, injury: null, majorInjuries: 0,
      stats: { regular: createStats(), playoffs: createStats() }, seasonHistory: [], accolades: []
    };
  }

  function createUserPlayer(config) {
    return {
      id: uid('user'), ...config, jerseyNumber: sanitizeJerseyNumber(config.jerseyNumber ?? '1'), teamId: null, isUser: true, isRookie: true, contractYears: 4, contractLength: 4,
      role: 'Prospect', projectedMinutes: 0, injury: null, majorInjuries: 0,
      stats: { regular: createStats(), playoffs: createStats() }, seasonHistory: [], accolades: []
    };
  }

  function generateTeamQuality(index, count) {
    const tier = index / count;
    if (tier < .15) return randInt(79, 83);
    if (tier < .40) return randInt(75, 79);
    if (tier < .80) return randInt(70, 76);
    return randInt(66, 72);
  }

  function generateLeagueTeams(config, existingNames) {
    const qualities = shuffle(config.teams.map((_, index) => generateTeamQuality(index, config.teams.length)));
    return config.teams.map((definition, index) => {
      const quality = qualities[index];
      const roster = [];
      const targetBySlot = [quality + 8, quality + 4, quality + 2, quality, quality - 1, quality - 4, quality - 6, quality - 7, quality - 9, quality - 10, quality - 12];
      targetBySlot.forEach((target, slot) => {
        const position = slot < 5 ? POSITIONS[slot] : choose(POSITIONS);
        roster.push(createGeneratedPlayer({
          age: randInt(21, 34), position, playstyle: choose(Object.keys(PLAYSTYLES)),
          targetOverall: clamp(Math.round(target + normalRandom() * 2), 52, slot === 0 ? 92 : 88),
          teamId: definition.id, rookie: false, existingNames
        }));
      });
      return {
        ...definition, quality, coachRating: clamp(Math.round(quality + normalRandom() * 5), 55, 90),
        expectedWinPct: clamp(.25 + (quality - 65) * .025, .25, .72), roster,
        record: { wins:0, losses:0, pointsFor:0, pointsAgainst:0 }, draftPick: null
      };
    });
  }

  function generateDraftClass(count, userPlayer, existingNames) {
    const prospects = [userPlayer];
    for (let i = 1; i < count; i += 1) {
      // Larger leagues reach deeper into the class. Most first-round prospects land in the high 60s,
      // while late selections can fall near 60 and generated rookies never exceed 75.
      const target = clamp(Math.round(51 + Math.pow(Math.random(), .92) * 24 + normalRandom() * 2.2), 45, 75);
      prospects.push(createGeneratedPlayer({ age: randInt(18,22), position: choose(POSITIONS), playstyle: choose(Object.keys(PLAYSTYLES)), targetOverall: target, rookie: true, existingNames }));
    }
    return prospects;
  }

  function teamNeedScore(team, prospect) {
    const samePosition = team.roster.filter((player) => player.position === prospect.position).sort((a,b) => b.overall - a.overall);
    const bestAtPosition = samePosition[0]?.overall || 50;
    const depth = samePosition.length;
    let need = clamp((78 - bestAtPosition) * .18, -2, 5);
    if (depth < 2) need += 1.5;
    if (prospect.position === 'PG') need += .3;
    return need;
  }

  function prospectDraftScore(team, prospect) {
    const scoutingNoise = normalRandom() * 1.3;
    const need = teamNeedScore(team, prospect);
    const generationalBoost = prospect.overall >= 88 ? 7 : prospect.overall >= 83 ? 4 : 0;
    return prospect.overall + need + scoutingNoise + generationalBoost;
  }

  async function runDraft() {
    showCreatorStep('draft');
    dom['draft-board'].innerHTML = '';
    dom['draft-result'].classList.add('hidden');
    dom['undrafted-offers'].classList.add('hidden');
    dom['continue-after-draft'].classList.add('hidden');
    dom['draft-mode-controls'].classList.add('hidden');
    dom['manual-draft-controls'].classList.add('hidden');
    dom['draft-selection-detail'].classList.add('hidden');
    dom['draft-headline'].textContent = 'Generating your basketball world…';

    const userPlayer = createUserPlayer(creator.playerConfig);
    const existingNames = new Set([userPlayer.name]);
    prepareEasterEggQueue(existingNames);
    const teams = generateLeagueTeams(creator.leagueConfig, existingNames);
    const prospects = generateDraftClass(Math.ceil(teams.length * 1.35), userPlayer, existingNames);
    const draftOrder = shuffle(teams.map((team) => team.id));
    const draftPicks = [];
    currentCareer = buildCareerState(creator.leagueConfig, teams, prospects, draftPicks, userPlayer.id);
    currentCareer.phase = 'draft';
    draftSession = { teams, prospects, draftOrder, draftPicks, nextPick: 0, complete: false };

    await sleep(250);
    dom['draft-headline'].textContent = `${creator.leagueConfig.name} Draft`;
    dom['draft-mode-controls'].classList.remove('hidden');
    renderDraftOutlook();
  }

  function renderDraftOutlook() {
    if (!draftSession || draftSession.complete) return;
    const pickNumber = draftSession.nextPick + 1;
    const team = getTeam(draftSession.draftOrder[draftSession.nextPick]);
    const available = draftSession.prospects.filter((prospect) => !prospect.drafted)
      .sort((a,b) => prospectDraftScore(team,b) - prospectDraftScore(team,a));
    const top = available.slice(0,5);
    dom['draft-selection-detail'].innerHTML = `<div class="draft-outlook-card"><span class="eyebrow">ON THE CLOCK · PICK #${pickNumber}</span><h3>${escapeHtml(team.name)}</h3><p>Top available prospects for this roster:</p><div class="prospect-mini-list">${top.map((player,index)=>`<div><strong>${index+1}. ${escapeHtml(player.name)}</strong><span>${player.position} · ${player.overall} OVR · ${formatHeight(player.height)} · ${player.weight} lbs</span></div>`).join('')}</div></div>`;
    dom['draft-selection-detail'].classList.remove('hidden');
  }

  function renderDraftedProspect(selected, team, pickNumber) {
    const strongest = ATTRIBUTES.map(([key,label])=>({label,value:selected.attributes[key]})).sort((a,b)=>b.value-a.value).slice(0,4);
    dom['draft-selection-detail'].innerHTML = `<article class="drafted-prospect-card ${selected.isUser?'user-selection':''}">
      <div><span class="eyebrow">PICK #${pickNumber} · ${escapeHtml(team.abbr)}</span><h3>${escapeHtml(selected.name)}</h3><p>${selected.position} · ${formatHeight(selected.height)} · ${selected.weight} lbs · ${escapeHtml(selected.playstyle)}</p></div>
      <div class="drafted-overall"><strong>${selected.overall}</strong><span>OVR</span></div>
      <div class="drafted-skills">${strongest.map((skill)=>`<span>${escapeHtml(skill.label)} <strong>${skill.value}</strong></span>`).join('')}</div>
    </article>`;
    dom['draft-selection-detail'].classList.remove('hidden');
  }

  function completeOneDraftPick() {
    if (!draftSession || draftSession.complete || draftSession.nextPick >= draftSession.draftOrder.length) return null;
    const pickIndex = draftSession.nextPick;
    const team = getTeam(draftSession.draftOrder[pickIndex]);
    const available = draftSession.prospects.filter((prospect) => !prospect.drafted);
    const selected = [...available].sort((a, b) => prospectDraftScore(team, b) - prospectDraftScore(team, a))[0];
    selected.drafted = true;
    selected.draftPick = pickIndex + 1;
    selected.teamId = team.id;
    team.draftPick = selected.id;
    team.roster.push(selected);
    draftSession.draftPicks.push({ pick: pickIndex + 1, teamId: team.id, playerId: selected.id });
    draftSession.nextPick += 1;

    const row = document.createElement('div');
    row.className = `draft-pick ${selected.isUser ? 'user-pick' : ''}`;
    row.innerHTML = `<span class="pick-number">#${pickIndex + 1}</span><button class="player-name-button" data-player-id="${selected.id}" type="button"><strong>${escapeHtml(selected.name)}</strong><small>${selected.position} · ${escapeHtml(selected.playstyle)} · ${escapeHtml(team.name)}</small></button><span class="pick-overall">${selected.overall} OVR</span>`;
    dom['draft-board'].appendChild(row);
    renderDraftedProspect(selected, team, pickIndex + 1);
    if (selected.isUser) row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (draftSession.nextPick >= draftSession.draftOrder.length) finishDraftProcess();
    return selected;
  }

  function startManualDraft() {
    if (!draftSession || draftSession.complete) return;
    dom['draft-mode-controls'].classList.add('hidden');
    dom['manual-draft-controls'].classList.remove('hidden');
    renderDraftOutlook();
  }

  async function simulateRemainingDraft() {
    if (!draftSession || draftSession.complete) return;
    dom['draft-mode-controls'].classList.add('hidden');
    dom['manual-draft-controls'].classList.add('hidden');
    while (draftSession && !draftSession.complete && draftSession.nextPick < draftSession.draftOrder.length) {
      completeOneDraftPick();
      if (draftSession.nextPick % 6 === 0) await sleep(0);
    }
  }

  function draftNextPick() {
    if (!draftSession || draftSession.complete) return;
    completeOneDraftPick();
    if (draftSession && !draftSession.complete) renderDraftOutlook();
  }

  function finishDraftProcess() {
    if (!draftSession || draftSession.complete) return;
    draftSession.complete = true;
    currentCareer.phase = 'preseason';
    dom['draft-mode-controls'].classList.add('hidden');
    dom['manual-draft-controls'].classList.add('hidden');
    const userPlayer = getUserPlayer();
    if (userPlayer?.draftPick) {
      const team = getTeam(userPlayer.teamId);
      dom['draft-result'].innerHTML = `<span class="eyebrow">DRAFTED</span><h2>${escapeHtml(team.name)} select ${escapeHtml(userPlayer.name)}.</h2><p>You were selected <strong>#${userPlayer.draftPick}</strong> overall at ${userPlayer.overall} OVR. Your guaranteed rookie contract runs four seasons.</p>`;
      dom['draft-result'].classList.remove('hidden');
      finalizeLeagueAfterRosterChoice();
      dom['continue-after-draft'].classList.remove('hidden');
    } else {
      showUndraftedOffers(userPlayer);
    }
  }

  function buildCareerState(config, teams, prospects, draftPicks, userPlayerId) {
    return {
      version: VERSION, id: uid('career'), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      league: { ...config, season: 1 }, teams, prospects, draftPicks, userPlayerId,
      schedule: [], currentRound: 0, phase: 'preseason', awards: null, playoffs: null,
      champion: null, finalsMvp: null, completed: false, careerEvents: [],
      settings: { injuriesEnabled: config.injuriesEnabled }, rosterViewTeamId:null, lastKnownUserTeamId:null,
      tradeRequestSeason:null
    };
  }

  function showUndraftedOffers(userPlayer) {
    const offers = [...currentCareer.teams]
      .map((team) => ({ team, score: teamNeedScore(team, userPlayer) + team.roster.filter((player) => player.overall <= userPlayer.overall).length * .7 + rand(-1,1) }))
      .sort((a,b) => b.score - a.score).slice(0, 3);
    dom['draft-result'].innerHTML = `<span class="eyebrow">UNDRAFTED</span><h2>${escapeHtml(userPlayer.name)} was not selected.</h2><p>Choose one of three teams offering a roster spot. You will begin on a one-year deal.</p>`;
    dom['draft-result'].classList.remove('hidden');
    dom['undrafted-offers'].innerHTML = `<div class="offer-grid">${offers.map(({ team }) => {
      const samePos = team.roster.filter((player) => player.position === userPlayer.position).sort((a,b)=>b.overall-a.overall)[0];
      return `<article class="offer-card"><span class="eyebrow">ROSTER OFFER</span><h3>${escapeHtml(team.name)}</h3><p>${team.conference} · Team quality ${team.quality}</p><p>Best ${userPlayer.position}: ${samePos ? `${samePos.overall} OVR` : 'No established player'}</p><button class="primary-button wide" data-sign-team="${team.id}" type="button">Sign here</button></article>`;
    }).join('')}</div>`;
    dom['undrafted-offers'].classList.remove('hidden');
  }

  function signUndrafted(teamId) {
    const team = currentCareer.teams.find((entry) => entry.id === teamId);
    const user = getUserPlayer();
    const lowest = [...team.roster].sort((a,b) => a.overall - b.overall)[0];
    team.roster = team.roster.filter((player) => player.id !== lowest.id);
    user.teamId = team.id;
    user.contractYears = 1;
    user.contractLength = 1;
    team.roster.push(user);
    currentCareer.rosterViewTeamId = team.id;
    currentCareer.lastKnownUserTeamId = team.id;
    recordLeagueNews('signing', `${user.name} signed with ${team.name} after going undrafted.`, 1);
    dom['undrafted-offers'].classList.add('hidden');
    dom['draft-result'].innerHTML = `<span class="eyebrow">SIGNED</span><h2>${escapeHtml(team.name)} give ${escapeHtml(user.name)} a chance.</h2><p>You signed a one-year rookie deal after going undrafted. Your role will be determined by the roster.</p>`;
    finalizeLeagueAfterRosterChoice();
    dom['continue-after-draft'].classList.remove('hidden');
  }

  function finalizeLeagueAfterRosterChoice() {
    currentCareer.teams.forEach((team) => updateTeamRotation(team));
    currentCareer.schedule = buildSchedule(currentCareer.teams.map((team) => team.id), currentCareer.league.games);
    currentCareer.phase = 'regular';
    const user = getUserPlayer();
    const team = getTeam(user.teamId);
    currentCareer.careerEvents.push({ type:'draft', season:1, text:user.draftPick ? `Drafted #${user.draftPick} by ${team.name}.` : `Signed with ${team.name} after the draft.` });
  }

  function buildSchedule(teamIds, gamesPerTeam) {
    const ids = [...teamIds];
    const baseRounds = [];
    let rotation = [...ids];
    for (let round = 0; round < ids.length - 1; round += 1) {
      const games = [];
      for (let i = 0; i < ids.length / 2; i += 1) {
        const a = rotation[i];
        const b = rotation[ids.length - 1 - i];
        const swap = (round + i) % 2 === 1;
        games.push({ homeId: swap ? b : a, awayId: swap ? a : b });
      }
      baseRounds.push(games);
      rotation = [rotation[0], rotation[rotation.length - 1], ...rotation.slice(1, -1)];
    }
    const schedule = [];
    for (let round = 0; round < gamesPerTeam; round += 1) {
      const cycle = Math.floor(round / baseRounds.length);
      const base = baseRounds[round % baseRounds.length];
      schedule.push(base.map((game, index) => {
        const swap = cycle % 2 === 1;
        return { id: uid('game'), round, homeId: swap ? game.awayId : game.homeId, awayId: swap ? game.homeId : game.awayId, played:false, result:null, index };
      }));
    }
    return schedule;
  }

  function getUserPlayer() {
    for (const team of currentCareer?.teams || []) {
      const player = team.roster.find((entry) => entry.id === currentCareer.userPlayerId);
      if (player) return player;
    }
    return currentCareer?.prospects?.find((entry) => entry.id === currentCareer.userPlayerId) || null;
  }
  function getTeam(teamId) { return currentCareer.teams.find((team) => team.id === teamId); }
  function allPlayers() { return currentCareer.teams.flatMap((team) => team.roster); }

  function recordLeagueNews(category, text, season = currentCareer?.league?.season || 1) {
    if (!currentCareer) return;
    currentCareer.careerEvents ||= [];
    currentCareer.careerEvents.push({ id: uid('news'), category, type: category, season, text, createdAt: new Date().toISOString() });
  }

  function addAccolade(player, label, season = currentCareer.league.season, teamId = player.teamId) {
    player.accolades ||= [];
    if (!player.accolades.some((award) => award.season === season && award.label === label)) {
      player.accolades.push({ season, label, teamId });
    }
  }

  function rotationScore(player, team) {
    const gamesPlayed = team.record.wins + team.record.losses;
    const winPct = gamesPlayed ? team.record.wins / gamesPlayed : team.expectedWinPct;
    let score = player.overall;
    if (player.age <= 22 && gamesPlayed >= Math.max(5, Math.floor(currentCareer.league.games * .15)) && winPct < .45) {
      const youth = (23 - player.age) * .55;
      const developmentOpportunity = clamp((.45 - winPct) * 18, 0, 5);
      score += youth + developmentOpportunity;
    }
    if (winPct >= .58 && player.age <= 22 && player.overall < 70) score -= 1.5;
    return score;
  }

  function chooseStartingFive(roster) {
    const team = roster.length ? getTeam(roster[0].teamId) : null;
    const available = roster.filter((player) => !player.injury || player.injury.gamesRemaining <= 0);
    const selected = [];
    POSITIONS.forEach((position) => {
      const candidate = available.filter((player) => player.position === position && !selected.includes(player)).sort((a,b) => rotationScore(b, team)-rotationScore(a, team))[0];
      if (candidate) selected.push(candidate);
    });
    available.sort((a,b) => rotationScore(b, team)-rotationScore(a, team)).forEach((player) => { if (selected.length < 5 && !selected.includes(player)) selected.push(player); });
    return selected;
  }

  function updateTeamRotation(team, playoff = false) {
    const available = team.roster.filter((player) => !player.injury || player.injury.gamesRemaining <= 0).sort((a,b) => rotationScore(b, team)-rotationScore(a, team));
    const starters = chooseStartingFive(team.roster);
    const regularSize = available.length >= 10 ? 10 : Math.min(9, available.length);
    const rotationSize = playoff ? Math.min(9, available.length) : regularSize;
    const rotation = [...starters, ...available.filter((player) => !starters.includes(player))].slice(0, rotationSize);
    const regularSlots = rotationSize >= 10 ? [36,34,32,30,28,22,18,16,13,11] : [37,35,33,31,29,23,20,17,15];
    const playoffSlotsBySize = {
      9: [40,39,38,37,36,20,14,10,6],
      8: [41,40,39,38,37,20,15,10],
      7: [42,41,40,39,38,22,18],
      6: [43,42,41,40,39,35],
      5: [48,48,48,48,48]
    };
    const minuteSlots = playoff ? (playoffSlotsBySize[rotationSize] || regularSlots) : regularSlots;
    team.roster.forEach((player) => {
      const index = rotation.indexOf(player);
      player.projectedMinutes = index >= 0 ? minuteSlots[index] : 0;
      player.role = index < 0 ? (player.injury ? 'Injured Reserve' : 'Reserve') : index < 5 ? 'Starter' : index === 5 ? 'Sixth Man' : 'Rotation';
    });
  }

  function advanceExistingInjuries(team, injuredBeforeGame) {
    injuredBeforeGame.forEach((playerId) => {
      const player = team.roster.find((entry) => entry.id === playerId);
      if (!player?.injury) return;
      player.injury.gamesRemaining -= 1;
      if (player.injury.gamesRemaining <= 0) player.injury = null;
    });
  }

  function averageDefense(team) {
    const rotation = team.roster.filter((player) => player.projectedMinutes > 0 && !player.injury);
    if (!rotation.length) return 55;
    return sum(rotation.map((player) => ((player.attributes.interiorDefense + player.attributes.perimeterDefense + player.attributes.iq) / 3) * player.projectedMinutes)) / sum(rotation.map((player) => player.projectedMinutes));
  }

  function teamOffensiveSupport(team, focalPlayerId) {
    const teammates = team.roster.filter((player) => player.id !== focalPlayerId && player.projectedMinutes > 0 && !player.injury);
    if (!teammates.length) return .82;
    const weightedSkill = sum(teammates.map((player) => {
      const scoring = mean([player.attributes.layup, player.attributes.dunk, player.attributes.midrange, player.attributes.threePoint, player.attributes.postMoves]);
      return scoring * player.projectedMinutes;
    })) / Math.max(1, sum(teammates.map((player) => player.projectedMinutes)));
    return clamp(.72 + (weightedSkill - 48) * .012, .72, 1.28);
  }

  function simulatePlayerBox(player, opponentDefense, coachRating, offenseSupport = 1) {
    const minutes = player.projectedMinutes;
    const a = player.attributes;
    const scoringSkill = mean([a.layup, a.dunk, a.midrange, a.threePoint, a.postMoves]);
    const creation = mean([a.passing, a.dribbling, a.iq]);
    const defenseFactor = clamp(1 + (70 - opponentDefense) * .003, .88, 1.10);
    const coachFactor = clamp(1 + (coachRating - 70) * .0015, .96, 1.05);
    const sizeFinishing = clamp((player.height - POSITION_HEIGHT[player.position]) * .008 + (a.vertical - 60) * .0015, -.05, .09);
    const playstyleFga = player.playstyle === 'Pure Scorer' ? 2.7 : player.playstyle === 'Offensive Engine' ? 1.5 : player.playstyle === 'Pure Playmaker' ? -1.1 : player.playstyle === '3&D' ? -.25 : 0;
    const fgaPer36 = clamp(3.2 + scoringSkill / 10.7 + a.dribbling / 58 + playstyleFga, 3.2, 21.5);
    const fga = Math.max(0, Math.round(fgaPer36 * minutes / 36 * rand(.88,1.12)));
    const threeRate = clamp(.05 + a.threePoint / 235 + (player.playstyle === '3&D' ? .15 : 0) + (player.playstyle === 'Pure Scorer' ? .04 : 0), .03, .70);
    const threeA = Math.min(fga, Math.round(fga * threeRate * rand(.86,1.14)));
    const twoA = Math.max(0, fga - threeA);
    const twoSkill = mean([a.layup, a.dunk, a.midrange, a.postMoves]);
    const twoPct = clamp((.365 + twoSkill * .00245 + sizeFinishing) * defenseFactor * coachFactor, .34, .69);
    const threePct = clamp((.205 + a.threePoint * .0027) * defenseFactor * coachFactor, .19, .49);
    const threeM = binomial(threeA, threePct);
    const twoM = binomial(twoA, twoPct);
    const ftaPer36 = clamp(.45 + (a.layup + a.dunk + a.postMoves) / 56 + Math.max(0, player.height - 78) * .035 + (player.playstyle === 'Pure Scorer' ? 1 : 0), .4, 11);
    const fta = Math.round(ftaPer36 * minutes / 36 * rand(.68,1.32));
    const ftPct = clamp(.45 + a.freeThrow * .005, .50, .96);
    const ftm = binomial(fta, ftPct);
    const points = twoM * 2 + threeM * 3 + ftm;
    const positionReb = { PG:.15, SG:.35, SF:.85, PF:1.75, C:2.8 }[player.position];
    const heightReb = Math.max(-.6, (player.height - POSITION_HEIGHT[player.position]) * .30);
    const verticalReb = (a.vertical - 50) / 30;
    const eliteSizeBonus = Math.max(0, player.height - 86) * .50 + Math.max(0, a.rebounding - 85) * .20;
    const reboundPer36 = .2 + a.rebounding / 12 + positionReb + heightReb + verticalReb + eliteSizeBonus + (player.playstyle === 'Uber Athlete' ? .8 : 0);
    const rebounds = Math.max(0, Math.round(reboundPer36 * minutes / 36 * rand(.78,1.22)));
    const posAst = player.position === 'PG' ? 1.45 : player.position === 'SG' ? .55 : player.position === 'SF' ? .2 : 0;
    const playmakerBonus = player.playstyle === 'Pure Playmaker' ? 2.1 : player.playstyle === 'Offensive Engine' ? 1.05 : 0;
    const assistPer36 = .15 + a.passing / 14.2 + a.dribbling / 60 + posAst + playmakerBonus;
    const passingLeverage = clamp(.78 + (a.passing - 50) * .006, .65, 1.08);
    const talentMultiplier = clamp(1 + (offenseSupport - 1) * passingLeverage, .68, 1.34);
    const assists = Math.max(0, Math.round(assistPer36 * talentMultiplier * minutes / 36 * rand(.72,1.28)));
    const steals = Math.max(0, Math.round((.12 + a.perimeterDefense / 76 + a.iq / 205 + (player.playstyle === 'Lockdown Defender' ? .52 : 0)) * minutes / 36 * rand(.55,1.45)));
    const heightBonus = Math.max(-.15, (player.height - POSITION_HEIGHT[player.position]) / 8);
    const verticalBlock = Math.max(0, (a.vertical - 55) / 80);
    const blocks = Math.max(0, Math.round((.03 + a.interiorDefense / 78 + heightBonus + verticalBlock + (player.position === 'C' ? .42 : player.position === 'PF' ? .18 : 0)) * minutes / 36 * rand(.52,1.48)));
    const turnovers = Math.max(0, Math.round((.35 + fga / 17 + assists / 4 + creation / 155 - a.iq / 215) * rand(.65,1.35)));
    const fouls = Math.max(0, Math.round((1.1 + (100-a.iq)/62) * minutes / 36 * rand(.55,1.45)));
    return { playerId:player.id, playerName:player.name, position:player.position, overall:player.overall, minutes, points, rebounds, assists, steals, blocks, turnovers, fgm:twoM+threeM, fga, threeM, threeA, ftm, fta, fouls, starter:player.role==='Starter' };
  }

  function addBoxToStats(stats, box) {
    stats.games += 1;
    if (box.starter) stats.starts += 1;
    ['minutes','points','rebounds','assists','steals','blocks','turnovers','fgm','fga','threeM','threeA','ftm','fta','fouls'].forEach((key) => { stats[key] += box[key]; });
  }

  function maybeInjurePlayer(player, team) {
    if (!currentCareer.settings.injuriesEnabled || player.injury || player.projectedMinutes <= 0) return;
    if (team.roster.filter((entry) => entry.injury).length >= 2) return;
    const chance = .002 + (100 - player.attributes.durability) * .00012 * (player.projectedMinutes / 30);
    if (Math.random() >= chance) return;
    const severity = Math.random();
    let games = randInt(1,3), label = choose(INJURY_TYPES), major = false;
    if (severity > .93) { games = randInt(14,35); label = choose(['torn ligament','fractured foot','major knee injury']); major = true; }
    else if (severity > .72) { games = randInt(4,12); label = choose(['high ankle sprain','moderate hamstring injury','hand fracture']); }
    player.injury = { label, gamesRemaining: games, originalGames: games };
    if (major) player.majorInjuries += 1;
  }

  function simulateGame(homeTeam, awayTeam, playoff = false) {
    const homeInjuredBefore = homeTeam.roster.filter((player) => player.injury).map((player) => player.id);
    const awayInjuredBefore = awayTeam.roster.filter((player) => player.injury).map((player) => player.id);
    updateTeamRotation(homeTeam, playoff); updateTeamRotation(awayTeam, playoff);
    const homeDefense = averageDefense(homeTeam);
    const awayDefense = averageDefense(awayTeam);
    const homeBoxes = homeTeam.roster.filter((player) => player.projectedMinutes > 0 && !player.injury).map((player) => simulatePlayerBox(player, awayDefense, homeTeam.coachRating, teamOffensiveSupport(homeTeam, player.id)));
    const awayBoxes = awayTeam.roster.filter((player) => player.projectedMinutes > 0 && !player.injury).map((player) => simulatePlayerBox(player, homeDefense, awayTeam.coachRating, teamOffensiveSupport(awayTeam, player.id)));
    let homeScore = sum(homeBoxes.map((box) => box.points));
    let awayScore = sum(awayBoxes.map((box) => box.points));
    const homeCourt = randInt(0,3);
    homeScore += homeCourt;
    if (homeBoxes.length) { homeBoxes[0].points += homeCourt; homeBoxes[0].ftm += homeCourt; homeBoxes[0].fta += homeCourt; }
    if (homeScore === awayScore) {
      const winnerBoxes = Math.random() < .53 ? homeBoxes : awayBoxes;
      const bonus = randInt(1,5);
      if (winnerBoxes.length) { winnerBoxes[0].points += bonus; winnerBoxes[0].ftm += bonus; winnerBoxes[0].fta += bonus; }
      if (winnerBoxes === homeBoxes) homeScore += bonus; else awayScore += bonus;
    }
    const statType = playoff ? 'playoffs' : 'regular';
    homeBoxes.forEach((box) => addBoxToStats(homeTeam.roster.find((p) => p.id === box.playerId).stats[statType], box));
    awayBoxes.forEach((box) => addBoxToStats(awayTeam.roster.find((p) => p.id === box.playerId).stats[statType], box));
    if (!playoff) {
      const homeWon = homeScore > awayScore;
      homeTeam.record[homeWon ? 'wins' : 'losses'] += 1;
      awayTeam.record[homeWon ? 'losses' : 'wins'] += 1;
      homeTeam.record.pointsFor += homeScore; homeTeam.record.pointsAgainst += awayScore;
      awayTeam.record.pointsFor += awayScore; awayTeam.record.pointsAgainst += homeScore;
    }
    advanceExistingInjuries(homeTeam, homeInjuredBefore);
    advanceExistingInjuries(awayTeam, awayInjuredBefore);
    homeTeam.roster.forEach((player) => maybeInjurePlayer(player, homeTeam));
    awayTeam.roster.forEach((player) => maybeInjurePlayer(player, awayTeam));
    updateTeamRotation(homeTeam); updateTeamRotation(awayTeam);
    return { id:uid('game'), season:currentCareer.league.season, homeId:homeTeam.id, awayId:awayTeam.id, homeScore, awayScore, winnerId:homeScore>awayScore?homeTeam.id:awayTeam.id, homeBoxes, awayBoxes, homeInjuredBefore, awayInjuredBefore, playoff };
  }

  function userGameEntry(result, context = {}) {
    const user = getUserPlayer();
    if (![result.homeId, result.awayId].includes(user.teamId)) return null;
    const opponentId = result.homeId === user.teamId ? result.awayId : result.homeId;
    const boxes = result.homeId === user.teamId ? result.homeBoxes : result.awayBoxes;
    const injuredBefore = result.homeId === user.teamId ? result.homeInjuredBefore : result.awayInjuredBefore;
    const box = boxes.find((entry) => entry.playerId === user.id);
    const userScore = result.homeId === user.teamId ? result.homeScore : result.awayScore;
    const oppScore = result.homeId === user.teamId ? result.awayScore : result.homeScore;
    const dnpReason = box ? null : injuredBefore?.includes(user.id) ? 'Injury' : 'Coach’s decision';
    return {
      round: context.round ?? currentCareer.currentRound + 1,
      opponentId,
      result: userScore > oppScore ? 'W' : 'L',
      score: `${userScore}-${oppScore}`,
      box: box || null,
      dnpReason,
      playoff: Boolean(context.playoff),
      playoffStage: context.stage || null,
      playoffRound: context.playoffRound || null,
      seriesGame: context.seriesGame || null,
      gameId: result.id || null
    };
  }

  async function simulateRegularRounds(count) {
    if (!currentCareer || currentCareer.phase !== 'regular') return;
    const remaining = currentCareer.league.games - currentCareer.currentRound;
    const rounds = Math.min(count, remaining);
    if (rounds <= 0) return;
    disableSimButtons(true);
    dom['sim-message'].textContent = `Simulating ${rounds} game${rounds===1?'':'s'} for every team…`;
    for (let r = 0; r < rounds; r += 1) {
      const roundGames = currentCareer.schedule[currentCareer.currentRound];
      roundGames.forEach((game) => {
        if (game.played) return;
        game.result = simulateGame(getTeam(game.homeId), getTeam(game.awayId), false);
        game.played = true;
        const entry = userGameEntry(game.result);
        if (entry) {
          currentCareer.userGameLogs ||= [];
          currentCareer.userGameLogs.push(entry);
        }
      });
      currentCareer.currentRound += 1;
      if (rounds > 5 && r % 5 === 0) await sleep(0);
    }
    if (currentCareer.currentRound >= currentCareer.league.games) finishRegularSeason();
    await putSave(currentCareer);
    renderCareer();
    disableSimButtons(false);
    dom['sim-message'].textContent = rounds === 1 ? 'Game complete.' : `${rounds} games simulated.`;
  }

  function disableSimButtons(disabled) {
    document.querySelectorAll('[data-sim]').forEach((button) => { button.disabled = disabled || currentCareer.phase !== 'regular'; });
  }

  function statsAverages(stats) {
    const games = Math.max(1, stats.games);
    return {
      ppg: stats.points / games, rpg: stats.rebounds / games, apg: stats.assists / games,
      spg: stats.steals / games, bpg: stats.blocks / games, mpg: stats.minutes / games,
      fgPct: stats.fga ? stats.fgm / stats.fga : 0, threePct: stats.threeA ? stats.threeM / stats.threeA : 0,
      ftPct: stats.fta ? stats.ftm / stats.fta : 0
    };
  }

  function playerSeasonScore(player) {
    const avg = statsAverages(player.stats.regular);
    const team = getTeam(player.teamId);
    const winPct = team.record.wins / Math.max(1, team.record.wins + team.record.losses);
    return avg.ppg + avg.rpg*.7 + avg.apg*.75 + avg.spg*2.2 + avg.bpg*2.2 + winPct*12 + avg.fgPct*5;
  }

  function defensiveScore(player) {
    const avg = statsAverages(player.stats.regular);
    const attrs = (player.attributes.interiorDefense + player.attributes.perimeterDefense + player.attributes.iq) / 3;
    return avg.spg*4.5 + avg.bpg*4.5 + avg.rpg*.45 + attrs*.13 + getTeam(player.teamId).record.wins/currentCareer.league.games*6;
  }

  function selectPositionBalanced(players, scorer, excluded = new Set()) {
    const selected = [];
    POSITIONS.forEach((position) => {
      const candidate = players.filter((player) => player.position === position && !excluded.has(player.id)).sort((a,b) => scorer(b)-scorer(a))[0];
      if (candidate) { selected.push(candidate); excluded.add(candidate.id); }
    });
    return selected;
  }

  function calculateAwards() {
    const minimumGames = Math.max(1, Math.floor(currentCareer.league.games * .35));
    const qualified = allPlayers().filter((player) => player.stats.regular.games >= minimumGames);
    const mvp = [...qualified].sort((a,b) => playerSeasonScore(b)-playerSeasonScore(a))[0];
    const rookies = qualified.filter((player) => player.isRookie);
    const roty = [...rookies].sort((a,b) => playerSeasonScore(b)-playerSeasonScore(a))[0] || mvp;
    const dpoy = [...qualified].sort((a,b) => defensiveScore(b)-defensiveScore(a))[0];
    const bench = qualified.filter((player) => player.stats.regular.starts < player.stats.regular.games * .5);
    const sixth = [...bench].sort((a,b) => playerSeasonScore(b)-playerSeasonScore(a))[0] || qualified[0];
    const coachTeam = [...currentCareer.teams].sort((a,b) => {
      const aActual = a.record.wins/currentCareer.league.games;
      const bActual = b.record.wins/currentCareer.league.games;
      return (bActual-b.expectedWinPct)*100+b.record.wins*.2 - ((aActual-a.expectedWinPct)*100+a.record.wins*.2);
    })[0];
    const used = new Set();
    const first = selectPositionBalanced(qualified, playerSeasonScore, used);
    const second = selectPositionBalanced(qualified, playerSeasonScore, used);
    const third = selectPositionBalanced(qualified, playerSeasonScore, used);
    const defUsed = new Set();
    const defenseFirst = selectPositionBalanced(qualified, defensiveScore, defUsed);
    const defenseSecond = selectPositionBalanced(qualified, defensiveScore, defUsed);
    const leaderFor = (key) => [...qualified].sort((a,b)=>statsAverages(b.stats.regular)[key]-statsAverages(a.stats.regular)[key])[0]?.id || null;
    const statLeaders = { scoring:leaderFor('ppg'), rebounding:leaderFor('rpg'), assists:leaderFor('apg'), steals:leaderFor('spg'), blocks:leaderFor('bpg') };
    return { mvp:mvp.id, roty:roty.id, dpoy:dpoy.id, sixth:sixth.id, coty:coachTeam.id, first:first.map(p=>p.id), second:second.map(p=>p.id), third:third.map(p=>p.id), defenseFirst:defenseFirst.map(p=>p.id), defenseSecond:defenseSecond.map(p=>p.id), statLeaders };
  }

  function finishRegularSeason() {
    currentCareer.phase = 'awards';
    currentCareer.awards = calculateAwards();
    const user = getUserPlayer();
    const awardMap = currentCareer.awards;
    [['MVP','mvp'],['Rookie of the Year','roty'],['Defensive Player of the Year','dpoy'],['Sixth Man of the Year','sixth']].forEach(([label,key]) => {
      if (awardMap[key] === user.id) addAccolade(user, label);
    });
    [['All-HoopLoop First Team','first'],['All-HoopLoop Second Team','second'],['All-HoopLoop Third Team','third'],['All-Defensive First Team','defenseFirst'],['All-Defensive Second Team','defenseSecond']].forEach(([label,key]) => {
      if (awardMap[key].includes(user.id)) addAccolade(user, label);
    });
    const leaderLabels = { scoring:'Scoring Leader', rebounding:'Rebounding Leader', assists:'Assists Leader', steals:'Steals Leader', blocks:'Blocks Leader' };
    Object.entries(awardMap.statLeaders || {}).forEach(([key, playerId]) => {
      if (playerId === user.id) addAccolade(user, leaderLabels[key]);
    });
  }

  function standingsForConference(conference) {
    return currentCareer.teams.filter((team) => team.conference === conference).sort((a,b) => {
      if (b.record.wins !== a.record.wins) return b.record.wins-a.record.wins;
      return (b.record.pointsFor-b.record.pointsAgainst)-(a.record.pointsFor-a.record.pointsAgainst);
    });
  }

  function createInitialPlayoffs() {
    const slots = currentCareer.league.playoffSize / 2;
    const west = standingsForConference('West').slice(0, slots);
    const east = standingsForConference('East').slice(0, slots);
    const pair = (teams, conference) => Array.from({ length: teams.length/2 }, (_, i) => createSeries(teams[i], teams[teams.length-1-i], conference, i+1, teams.length-i));
    const seedByTeam = {};
    west.forEach((team,index)=>{ seedByTeam[team.id] = index + 1; });
    east.forEach((team,index)=>{ seedByTeam[team.id] = index + 1; });
    currentCareer.playoffs = {
      bestOf:currentCareer.league.seriesLength, winsNeeded:Math.floor(currentCareer.league.seriesLength/2)+1,
      stage:'conference', roundNumber:1, currentSeries:[...pair(west,'West'),...pair(east,'East')],
      history:[], finals:null, complete:false, seedByTeam
    };
    currentCareer.phase = 'playoffs';
  }

  function createSeries(teamA, teamB, conference = 'Finals', seedA = null, seedB = null) {
    return { id:uid('series'), conference, teamAId:teamA.id, teamBId:teamB.id, seedA, seedB, winsA:0, winsB:0, complete:false, winnerId:null, games:[] };
  }

  function simulateSeriesGame(series) {
    const gameNumber = series.games.length;
    const homeA = gameNumber % 4 === 0 || gameNumber % 4 === 1;
    const home = getTeam(homeA ? series.teamAId : series.teamBId);
    const away = getTeam(homeA ? series.teamBId : series.teamAId);
    const result = simulateGame(home, away, true);
    series.games.push(result);
    if (result.winnerId === series.teamAId) series.winsA += 1; else series.winsB += 1;
    const entry = userGameEntry(result, {
      playoff: true,
      stage: currentCareer.playoffs.stage,
      playoffRound: currentCareer.playoffs.roundNumber,
      seriesGame: series.games.length
    });
    if (entry) {
      currentCareer.userPlayoffLogs ||= [];
      currentCareer.userPlayoffLogs.push(entry);
    }
    if (series.winsA >= currentCareer.playoffs.winsNeeded || series.winsB >= currentCareer.playoffs.winsNeeded) {
      series.complete = true;
      series.winnerId = series.winsA > series.winsB ? series.teamAId : series.teamBId;
    }
  }

  function advancePlayoffStageIfReady() {
    const playoffs = currentCareer.playoffs;
    if (!playoffs.currentSeries.every((series) => series.complete)) return;
    playoffs.history.push({ stage:playoffs.stage, roundNumber:playoffs.roundNumber, series:structuredClone(playoffs.currentSeries) });
    if (playoffs.stage === 'finals') {
      playoffs.complete = true;
      const finals = playoffs.currentSeries[0];
      currentCareer.champion = finals.winnerId;
      currentCareer.finalsMvp = calculateFinalsMvp(finals);
      currentCareer.phase = 'complete';
      finalizeSeasonHistory();
      return;
    }
    const westWinners = playoffs.currentSeries.filter((s)=>s.conference==='West').map((s)=>getTeam(s.winnerId));
    const eastWinners = playoffs.currentSeries.filter((s)=>s.conference==='East').map((s)=>getTeam(s.winnerId));
    if (westWinners.length === 1 && eastWinners.length === 1) {
      playoffs.stage = 'finals'; playoffs.roundNumber += 1;
      playoffs.currentSeries = [createSeries(westWinners[0], eastWinners[0], 'Finals', playoffs.seedByTeam?.[westWinners[0].id] ?? null, playoffs.seedByTeam?.[eastWinners[0].id] ?? null)];
    } else {
      const pairWinners = (teams, conference) => Array.from({length:teams.length/2},(_,i)=>createSeries(teams[i],teams[teams.length-1-i],conference, playoffs.seedByTeam?.[teams[i].id] ?? null, playoffs.seedByTeam?.[teams[teams.length-1-i].id] ?? null));
      playoffs.roundNumber += 1;
      playoffs.currentSeries = [...pairWinners(westWinners,'West'),...pairWinners(eastWinners,'East')];
    }
  }

  function calculateFinalsMvp(finalsSeries) {
    const championId = finalsSeries.winnerId;
    const totals = new Map();
    finalsSeries.games.forEach((game) => {
      const boxes = game.homeId === championId ? game.homeBoxes : game.awayBoxes;
      boxes.forEach((box) => {
        const current = totals.get(box.playerId) || { points:0, rebounds:0, assists:0, steals:0, blocks:0 };
        ['points','rebounds','assists','steals','blocks'].forEach((key)=>current[key]+=box[key]);
        totals.set(box.playerId,current);
      });
    });
    return [...totals.entries()].sort((a,b) => (b[1].points+b[1].rebounds*.5+b[1].assists*.6+b[1].steals*2+b[1].blocks*2)-(a[1].points+a[1].rebounds*.5+a[1].assists*.6+a[1].steals*2+a[1].blocks*2))[0]?.[0] || getTeam(championId).roster[0].id;
  }

  function seasonSnapshot(player) {
    const regular = statsAverages(player.stats.regular);
    const playoffs = statsAverages(player.stats.playoffs);
    const team = getTeam(player.teamId);
    return {
      season: currentCareer.league.season,
      teamId: team.id,
      age: player.age,
      overall: player.overall,
      games: player.stats.regular.games,
      starts: player.stats.regular.starts,
      mpg: round1(regular.mpg),
      ppg: round1(regular.ppg), rpg: round1(regular.rpg), apg: round1(regular.apg), spg: round1(regular.spg), bpg: round1(regular.bpg),
      fgPct: round1(regular.fgPct*100), threePct: round1(regular.threePct*100), ftPct: round1(regular.ftPct*100),
      totals: structuredClone(player.stats.regular),
      playoffTotals: structuredClone(player.stats.playoffs),
      playoffGames: player.stats.playoffs.games,
      playoffMpg: round1(playoffs.mpg),
      playoffPpg: round1(playoffs.ppg), playoffRpg: round1(playoffs.rpg), playoffApg: round1(playoffs.apg),
      playoffFgPct: round1(playoffs.fgPct*100), playoffThreePct: round1(playoffs.threePct*100), playoffFtPct: round1(playoffs.ftPct*100),
      record: `${team.record.wins}-${team.record.losses}`,
      champion: currentCareer.champion === team.id
    };
  }

  function finalizeSeasonHistory() {
    const user = getUserPlayer();
    const season = currentCareer.league.season;
    if (currentCareer.champion === user.teamId) addAccolade(user, 'HoopSim Champion', season, user.teamId);
    if (currentCareer.finalsMvp === user.id) addAccolade(user, 'Finals MVP', season, user.teamId);
    allPlayers().forEach((player)=>{
      player.seasonHistory ||= [];
      const snapshot = seasonSnapshot(player);
      const existingIndex = player.seasonHistory.findIndex((entry)=>entry.season===season);
      if (existingIndex >= 0) player.seasonHistory[existingIndex] = snapshot;
      else player.seasonHistory.push(snapshot);
    });
  }

  function capturePostseasonScroll(elementId = 'sim-playoff-game') {
    const element = $(elementId) || dom['postseason-panel'];
    return { elementId, viewportTop: element?.getBoundingClientRect?.().top ?? 0, scrollY: window.scrollY };
  }

  function restorePostseasonScroll(anchor) {
    requestAnimationFrame(() => {
      const element = $(anchor.elementId) || dom['season-finale'] || dom['postseason-panel'];
      if (!element?.getBoundingClientRect) return window.scrollTo({ top: anchor.scrollY, behavior: 'auto' });
      const delta = element.getBoundingClientRect().top - anchor.viewportTop;
      window.scrollBy({ top: delta, behavior: 'auto' });
    });
  }

  async function simNextPlayoffGame() {
    if (!currentCareer.playoffs || currentCareer.playoffs.complete) return;
    const anchor = capturePostseasonScroll();
    currentCareer.playoffs.currentSeries.filter((series) => !series.complete).forEach((series) => simulateSeriesGame(series));
    advancePlayoffStageIfReady();
    await putSave(currentCareer);
    renderCareer();
    restorePostseasonScroll(anchor);
  }

  async function simCurrentPlayoffRound() {
    if (!currentCareer.playoffs || currentCareer.playoffs.complete) return;
    const anchor = capturePostseasonScroll();
    while (currentCareer.playoffs.currentSeries.some((series) => !series.complete)) {
      currentCareer.playoffs.currentSeries.filter((series) => !series.complete).forEach((series) => simulateSeriesGame(series));
      await sleep(0);
    }
    advancePlayoffStageIfReady();
    await putSave(currentCareer);
    renderCareer();
    restorePostseasonScroll(anchor);
  }

  async function simAllPlayoffs() {
    if (!currentCareer.playoffs || currentCareer.playoffs.complete) return;
    const anchor = capturePostseasonScroll();
    while (!currentCareer.playoffs.complete) {
      while (currentCareer.playoffs.currentSeries.some((series) => !series.complete)) {
        currentCareer.playoffs.currentSeries.filter((series) => !series.complete).forEach((series) => simulateSeriesGame(series));
        await sleep(0);
      }
      advancePlayoffStageIfReady();
    }
    await putSave(currentCareer);
    renderCareer();
    restorePostseasonScroll(anchor);
  }

  function playerById(id) {
    return allPlayers().find((player) => player.id === id) || currentCareer?.prospects?.find((player) => player.id === id) || null;
  }

  function findGameResult(gameId) {
    if (!gameId || !currentCareer) return null;
    for (const round of currentCareer.schedule || []) {
      for (const game of round) if (game.result?.id === gameId) return game.result;
    }
    const playoffRounds = [...(currentCareer.playoffs?.history || [])];
    if (currentCareer.playoffs?.currentSeries) playoffRounds.push({ series:currentCareer.playoffs.currentSeries });
    for (const round of playoffRounds) {
      for (const series of round.series || []) {
        const game = (series.games || []).find((entry)=>entry.id===gameId);
        if (game) return game;
      }
    }
    return null;
  }

  function boxScoreTeamMarkup(team, boxes, score) {
    const byId = new Map(boxes.map((box)=>[box.playerId,box]));
    const rows = [...boxes].sort((a,b)=>Number(b.starter)-Number(a.starter) || b.minutes-a.minutes).map((box)=>{
      const player = playerById(box.playerId);
      const name = box.playerName || player?.name || 'Unknown Player';
      const position = box.position || player?.position || '—';
      return `<tr><td><button class="player-name-button" data-player-id="${box.playerId}" type="button"><strong>${escapeHtml(name)}</strong><small>${position}${box.starter?' · Starter':''}</small></button></td><td>${box.minutes}</td><td>${box.fgm}-${box.fga}</td><td>${box.threeM}-${box.threeA}</td><td>${box.ftm}-${box.fta}</td><td>${box.rebounds}</td><td>${box.assists}</td><td>${box.steals}</td><td>${box.blocks}</td><td>${box.turnovers}</td><td>${box.fouls}</td><td><strong>${box.points}</strong></td></tr>`;
    }).join('');
    const totals = boxes.reduce((acc,box)=>{ ['minutes','fgm','fga','threeM','threeA','ftm','fta','rebounds','assists','steals','blocks','turnovers','fouls','points'].forEach((key)=>acc[key]+=Number(box[key]||0)); return acc; }, {minutes:0,fgm:0,fga:0,threeM:0,threeA:0,ftm:0,fta:0,rebounds:0,assists:0,steals:0,blocks:0,turnovers:0,fouls:0,points:0});
    return `<section class="box-team-section"><div class="box-team-heading"><div><span>${escapeHtml(team.abbr)}</span><h3>${escapeHtml(team.name)}</h3></div><strong>${score}</strong></div><div class="box-table-scroll"><table class="data-table box-table"><thead><tr><th>Player</th><th>MIN</th><th>FG</th><th>3PT</th><th>FT</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TO</th><th>PF</th><th>PTS</th></tr></thead><tbody>${rows}<tr class="box-total-row"><td><strong>TEAM</strong></td><td>${totals.minutes}</td><td>${totals.fgm}-${totals.fga}</td><td>${totals.threeM}-${totals.threeA}</td><td>${totals.ftm}-${totals.fta}</td><td>${totals.rebounds}</td><td>${totals.assists}</td><td>${totals.steals}</td><td>${totals.blocks}</td><td>${totals.turnovers}</td><td>${totals.fouls}</td><td><strong>${score}</strong></td></tr></tbody></table></div></section>`;
  }

  function openBoxScore(gameId) {
    const game = findGameResult(gameId);
    if (!game) return showToast('That box score is not available in this save.', 'error');
    const home = getTeam(game.homeId), away = getTeam(game.awayId);
    dom['box-score-title'].textContent = `${away.name} ${game.awayScore}, ${home.name} ${game.homeScore}`;
    dom['box-score-subtitle'].textContent = `${game.playoff ? 'Playoff game' : 'Regular season'} · Season ${game.season || currentCareer.league.season}`;
    dom['box-score-content'].innerHTML = boxScoreTeamMarkup(away, game.awayBoxes || [], game.awayScore) + boxScoreTeamMarkup(home, game.homeBoxes || [], game.homeScore);
    dom['box-score-dialog'].showModal();
  }

  function renderCareer() {
    if (!currentCareer) return;
    migrateCareer(currentCareer);
    showView('career-view', false);
    const user = getUserPlayer();
    const team = getTeam(user.teamId);
    if (currentCareer.lastKnownUserTeamId !== user.teamId) {
      currentCareer.rosterViewTeamId = user.teamId;
      currentCareer.lastKnownUserTeamId = user.teamId;
    }
    updateTeamRotation(team);
    dom['career-league-label'].textContent = currentCareer.league.name.toUpperCase();
    dom['career-title'].textContent = `${user.name}’s Career`;
    const phaseLabel = currentCareer.phase === 'regular' ? 'Regular Season' : currentCareer.phase === 'awards' ? 'Awards' : currentCareer.phase === 'playoffs' ? 'Playoffs' : currentCareer.phase === 'complete' ? 'Season Complete' : currentCareer.phase === 'retired' ? 'Retired' : 'Preseason';
    dom['career-subtitle'].textContent = `Season ${currentCareer.league.season} · ${phaseLabel}`;
    dom['player-team-mark'].textContent = team.abbr;
    dom['player-team-name'].textContent = team.name;
    const contractYear = Math.max(1, (user.contractLength || user.contractYears || 1) - user.contractYears + 1);
    dom['player-contract'].textContent = `${user.draftPick ? 'Career contract' : 'Player contract'} · Year ${contractYear} · ${user.contractYears} remaining`;
    dom['career-overall'].textContent = user.overall;
    dom['career-player-name'].textContent = user.name;
    dom['career-player-meta'].textContent = `#${user.jerseyNumber ?? '0'} · ${user.position} · Age ${user.age} · ${formatHeight(user.height)} · ${user.weight} lbs · ${user.playstyle}`;
    dom['career-role'].textContent = currentCareer.phase === 'retired' ? 'Retired' : user.role;
    dom['career-minutes'].textContent = currentCareer.phase === 'retired' ? `${user.seasonHistory.length} seasons` : `${user.projectedMinutes} projected MPG`;
    dom['career-health'].textContent = user.injury ? `${user.injury.label} · ${user.injury.gamesRemaining} games` : 'Healthy';
    renderSeasonAverages(user);
    renderSeasonControl(team);
    renderRecentGames();
    renderStandings();
    renderLeaders();
    renderStatsTable();
    renderRosterSelector(team.id);
    renderLeagueNews();
    renderHistory(user);
    renderPostseason();
    disableSimButtons(currentCareer.phase !== 'regular');
  }

  function renderSeasonAverages(user) {
    const avg = statsAverages(user.stats.regular);
    dom['season-averages'].innerHTML = [['PPG',avg.ppg],['RPG',avg.rpg],['APG',avg.apg],['SPG',avg.spg],['BPG',avg.bpg]].map(([label,value])=>`<div><strong>${round1(value).toFixed(1)}</strong><span>${label}</span></div>`).join('');
  }

  function renderSeasonControl(team) {
    dom['season-progress-title'].textContent = `Game ${currentCareer.currentRound} of ${currentCareer.league.games}`;
    dom['team-record'].textContent = `${team.record.wins}–${team.record.losses}`;
    dom['season-progress-fill'].style.width = `${currentCareer.currentRound/currentCareer.league.games*100}%`;
    if (currentCareer.phase === 'retired') {
      dom['season-progress-title'].textContent = `Career complete · ${getUserPlayer().seasonHistory.length} seasons`;
      dom['season-progress-fill'].style.width = '100%';
      dom['next-game-copy'].textContent = 'This career has been finalized.';
    } else if (currentCareer.phase === 'regular') {
      const nextRound = currentCareer.schedule[currentCareer.currentRound];
      const game = nextRound?.find((entry)=>[entry.homeId,entry.awayId].includes(team.id));
      const opponent = game ? getTeam(game.homeId===team.id?game.awayId:game.homeId) : null;
      dom['next-game-copy'].textContent = opponent ? `Next: ${game.homeId===team.id?'vs.':'at'} ${opponent.name}` : 'Regular season complete.';
    } else dom['next-game-copy'].textContent = 'The regular season is complete.';
  }

  function gameLogMarkup(log) {
    const opponent = getTeam(log.opponentId);
    const line = log.box
      ? `${log.box.points} PTS · ${log.box.rebounds} REB · ${log.box.assists} AST · ${log.box.minutes} MIN`
      : log.dnpReason === 'Injury'
        ? `<span class="dnp-injury">DNP · Injury</span>`
        : `<span class="dnp-coach">DNP · Coach’s decision</span>`;
    const gameLabel = log.playoff
      ? `${log.playoffStage === 'finals' ? 'Finals' : `Round ${log.playoffRound}`} · G${log.seriesGame}`
      : `G${log.round}`;
    return `<div class="list-row game-log-row ${log.playoff?'playoff-log-row':''}"><span><strong>${log.result} ${log.score}</strong><small> vs ${escapeHtml(opponent.abbr)} · ${line}</small></span><div class="game-log-actions"><span>${gameLabel}</span>${log.gameId?`<button class="text-button" data-box-score="${log.gameId}" type="button">Box score</button>`:''}</div></div>`;
  }

  function renderRecentGames() {
    const regular = (currentCareer.userGameLogs || []).map((log)=>({...log,playoff:false}));
    const playoff = (currentCareer.userPlayoffLogs || []).map((log)=>({...log,playoff:true}));
    const logs = [...regular, ...playoff].slice(-8).reverse();
    dom['recent-games'].innerHTML = logs.length ? logs.map(gameLogMarkup).join('') : '<div class="muted">No games played yet.</div>';
  }

  function renderPlayoffGameLog() {
    const logs = (currentCareer.userPlayoffLogs || []).slice().reverse();
    dom['playoff-log-panel'].classList.toggle('hidden', !logs.length);
    dom['playoff-game-log'].innerHTML = logs.length ? logs.map(gameLogMarkup).join('') : '<div class="muted">Your playoff games will appear here.</div>';
  }

  function renderStandingsRows(teams, full = false) {
    const userTeamId = getUserPlayer().teamId;
    return teams.map((team,index)=>`<div class="standing-row ${team.id===userTeamId?'user-team':''}"><span>${index+1}</span><strong>${escapeHtml(team.name)}</strong><span>${team.record.wins}-${team.record.losses}</span>${full?`<span>${team.record.pointsFor-team.record.pointsAgainst>=0?'+':''}${team.record.pointsFor-team.record.pointsAgainst}</span>`:''}</div>`).join('');
  }

  function renderStandings() {
    const userTeam = getTeam(getUserPlayer().teamId);
    const conference = standingsForConference(userTeam.conference);
    dom['standings-preview'].innerHTML = renderStandingsRows(conference.slice(0,6));
    dom['west-standings'].innerHTML = renderStandingsRows(standingsForConference('West'), true);
    dom['east-standings'].innerHTML = renderStandingsRows(standingsForConference('East'), true);
  }

  function qualifiedPlayersForDisplay() {
    return allPlayers().filter((player)=>player.stats.regular.games > 0);
  }

  function renderLeaders() {
    const players = qualifiedPlayersForDisplay();
    const leaders = [
      ['PPG', [...players].sort((a,b)=>statsAverages(b.stats.regular).ppg-statsAverages(a.stats.regular).ppg)[0]],
      ['RPG', [...players].sort((a,b)=>statsAverages(b.stats.regular).rpg-statsAverages(a.stats.regular).rpg)[0]],
      ['APG', [...players].sort((a,b)=>statsAverages(b.stats.regular).apg-statsAverages(a.stats.regular).apg)[0]]
    ];
    dom['leaders-preview'].innerHTML = players.length ? leaders.map(([label,player],index)=>`<div class="leader-row"><span>${index+1}</span><strong>${escapeHtml(player.name)}<small>${escapeHtml(getTeam(player.teamId).abbr)} · ${label}</small></strong><span>${round1(statsAverages(player.stats.regular)[label.toLowerCase()]).toFixed(1)}</span></div>`).join('') : '<div class="muted">Leaders appear after games are simulated.</div>';
  }

  function statSortValue(player, key) {
    const avg = statsAverages(player.stats.regular);
    if (key === 'name') return player.name.toLowerCase();
    if (key === 'team') return getTeam(player.teamId).abbr;
    if (key === 'overall') return player.overall;
    if (key === 'games') return player.stats.regular.games;
    if (key === 'mpg') return avg.mpg;
    return avg[key] ?? 0;
  }

  function sortHeader(label, key) {
    const active = statsSortKey === key;
    const arrow = active ? (statsSortDirection < 0 ? '▼' : '▲') : '';
    return `<button class="stats-sort-button ${active?'active':''}" data-stat-sort="${key}" type="button">${label}<span>${arrow}</span></button>`;
  }

  function renderStatsTable() {
    if (dom['stats-sort'].value !== statsSortKey && [...dom['stats-sort'].options].some((option)=>option.value===statsSortKey)) dom['stats-sort'].value = statsSortKey;
    const players = qualifiedPlayersForDisplay().sort((a,b)=>{
      const av=statSortValue(a,statsSortKey), bv=statSortValue(b,statsSortKey);
      if (typeof av === 'string') return av.localeCompare(bv) * statsSortDirection;
      return (av-bv) * statsSortDirection;
    }).slice(0,150);
    dom['stats-table'].innerHTML = players.length ? `<table class="data-table sortable-table"><thead><tr>
      <th>#</th><th>Player</th><th>Team</th>
      <th>${sortHeader('OVR','overall')}</th><th>${sortHeader('GP','games')}</th><th>${sortHeader('MPG','mpg')}</th>
      <th>${sortHeader('PPG','ppg')}</th><th>${sortHeader('RPG','rpg')}</th><th>${sortHeader('APG','apg')}</th>
      <th>${sortHeader('SPG','spg')}</th><th>${sortHeader('BPG','bpg')}</th>
      <th>${sortHeader('FG%','fgPct')}</th><th>${sortHeader('3P%','threePct')}</th><th>${sortHeader('FT%','ftPct')}</th>
    </tr></thead><tbody>${players.map((player,index)=>{
      const a=statsAverages(player.stats.regular);
      return `<tr class="${player.isUser?'user-row':''}"><td>${index+1}</td>
        <td><button class="player-name-button" data-player-id="${player.id}" type="button"><strong>${escapeHtml(player.name)}</strong><small>${player.position} · ${escapeHtml(player.playstyle)}</small></button></td>
        <td>${escapeHtml(getTeam(player.teamId).abbr)}</td><td>${player.overall}</td><td>${player.stats.regular.games}</td><td>${round1(a.mpg).toFixed(1)}</td>
        <td>${round1(a.ppg).toFixed(1)}</td><td>${round1(a.rpg).toFixed(1)}</td><td>${round1(a.apg).toFixed(1)}</td><td>${round1(a.spg).toFixed(1)}</td><td>${round1(a.bpg).toFixed(1)}</td>
        <td>${(a.fgPct*100).toFixed(1)}</td><td>${(a.threePct*100).toFixed(1)}</td><td>${(a.ftPct*100).toFixed(1)}</td></tr>`;
    }).join('')}</tbody></table>` : '<div class="muted">Simulate games to populate league statistics.</div>';
  }

  function renderRosterSelector(defaultTeamId) {
    const currentValue = Number(dom['roster-team-select'].value || currentCareer.rosterViewTeamId || defaultTeamId);
    dom['roster-team-select'].innerHTML = [...currentCareer.teams]
      .sort((a,b)=>a.name.localeCompare(b.name))
      .map((team)=>`<option value="${team.id}" ${team.id===currentValue?'selected':''}>${escapeHtml(team.name)}</option>`).join('');
    const selectedId = currentCareer.teams.some((team)=>team.id===currentValue) ? currentValue : defaultTeamId;
    dom['roster-team-select'].value = String(selectedId);
    currentCareer.rosterViewTeamId = selectedId;
    renderRoster(getTeam(selectedId));
  }

  function renderRoster(team) {
    dom['roster-title'].textContent = `${team.name} roster`;
    updateTeamRotation(team);
    const roster = [...team.roster].sort((a,b)=>b.projectedMinutes-a.projectedMinutes || b.overall-a.overall);
    dom['roster-table'].innerHTML = `<table class="data-table"><thead><tr><th>Player</th><th>Pos</th><th>Age</th><th>OVR</th><th>Role</th><th>MPG</th><th>Contract</th><th>Status</th></tr></thead><tbody>${roster.map((player)=>`<tr class="${player.isUser?'user-row':''}">
      <td><button class="player-name-button" data-player-id="${player.id}" type="button"><strong>${escapeHtml(player.name)}</strong><small>${escapeHtml(player.playstyle)}</small></button></td>
      <td>${player.position}</td><td>${player.age}</td><td>${player.overall}</td><td>${player.role}</td><td>${player.projectedMinutes}</td><td>${player.contractYears} yr</td><td>${player.injury?`${escapeHtml(player.injury.label)} (${player.injury.gamesRemaining})`:'Healthy'}</td></tr>`).join('')}</tbody></table>`;
  }

  function renderLeagueNews() {
    const events = [...(currentCareer.careerEvents || [])].reverse();
    const groups = {
      trade: events.filter((event)=>['trade','traded'].includes(event.category || event.type)),
      signing: events.filter((event)=>['signing','signed'].includes(event.category || event.type)),
      retirement: events.filter((event)=>['retirement','retired'].includes(event.category || event.type))
    };
    const renderGroup = (items) => items.length ? items.slice(0,80).map((event)=>`<article class="news-card"><span>SEASON ${event.season || 1}</span><p>${escapeHtml(event.text)}</p></article>`).join('') : '<div class="muted news-empty">No news in this category yet.</div>';
    dom['trade-news-count'].textContent = groups.trade.length;
    dom['signing-news-count'].textContent = groups.signing.length;
    dom['retirement-news-count'].textContent = groups.retirement.length;
    dom['trade-news-list'].innerHTML = renderGroup(groups.trade);
    dom['signing-news-list'].innerHTML = renderGroup(groups.signing);
    dom['retirement-news-list'].innerHTML = renderGroup(groups.retirement);
  }

  function totalsFromSeasons(player, key = 'totals') {
    const totals = createStats();
    (player.seasonHistory || []).forEach((season)=>{
      const source = season[key] || {};
      Object.keys(totals).forEach((stat)=>{ totals[stat] += Number(source[stat] || 0); });
    });
    return totals;
  }

  function careerSummaryMarkup(player) {
    const totals = totalsFromSeasons(player);
    const avg = statsAverages(totals);
    return `<div class="career-summary-grid">
      <div><strong>${player.seasonHistory?.length || 0}</strong><span>Seasons</span></div>
      <div><strong>${totals.games}</strong><span>Games</span></div>
      <div><strong>${round1(avg.mpg).toFixed(1)}</strong><span>MPG</span></div>
      <div><strong>${round1(avg.ppg).toFixed(1)}</strong><span>PPG</span></div>
      <div><strong>${round1(avg.rpg).toFixed(1)}</strong><span>RPG</span></div>
      <div><strong>${round1(avg.apg).toFixed(1)}</strong><span>APG</span></div>
      <div><strong>${round1(avg.spg).toFixed(1)}</strong><span>SPG</span></div>
      <div><strong>${round1(avg.bpg).toFixed(1)}</strong><span>BPG</span></div>
      <div><strong>${(avg.fgPct*100).toFixed(1)}%</strong><span>FG%</span></div>
      <div><strong>${(avg.threePct*100).toFixed(1)}%</strong><span>3P%</span></div>
      <div><strong>${(avg.ftPct*100).toFixed(1)}%</strong><span>FT%</span></div>
      <div><strong>${totals.points.toLocaleString()}</strong><span>Points</span></div>
    </div>`;
  }

  function seasonHistoryMarkup(season) {
    const team = getTeam(season.teamId);
    const playoffLine = season.playoffGames
      ? `<div class="season-stat-line playoff-season-line"><span>PLAYOFFS</span><b>${season.playoffGames} GP</b><b>${Number(season.playoffPpg||0).toFixed(1)} PPG</b><b>${Number(season.playoffRpg||0).toFixed(1)} RPG</b><b>${Number(season.playoffApg||0).toFixed(1)} APG</b><b>${Number(season.playoffFgPct||0).toFixed(1)} FG%</b><b>${Number(season.playoffThreePct||0).toFixed(1)} 3P%</b></div>`
      : '<div class="season-stat-line playoff-season-line muted"><span>PLAYOFFS</span><b>Did not play</b></div>';
    return `<article class="season-history-card">
      <div class="season-history-heading"><div><span class="eyebrow">SEASON ${season.season} · AGE ${season.age ?? '—'}</span><h3>${escapeHtml(team?.name || 'Former team')}</h3><p>${season.record}${season.champion?' · Champion':''}</p></div><strong>${season.overall} OVR</strong></div>
      <div class="season-stat-line"><span>REGULAR</span><b>${season.games} GP</b><b>${season.starts ?? 0} GS</b><b>${Number(season.mpg||0).toFixed(1)} MPG</b><b>${Number(season.ppg||0).toFixed(1)} PPG</b><b>${Number(season.rpg||0).toFixed(1)} RPG</b><b>${Number(season.apg||0).toFixed(1)} APG</b><b>${Number(season.spg||0).toFixed(1)} SPG</b><b>${Number(season.bpg||0).toFixed(1)} BPG</b></div>
      <div class="season-shooting-line"><span>${Number(season.fgPct||0).toFixed(1)}% FG</span><span>${Number(season.threePct||0).toFixed(1)}% 3P</span><span>${Number(season.ftPct||0).toFixed(1)}% FT</span></div>
      ${playoffLine}
    </article>`;
  }

  function renderHistory(user) {
    dom['career-collective-summary'].innerHTML = careerSummaryMarkup(user);
    const hofUnlocked = user.age >= 30 || (user.seasonHistory?.length || 0) >= 10 || currentCareer.phase === 'retired';
    if (hofUnlocked) {
      const probability = hallOfFameProbability(user);
      dom['career-hof-outlook'].innerHTML = `<div class="hof-outlook-card"><div><span class="eyebrow">HALL OF FAME OUTLOOK</span><strong>${probability}%</strong><p>This estimate changes with production, longevity, awards, and championships.</p></div><div class="hof-meter"><span style="width:${probability}%"></span></div></div>`;
    } else {
      dom['career-hof-outlook'].innerHTML = `<div class="hof-locked"><strong>Hall of Fame outlook hidden</strong><span>Unlocks at age 30 or after 10 completed seasons.</span></div>`;
    }
    dom['career-history-list'].innerHTML = user.seasonHistory?.length
      ? [...user.seasonHistory].reverse().map(seasonHistoryMarkup).join('')
      : currentCareer.careerEvents.map((event)=>`<div class="list-row"><span><strong>Season ${event.season}</strong><small>${escapeHtml(event.text)}</small></span></div>`).join('');
    const counts = {};
    user.accolades.forEach((award)=>{counts[award.label]=(counts[award.label]||0)+1;});
    if (currentCareer.retirement?.hallOfFame) counts['HoopLoop Hall of Fame'] = 1;
    dom['career-accolades'].innerHTML = Object.keys(counts).length ? Object.entries(counts).map(([label,count])=>`<div class="trophy"><strong>${count}</strong><span>${escapeHtml(label)}</span></div>`).join('') : '<div class="muted">Your trophy case is empty.</div>';
  }

  function playerProfileSeasonRows(player) {
    const history = player.seasonHistory || [];
    if (!history.length) return '<div class="muted">No completed season history yet.</div>';
    return `<div class="profile-history-table"><table class="data-table"><thead><tr><th>Season</th><th>Team</th><th>GP</th><th>MPG</th><th>PPG</th><th>RPG</th><th>APG</th><th>FG%</th><th>3P%</th><th>FT%</th><th>OVR</th></tr></thead><tbody>${[...history].reverse().map((season)=>`<tr><td>${season.season}</td><td>${escapeHtml(getTeam(season.teamId)?.abbr || '—')}</td><td>${season.games}</td><td>${Number(season.mpg||0).toFixed(1)}</td><td>${Number(season.ppg||0).toFixed(1)}</td><td>${Number(season.rpg||0).toFixed(1)}</td><td>${Number(season.apg||0).toFixed(1)}</td><td>${Number(season.fgPct||0).toFixed(1)}</td><td>${Number(season.threePct||0).toFixed(1)}</td><td>${Number(season.ftPct||0).toFixed(1)}</td><td>${season.overall}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function openPlayerProfile(playerId) {
    const player = playerById(playerId);
    if (!player) return showToast('Player profile is unavailable.', 'error');
    const team = player.teamId ? getTeam(player.teamId) : null;
    const regular = statsAverages(player.stats?.regular || createStats());
    const playoffs = statsAverages(player.stats?.playoffs || createStats());
    dom['profile-player-name'].textContent = player.name;
    dom['profile-player-meta'].textContent = `${player.isUser ? `#${player.jerseyNumber ?? '0'} · ` : ''}${player.position} · Age ${player.age} · ${formatHeight(player.height)} · ${player.weight} lbs · ${player.playstyle}${team?` · ${team.name}`:''}`;
    dom['profile-player-summary'].innerHTML = `<div class="profile-summary-grid">
      <div><strong>${player.overall}</strong><span>OVR</span></div><div><strong>${player.role || 'Prospect'}</strong><span>Role</span></div>
      <div><strong>${player.stats?.regular?.games || 0}</strong><span>GP</span></div><div><strong>${round1(regular.mpg).toFixed(1)}</strong><span>MPG</span></div>
      <div><strong>${round1(regular.ppg).toFixed(1)}</strong><span>PPG</span></div><div><strong>${round1(regular.rpg).toFixed(1)}</strong><span>RPG</span></div>
      <div><strong>${round1(regular.apg).toFixed(1)}</strong><span>APG</span></div><div><strong>${(regular.fgPct*100).toFixed(1)}%</strong><span>FG%</span></div>
      <div><strong>${(regular.threePct*100).toFixed(1)}%</strong><span>3P%</span></div><div><strong>${player.stats?.playoffs?.games || 0}</strong><span>Playoff GP</span></div>
      <div><strong>${round1(playoffs.ppg).toFixed(1)}</strong><span>Playoff PPG</span></div><div><strong>${player.contractYears ?? '—'}</strong><span>Contract years</span></div>
    </div>`;
    dom['profile-player-attributes'].innerHTML = `<section class="profile-section"><h3>Attributes</h3><div class="profile-attribute-grid">${ATTRIBUTES.map(([key,label])=>`<div><span>${escapeHtml(label)}</span><strong>${player.attributes[key]}</strong></div>`).join('')}</div></section>`;
    const accolades = player.accolades?.length ? `<div class="profile-accolades">${player.accolades.map((award)=>`<span>${escapeHtml(award.label)} · S${award.season}</span>`).join('')}</div>` : '<div class="muted">No recorded accolades.</div>';
    dom['profile-player-history'].innerHTML = `<section class="profile-section"><h3>Season history</h3>${playerProfileSeasonRows(player)}</section><section class="profile-section"><h3>Accolades</h3>${accolades}</section>`;
    dom['player-profile-dialog'].showModal();
  }

  function awardCard(label, playerId) {
    const player = playerById(playerId);
    return `<article class="award-card"><span>${label}</span>${player?`<button class="player-name-button" data-player-id="${player.id}" type="button"><strong>${escapeHtml(player.name)}</strong><small>${escapeHtml(getTeam(player.teamId).abbr)} · ${player.position}</small></button>`:'<strong>—</strong>'}</article>`;
  }

  function renderPostseason() {
    const panel = dom['postseason-panel'];
    panel.classList.toggle('hidden', !['awards','playoffs','complete'].includes(currentCareer.phase));
    if (panel.classList.contains('hidden')) return;
    const awards = currentCareer.awards;
    const leaderCards = awards.statLeaders ? awardCard('SCORING LEADER',awards.statLeaders.scoring)+awardCard('REBOUNDING LEADER',awards.statLeaders.rebounding)+awardCard('ASSISTS LEADER',awards.statLeaders.assists)+awardCard('STEALS LEADER',awards.statLeaders.steals)+awardCard('BLOCKS LEADER',awards.statLeaders.blocks) : '';
    dom['awards-grid'].innerHTML = awardCard('MVP',awards.mvp)+awardCard('ROTY',awards.roty)+awardCard('DPOY',awards.dpoy)+awardCard('6MOTY',awards.sixth)+`<article class="award-card"><span>COTY</span><strong>${escapeHtml(getTeam(awards.coty).name)}</strong><small>Coach rating ${getTeam(awards.coty).coachRating}</small></article>`+leaderCards;
    const teamLine = (label, ids) => `<div class="all-team-row"><strong>${label}</strong><div class="all-team-members">${ids.map((id)=>{const player=playerById(id);return `<div class="all-team-player"><button class="player-name-button" data-player-id="${player.id}" type="button"><strong>${escapeHtml(player.name)}</strong><small>${player.position} · ${escapeHtml(getTeam(player.teamId).abbr)} · ${player.overall} OVR</small></button></div>`}).join('')}</div></div>`;
    dom['all-league-teams'].innerHTML = teamLine('All-HoopLoop First Team',awards.first)+teamLine('All-HoopLoop Second Team',awards.second)+teamLine('All-HoopLoop Third Team',awards.third)+teamLine('All-Defensive First Team',awards.defenseFirst)+teamLine('All-Defensive Second Team',awards.defenseSecond);
    if (currentCareer.phase === 'awards') {
      dom['postseason-title'].textContent = `Season ${currentCareer.league.season} awards`;
      dom['postseason-copy'].textContent = 'Every All-HoopLoop group contains one player at each traditional position.';
      dom['playoff-area'].classList.remove('hidden');
      dom['playoff-bracket'].innerHTML = `<button id="begin-playoffs-button" class="primary-button" type="button">Begin ${currentCareer.league.playoffSize}-team playoffs</button>`;
      dom['sim-playoff-game'].classList.add('hidden'); dom['sim-playoff-round'].classList.add('hidden'); dom['sim-all-playoffs'].classList.add('hidden');
      dom['playoff-log-panel'].classList.add('hidden');
    } else {
      dom['postseason-title'].textContent = currentCareer.phase === 'complete' ? `Season ${currentCareer.league.season} complete` : `Season ${currentCareer.league.season} playoffs`;
      dom['postseason-copy'].textContent = `Every series is best of ${currentCareer.league.seriesLength}.`;
      dom['playoff-area'].classList.remove('hidden');
      renderPlayoffBracket();
      const complete = currentCareer.phase === 'complete';
      dom['sim-playoff-game'].classList.toggle('hidden', complete); dom['sim-playoff-round'].classList.toggle('hidden', complete); dom['sim-all-playoffs'].classList.toggle('hidden', complete);
    }
    if (currentCareer.phase === 'complete') renderSeasonFinale(); else dom['season-finale'].classList.add('hidden');
  }

  function renderPlayoffBracket() {
    const playoffs = currentCareer.playoffs;
    if (!playoffs) return;
    const userTeamId = getUserPlayer().teamId;
    const rounds = playoffs.complete ? [...playoffs.history] : [...playoffs.history, {stage:playoffs.stage,roundNumber:playoffs.roundNumber,series:playoffs.currentSeries,current:true}];
    const maxSeries = Math.max(1, ...rounds.map((round)=>round.series.length));
    const bracketHeight = Math.max(190, maxSeries * 176);
    dom['playoff-bracket'].innerHTML = `<div class="bracket-scroll" style="--bracket-height:${bracketHeight}px">${rounds.map((round)=>`<section class="bracket-round ${round.current?'current':'complete'}">
      <h3 class="bracket-round-label">${round.stage==='finals'?'HoopSim Finals':`Round ${round.roundNumber}`}</h3>
      <div class="bracket-round-list">${round.series.map((series)=>{
        const a=getTeam(series.teamAId), b=getTeam(series.teamBId);
        const userSeries = [a.id,b.id].includes(userTeamId);
        const seedA = series.seedA ?? playoffs.seedByTeam?.[a.id] ?? '';
        const seedB = series.seedB ?? playoffs.seedByTeam?.[b.id] ?? '';
        const gameChips = series.games.map((game,index)=>{
          const aScore = game.homeId===a.id ? game.homeScore : game.awayScore;
          const bScore = game.homeId===b.id ? game.homeScore : game.awayScore;
          return `<button class="box-score-chip ${game.winnerId===a.id?'a-win':'b-win'}" data-box-score="${game.id}" type="button" title="Open Game ${index+1} box score">G${index+1} ${aScore}-${bScore}</button>`;
        }).join('');
        return `<article class="series-card ${userSeries?'user-series':''}">
          <div class="series-conference">${round.stage==='finals'?'CHAMPIONSHIP':escapeHtml(series.conference)}</div>
          <div class="series-team ${series.winnerId===a.id?'winner':''}"><span><i class="series-seed">${seedA}</i>${escapeHtml(a.name)}</span><strong>${series.winsA}</strong></div>
          <div class="series-team ${series.winnerId===b.id?'winner':''}"><span><i class="series-seed">${seedB}</i>${escapeHtml(b.name)}</span><strong>${series.winsB}</strong></div>
          <div class="series-game-strip">${gameChips || '<span class="not-started">Series not started</span>'}</div>
        </article>`;
      }).join('')}</div>
    </section>`).join('')}</div>`;
    renderPlayoffGameLog();
  }

  function renderSeasonFinale() {
    const champion = getTeam(currentCareer.champion);
    const fmvp = playerById(currentCareer.finalsMvp);
    const user = getUserPlayer();
    dom['season-finale'].innerHTML = `<span class="eyebrow">CHAMPIONS</span><h2>${escapeHtml(champion.name)} win the HoopSim title.</h2><p><strong>${escapeHtml(fmvp.name)}</strong> is Finals MVP.${champion.id===user.teamId?' Your team ends the season as champion.':''}</p><button id="open-offseason-button" class="primary-button" type="button">Enter offseason</button>`;
    dom['season-finale'].classList.remove('hidden');
  }

  function performanceDevelopmentSignal(player) {
    const avg = statsAverages(player.stats.regular);
    const production = avg.ppg + avg.rpg*.65 + avg.apg*.72 + avg.spg*1.8 + avg.bpg*1.8;
    const expectation = Math.max(3, (player.overall - 48) * .62) * clamp(player.projectedMinutes / 26, .5, 1.25);
    return clamp((production - expectation) / 7.5, -3, 3.5);
  }

  function playstyleBonus(player, key) {
    if (player.playstyle === 'Pure Playmaker' && ['passing','dribbling','iq'].includes(key)) return .65;
    if (player.playstyle === 'Pure Scorer' && ['layup','midrange','threePoint','freeThrow','postMoves'].includes(key)) return .65;
    if (player.playstyle === 'Lockdown Defender' && ['interiorDefense','perimeterDefense','iq'].includes(key)) return .65;
    if (player.playstyle === 'Offensive Engine' && ['passing','dribbling','layup','midrange','threePoint'].includes(key)) return .5;
    if (player.playstyle === 'Uber Athlete' && ['dunk','vertical','speed','rebounding'].includes(key)) return .65;
    if (player.playstyle === '3&D' && ['threePoint','interiorDefense','perimeterDefense'].includes(key)) return .65;
    return 0;
  }

  function developPlayer(player) {
    const before = { ...player.attributes };
    const oldOverall = player.overall;
    const performance = performanceDevelopmentSignal(player);
    const age = player.age;
    const youngVariance = age <= 22 ? 2.15 : age <= 26 ? 1.55 : age <= 31 ? 1.25 : 1.05;
    const baseAge = age <= 20 ? 1.7 : age <= 22 ? 1.25 : age <= 26 ? .7 : age <= 30 ? .15 : age <= 33 ? -.35 : age <= 36 ? -1.05 : -1.75;
    const injuryPenalty = player.majorInjuries * .24 + (player.injury ? .25 : 0);
    const rareBreakout = age <= 22 && Math.random() < .075 ? rand(2.5,5.5) : age <= 31 && Math.random() < .012 ? rand(4,8) : 0;
    const lateLongevity = age >= 34 && player.attributes.durability >= 88 && Math.random() < .055 ? rand(1.5,4) : 0;
    const changes = {};
    ATTRIBUTES.forEach(([key]) => {
      const physicalDecline = age >= 31 && ['dunk','vertical','speed','durability'].includes(key) ? -(age-30)*.2 : 0;
      const raw = baseAge + performance*.5 + playstyleBonus(player,key) + physicalDecline - injuryPenalty + rareBreakout + lateLongevity + normalRandom()*youngVariance;
      const capDown = age >= 36 ? -8 : -6;
      const capUp = age <= 22 ? 9 : rareBreakout ? 10 : 7;
      const change = clamp(Math.round(raw), capDown, capUp);
      changes[key] = change;
      player.attributes[key] = clamp(player.attributes[key] + change, 10, 99);
    });
    player.overall = overallFromAttributes(player.attributes);
    player.age += 1;
    return { before, changes, oldOverall, newOverall:player.overall, performance, rareBreakout:rareBreakout > 0 };
  }

  function shouldGeneratedPlayerRetire(player) {
    if (player.isUser) return false;
    if (player.age >= 43) return true;
    const ageChance = player.age < 34 ? 0 : player.age < 37 ? .025 : player.age < 39 ? .16 : .42;
    const injuryChance = player.majorInjuries >= 3 ? .18 : player.majorInjuries >= 2 ? .07 : 0;
    const durabilityChance = player.attributes.durability < 35 && player.age >= 30 ? .1 : 0;
    return Math.random() < ageChance + injuryChance + durabilityChance;
  }

  function shouldForceUserRetirement(user) {
    if (user.age >= 45) return 'Age and wear have brought the career to a close.';
    if (user.majorInjuries >= 4 && user.attributes.durability < 42 && Math.random() < .35) return 'Repeated major injuries forced an early retirement.';
    if (user.age >= 40 && Math.random() < .18 + (user.age - 40) * .14) return 'After a long career, retirement became the natural next step.';
    return null;
  }

  function existingLeagueNames() {
    return new Set(allPlayers().map((player)=>player.name));
  }

  function replenishLeagueRosters() {
    const names = existingLeagueNames();
    if (Math.random() < .10) {
      const availableEggs = EASTER_EGG_NAMES.filter((name)=>!names.has(name));
      if (availableEggs.length) easterEggQueue = [choose(availableEggs)];
    }
    currentCareer.teams.forEach((team) => {
      while (team.roster.length < 12) {
        const rookie = createGeneratedPlayer({
          age: randInt(18,22), position: choose(POSITIONS), playstyle: choose(Object.keys(PLAYSTYLES)),
          targetOverall: clamp(Math.round(51 + Math.pow(Math.random(), .9) * 24 + normalRandom()*2), 45, 75),
          teamId: team.id, rookie: true, existingNames:names
        });
        rookie.contractLength = 4;
        team.roster.push(rookie);
      }
      if (team.roster.length > 12) {
        const user = getUserPlayer();
        const sorted = [...team.roster].sort((a,b)=>b.overall-a.overall);
        const keep = sorted.slice(0,12);
        if (!keep.some((player)=>player.id===user.id) && team.id===user.teamId) {
          const replaceIndex = keep.findIndex((player)=>!player.isUser);
          if (replaceIndex>=0) keep[replaceIndex]=user;
        }
        team.roster = keep;
      }
    });
  }

  function moveExpiredGeneratedPlayers() {
    const freeAgents = [];
    currentCareer.teams.forEach((team) => {
      const staying = [];
      team.roster.forEach((player) => {
        if (!player.isUser && player.contractYears <= 0) freeAgents.push(player);
        else staying.push(player);
      });
      team.roster = staying;
    });
    shuffle(freeAgents).forEach((player) => {
      const previousTeam = getTeam(player.teamId);
      const candidates = [...currentCareer.teams].sort((a,b) => {
        const needA = teamNeedScore(a, player) + (12-a.roster.length)*2 + rand(-1,1);
        const needB = teamNeedScore(b, player) + (12-b.roster.length)*2 + rand(-1,1);
        return needB - needA;
      });
      const team = candidates[0];
      player.teamId = team.id;
      player.contractYears = weightedChoice([[3,3],[4,5],[5,4],[2,1],[1,.35]]);
      player.contractLength = player.contractYears;
      team.roster.push(player);
      if (previousTeam && previousTeam.id !== team.id) recordLeagueNews('signing', `${player.name} signed a ${player.contractYears}-year deal with ${team.name} after leaving ${previousTeam.name}.`, currentCareer.league.season + 1);
    });
  }

  function prepareOffseason() {
    if (currentCareer.offseasonPreparedSeason === currentCareer.league.season) return currentCareer.development;
    const user = getUserPlayer();
    let userDevelopment = null;
    currentCareer.teams.forEach((team) => {
      const survivors = [];
      team.roster.forEach((player) => {
        const development = developPlayer(player);
        if (player.isUser) userDevelopment = development;
        player.contractYears = Math.max(0, Number(player.contractYears || 1) - 1);
        player.contractLength ||= Math.max(1, player.contractYears + 1);
        player.isRookie = false;
        player.injury = null;
        if (shouldGeneratedPlayerRetire(player)) {
          recordLeagueNews('retirement', `${player.name} retired at age ${player.age}.`, currentCareer.league.season);
        } else survivors.push(player);
      });
      team.roster = survivors;
    });
    moveExpiredGeneratedPlayers();
    replenishLeagueRosters();
    currentCareer.development = userDevelopment;
    currentCareer.offseasonPreparedSeason = currentCareer.league.season;
    currentCareer.forcedRetirementReason = shouldForceUserRetirement(user);
    return userDevelopment;
  }

  function openOffseason() {
    const development = prepareOffseason();
    renderLeagueNews();
    const user = getUserPlayer();
    const overallDelta = development.newOverall - development.oldOverall;
    dom['offseason-heading'].textContent = `${user.name}: ${development.oldOverall} → ${development.newOverall} OVR (${overallDelta>=0?'+':''}${overallDelta})`;
    dom['development-summary'].innerHTML = `<div class="development-overall"><strong>${development.newOverall}</strong><span>NEW OVR</span></div><div class="development-list">${ATTRIBUTES.map(([key,label])=>{
      const oldValue = development.before[key];
      const newValue = user.attributes[key];
      const change = newValue - oldValue;
      return `<div class="development-change ${change>0?'positive':change<0?'negative':''}"><span>${label}</span><div class="development-values"><b>${oldValue}</b><i>→</i><strong>${newValue}</strong><em>(${change>0?'+':''}${change})</em></div></div>`;
    }).join('')}</div>`;
    const forced = currentCareer.forcedRetirementReason;
    const offerCount = freeAgencyOfferCount(user.overall);
    dom['offseason-note'].textContent = forced || (user.contractYears <= 0 ? `Your contract has expired. Your ${user.overall} OVR reputation has generated up to ${offerCount} free-agent options.` : `You have ${user.contractYears} season${user.contractYears===1?'':'s'} remaining on your contract.`);
    dom['continue-next-season-button'].textContent = forced ? 'Finalize retirement' : user.contractYears <= 0 ? 'Review contract offers' : `Continue to Season ${currentCareer.league.season + 1}`;
    dom['retire-career-button'].classList.toggle('hidden', Boolean(forced));
    const tradeAvailable = !forced && user.contractYears > 0 && currentCareer.tradeRequestSeason !== currentCareer.league.season;
    dom['request-trade-button'].disabled = !tradeAvailable;
    dom['request-trade-button'].textContent = currentCareer.tradeRequestSeason === currentCareer.league.season ? 'Trade request used' : user.contractYears <= 0 ? 'Use free agency instead' : 'Request trade';
    dom['trade-request-result'].classList.add('hidden');
    dom['offseason-dialog'].showModal();
  }

  function resetForNextSeason() {
    currentCareer.league.season += 1;
    currentCareer.teams.forEach((team) => {
      team.record = { wins:0, losses:0, pointsFor:0, pointsAgainst:0 };
      const top = [...team.roster].sort((a,b)=>b.overall-a.overall).slice(0,10);
      team.quality = Math.round(mean(top.map((player)=>player.overall)));
      team.expectedWinPct = clamp(.22 + (team.quality - 64) * .025, .22, .76);
      team.roster.forEach((player) => {
        player.stats = { regular:createStats(), playoffs:createStats() };
        player.injury = null;
      });
      updateTeamRotation(team);
    });
    currentCareer.schedule = buildSchedule(currentCareer.teams.map((team)=>team.id), currentCareer.league.games);
    currentCareer.currentRound = 0;
    currentCareer.phase = 'regular';
    currentCareer.completed = false;
    currentCareer.awards = null;
    currentCareer.playoffs = null;
    currentCareer.champion = null;
    currentCareer.finalsMvp = null;
    currentCareer.userGameLogs = [];
    currentCareer.userPlayoffLogs = [];
    currentCareer.development = null;
    currentCareer.forcedRetirementReason = null;
    currentCareer.rosterViewTeamId = getUserPlayer().teamId;
    currentCareer.lastKnownUserTeamId = getUserPlayer().teamId;
    currentCareer.careerEvents.push({ season:currentCareer.league.season, text:`Season ${currentCareer.league.season} began.` });
  }

  function freeAgencyOfferCount(overall) {
    if (overall >= 95) return 10;
    if (overall >= 90) return 8;
    if (overall >= 85) return 7;
    if (overall >= 80) return 6;
    if (overall >= 75) return 5;
    if (overall >= 70) return 4;
    return 3;
  }

  function buildFreeAgencyOffers() {
    const user = getUserPlayer();
    const currentTeam = getTeam(user.teamId);
    const ranked = currentCareer.teams.map((team)=>{
      updateTeamRotation(team);
      const need = teamNeedScore(team,user);
      const projectedRoleScore = need + (team.roster.filter((p)=>p.position===user.position && p.overall>user.overall).length*-2);
      return { team, score:projectedRoleScore + rand(-1.5,1.5) };
    }).sort((a,b)=>b.score-a.score);
    const count = Math.min(currentCareer.teams.length, freeAgencyOfferCount(user.overall));
    const selected = [{team:currentTeam,score:999}, ...ranked.filter((entry)=>entry.team.id!==currentTeam.id)].slice(0,count);
    return selected.map(({team})=>{
      const stronger = team.roster.filter((player)=>player.position===user.position && player.overall>user.overall).length;
      const role = stronger===0?'Likely starter':stronger===1?'Rotation / sixth man':'Reserve competition';
      const minutes = stronger===0?randInt(29,35):stronger===1?randInt(20,28):randInt(10,20);
      const years = weightedChoice([[3,3],[4,5],[5,4],[2,1]]);
      return { teamId:team.id, role, minutes, years, quality:team.quality };
    });
  }

  function showFreeAgencyOffers() {
    currentCareer.freeAgencyOffers = buildFreeAgencyOffers();
    const user = getUserPlayer();
    dom['free-agency-heading'].textContent = `${user.name} enters free agency · ${currentCareer.freeAgencyOffers.length} teams interested`;
    dom['free-agency-offers'].innerHTML = currentCareer.freeAgencyOffers.map((offer)=>{
      const team=getTeam(offer.teamId);
      return `<article class="offer-card"><span class="eyebrow">${team.id===user.teamId?'RE-SIGN':'NEW TEAM'}</span><h3>${escapeHtml(team.name)}</h3><p>${offer.role} · ${offer.minutes} projected MPG</p><p>${offer.years}-year contract · Team quality ${offer.quality}</p><button class="primary-button wide" data-free-agent-team="${team.id}" type="button">Choose ${escapeHtml(team.abbr)}</button></article>`;
    }).join('');
    dom['free-agency-dialog'].showModal();
  }

  async function selectFreeAgentTeam(teamId) {
    const user = getUserPlayer();
    const oldTeam = getTeam(user.teamId);
    const offer = currentCareer.freeAgencyOffers.find((entry)=>entry.teamId===teamId);
    const newTeam = getTeam(teamId);
    oldTeam.roster = oldTeam.roster.filter((player)=>player.id!==user.id);
    if (newTeam.roster.length >= 12) {
      const release = [...newTeam.roster].filter((player)=>!player.isUser).sort((a,b)=>a.overall-b.overall)[0];
      newTeam.roster = newTeam.roster.filter((player)=>player.id!==release.id);
    }
    user.teamId = newTeam.id;
    user.contractYears = offer.years;
    user.contractLength = offer.years;
    newTeam.roster.push(user);
    currentCareer.rosterViewTeamId = newTeam.id;
    currentCareer.lastKnownUserTeamId = newTeam.id;
    recordLeagueNews('signing', `${user.name} signed a ${offer.years}-year contract with ${newTeam.name}${oldTeam.id===newTeam.id?'':' after leaving '+oldTeam.name}.`, currentCareer.league.season + 1);
    dom['free-agency-dialog'].close();
    resetForNextSeason();
    await putSave(currentCareer);
    renderCareer();
    showToast(`Signed with ${newTeam.name}.`, 'success');
  }

  async function requestTrade() {
    const user = getUserPlayer();
    if (!currentCareer || currentCareer.tradeRequestSeason === currentCareer.league.season || user.contractYears <= 0) return;
    currentCareer.tradeRequestSeason = currentCareer.league.season;
    dom['request-trade-button'].disabled = true;
    dom['request-trade-button'].textContent = 'Trade request used';
    dom['trade-request-result'].classList.remove('hidden');
    if (Math.random() < .33) {
      dom['trade-request-result'].className = 'trade-request-result denied';
      dom['trade-request-result'].textContent = 'The front office denied your trade request. You will remain with your current team for now.';
      await putSave(currentCareer);
      return;
    }
    const oldTeam = getTeam(user.teamId);
    const newTeam = choose(currentCareer.teams.filter((team)=>team.id!==oldTeam.id));
    const tradePiece = [...newTeam.roster].filter((player)=>!player.isUser).sort((a,b)=>Math.abs(a.overall-user.overall)-Math.abs(b.overall-user.overall))[0];
    oldTeam.roster = oldTeam.roster.filter((player)=>player.id!==user.id);
    newTeam.roster = newTeam.roster.filter((player)=>player.id!==tradePiece.id);
    tradePiece.teamId = oldTeam.id;
    user.teamId = newTeam.id;
    oldTeam.roster.push(tradePiece);
    newTeam.roster.push(user);
    updateTeamRotation(oldTeam);
    updateTeamRotation(newTeam);
    currentCareer.rosterViewTeamId = newTeam.id;
    currentCareer.lastKnownUserTeamId = newTeam.id;
    recordLeagueNews('trade', `${oldTeam.name} traded ${user.name} to ${newTeam.name} for ${tradePiece.name}.`, currentCareer.league.season + 1);
    dom['trade-request-result'].className = 'trade-request-result approved';
    dom['trade-request-result'].textContent = `Trade approved: you are headed to the ${newTeam.name}. ${tradePiece.name} was sent to ${oldTeam.name}.`;
    await putSave(currentCareer);
    renderCareer();
    if (!dom['offseason-dialog'].open) dom['offseason-dialog'].showModal();
  }

  async function continueNextSeason() {
    dom['offseason-dialog'].close();
    if (currentCareer.forcedRetirementReason) return retireCareer(currentCareer.forcedRetirementReason);
    const user = getUserPlayer();
    if (user.contractYears <= 0) return showFreeAgencyOffers();
    resetForNextSeason();
    await putSave(currentCareer);
    renderCareer();
    showToast(`Season ${currentCareer.league.season} is ready.`, 'success');
  }

  function careerTotals(user) {
    const totals = createStats();
    user.seasonHistory.forEach((season)=>{
      const source = season.totals || {};
      Object.keys(totals).forEach((key)=>{ totals[key] += Number(source[key] || 0); });
    });
    return totals;
  }

  function hallOfFameProbability(user) {
    const totals = careerTotals(user);
    const games = Math.max(1, totals.games);
    const counts = {};
    user.accolades.forEach((award)=>{counts[award.label]=(counts[award.label]||0)+1;});
    let score = user.seasonHistory.length * 1.7;
    score += (totals.points/games)*.7 + (totals.rebounds/games)*.35 + (totals.assists/games)*.45;
    score += (counts['MVP']||0)*15 + (counts['Finals MVP']||0)*11 + (counts['Defensive Player of the Year']||0)*9;
    score += (counts['HoopSim Champion']||0)*7 + (counts['All-HoopLoop First Team']||0)*5;
    score += (counts['All-HoopLoop Second Team']||0)*3 + (counts['All-HoopLoop Third Team']||0)*1.5;
    score += (counts['Rookie of the Year']||0)*4 + (counts['All-Defensive First Team']||0)*2.5;
    if (totals.points >= 25000) score += 13; else if (totals.points >= 18000) score += 8; else if (totals.points >= 12000) score += 4;
    return clamp(Math.round(score), 1, 99);
  }

  function jerseyRetirementTeams(user) {
    const seasonCounts = {};
    (user.seasonHistory || []).forEach((season)=>{ seasonCounts[season.teamId] = (seasonCounts[season.teamId] || 0) + 1; });
    const accoladeCounts = {};
    (user.accolades || []).forEach((award)=>{
      const inferredTeamId = award.teamId ?? user.seasonHistory?.find((season)=>season.season===award.season)?.teamId;
      if (inferredTeamId != null) accoladeCounts[inferredTeamId] = (accoladeCounts[inferredTeamId] || 0) + 1;
    });
    return Object.keys(seasonCounts).map(Number).map((teamId)=>{
      const team = getTeam(teamId);
      const finalsMvp = (user.accolades || []).some((award)=>award.label==='Finals MVP' && (award.teamId ?? user.seasonHistory?.find((season)=>season.season===award.season)?.teamId)===teamId);
      const accolades = accoladeCounts[teamId] || 0;
      const seasons = seasonCounts[teamId] || 0;
      const reasons = [];
      if (finalsMvp) reasons.push('Finals MVP');
      if (accolades >= 5) reasons.push(`${accolades} team accolades`);
      if (seasons >= 15) reasons.push(`${seasons} seasons`);
      return reasons.length ? { teamId, teamName:team?.name || 'Former team', reasons } : null;
    }).filter(Boolean);
  }

  function buildRetirementSummary(reason) {
    const user = getUserPlayer();
    const totals = careerTotals(user);
    const games = Math.max(1, totals.games);
    const hof = hallOfFameProbability(user);
    return {
      reason, seasons:user.seasonHistory.length, games:totals.games,
      points:totals.points, rebounds:totals.rebounds, assists:totals.assists,
      ppg:round1(totals.points/games), rpg:round1(totals.rebounds/games), apg:round1(totals.assists/games),
      fgPct:round1((totals.fga ? totals.fgm/totals.fga : 0)*100), threePct:round1((totals.threeA ? totals.threeM/totals.threeA : 0)*100), ftPct:round1((totals.fta ? totals.ftm/totals.fta : 0)*100),
      teamsPlayed:[...new Set((user.seasonHistory||[]).map((season)=>season.teamId))], jerseyRetirements:jerseyRetirementTeams(user),
      hofProbability:hof, hallOfFame:hof>=80
    };
  }

  async function retireCareer(reason = 'You chose to end the career on your own terms.') {
    dom['offseason-dialog'].close();
    currentCareer.retirement = buildRetirementSummary(reason);
    recordLeagueNews('retirement', `${getUserPlayer().name} retired after ${currentCareer.retirement.seasons} seasons.`, currentCareer.league.season);
    currentCareer.phase = 'retired';
    currentCareer.completed = true;
    await putSave(currentCareer);
    const user = getUserPlayer();
    const r = currentCareer.retirement;
    const accoladeCounts = {};
    user.accolades.forEach((award)=>{ accoladeCounts[award.label]=(accoladeCounts[award.label]||0)+1; });
    const accoladeSummary = Object.entries(accoladeCounts).sort((a,b)=>b[1]-a[1]).map(([label,count])=>`<span>${escapeHtml(label)}${count>1?` ×${count}`:''}</span>`).join('') || '<span>No major accolades</span>';
    const jerseySummary = r.jerseyRetirements.length ? `<section class="jersey-retirement-section"><span class="eyebrow">JERSEY RETIREMENTS</span>${r.jerseyRetirements.map((entry)=>`<article><strong>#${escapeHtml(user.jerseyNumber)} · ${escapeHtml(entry.teamName)}</strong><small>${escapeHtml(entry.reasons.join(' · '))}</small></article>`).join('')}</section>` : '';
    dom['retirement-summary'].innerHTML = `<div class="retirement-hero"><span class="eyebrow">FINAL CAREER CARD</span><h2>#${escapeHtml(user.jerseyNumber)} ${escapeHtml(user.name)}</h2><p>${escapeHtml(r.reason)}</p></div><div class="retirement-grid"><div class="retirement-stat"><strong>${r.seasons}</strong><span>Seasons</span></div><div class="retirement-stat"><strong>${r.games}</strong><span>Games</span></div><div class="retirement-stat"><strong>${r.points.toLocaleString()}</strong><span>Points</span></div><div class="retirement-stat"><strong>${r.ppg}</strong><span>Career PPG</span></div><div class="retirement-stat"><strong>${r.rebounds.toLocaleString()}</strong><span>Rebounds</span></div><div class="retirement-stat"><strong>${r.apg}</strong><span>Career APG</span></div><div class="retirement-stat"><strong>${r.fgPct}%</strong><span>FG%</span></div><div class="retirement-stat"><strong>${r.threePct}%</strong><span>3P%</span></div><div class="retirement-stat"><strong>${r.ftPct}%</strong><span>FT%</span></div><div class="retirement-stat"><strong>${r.teamsPlayed.length}</strong><span>Teams</span></div><div class="retirement-stat"><strong>${user.accolades.length}</strong><span>Accolades</span></div><div class="retirement-stat"><strong>${r.hofProbability}%</strong><span>Hall probability</span></div></div><section class="retirement-accolades"><span class="eyebrow">CAREER HONORS</span><div>${accoladeSummary}</div></section>${jerseySummary}<h3>HoopLoop Hall of Fame probability: ${r.hofProbability}%</h3><div class="hof-meter"><span style="width:${r.hofProbability}%"></span></div><p>${r.hallOfFame?'This career cleared the 80% induction threshold.':'This career did not reach the 80% automatic induction threshold.'}</p>`;
    dom['retirement-dialog'].showModal();
    renderCareer();
  }

  function migrateCareer(career) {
    career.version = VERSION;
    career.league.season ||= 1;
    career.league.games = clamp(Number(career.league.games || 30), 14, 99);
    career.userGameLogs ||= [];
    career.userPlayoffLogs ||= [];
    career.careerEvents ||= [];
    career.careerEvents.forEach((event)=>{ event.category ||= event.type === 'signed' ? 'signing' : event.type === 'retired' ? 'retirement' : event.type === 'traded' ? 'trade' : event.category; });
    career.settings ||= { injuriesEnabled: career.league.injuriesEnabled !== false };
    career.tradeRequestSeason ??= null;
    career.lastKnownUserTeamId ??= null;
    (career.schedule || []).forEach((round)=>round.forEach((scheduled)=>{
      if (scheduled.result) {
        scheduled.result.id ||= uid('game');
        scheduled.result.season ||= career.league.season;
      }
    }));
    if (career.playoffs) {
      if (!career.playoffs.seedByTeam) {
        career.playoffs.seedByTeam = {};
        const firstRound = career.playoffs.history?.[0]?.series || (career.playoffs.roundNumber === 1 ? career.playoffs.currentSeries : []);
        (firstRound || []).forEach((series)=>{
          if (series.seedA != null) career.playoffs.seedByTeam[series.teamAId] = series.seedA;
          if (series.seedB != null) career.playoffs.seedByTeam[series.teamBId] = series.seedB;
        });
      }
      const rounds = [...(career.playoffs.history || []), { series:career.playoffs.currentSeries || [] }];
      rounds.forEach((round)=>round.series?.forEach((series)=>series.games?.forEach((game)=>{
        game.id ||= uid('game');
        game.season ||= career.league.season;
      })));
    }
    career.teams.forEach((team)=>{
      team.record ||= {wins:0,losses:0,pointsFor:0,pointsAgainst:0};
      team.roster.forEach((player)=>{
        player.seasonHistory ||= [];
        player.seasonHistory.forEach((season)=>{
          season.starts ??= season.totals?.starts || 0;
          season.mpg ??= season.totals?.games ? round1((season.totals.minutes || 0) / season.totals.games) : 0;
          season.playoffTotals ||= createStats();
          const playoffAvg = statsAverages(season.playoffTotals);
          season.playoffGames ??= season.playoffTotals.games || 0;
          season.playoffMpg ??= round1(playoffAvg.mpg);
          season.playoffPpg ??= round1(playoffAvg.ppg);
          season.playoffRpg ??= round1(playoffAvg.rpg);
          season.playoffApg ??= round1(playoffAvg.apg);
          season.playoffFgPct ??= round1(playoffAvg.fgPct*100);
          season.playoffThreePct ??= round1(playoffAvg.threePct*100);
          season.playoffFtPct ??= round1(playoffAvg.ftPct*100);
        });
        player.accolades ||= [];
        player.accolades.forEach((award)=>{ award.teamId ??= player.seasonHistory?.find((season)=>season.season===award.season)?.teamId ?? player.teamId; });
        if (player.isUser) player.jerseyNumber = sanitizeJerseyNumber(player.jerseyNumber ?? '1');
        player.majorInjuries ||= 0;
        player.contractYears = Number.isFinite(player.contractYears) ? player.contractYears : 1;
        player.contractLength ||= Math.max(1, player.contractYears);
        player.stats ||= {regular:createStats(),playoffs:createStats()};
        player.stats.regular ||= createStats();
        player.stats.playoffs ||= createStats();
      });
    });
    return career;
  }

  function showCareerTab(name) {
    document.querySelectorAll('.career-tabs button').forEach((button)=>button.classList.toggle('active',button.dataset.tab===name));
    document.querySelectorAll('.career-tab').forEach((section)=>section.classList.toggle('hidden',section.id!==`career-${name}-tab`));
  }

  async function renderSaveDialog() {
    const saves = await getAllSaves();
    dom['save-list'].innerHTML = saves.length ? saves.map((save)=>{
      const player = save.teams?.flatMap((team)=>team.roster).find((entry)=>entry.id===save.userPlayerId);
      const team = save.teams?.find((entry)=>entry.id===player?.teamId);
      return `<article class="save-card"><div><strong>${escapeHtml(player?.name || 'Unnamed Career')}</strong><small>${escapeHtml(team?.name || 'Pre-draft')} · ${player?.overall || '--'} OVR · Season ${save.league?.season || 1} · ${escapeHtml(save.phase || 'creator')} · Updated ${formatDate(save.updatedAt)}</small></div><div class="save-actions"><button class="primary-button" data-load-save="${save.id}" type="button">Load</button><button class="ghost-button" data-export-save="${save.id}" type="button">Export</button><button class="danger-button" data-delete-save="${save.id}" type="button">Delete</button></div></article>`;
    }).join('') : '<div class="muted">No HoopSim careers saved on this device.</div>';
    if (!dom['saves-dialog'].open) dom['saves-dialog'].showModal();
  }

  async function loadCareer(id) {
    const save = await getSave(id);
    if (!save) return showToast('Save file not found.', 'error');
    currentCareer = migrateCareer(save);
    dom['saves-dialog'].close();
    renderCareer();
  }

  function downloadSave(save) {
    const blob = new Blob([JSON.stringify(save,null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `hoopsim-${(getPlayerNameFromSave(save)||'career').toLowerCase().replace(/[^a-z0-9]+/g,'-')}.json`;
    anchor.click(); URL.revokeObjectURL(url);
  }

  function getPlayerNameFromSave(save) {
    return save.teams?.flatMap((team)=>team.roster).find((entry)=>entry.id===save.userPlayerId)?.name || 'career';
  }

  async function importSave(file) {
    try {
      const text = await file.text();
      const save = JSON.parse(text);
      if (!save.id || !save.teams || !save.userPlayerId) throw new Error('Not a HoopSim save');
      const saves = await getAllSaves();
      if (saves.length >= MAX_SAVES && !saves.some((entry)=>entry.id===save.id)) throw new Error(`Maximum ${MAX_SAVES} saves reached`);
      save.updatedAt = new Date().toISOString();
      await putSave(save); await renderSaveDialog(); showToast('Save imported.', 'success');
    } catch (error) { showToast(error.message || 'Could not import save.', 'error'); }
  }

  function startNewCareer() {
    currentCareer = null;
    draftSession = null;
    creator.leagueConfig = null; creator.playerConfig = null;
    creator.selectedTeamIds.clear();
    dom['league-size'].value = '16'; dom['season-games'].value='30'; dom['league-name'].value='HoopSim League';
    updatePlayoffOptions(); autoSelectTeams();
    dom['player-name'].value='Evan Oblewski';
    dom['player-jersey'].value='1';
    dom['player-position'].value='PG'; dom['player-playstyle'].value='All Around Hooper'; dom['player-height'].value='75'; dom['player-weight'].value='195';
    applyPlaystyleTemplate(); showView('creator-view'); showCreatorStep('league');
  }

  function bindEvents() {
    dom['new-career-button'].addEventListener('click', startNewCareer);
    dom['continue-career-button'].addEventListener('click', renderSaveDialog);
    dom['open-saves-button'].addEventListener('click', renderSaveDialog);
    dom['new-save-from-dialog'].addEventListener('click', () => { dom['saves-dialog'].close(); startNewCareer(); });
    dom['league-size'].addEventListener('change', updatePlayoffOptions);
    dom['season-games'].addEventListener('input',()=>{ dom['season-games'].value = dom['season-games'].value.replace(/\D/g,'').slice(0,2); previewSeasonGamesInput(); });
    ['change','blur'].forEach((eventName)=>dom['season-games'].addEventListener(eventName,clampSeasonGamesInput));
    dom['season-games'].addEventListener('keydown',(event)=>{ if(event.key==='Enter'){ event.preventDefault(); dom['season-games'].blur(); } });
    dom['player-jersey'].addEventListener('input',()=>{ dom['player-jersey'].value = dom['player-jersey'].value.replace(/\D/g,'').slice(0,2); });
    dom['player-jersey'].addEventListener('blur',()=>{ dom['player-jersey'].value = sanitizeJerseyNumber(dom['player-jersey'].value); });
    document.querySelectorAll('[data-adjust-games]').forEach((button)=>button.addEventListener('click',()=>{
      const current = Number(dom['season-games'].value);
      const base = Number.isFinite(current) ? current : 30;
      dom['season-games'].value = String(clamp(Math.round(base + Number(button.dataset.adjustGames)),14,99));
      clampSeasonGamesInput();
    }));
    dom['team-search'].addEventListener('input', renderTeams);
    dom['team-grid'].addEventListener('click', (event) => { const button=event.target.closest('[data-team-id]'); if(button)toggleTeam(Number(button.dataset.teamId)); });
    dom['auto-select-teams'].addEventListener('click', autoSelectTeams);
    dom['clear-team-selection'].addEventListener('click',()=>{creator.selectedTeamIds.clear();renderTeams();});
    dom['randomize-league-button'].addEventListener('click',()=>{
      const sizes=Array.from({length:22},(_,i)=>8+i*2);dom['league-size'].value=String(choose(sizes));dom['season-games'].value=randInt(14,99);updatePlayoffOptions();dom['series-length'].value=String(choose([1,3,5,7,9]));autoSelectTeams();clampSeasonGamesInput();
    });
    dom['cancel-creator-button'].addEventListener('click',()=>showView('landing-view'));
    dom['continue-to-player'].addEventListener('click',()=>{if(validateLeagueConfig()){showCreatorStep('player');updatePlayerProjection();}});
    dom['back-to-league'].addEventListener('click',()=>showCreatorStep('league'));
    dom['apply-template-button'].addEventListener('click',applyPlaystyleTemplate);
    dom['randomize-attributes-button'].addEventListener('click',randomizeAttributes);
    dom['reset-attributes-button'].addEventListener('click',()=>setAllAttributes(50));
    dom['player-playstyle'].addEventListener('change',()=>showToast(PLAYSTYLES[dom['player-playstyle'].value].description));
    ['player-name','player-position'].forEach((id)=>dom[id].addEventListener('input',updatePlayerProjection));
    dom['projection-visible'].addEventListener('change',()=>{dom['projection-content'].classList.toggle('hidden',!dom['projection-visible'].checked);dom['projection-hidden'].classList.toggle('hidden',dom['projection-visible'].checked);});
    dom['attribute-grid'].addEventListener('input',(event)=>{const key=event.target.dataset.attributeRange||event.target.dataset.attributeNumber;if(key)syncAttribute(key,event.target.value);});
    dom['begin-draft-button'].addEventListener('click',async()=>{creator.playerConfig=gatherPlayerConfig();const saves=await getAllSaves();if(saves.length>=MAX_SAVES)return showToast(`Delete or export a save first. Maximum ${MAX_SAVES}.`,'error');await runDraft();});
    dom['manual-draft-button'].addEventListener('click',startManualDraft);
    dom['simulate-draft-button'].addEventListener('click',simulateRemainingDraft);
    dom['draft-next-pick-button'].addEventListener('click',draftNextPick);
    dom['simulate-remaining-draft-button'].addEventListener('click',simulateRemainingDraft);
    dom['draft-step'].addEventListener('click',(event)=>{const button=event.target.closest('[data-sign-team]');if(button)signUndrafted(Number(button.dataset.signTeam));});
    dom['continue-after-draft'].addEventListener('click',async()=>{await putSave(currentCareer);renderCareer();});
    document.querySelectorAll('[data-sim]').forEach((button)=>button.addEventListener('click',()=>{
      const value=button.dataset.sim;let count=1;if(value==='5')count=5;else if(value==='half')count=Math.max(0,Math.ceil(currentCareer.league.games/2)-currentCareer.currentRound);else if(value==='full')count=currentCareer.league.games-currentCareer.currentRound;simulateRegularRounds(count);
    }));
    document.querySelectorAll('.career-tabs button').forEach((button)=>button.addEventListener('click',()=>showCareerTab(button.dataset.tab)));
    document.querySelectorAll('[data-open-tab]').forEach((button)=>button.addEventListener('click',()=>showCareerTab(button.dataset.openTab)));
    dom['stats-sort'].addEventListener('change',()=>{statsSortKey=dom['stats-sort'].value;statsSortDirection=-1;renderStatsTable();});
    dom['stats-table'].addEventListener('click',(event)=>{
      const sortButton=event.target.closest('[data-stat-sort]');
      if(sortButton){
        const key=sortButton.dataset.statSort;
        if(statsSortKey===key) statsSortDirection*=-1; else {statsSortKey=key;statsSortDirection=-1;}
        renderStatsTable();
      }
    });
    dom['roster-team-select'].addEventListener('change',()=>{currentCareer.rosterViewTeamId=Number(dom['roster-team-select'].value);renderRoster(getTeam(currentCareer.rosterViewTeamId));});
    document.addEventListener('click',(event)=>{
      const playerButton=event.target.closest('[data-player-id]');
      if(playerButton && currentCareer) openPlayerProfile(playerButton.dataset.playerId);
    });
    dom['close-player-profile'].addEventListener('click',()=>dom['player-profile-dialog'].close());
    dom['close-box-score'].addEventListener('click',()=>dom['box-score-dialog'].close());
    document.addEventListener('click',(event)=>{ const button=event.target.closest('[data-box-score]'); if(button && currentCareer) openBoxScore(button.dataset.boxScore); });
    dom['manual-save-button'].addEventListener('click',async()=>{await putSave(currentCareer);showToast('Career saved.','success');});
    dom['career-menu-button'].addEventListener('click',()=>dom['career-menu-dialog'].showModal());
    dom['export-current-save'].addEventListener('click',()=>downloadSave(currentCareer));
    dom['return-to-title'].addEventListener('click',()=>{dom['career-menu-dialog'].close();currentCareer=null;showView('landing-view');refreshContinueButton();});
    dom['delete-current-save'].addEventListener('click',async()=>{if(confirm('Delete this HoopSim career from this device?')){await deleteSave(currentCareer.id);currentCareer=null;dom['career-menu-dialog'].close();showView('landing-view');refreshContinueButton();}});
    dom['postseason-panel'].addEventListener('click',(event)=>{
      if(event.target.id==='begin-playoffs-button'){createInitialPlayoffs();putSave(currentCareer);renderCareer();}
      if(event.target.id==='open-offseason-button')openOffseason();
    });
    dom['sim-playoff-game'].addEventListener('click',simNextPlayoffGame);
    dom['sim-playoff-round'].addEventListener('click',simCurrentPlayoffRound);
    dom['sim-all-playoffs'].addEventListener('click',simAllPlayoffs);
    dom['continue-next-season-button'].addEventListener('click',continueNextSeason);
    dom['request-trade-button'].addEventListener('click',requestTrade);
    dom['retire-career-button'].addEventListener('click',()=>retireCareer());
    dom['free-agency-offers'].addEventListener('click',(event)=>{const button=event.target.closest('[data-free-agent-team]');if(button)selectFreeAgentTeam(Number(button.dataset.freeAgentTeam));});
    dom['close-retirement-button'].addEventListener('click',()=>{dom['retirement-dialog'].close();if(currentCareer.retirement?.hallOfFame){dom['hall-of-fame-heading'].textContent=`${getUserPlayer().name} is inducted.`;dom['hall-of-fame-copy'].textContent=`A ${currentCareer.retirement.hofProbability}% Hall of Fame case earns a place among HoopLoop's legends.${currentCareer.retirement.jerseyRetirements?.length ? ` Jersey #${getUserPlayer().jerseyNumber} was also retired by ${currentCareer.retirement.jerseyRetirements.map((entry)=>entry.teamName).join(', ')}.` : ''}`;dom['hall-of-fame-dialog'].showModal();}});
    dom['close-hall-of-fame-button'].addEventListener('click',()=>dom['hall-of-fame-dialog'].close());
    dom['save-list'].addEventListener('click',async(event)=>{
      const load=event.target.closest('[data-load-save]');const del=event.target.closest('[data-delete-save]');const exp=event.target.closest('[data-export-save]');
      if(load)await loadCareer(load.dataset.loadSave);
      if(del&&confirm('Delete this career?')){await deleteSave(del.dataset.deleteSave);await renderSaveDialog();refreshContinueButton();}
      if(exp){const save=await getSave(exp.dataset.exportSave);if(save)downloadSave(save);}
    });
    dom['import-save-input'].addEventListener('change',(event)=>{if(event.target.files[0])importSave(event.target.files[0]);event.target.value='';});
    window.addEventListener('beforeunload',()=>{if(currentCareer)putSave(currentCareer);});
  }

  async function init() {
    cacheDom(); fillSelects();
    ATTRIBUTES.forEach(([key])=>{creator.attributes[key]=60;});
    renderAttributeEditor(); autoSelectTeams(); bindEvents(); await refreshContinueButton();
    clampSeasonGamesInput();
    dom['autosave-status'].textContent = 'Offline · ready';
  }

  document.addEventListener('DOMContentLoaded', init);
})();
