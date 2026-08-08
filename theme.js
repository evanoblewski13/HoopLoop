(() => {
  'use strict';

  const STORAGE_KEY = 'hooploop_accent_color';
  const PRESETS = {
    orange: { label: 'Orange', main: '#ff5a1f', dark: '#d9420b', rgb: '255, 90, 31' },
    blue:   { label: 'Blue',   main: '#2563eb', dark: '#1d4ed8', rgb: '37, 99, 235' },
    green:  { label: 'Green',  main: '#16a34a', dark: '#15803d', rgb: '22, 163, 74' },
    purple: { label: 'Purple', main: '#7c3aed', dark: '#6d28d9', rgb: '124, 58, 237' },
    red:    { label: 'Red',    main: '#dc2626', dark: '#b91c1c', rgb: '220, 38, 38' },
    teal:   { label: 'Teal',   main: '#0f766e', dark: '#115e59', rgb: '15, 118, 110' },
    gold:   { label: 'Gold',   main: '#d97706', dark: '#b45309', rgb: '217, 119, 6' }
  };

  function safeStored() {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  }

  function validKey(key) { return Object.prototype.hasOwnProperty.call(PRESETS, key); }

  function apply(key, { persist = true } = {}) {
    const chosen = validKey(key) ? key : 'orange';
    const preset = PRESETS[chosen];
    const root = document.documentElement;
    root.dataset.accent = chosen;
    root.style.setProperty('--orange', preset.main);
    root.style.setProperty('--orange-dark', preset.dark);
    root.style.setProperty('--accent', preset.main);
    root.style.setProperty('--accent-dark', preset.dark);
    root.style.setProperty('--accent-rgb', preset.rgb);
    root.style.setProperty('--accent-soft', `rgba(${preset.rgb}, .10)`);
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', preset.main);
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, chosen); } catch {}
    }
    window.dispatchEvent(new CustomEvent('hooploop:accentchange', { detail: { key: chosen, preset } }));
    return chosen;
  }

  function current() {
    const key = document.documentElement.dataset.accent || safeStored() || 'orange';
    return validKey(key) ? key : 'orange';
  }

  function optionsMarkup(selected = current()) {
    return Object.entries(PRESETS).map(([key, preset]) => `
      <button class="accent-choice${key === selected ? ' active' : ''}" type="button" data-accent-choice="${key}" aria-pressed="${key === selected}">
        <span class="accent-swatch" style="--swatch:${preset.main}"></span>
        <span>${preset.label}</span>
      </button>`).join('');
  }

  window.HoopLoopTheme = { PRESETS, apply, current, optionsMarkup, storageKey: STORAGE_KEY };
  apply(safeStored() || 'orange', { persist: false });
})();
