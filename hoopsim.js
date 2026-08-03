(() => {
  'use strict';

  const VERSION = '0.1.0';
  const DB_NAME = 'hoopsim_alpha_db';
  const DB_STORE = 'careers';
  const MAX_SAVES = 5;

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

  function showView(viewId) {
    ['landing-view', 'creator-view', 'career-view'].forEach((id) => $(id).classList.toggle('hidden', id !== viewId));
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    const valid = overall >= 50 && dom['player-name'].value.trim();
    dom['begin-draft-button'].disabled = !valid;
    dom['player-validation'].textContent = overall < 50 ? `Current overall: ${overall}. Raise the average to at least 50.` : `Current overall: ${overall}. No maximum rating is enforced.`;
    dom['player-validation'].classList.toggle('error', overall < 50);
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

  function validateLeagueConfig() {
    const size = Number(dom['league-size'].value);
    const games = clamp(Number(dom['season-games'].value), 14, 99);
    dom['season-games'].value = games;
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
      attributes: { ...creator.attributes },
      overall
    };
  }

  function fakeName(existingNames) {
    let name = '';
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
    return {
      id: uid('player'), name: name || fakeName(existingNames), age, position, playstyle, height, weight,
      attributes, overall: overallFromAttributes(attributes), teamId, isUser: false, isRookie: rookie,
      contractYears: rookie ? 4 : weightedChoice([[3,3],[4,5],[5,4],[2,1],[1,.5]]),
      role: 'Reserve', projectedMinutes: 0, injury: null, majorInjuries: 0,
      stats: { regular: createStats(), playoffs: createStats() }, seasonHistory: [], accolades: []
    };
  }

  function createUserPlayer(config) {
    return {
      id: uid('user'), ...config, teamId: null, isUser: true, isRookie: true, contractYears: 4,
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
      const target = clamp(Math.round(57 + Math.pow(Math.random(), .75) * 18 + normalRandom() * 2), 50, 75);
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
    dom['draft-headline'].textContent = 'Generating your basketball world…';
    dom['draft-subhead'].textContent = 'Creating rosters, team strengths, contracts, and a draft class.';

    const existingNames = new Set();
    const userPlayer = createUserPlayer(creator.playerConfig);
    const teams = generateLeagueTeams(creator.leagueConfig, existingNames);
    const prospects = generateDraftClass(Math.ceil(teams.length * 1.35), userPlayer, existingNames);
    const draftOrder = shuffle(teams.map((team) => team.id));
    const draftPicks = [];
    await sleep(450);
    dom['draft-headline'].textContent = `${creator.leagueConfig.name} Draft`;
    dom['draft-subhead'].textContent = `${teams.length} teams. One round. Team need can move prospects within their rating tier.`;

    for (let pickIndex = 0; pickIndex < draftOrder.length; pickIndex += 1) {
      const team = teams.find((entry) => entry.id === draftOrder[pickIndex]);
      const available = prospects.filter((prospect) => !prospect.drafted);
      const selected = [...available].sort((a, b) => prospectDraftScore(team, b) - prospectDraftScore(team, a))[0];
      selected.drafted = true;
      selected.draftPick = pickIndex + 1;
      selected.teamId = team.id;
      team.draftPick = selected.id;
      team.roster.push(selected);
      draftPicks.push({ pick: pickIndex + 1, teamId: team.id, playerId: selected.id });
      const row = document.createElement('div');
      row.className = `draft-pick ${selected.isUser ? 'user-pick' : ''}`;
      row.innerHTML = `<span class="pick-number">#${pickIndex + 1}</span><span><strong>${escapeHtml(selected.name)}</strong><small>${selected.position} · ${escapeHtml(selected.playstyle)} · ${escapeHtml(team.name)}</small></span><span class="pick-overall">${selected.overall} OVR</span>`;
      dom['draft-board'].appendChild(row);
      if (selected.isUser) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(Math.max(35, 115 - teams.length));
    }

    const draftedUser = prospects.find((prospect) => prospect.isUser && prospect.draftPick);
    currentCareer = buildCareerState(creator.leagueConfig, teams, prospects, draftPicks, userPlayer.id);
    if (draftedUser) {
      const team = teams.find((entry) => entry.id === draftedUser.teamId);
      dom['draft-result'].innerHTML = `<span class="eyebrow">DRAFTED</span><h2>${escapeHtml(team.name)} select ${escapeHtml(draftedUser.name)}.</h2><p>You were selected <strong>#${draftedUser.draftPick}</strong> overall at ${draftedUser.overall} OVR. Your guaranteed rookie contract runs four seasons.</p>`;
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
      settings: { injuriesEnabled: config.injuriesEnabled }
    };
  }

  function showUndraftedOffers(userPlayer) {
    const offers = [...currentCareer.teams]
      .map((team) => ({ team, score: teamNeedScore(team, userPlayer) + team.roster.filter((player) => player.overall <= userPlayer.overall).length * .7 + rand(-1,1) }))
      .sort((a,b) => b.score - a.score).slice(0, 5);
    dom['draft-result'].innerHTML = `<span class="eyebrow">UNDRAFTED</span><h2>${escapeHtml(userPlayer.name)} was not selected.</h2><p>Choose a team offering a roster spot. The lowest-rated player will be released to keep a 12-player active roster.</p>`;
    dom['draft-result'].classList.remove('hidden');
    dom['undrafted-offers'].innerHTML = `<div class="offer-grid">${offers.map(({ team }) => {
      const samePos = team.roster.filter((player) => player.position === userPlayer.position).sort((a,b) => b.overall-a.overall)[0];
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
    team.roster.push(user);
    currentCareer.careerEvents.push({ type:'signed', season:1, text:`Signed with ${team.name} after going undrafted.` });
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

  function chooseStartingFive(roster) {
    const available = roster.filter((player) => !player.injury || player.injury.gamesRemaining <= 0);
    const selected = [];
    POSITIONS.forEach((position) => {
      const candidate = available.filter((player) => player.position === position && !selected.includes(player)).sort((a,b) => b.overall-a.overall)[0];
      if (candidate) selected.push(candidate);
    });
    available.sort((a,b) => b.overall-a.overall).forEach((player) => { if (selected.length < 5 && !selected.includes(player)) selected.push(player); });
    return selected;
  }

  function updateTeamRotation(team) {
    const available = team.roster.filter((player) => !player.injury || player.injury.gamesRemaining <= 0).sort((a,b) => b.overall-a.overall);
    const starters = chooseStartingFive(team.roster);
    const rotation = [...starters, ...available.filter((player) => !starters.includes(player))].slice(0, 10);
    const minuteSlots = [36,34,32,30,28,22,18,16,13,11];
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

  function simulatePlayerBox(player, opponentDefense, coachRating) {
    const minutes = player.projectedMinutes;
    const a = player.attributes;
    const scoringSkill = mean([a.layup, a.dunk, a.midrange, a.threePoint, a.postMoves]);
    const creation = mean([a.passing, a.dribbling, a.iq]);
    const defenseFactor = clamp(1 + (70 - opponentDefense) * .003, .88, 1.10);
    const coachFactor = clamp(1 + (coachRating - 70) * .0015, .96, 1.05);
    const playstyleFga = player.playstyle === 'Pure Scorer' ? 2.5 : player.playstyle === 'Offensive Engine' ? 1.4 : player.playstyle === 'Pure Playmaker' ? -1.2 : player.playstyle === '3&D' ? -.3 : 0;
    const fgaPer36 = clamp(3.5 + scoringSkill / 11 + a.dribbling / 60 + playstyleFga, 3.5, 20);
    const fga = Math.max(0, Math.round(fgaPer36 * minutes / 36 * rand(.87,1.13)));
    const threeRate = clamp(.06 + a.threePoint / 240 + (player.playstyle === '3&D' ? .15 : 0) + (player.playstyle === 'Pure Scorer' ? .04 : 0), .04, .68);
    const threeA = Math.min(fga, Math.round(fga * threeRate * rand(.85,1.15)));
    const twoA = Math.max(0, fga - threeA);
    const twoSkill = mean([a.layup, a.dunk, a.midrange, a.postMoves]);
    const twoPct = clamp((.37 + twoSkill * .00235) * defenseFactor * coachFactor, .35, .65);
    const threePct = clamp((.21 + a.threePoint * .00255) * defenseFactor * coachFactor, .20, .47);
    const threeM = binomial(threeA, threePct);
    const twoM = binomial(twoA, twoPct);
    const ftaPer36 = clamp(.6 + (a.layup + a.dunk + a.postMoves) / 58 + (player.playstyle === 'Pure Scorer' ? 1 : 0), .5, 10);
    const fta = Math.round(ftaPer36 * minutes / 36 * rand(.65,1.35));
    const ftPct = clamp(.45 + a.freeThrow * .005, .50, .96);
    const ftm = binomial(fta, ftPct);
    const points = twoM * 2 + threeM * 3 + ftm;
    const positionReb = { PG:0, SG:.3, SF:.8, PF:1.7, C:2.7 }[player.position];
    const rebounds = Math.max(0, Math.round((.4 + a.rebounding / 13 + positionReb + (player.playstyle === 'Uber Athlete' ? 1.2 : 0)) * minutes / 36 * rand(.65,1.35)));
    const posAst = player.position === 'PG' ? 1.4 : player.position === 'SG' ? .5 : 0;
    const assists = Math.max(0, Math.round((.2 + a.passing / 15 + a.dribbling / 55 + posAst + (player.playstyle === 'Pure Playmaker' ? 2 : player.playstyle === 'Offensive Engine' ? 1 : 0)) * minutes / 36 * rand(.55,1.45)));
    const steals = Math.max(0, Math.round((.15 + a.perimeterDefense / 78 + a.iq / 210 + (player.playstyle === 'Lockdown Defender' ? .5 : 0)) * minutes / 36 * rand(.45,1.55)));
    const heightBonus = Math.max(0, (player.height - 75) / 14);
    const blocks = Math.max(0, Math.round((.05 + a.interiorDefense / 82 + heightBonus + (player.position === 'C' ? .4 : 0)) * minutes / 36 * rand(.4,1.6)));
    const turnovers = Math.max(0, Math.round((.4 + fga / 16 + assists / 3.8 + creation / 150 - a.iq / 220) * rand(.6,1.4)));
    const fouls = Math.max(0, Math.round((1.2 + (100-a.iq)/60) * minutes / 36 * rand(.5,1.5)));
    return { playerId:player.id, minutes, points, rebounds, assists, steals, blocks, turnovers, fgm:twoM+threeM, fga, threeM, threeA, ftm, fta, fouls, starter:player.role==='Starter' };
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
    updateTeamRotation(homeTeam); updateTeamRotation(awayTeam);
    const homeDefense = averageDefense(homeTeam);
    const awayDefense = averageDefense(awayTeam);
    const homeBoxes = homeTeam.roster.filter((player) => player.projectedMinutes > 0 && !player.injury).map((player) => simulatePlayerBox(player, awayDefense, homeTeam.coachRating));
    const awayBoxes = awayTeam.roster.filter((player) => player.projectedMinutes > 0 && !player.injury).map((player) => simulatePlayerBox(player, homeDefense, awayTeam.coachRating));
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
    return { homeId:homeTeam.id, awayId:awayTeam.id, homeScore, awayScore, winnerId:homeScore>awayScore?homeTeam.id:awayTeam.id, homeBoxes, awayBoxes, playoff };
  }

  function userGameEntry(result) {
    const user = getUserPlayer();
    if (![result.homeId, result.awayId].includes(user.teamId)) return null;
    const opponentId = result.homeId === user.teamId ? result.awayId : result.homeId;
    const boxes = result.homeId === user.teamId ? result.homeBoxes : result.awayBoxes;
    const box = boxes.find((entry) => entry.playerId === user.id);
    const userScore = result.homeId === user.teamId ? result.homeScore : result.awayScore;
    const oppScore = result.homeId === user.teamId ? result.awayScore : result.homeScore;
    return { round:currentCareer.currentRound+1, opponentId, result:userScore>oppScore?'W':'L', score:`${userScore}-${oppScore}`, box:box||null, injured:!box };
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
    return { mvp:mvp.id, roty:roty.id, dpoy:dpoy.id, sixth:sixth.id, coty:coachTeam.id, first:first.map(p=>p.id), second:second.map(p=>p.id), third:third.map(p=>p.id), defenseFirst:defenseFirst.map(p=>p.id), defenseSecond:defenseSecond.map(p=>p.id) };
  }

  function finishRegularSeason() {
    currentCareer.phase = 'awards';
    currentCareer.awards = calculateAwards();
    const user = getUserPlayer();
    const awardMap = currentCareer.awards;
    [['MVP','mvp'],['Rookie of the Year','roty'],['Defensive Player of the Year','dpoy'],['Sixth Man of the Year','sixth']].forEach(([label,key]) => {
      if (awardMap[key] === user.id) user.accolades.push({ season:1, label });
    });
    [['All-HoopLoop First Team','first'],['All-HoopLoop Second Team','second'],['All-HoopLoop Third Team','third'],['All-Defensive First Team','defenseFirst'],['All-Defensive Second Team','defenseSecond']].forEach(([label,key]) => {
      if (awardMap[key].includes(user.id)) user.accolades.push({ season:1, label });
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
    const pair = (teams, conference) => Array.from({ length: teams.length/2 }, (_, i) => createSeries(teams[i], teams[teams.length-1-i], conference));
    currentCareer.playoffs = {
      bestOf:currentCareer.league.seriesLength, winsNeeded:Math.floor(currentCareer.league.seriesLength/2)+1,
      stage:'conference', roundNumber:1, currentSeries:[...pair(west,'West'),...pair(east,'East')],
      history:[], finals:null, complete:false
    };
    currentCareer.phase = 'playoffs';
  }

  function createSeries(teamA, teamB, conference = 'Finals') {
    return { id:uid('series'), conference, teamAId:teamA.id, teamBId:teamB.id, winsA:0, winsB:0, complete:false, winnerId:null, games:[] };
  }

  function simulateSeriesGame(series) {
    const gameNumber = series.games.length;
    const homeA = gameNumber % 4 === 0 || gameNumber % 4 === 1;
    const home = getTeam(homeA ? series.teamAId : series.teamBId);
    const away = getTeam(homeA ? series.teamBId : series.teamAId);
    const result = simulateGame(home, away, true);
    series.games.push(result);
    if (result.winnerId === series.teamAId) series.winsA += 1; else series.winsB += 1;
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
      playoffs.currentSeries = [createSeries(westWinners[0], eastWinners[0], 'Finals')];
    } else {
      const pairWinners = (teams, conference) => Array.from({length:teams.length/2},(_,i)=>createSeries(teams[i],teams[teams.length-1-i],conference));
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

  function finalizeSeasonHistory() {
    const user = getUserPlayer();
    const avg = statsAverages(user.stats.regular);
    const team = getTeam(user.teamId);
    const champion = currentCareer.champion === user.teamId;
    if (champion) user.accolades.push({season:1,label:'HoopSim Champion'});
    if (currentCareer.finalsMvp === user.id) user.accolades.push({season:1,label:'Finals MVP'});
    user.seasonHistory.push({ season:1, teamId:team.id, overall:user.overall, games:user.stats.regular.games, ppg:round1(avg.ppg), rpg:round1(avg.rpg), apg:round1(avg.apg), record:`${team.record.wins}-${team.record.losses}`, champion });
  }

  async function simNextPlayoffGame() {
    if (!currentCareer.playoffs || currentCareer.playoffs.complete) return;
    const series = currentCareer.playoffs.currentSeries.find((entry) => !entry.complete);
    if (series) simulateSeriesGame(series);
    advancePlayoffStageIfReady();
    await putSave(currentCareer); renderCareer();
  }

  async function simCurrentPlayoffRound() {
    if (!currentCareer.playoffs || currentCareer.playoffs.complete) return;
    currentCareer.playoffs.currentSeries.forEach((series) => { while (!series.complete) simulateSeriesGame(series); });
    advancePlayoffStageIfReady();
    await putSave(currentCareer); renderCareer();
  }

  async function simAllPlayoffs() {
    if (!currentCareer.playoffs || currentCareer.playoffs.complete) return;
    while (!currentCareer.playoffs.complete) {
      currentCareer.playoffs.currentSeries.forEach((series) => { while (!series.complete) simulateSeriesGame(series); });
      advancePlayoffStageIfReady();
      await sleep(0);
    }
    await putSave(currentCareer); renderCareer();
  }

  function playerById(id) { return allPlayers().find((player) => player.id === id); }

  function renderCareer() {
    if (!currentCareer) return;
    showView('career-view');
    const user = getUserPlayer();
    const team = getTeam(user.teamId);
    updateTeamRotation(team);
    dom['career-league-label'].textContent = currentCareer.league.name.toUpperCase();
    dom['career-title'].textContent = `${user.name}’s Career`;
    dom['career-subtitle'].textContent = `Season 1 · ${currentCareer.phase === 'regular' ? 'Regular Season' : currentCareer.phase === 'awards' ? 'Awards' : currentCareer.phase === 'playoffs' ? 'Playoffs' : currentCareer.phase === 'complete' ? 'Season Complete' : 'Preseason'}`;
    dom['player-team-mark'].textContent = team.abbr;
    dom['player-team-name'].textContent = team.name;
    dom['player-contract'].textContent = `${user.draftPick ? 'Rookie contract' : 'Rookie deal'} · Year 1 of ${user.contractYears}`;
    dom['career-overall'].textContent = user.overall;
    dom['career-player-name'].textContent = user.name;
    dom['career-player-meta'].textContent = `${user.position} · ${formatHeight(user.height)} · ${user.weight} lbs · ${user.playstyle}`;
    dom['career-role'].textContent = user.role;
    dom['career-minutes'].textContent = `${user.projectedMinutes} projected MPG`;
    dom['career-health'].textContent = user.injury ? `${user.injury.label} · ${user.injury.gamesRemaining} games` : 'Healthy';
    renderSeasonAverages(user);
    renderSeasonControl(team);
    renderRecentGames();
    renderStandings();
    renderLeaders();
    renderStatsTable();
    renderRoster(team);
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
    if (currentCareer.phase === 'regular') {
      const nextRound = currentCareer.schedule[currentCareer.currentRound];
      const game = nextRound?.find((entry)=>[entry.homeId,entry.awayId].includes(team.id));
      const opponent = game ? getTeam(game.homeId===team.id?game.awayId:game.homeId) : null;
      dom['next-game-copy'].textContent = opponent ? `Next: ${game.homeId===team.id?'vs.':'at'} ${opponent.name}` : 'Regular season complete.';
    } else dom['next-game-copy'].textContent = 'The regular season is complete.';
  }

  function renderRecentGames() {
    const logs = (currentCareer.userGameLogs || []).slice(-6).reverse();
    dom['recent-games'].innerHTML = logs.length ? logs.map((log)=>{
      const opponent = getTeam(log.opponentId);
      const line = log.box ? `${log.box.points} PTS · ${log.box.rebounds} REB · ${log.box.assists} AST` : 'DNP · Injured';
      return `<div class="list-row"><span><strong>${log.result} ${log.score}</strong><small> vs ${escapeHtml(opponent.abbr)} · ${line}</small></span><span>G${log.round}</span></div>`;
    }).join('') : '<div class="muted">No games played yet.</div>';
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

  function renderStatsTable() {
    const sortKey = dom['stats-sort'].value;
    const players = qualifiedPlayersForDisplay().sort((a,b)=>statsAverages(b.stats.regular)[sortKey]-statsAverages(a.stats.regular)[sortKey]).slice(0,100);
    dom['stats-table'].innerHTML = players.length ? `<table class="data-table"><thead><tr><th>#</th><th>Player</th><th>Team</th><th>GP</th><th>PPG</th><th>RPG</th><th>APG</th><th>SPG</th><th>BPG</th><th>FG%</th><th>3P%</th></tr></thead><tbody>${players.map((player,index)=>{const a=statsAverages(player.stats.regular);return `<tr class="${player.isUser?'user-row':''}"><td>${index+1}</td><td><strong>${escapeHtml(player.name)}</strong><br><small>${player.position} · ${player.overall} OVR</small></td><td>${escapeHtml(getTeam(player.teamId).abbr)}</td><td>${player.stats.regular.games}</td><td>${round1(a.ppg).toFixed(1)}</td><td>${round1(a.rpg).toFixed(1)}</td><td>${round1(a.apg).toFixed(1)}</td><td>${round1(a.spg).toFixed(1)}</td><td>${round1(a.bpg).toFixed(1)}</td><td>${(a.fgPct*100).toFixed(1)}</td><td>${(a.threePct*100).toFixed(1)}</td></tr>`}).join('')}</tbody></table>` : '<div class="muted">Simulate games to populate league statistics.</div>';
  }

  function renderRoster(team) {
    dom['roster-title'].textContent = `${team.name} roster`;
    const roster = [...team.roster].sort((a,b)=>b.projectedMinutes-a.projectedMinutes || b.overall-a.overall);
    dom['roster-table'].innerHTML = `<table class="data-table"><thead><tr><th>Player</th><th>Pos</th><th>Age</th><th>OVR</th><th>Role</th><th>MPG</th><th>Contract</th><th>Status</th></tr></thead><tbody>${roster.map((player)=>`<tr class="${player.isUser?'user-row':''}"><td><strong>${escapeHtml(player.name)}</strong><br><small>${escapeHtml(player.playstyle)}</small></td><td>${player.position}</td><td>${player.age}</td><td>${player.overall}</td><td>${player.role}</td><td>${player.projectedMinutes}</td><td>${player.contractYears} yr</td><td>${player.injury?`${escapeHtml(player.injury.label)} (${player.injury.gamesRemaining})`:'Healthy'}</td></tr>`).join('')}</tbody></table>`;
  }

  function renderHistory(user) {
    dom['career-history-list'].innerHTML = user.seasonHistory.length ? user.seasonHistory.map((season)=>`<div class="list-row"><span><strong>Season ${season.season} · ${escapeHtml(getTeam(season.teamId).name)}</strong><small>${season.ppg} PPG · ${season.rpg} RPG · ${season.apg} APG · ${season.record}${season.champion?' · Champion':''}</small></span><span>${season.overall} OVR</span></div>`).join('') : currentCareer.careerEvents.map((event)=>`<div class="list-row"><span><strong>Season ${event.season}</strong><small>${escapeHtml(event.text)}</small></span></div>`).join('');
    const counts = {};
    user.accolades.forEach((award)=>{counts[award.label]=(counts[award.label]||0)+1;});
    dom['career-accolades'].innerHTML = Object.keys(counts).length ? Object.entries(counts).map(([label,count])=>`<div class="trophy"><strong>${count}</strong><span>${escapeHtml(label)}</span></div>`).join('') : '<div class="muted">Your trophy case is empty.</div>';
  }

  function awardCard(label, playerId) {
    const player = playerById(playerId);
    return `<article class="award-card"><span>${label}</span><strong>${escapeHtml(player?.name || '—')}</strong><small>${player ? `${escapeHtml(getTeam(player.teamId).abbr)} · ${player.position}` : ''}</small></article>`;
  }

  function renderPostseason() {
    const panel = dom['postseason-panel'];
    panel.classList.toggle('hidden', !['awards','playoffs','complete'].includes(currentCareer.phase));
    if (panel.classList.contains('hidden')) return;
    const awards = currentCareer.awards;
    dom['awards-grid'].innerHTML = awardCard('MVP',awards.mvp)+awardCard('ROTY',awards.roty)+awardCard('DPOY',awards.dpoy)+awardCard('6MOTY',awards.sixth)+`<article class="award-card"><span>COTY</span><strong>${escapeHtml(getTeam(awards.coty).name)}</strong><small>Coach rating ${getTeam(awards.coty).coachRating}</small></article>`;
    const teamLine = (label, ids) => `<div class="all-team-row"><strong>${label}</strong><span>${ids.map((id)=>escapeHtml(playerById(id).name)).join(' · ')}</span></div>`;
    dom['all-league-teams'].innerHTML = teamLine('All-HoopLoop First Team',awards.first)+teamLine('All-HoopLoop Second Team',awards.second)+teamLine('All-HoopLoop Third Team',awards.third)+teamLine('All-Defensive First Team',awards.defenseFirst)+teamLine('All-Defensive Second Team',awards.defenseSecond);
    if (currentCareer.phase === 'awards') {
      dom['postseason-title'].textContent = 'Regular-season awards';
      dom['postseason-copy'].textContent = 'Review the honors, then build the conference playoff bracket.';
      dom['playoff-area'].classList.remove('hidden');
      dom['playoff-bracket'].innerHTML = `<button id="begin-playoffs-button" class="primary-button" type="button">Begin ${currentCareer.league.playoffSize}-team playoffs</button>`;
      dom['sim-playoff-game'].classList.add('hidden'); dom['sim-playoff-round'].classList.add('hidden'); dom['sim-all-playoffs'].classList.add('hidden');
    } else {
      dom['postseason-title'].textContent = currentCareer.phase === 'complete' ? 'Season complete' : 'Playoffs';
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
    const rounds = playoffs.complete ? [...playoffs.history] : [...playoffs.history, {stage:playoffs.stage,roundNumber:playoffs.roundNumber,series:playoffs.currentSeries}];
    dom['playoff-bracket'].innerHTML = rounds.map((round)=>`<div class="bracket-round"><h3>${round.stage==='finals'?'HoopSim Finals':`Playoff Round ${round.roundNumber}`}</h3>${round.series.map((series)=>{
      const a=getTeam(series.teamAId), b=getTeam(series.teamBId); return `<article class="series-card"><div class="series-team ${series.winnerId===a.id?'winner':''}"><span>${escapeHtml(a.name)}</span><strong>${series.winsA}</strong></div><div class="series-team ${series.winnerId===b.id?'winner':''}"><span>${escapeHtml(b.name)}</span><strong>${series.winsB}</strong></div></article>`;
    }).join('')}</div>`).join('');
  }

  function renderSeasonFinale() {
    const champion = getTeam(currentCareer.champion);
    const fmvp = playerById(currentCareer.finalsMvp);
    const user = getUserPlayer();
    dom['season-finale'].innerHTML = `<span class="eyebrow">CHAMPIONS</span><h2>${escapeHtml(champion.name)} win the HoopSim title.</h2><p><strong>${escapeHtml(fmvp.name)}</strong> is Finals MVP.${champion.id===user.teamId?' Your rookie season ends with a championship.':''}</p><button id="open-offseason-button" class="primary-button" type="button">View offseason development</button>`;
    dom['season-finale'].classList.remove('hidden');
  }

  function calculateUserDevelopment() {
    const user = getUserPlayer();
    const before = { ...user.attributes };
    const avg = statsAverages(user.stats.regular);
    const production = avg.ppg + avg.rpg*.65 + avg.apg*.7 + avg.spg*1.8 + avg.bpg*1.8;
    const expectation = Math.max(6, (user.overall-45)*.65);
    const performance = clamp((production-expectation)/8, -2.5, 3);
    const ageFactor = user.age <= 22 ? 1.3 : user.age <= 27 ? .8 : user.age <= 31 ? .25 : user.age <= 35 ? -.8 : -1.8;
    const injuryPenalty = user.majorInjuries * .8 + (user.injury ? .4 : 0);
    const changes = {};
    ATTRIBUTES.forEach(([key]) => {
      let tendency = 0;
      if (user.playstyle === 'Pure Playmaker' && ['passing','dribbling','iq'].includes(key)) tendency += .7;
      if (user.playstyle === 'Pure Scorer' && ['layup','midrange','threePoint','freeThrow','postMoves'].includes(key)) tendency += .7;
      if (user.playstyle === 'Lockdown Defender' && ['interiorDefense','perimeterDefense','iq'].includes(key)) tendency += .7;
      if (user.playstyle === 'Offensive Engine' && ['passing','dribbling','layup','midrange','threePoint'].includes(key)) tendency += .55;
      if (user.playstyle === 'Uber Athlete' && ['dunk','vertical','speed','rebounding'].includes(key)) tendency += .7;
      if (user.playstyle === '3&D' && ['threePoint','interiorDefense','perimeterDefense'].includes(key)) tendency += .7;
      const physicalDecline = user.age >= 32 && ['dunk','vertical','speed','durability'].includes(key) ? -(user.age-31)*.18 : 0;
      const raw = ageFactor + performance*.45 + tendency + physicalDecline - injuryPenalty + normalRandom()*1.25;
      const change = clamp(Math.round(raw), -5, 6);
      changes[key] = change;
      user.attributes[key] = clamp(user.attributes[key]+change,10,99);
    });
    const oldOverall = user.overall;
    user.overall = overallFromAttributes(user.attributes);
    user.age += 1;
    return { before, changes, oldOverall, newOverall:user.overall, performance, ageFactor };
  }

  function openOffseason() {
    if (!currentCareer.development) currentCareer.development = calculateUserDevelopment();
    const development = currentCareer.development;
    dom['offseason-heading'].textContent = `${getUserPlayer().name}: ${development.oldOverall} → ${development.newOverall} OVR`;
    dom['development-summary'].innerHTML = `<div class="development-overall"><strong>${development.newOverall}</strong><span>NEW OVR</span></div><div class="development-list">${ATTRIBUTES.map(([key,label])=>{const change=development.changes[key];return `<div class="development-change ${change>0?'positive':change<0?'negative':''}"><span>${label}</span><b>${change>0?'+':''}${change}</b></div>`}).join('')}</div>`;
    dom['offseason-dialog'].showModal();
  }

  async function finishAlpha() {
    currentCareer.completed = true;
    await putSave(currentCareer);
    dom['offseason-dialog'].close();
    renderCareer();
    showToast('Completed Alpha career saved.', 'success');
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
      return `<article class="save-card"><div><strong>${escapeHtml(player?.name || 'Unnamed Career')}</strong><small>${escapeHtml(team?.name || 'Pre-draft')} · ${player?.overall || '--'} OVR · ${escapeHtml(save.phase || 'creator')} · Updated ${formatDate(save.updatedAt)}</small></div><div class="save-actions"><button class="primary-button" data-load-save="${save.id}" type="button">Load</button><button class="ghost-button" data-export-save="${save.id}" type="button">Export</button><button class="danger-button" data-delete-save="${save.id}" type="button">Delete</button></div></article>`;
    }).join('') : '<div class="muted">No HoopSim careers saved on this device.</div>';
    if (!dom['saves-dialog'].open) dom['saves-dialog'].showModal();
  }

  async function loadCareer(id) {
    const save = await getSave(id);
    if (!save) return showToast('Save file not found.', 'error');
    currentCareer = save;
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
    creator.leagueConfig = null; creator.playerConfig = null;
    creator.selectedTeamIds.clear();
    dom['league-size'].value = '16'; dom['season-games'].value='30'; dom['league-name'].value='HoopSim League';
    updatePlayoffOptions(); autoSelectTeams();
    dom['player-position'].value='PG'; dom['player-playstyle'].value='All Around Hooper'; dom['player-height'].value='75'; dom['player-weight'].value='195';
    applyPlaystyleTemplate(); showView('creator-view'); showCreatorStep('league');
  }

  function bindEvents() {
    dom['new-career-button'].addEventListener('click', startNewCareer);
    dom['continue-career-button'].addEventListener('click', renderSaveDialog);
    dom['open-saves-button'].addEventListener('click', renderSaveDialog);
    dom['new-save-from-dialog'].addEventListener('click', () => { dom['saves-dialog'].close(); startNewCareer(); });
    dom['league-size'].addEventListener('change', updatePlayoffOptions);
    dom['team-search'].addEventListener('input', renderTeams);
    dom['team-grid'].addEventListener('click', (event) => { const button=event.target.closest('[data-team-id]'); if(button)toggleTeam(Number(button.dataset.teamId)); });
    dom['auto-select-teams'].addEventListener('click', autoSelectTeams);
    dom['clear-team-selection'].addEventListener('click',()=>{creator.selectedTeamIds.clear();renderTeams();});
    dom['randomize-league-button'].addEventListener('click',()=>{
      const sizes=Array.from({length:22},(_,i)=>8+i*2);dom['league-size'].value=String(choose(sizes));dom['season-games'].value=randInt(14,99);updatePlayoffOptions();dom['series-length'].value=String(choose([1,3,5,7,9]));autoSelectTeams();
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
    dom['begin-draft-button'].addEventListener('click',async()=>{creator.playerConfig=gatherPlayerConfig();if(creator.playerConfig.overall<50)return showToast('Raise your overall to at least 50.','error');const saves=await getAllSaves();if(saves.length>=MAX_SAVES)return showToast(`Delete or export a save first. Maximum ${MAX_SAVES}.`,'error');await runDraft();});
    dom['draft-step'].addEventListener('click',(event)=>{const button=event.target.closest('[data-sign-team]');if(button)signUndrafted(Number(button.dataset.signTeam));});
    dom['continue-after-draft'].addEventListener('click',async()=>{await putSave(currentCareer);renderCareer();});
    document.querySelectorAll('[data-sim]').forEach((button)=>button.addEventListener('click',()=>{
      const value=button.dataset.sim;let count=1;if(value==='5')count=5;else if(value==='half')count=Math.max(0,Math.ceil(currentCareer.league.games/2)-currentCareer.currentRound);else if(value==='full')count=currentCareer.league.games-currentCareer.currentRound;simulateRegularRounds(count);
    }));
    document.querySelectorAll('.career-tabs button').forEach((button)=>button.addEventListener('click',()=>showCareerTab(button.dataset.tab)));
    document.querySelectorAll('[data-open-tab]').forEach((button)=>button.addEventListener('click',()=>showCareerTab(button.dataset.openTab)));
    dom['stats-sort'].addEventListener('change',renderStatsTable);
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
    dom['finish-alpha-button'].addEventListener('click',finishAlpha);
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
    dom['autosave-status'].textContent = 'Offline · ready';
  }

  document.addEventListener('DOMContentLoaded', init);
})();
