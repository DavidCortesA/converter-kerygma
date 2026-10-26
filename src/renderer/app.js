'use strict';

const api = window.kerygma;

/* ---------- Configuración de pestañas ---------- */
// Los textos viven en i18n.js; aquí solo hay datos. fmtGroup elige las descripciones (fmt.<grupo>.<id>).

const AUDIO_FORMATS = [
  { id: 'mp3', label: 'MP3', lossy: true },
  { id: 'm4a', label: 'M4A', lossy: true },
  { id: 'aac', label: 'AAC', lossy: true },
  { id: 'wav', label: 'WAV', lossy: false },
  { id: 'flac', label: 'FLAC', lossy: false },
  { id: 'alac', label: 'ALAC', lossy: false },
  { id: 'aiff', label: 'AIFF', lossy: false },
  { id: 'ogg', label: 'OGG', lossy: true },
  { id: 'opus', label: 'OPUS', lossy: true },
  { id: 'wma', label: 'WMA', lossy: true },
  { id: 'ac3', label: 'AC3', lossy: true },
  { id: 'm4r', label: 'M4R', lossy: true },
];

const AUDIO_DEFAULTS = { format: 'mp3', bitrate: '192', channels: 'original', rate: 'original', normalize: 'off', dest: 'same' };

const TABS = {
  video: {
    needs: 'video',
    fmtGroup: 'video',
    formats: ['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v', 'wmv', 'mpg', 'ts', 'flv', '3gp', 'gif']
      .map((id) => ({ id, label: id.toUpperCase() })),
    defaults: { format: 'mp4', mode: 'fast', quality: 'alta', resolution: 'original', dest: 'same' },
  },
  audio: {
    needs: 'audio',
    fmtGroup: 'audio',
    formats: AUDIO_FORMATS,
    defaults: AUDIO_DEFAULTS,
  },
  extract: {
    needs: 'audio',
    fmtGroup: 'audio',
    formats: AUDIO_FORMATS,
    defaults: AUDIO_DEFAULTS,
  },
  image: {
    needs: 'video',
    fmtGroup: 'image',
    formats: [
      { id: 'jpg', label: 'JPG', lossy: true },
      { id: 'png', label: 'PNG', lossy: false },
      { id: 'webp', label: 'WEBP', lossy: true },
      { id: 'avif', label: 'AVIF', lossy: true },
      { id: 'tiff', label: 'TIFF', lossy: false },
      { id: 'bmp', label: 'BMP', lossy: false },
      { id: 'gif', label: 'GIF', lossy: false },
      { id: 'ico', label: 'ICO', lossy: false },
    ],
    defaults: { format: 'jpg', quality: 'alta', size: 'original', dest: 'same' },
  },
};

// Valores posibles de cada opción (sirven para pintar los botones y validar lo guardado).
const OPTIONS = {
  mode: ['fast', 'compat'],
  quality: ['alta', 'media', 'baja'],
  resolution: ['original', '1080', '720', '480'],
  bitrate: ['128', '192', '256', '320'],
  normalize: ['off', 'on'],
  channels: ['original', '2', '1'],
  rate: ['original', '44100', '48000'],
  size: ['original', '3840', '1920', '1280', '800'],
  dest: ['same', 'custom'],
};

function optionLabel(setting, value) {
  if (value === 'original') return t('o.original');
  switch (setting) {
    case 'mode':
    case 'quality': return t(`o.${value}`);
    case 'resolution': return `${value}p`;
    case 'normalize': return value === 'on' ? t('o.normalizeOn') : t('o.no');
    case 'channels': return value === '2' ? t('o.stereo') : t('o.mono');
    case 'rate': return `${Number(value) / 1000} kHz`;
    case 'size': return value === '3840' ? '4K' : value;
    case 'dest': return t(`o.${value}`);
    default: return value;
  }
}

// Opciones de la ventana de Configuración.
const PREF_OPTIONS = {
  theme: ['system', 'light', 'dark'],
  language: ['system', 'es', 'en'],
  existing: ['copy', 'overwrite'],
};
const PREF_SWITCHES = ['remember', 'notify', 'openFolder'];

function prefLabel(pref, value) {
  if (pref === 'language' && value !== 'system') return LANGUAGE_NAMES[value];
  return t(`p.${pref}.${value}`);
}

const ICON = {
  upload: '<svg viewBox="0 0 24 24"><path d="M12 15V4m0 0-4 4m4-4 4 4"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  stop: '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2.5"/></svg>',
  folder: '<svg viewBox="0 0 24 24"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2.5h7.5A2.5 2.5 0 0 1 21 10v7.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24"><path d="M5 12h14m0 0-5-5m5 5-5 5"/></svg>',
  success: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.8L16.5 9.5"/></svg>',
  warn: '<svg viewBox="0 0 24 24"><path d="M12 9v4m0 3.5v.01"/><path d="M10.3 4.3 2.6 17.6A2 2 0 0 0 4.3 20.6h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z"/></svg>',
  error: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5m0 3.5v.01"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5m0-9v.01"/></svg>',
  github: '<svg viewBox="0 0 24 24"><path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/></svg>',
  reset: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
};

/* ---------- Estado ---------- */

const state = {
  active: 'video',
  accept: {},
  platform: '',
  prefs: null,
  tabs: {},
};

for (const key of Object.keys(TABS)) {
  state.tabs[key] = {
    items: [],
    settings: { ...TABS[key].defaults },
    outputDir: null,
    running: false,
    stopRequested: false,
    current: null,
    batch: null,
    el: null,
  };
}

/* ---------- Utilidades ---------- */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const extOf = (p) => (/\.([^.\\/]+)$/.exec(p)?.[1] || '').toLowerCase();
const nameOf = (p) => p.split(/[\\/]/).pop();

let seq = 0;
const uid = () => `job-${Date.now().toString(36)}-${(seq++).toString(36)}`;

function fmtSize(bytes) {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

function fmtDuration(sec) {
  if (!sec) return '';
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
}

function fmtEta(sec) {
  if (sec == null || !Number.isFinite(sec)) return '';
  if (sec < 60) return `≈ ${Math.max(1, Math.round(sec))} s`;
  return `≈ ${Math.round(sec / 60)} min`;
}

// Los errores llegan como { code, detail } y se traducen al mostrarlos (cambian si cambia el idioma).
function errorText(err) {
  if (!err) return t('e.FFMPEG_EMPTY');
  if (typeof err === 'string') return err;
  if (err.code === 'FFMPEG' && !err.detail) return t('e.FFMPEG_EMPTY');
  return t(`e.${err.code}`, { detail: err.detail ?? '' });
}

const isConvertible = (item) => ['pending', 'canceled', 'error'].includes(item.status);
const shortcut = (key) => `${state.platform === 'darwin' ? '⌘' : 'Ctrl+'}${key}`;

/* ---------- Plantillas ---------- */

function segTemplate(setting) {
  return `<div class="seg" data-setting="${setting}" role="radiogroup">
    ${OPTIONS[setting].map((v) => `<button type="button" role="radio" data-value="${v}">${esc(optionLabel(setting, v))}</button>`).join('')}
  </div>`;
}

// Opciones secundarias plegadas; el resumen muestra lo que se cambió.
function moreTemplate(inner) {
  return `<details class="more">
    <summary>
      <span class="group-label">${t('g.more')}</span>
      <span class="more-summary"></span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
    </summary>
    <div class="more-body">${inner}</div>
  </details>`;
}

const group = (label, body, attrs = '') => `
  <div class="group" ${attrs}>
    <div class="group-label">${label}</div>
    ${body}
  </div>`;

function settingsTemplate(key, cfg) {
  const formatGroup = group(t('g.format'), `
    <div class="chips cols-4 is-compact" data-setting="format" role="radiogroup">
      ${cfg.formats.map((f) => `<button type="button" class="chip" role="radio" data-value="${f.id}"><strong>${f.label}</strong></button>`).join('')}
    </div>
    <p class="group-hint" data-hint="format"></p>`);

  const videoGroups = group(t('g.mode'), `${segTemplate('mode')}<p class="group-hint" data-hint="mode"></p>`, 'data-group="mode"')
    + group(t('g.quality'), segTemplate('quality'))
    + moreTemplate(group(t('g.resolution'), `${segTemplate('resolution')}<p class="group-hint" data-hint="video"></p>`));

  const audioGroups = group(`${t('g.quality')} <em>kbps</em>`, `${segTemplate('bitrate')}<p class="group-hint" data-hint="bitrate"></p>`, 'data-group="bitrate"')
    + group(t('g.normalize'), `${segTemplate('normalize')}<p class="group-hint" data-hint="normalize"></p>`)
    + moreTemplate(group(t('g.channels'), segTemplate('channels'))
      + group(t('g.rate'), `${segTemplate('rate')}<p class="group-hint" data-hint="rate"></p>`));

  const imageGroups = group(t('g.quality'), `${segTemplate('quality')}<p class="group-hint" data-hint="quality"></p>`, 'data-group="quality"')
    + group(`${t('g.size')} <em>${t('g.size.em')}</em>`, `${segTemplate('size')}<p class="group-hint" data-hint="size"></p>`);

  const destGroup = group(t('g.dest'), `
    ${segTemplate('dest')}
    <button type="button" class="folder-chip" data-act="folder" hidden>
      ${ICON.folder}<span class="folder-path"></span>
    </button>`);

  return formatGroup + ({ video: videoGroups, image: imageGroups }[key] ?? audioGroups) + destGroup;
}

function panelTemplate(key) {
  const cfg = TABS[key];
  const exts = state.accept[key] || [];
  return `
  <section class="panel" data-panel="${key}" role="tabpanel" hidden>
    <div class="workspace">
      <div class="panel-head">
        <div>
          <h1>${t(`title.${key}`)}</h1>
          <p>${t(`sub.${key}`)}</p>
        </div>
        <div class="queue-tools" hidden>
          <span class="queue-count"></span>
          <button type="button" class="btn-ghost" data-act="clear">${t('q.clear')}</button>
        </div>
      </div>

      <button type="button" class="dropzone" data-act="pick">
        <span class="dz-icon">${ICON.upload}</span>
        <span class="dz-text">
          <strong>${t(`dz.title.${key}`)}</strong>
          <span>${tOr(`dz.sub.${key}`, 'dz.sub')}</span>
        </span>
        <span class="dz-formats">${exts.filter((e) => e !== 'aif').map((e) => `<i>${e}</i>`).join('')}</span>
      </button>

      <ul class="queue" aria-label="${t('q.files')}"></ul>
    </div>

    <aside class="settings">
      <div class="settings-body">${settingsTemplate(key, cfg)}</div>
      <div class="settings-footer">
        <div class="summary">
          <span class="summary-text"></span>
          <div class="overall"><span></span></div>
        </div>
        <button type="button" class="btn-primary" data-act="convert">
          <span class="btn-label"></span>
        </button>
      </div>
    </aside>
  </section>`;
}

function statusTemplate(item) {
  switch (item.status) {
    case 'probing': return `<span class="pill">${t('s.probing')}</span>`;
    case 'pending': return `<span class="pill">${t('s.pending')}</span>`;
    case 'queued': return `<span class="pill">${t('s.queued')}</span>`;
    case 'running': return `<span class="pill is-running"><b class="pct">${Math.floor(item.progress || 0)}%</b><small class="eta">${fmtEta(item.eta)}</small></span>`;
    case 'done': return `<span class="pill is-done">${t('s.done')}</span>`;
    case 'canceled': return `<span class="pill">${t('s.canceled')}</span>`;
    default: return `<span class="pill is-error">${t('s.error')}</span>`;
  }
}

function itemTemplate(key, item) {
  const st = state.tabs[key];
  const target = (item.status === 'done' || item.status === 'running' || item.status === 'queued' ? item.target : st.settings.format) || '';
  let meta;
  if (item.status === 'invalid' || item.status === 'error') {
    meta = `<span class="item-error">${esc(errorText(item.error))}</span>`;
  } else if (item.status === 'done') {
    meta = `<span>${t('q.savedAs')} <b>${esc(nameOf(item.output))}</b></span><span>${fmtSize(item.outputSize)}</span>`;
  } else {
    meta = [fmtSize(item.size), fmtDuration(item.duration), item.resolution]
      .filter(Boolean).map((m) => `<span>${esc(m)}</span>`).join('')
      + `<span class="route">${esc(item.ext.toUpperCase())}${ICON.arrow}${esc(target.toUpperCase())}</span>`;
  }

  const actions = [];
  if (item.status === 'done') {
    actions.push(`<button type="button" class="icon-btn" data-act="reveal" title="${t('q.reveal')}">${ICON.folder}</button>`);
  }
  if (item.status === 'running') {
    actions.push(`<button type="button" class="icon-btn is-stop" data-act="cancel" title="${t('q.cancel')}">${ICON.stop}</button>`);
  } else {
    actions.push(`<button type="button" class="icon-btn" data-act="remove" title="${t('q.remove')}">${ICON.x}</button>`);
  }

  return `
  <li class="item is-${item.status}" data-id="${item.id}">
    <div class="item-thumb">${key === 'image' && item.url && item.status !== 'invalid'
      ? `<img src="${esc(item.url)}" alt="" loading="lazy" draggable="false">`
      : esc(item.ext)}</div>
    <div class="item-main">
      <div class="item-name" title="${esc(item.path)}">${esc(item.name)}</div>
      <div class="item-meta">${meta}</div>
    </div>
    <div class="item-status">${statusTemplate(item)}</div>
    <div class="item-actions">${actions.join('')}</div>
    <div class="item-progress"><span style="width:${item.status === 'done' ? 100 : item.progress || 0}%"></span></div>
  </li>`;
}

/* ---------- Render ---------- */

function renderSettings(key) {
  const st = state.tabs[key];
  const root = st.el;
  const s = st.settings;
  const cfg = TABS[key];
  const fmt = cfg.formats.find((f) => f.id === s.format);

  for (const g of $$('[data-setting]', root)) {
    const value = s[g.dataset.setting];
    for (const btn of $$('[data-value]', g)) {
      const on = btn.dataset.value === value;
      btn.classList.toggle('is-selected', on);
      btn.setAttribute('aria-checked', on);
    }
  }

  for (const more of $$('.more', root)) {
    $('.more-summary', more).textContent = $$('[data-setting]', more)
      .filter((g) => s[g.dataset.setting] !== cfg.defaults[g.dataset.setting])
      .map((g) => $('.is-selected', g)?.textContent)
      .join(' · ');
  }

  $('[data-hint="format"]', root).textContent = t(`fmt.${cfg.fmtGroup}.${fmt.id}`);
  const disable = (name, off) => {
    const el = $(`[data-group="${name}"]`, root);
    el.classList.toggle('is-disabled', off);
    $$('[data-value]', el).forEach((b) => { b.disabled = off; });
  };

  if (key === 'video') {
    const gif = s.format === 'gif';
    disable('mode', gif);
    $('[data-hint="mode"]', root).textContent = gif ? t('h.gifMode')
      : s.mode === 'fast' ? t('h.fast') : t('h.compat', { fmt: fmt.label });
    $('[data-hint="video"]', root).textContent = gif
      ? t(s.resolution === 'original' ? 'h.gifResOriginal' : 'h.gifResSmaller')
      : s.resolution !== 'original' ? t('h.resolution') : '';
  } else if (key === 'image') {
    disable('quality', !fmt.lossy);
    $('[data-hint="quality"]', root).textContent = fmt.lossy ? t('h.imgLossy') : t('h.imgLossless', { fmt: fmt.label });
    $('[data-hint="size"]', root).textContent = s.format === 'ico' ? t('h.ico') : s.size === 'original' ? '' : t('h.size');
  } else {
    disable('bitrate', !fmt.lossy);
    $('[data-hint="bitrate"]', root).textContent = fmt.lossy ? t('h.bitrate') : t('h.lossless', { fmt: fmt.label });
    $('[data-hint="rate"]', root).textContent = s.format === 'opus' ? t('h.opus')
      : s.format === 'ac3' && s.rate === 'original' ? t('h.ac3') : '';
    $('[data-hint="normalize"]', root).textContent = s.normalize === 'on' ? t('h.normalize') : '';
  }

  const chip = $('.folder-chip', root);
  chip.hidden = s.dest !== 'custom' || !st.outputDir;
  $('.folder-path', root).textContent = st.outputDir || '';
  chip.title = st.outputDir || '';

  $('.settings', root).classList.toggle('is-locked', st.running);
}

function renderQueue(key) {
  const st = state.tabs[key];
  const root = st.el;
  const has = st.items.length > 0;

  $('.dropzone', root).classList.toggle('is-compact', has);
  $('.queue-tools', root).hidden = !has;
  $('.queue-count', root).textContent = t('q.count', { n: st.items.length });
  $('[data-act="clear"]', root).disabled = st.running;
  $('.queue', root).innerHTML = st.items.map((item) => itemTemplate(key, item)).join('');
}

function overallProgress(st) {
  if (!st.batch) return 0;
  const current = st.current ? (st.current.progress || 0) / 100 : 0;
  return Math.min(100, ((st.batch.finished + current) / st.batch.total) * 100);
}

function renderFooter(key) {
  const st = state.tabs[key];
  const root = st.el;
  const btn = $('[data-act="convert"]', root);
  const label = $('.btn-label', btn);
  const text = $('.summary-text', root);
  const bar = $('.overall', root);

  if (st.running) {
    btn.disabled = false;
    btn.classList.add('is-stop');
    label.textContent = st.stopRequested ? t('f.stopping') : t('f.stop');
    text.textContent = t('f.converting', { i: Math.min(st.batch.finished + 1, st.batch.total), n: st.batch.total });
    bar.classList.add('is-visible');
    $('span', bar).style.width = `${overallProgress(st)}%`;
    return;
  }

  const ready = st.items.filter(isConvertible).length;
  const done = st.items.filter((i) => i.status === 'done').length;
  const probing = st.items.some((i) => i.status === 'probing');

  btn.classList.remove('is-stop');
  btn.disabled = ready === 0;
  label.textContent = ready === 0 ? t(st.items.length ? 'f.nothing' : 'f.add') : t('f.convert', { n: ready });

  const parts = [];
  if (probing) parts.push(t('f.probing'));
  if (ready) parts.push(t('f.ready', { n: ready }));
  if (done) parts.push(t('f.done', { n: done }));
  text.textContent = parts.join(' · ') || t('f.empty');
  bar.classList.remove('is-visible');
}

function renderBadges() {
  for (const tab of $$('.tab')) {
    const st = state.tabs[tab.dataset.tab];
    const badge = $('.tab-badge', tab);
    const active = st.items.filter((i) => i.status === 'queued' || i.status === 'running').length;
    badge.hidden = active === 0;
    badge.textContent = active;
  }
  moveIndicator();
}

function refresh(key) {
  renderSettings(key);
  renderQueue(key);
  renderFooter(key);
  renderBadges();
}

function updateRunningItem(key, item) {
  const li = $(`.item[data-id="${item.id}"]`, state.tabs[key].el);
  if (!li) return;
  $('.item-progress span', li).style.width = `${item.progress}%`;
  const pct = $('.pct', li);
  if (pct) pct.textContent = `${Math.floor(item.progress)}%`;
  const eta = $('.eta', li);
  if (eta) eta.textContent = fmtEta(item.eta);
}

// Pinta las cuatro pestañas desde cero (al iniciar y al cambiar de idioma). La lista y el
// progreso viven en state, así que no se pierde nada.
function buildView() {
  const view = $('#view');
  view.innerHTML = Object.keys(TABS).map(panelTemplate).join('');
  for (const key of Object.keys(TABS)) {
    state.tabs[key].el = $(`.panel[data-panel="${key}"]`, view);
    refresh(key);
  }
  setTab(state.active);
}

// Textos fijos de index.html (pestañas, capa de arrastre, botón de configuración).
function applyStaticText() {
  for (const el of $$('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  $('.tabs').setAttribute('aria-label', t('tablist'));
  const gear = $('[data-act="open-prefs"]');
  gear.title = `${t('p.open')} (${shortcut(',')})`;
  gear.setAttribute('aria-label', t('p.open'));
}

/* ---------- Pestañas ---------- */

function moveIndicator() {
  const btn = $(`.tab[data-tab="${state.active}"]`);
  const indicator = $('.tab-indicator');
  indicator.style.width = `${btn.offsetWidth}px`;
  indicator.style.transform = `translateX(${btn.offsetLeft}px)`;
}

function setTab(key) {
  state.active = key;
  for (const tab of $$('.tab')) tab.setAttribute('aria-selected', tab.dataset.tab === key);
  for (const panel of $$('.panel')) panel.hidden = panel.dataset.panel !== key;
  $('.drop-overlay-target').textContent = t('drop.target', { tab: t(`tab.${key}`) });
  moveIndicator();
}

/* ---------- Opciones recordadas ---------- */

function isValidSetting(key, name, value) {
  if (name === 'format') return TABS[key].formats.some((f) => f.id === value);
  return OPTIONS[name]?.includes(value) ?? false;
}

// Aplica lo guardado en settings.json, ignorando valores que ya no existan.
function restoreTabs() {
  const saved = state.prefs.remember ? state.prefs.tabs : {};
  for (const key of Object.keys(TABS)) {
    const st = state.tabs[key];
    st.settings = { ...TABS[key].defaults };
    st.outputDir = null;
    const tab = saved[key];
    if (!tab) continue;
    for (const name of Object.keys(st.settings)) {
      if (isValidSetting(key, name, tab[name])) st.settings[name] = tab[name];
    }
    if (tab.outputDir) st.outputDir = tab.outputDir;
    if (st.settings.dest === 'custom' && !st.outputDir) st.settings.dest = 'same';
  }
}

const saveTimers = {};
function persistTab(key) {
  if (!state.prefs?.remember) return;
  clearTimeout(saveTimers[key]);
  saveTimers[key] = setTimeout(async () => {
    const st = state.tabs[key];
    state.prefs = await api.setSettings({ tabs: { [key]: { ...st.settings, outputDir: st.outputDir || '' } } });
  }, 300);
}

/* ---------- Archivos ---------- */

async function addFiles(key, paths) {
  const st = state.tabs[key];
  const accept = state.accept[key];
  const fresh = [];
  let rejected = 0;

  for (const p of paths) {
    if (!accept.includes(extOf(p))) { rejected++; continue; }
    if (st.items.some((i) => i.path === p)) continue;
    const item = { id: uid(), path: p, name: nameOf(p), ext: extOf(p), status: 'probing', progress: 0 };
    st.items.push(item);
    fresh.push(item);
  }

  if (rejected) toast(t('t.ignored', { n: rejected, tab: t(`tab.${key}`) }), { type: 'warn' });
  if (!fresh.length) return;
  refresh(key);

  const infos = await api.probe(fresh.map((i) => i.path));
  const need = TABS[key].needs === 'video' ? 'hasVideo' : 'hasAudio';
  infos.forEach((info, idx) => {
    const item = fresh[idx];
    Object.assign(item, { size: info.size, duration: info.duration, resolution: info.resolution, url: info.url });
    if (info.error) {
      item.status = 'invalid';
      item.error = info.error;
    } else if (!info[need]) {
      item.status = 'invalid';
      item.error = { code: key === 'image' ? 'NOT_IMAGE' : need === 'hasVideo' ? 'NO_VIDEO' : 'NO_AUDIO' };
    } else {
      item.status = 'pending';
    }
  });
  refresh(key);
}

async function pickFiles(key) {
  const paths = await api.pickFiles(key);
  if (paths.length) addFiles(key, paths);
}

async function pickFolder(key) {
  const st = state.tabs[key];
  const dir = await api.pickFolder();
  if (dir) {
    st.outputDir = dir;
    st.settings.dest = 'custom';
  } else if (!st.outputDir) {
    st.settings.dest = 'same';
  }
  refresh(key);
  persistTab(key);
}

/* ---------- Conversión ---------- */

async function startQueue(key) {
  const st = state.tabs[key];
  const targets = st.items.filter(isConvertible);
  if (st.running || !targets.length) return;

  const settings = { ...st.settings };
  const outputDir = settings.dest === 'custom' ? st.outputDir : null;

  st.running = true;
  st.stopRequested = false;
  st.batch = { total: targets.length, finished: 0, done: 0, failed: 0, lastOutput: null };
  for (const item of targets) {
    Object.assign(item, { status: 'queued', progress: 0, eta: null, error: null, target: settings.format });
  }
  refresh(key);

  for (const item of targets) {
    if (st.stopRequested) break;
    if (!st.items.includes(item) || item.status !== 'queued') {
      st.batch.finished++;
      continue;
    }

    item.status = 'running';
    st.current = item;
    refresh(key);

    const res = await api.convert({ id: item.id, kind: key, input: item.path, outputDir, ...settings });

    st.current = null;
    st.batch.finished++;
    if (res.ok) {
      Object.assign(item, { status: 'done', progress: 100, output: res.output, outputSize: res.size });
      st.batch.done++;
      st.batch.lastOutput = res.output;
    } else if (res.canceled) {
      Object.assign(item, { status: 'canceled', progress: 0 });
    } else {
      Object.assign(item, { status: 'error', progress: 0, error: res.error });
      st.batch.failed++;
    }
    refresh(key);
  }

  for (const item of st.items) if (item.status === 'queued') item.status = 'pending';
  st.running = false;
  refresh(key);
  announce(st.batch, st.stopRequested);
}

function stopQueue(key) {
  const st = state.tabs[key];
  st.stopRequested = true;
  if (st.current) api.cancel(st.current.id);
  renderFooter(key);
}

function announce(batch, stopped) {
  const { done, failed, lastOutput } = batch;
  if (done) {
    const msg = t('t.converted', { n: done }) + (failed ? t('t.withErrors', { n: failed }) : '');
    toast(msg, { type: 'success', action: { label: t('t.show'), run: () => api.reveal(lastOutput) } });
    if (state.prefs.notify && !document.hasFocus()) new Notification('Kerygma Converter', { body: msg });
    if (state.prefs.openFolder) api.reveal(lastOutput);
  } else if (failed) {
    toast(t('t.failed', { n: failed }), { type: 'error' });
  } else if (stopped) {
    toast(t('t.stopped'), { type: 'info' });
  }
}

/* ---------- Toasts ---------- */

function toast(message, { type = 'info', action, timeout = 5000 } = {}) {
  const el = document.createElement('div');
  el.className = `toast is-${type}`;
  el.innerHTML = `<span class="toast-icon">${ICON[type]}</span><span class="toast-msg"></span>`;
  $('.toast-msg', el).textContent = message;

  const close = () => {
    if (el.classList.contains('is-leaving')) return;
    el.classList.add('is-leaving');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  };

  if (action) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toast-action';
    btn.textContent = action.label;
    btn.addEventListener('click', () => { action.run(); close(); });
    el.append(btn);
  }

  $('#toasts').append(el);
  setTimeout(close, timeout);
}

/* ---------- Configuración ---------- */

function prefsTemplate() {
  const p = state.prefs;
  const seg = (pref) => `<div class="seg" data-pref="${pref}" role="radiogroup" aria-label="${t(`p.${pref}`)}">
    ${PREF_OPTIONS[pref].map((v) => `<button type="button" role="radio" data-value="${v}">${esc(prefLabel(pref, v))}</button>`).join('')}
  </div>`;
  const toggle = (pref) => `<button type="button" class="switch" role="switch" data-pref="${pref}" aria-label="${t(`p.${pref}`)}"><span></span></button>`;
  const row = (pref, control, wide = false) => `
    <div class="pref-row${wide ? ' is-wide' : ''}">
      <div class="pref-text">
        <strong>${t(`p.${pref}`)}</strong>
        <span>${t(`p.${pref}.desc`)}</span>
      </div>
      ${control}
    </div>`;

  return `
    <div class="prefs-backdrop" data-act="close-prefs"></div>
    <section class="prefs-dialog" role="dialog" aria-modal="true" aria-labelledby="prefs-title" tabindex="-1">
      <header class="prefs-head">
        <h2 id="prefs-title">${t('p.title')}</h2>
        <button type="button" class="icon-btn" data-act="close-prefs" title="${t('p.close')}">${ICON.x}</button>
      </header>
      <div class="prefs-body">
        <h3>${t('p.appearance')}</h3>
        ${row('theme', seg('theme'), true)}
        ${row('language', seg('language'), true)}

        <h3>${t('p.conversion')}</h3>
        ${row('existing', seg('existing'), true)}
        ${row('remember', toggle('remember'))}

        <h3>${t('p.finish')}</h3>
        ${row('notify', toggle('notify'))}
        ${row('openFolder', toggle('openFolder'))}

        <h3>${t('p.about')}</h3>
        <div class="about">
          <svg class="brand-mark about-mark" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="9"/>
            <path d="M8 12.5v7M12 9.5v13M16 13v6M20 10.5v11M24 14v4" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>
          </svg>
          <div class="about-text">
            <strong>Kerygma Converter</strong>
            <span>${t('p.version', { v: esc(p.version) })} · ${t('p.engine', { f: esc(p.ffmpeg || '—'), e: esc(p.electron) })}</span>
            <span>${t('p.offline')}</span>
          </div>
        </div>
        <div class="about-actions">
          <button type="button" class="btn-ghost" data-act="open-repo">${ICON.github}${t('p.github')}</button>
          <button type="button" class="btn-ghost" data-act="reset-prefs">${ICON.reset}${t('p.reset')}</button>
        </div>
      </div>
    </section>`;
}

function renderPrefs() {
  const root = $('#prefs');
  const p = state.prefs;
  for (const g of $$('.seg[data-pref]', root)) {
    for (const btn of $$('[data-value]', g)) {
      const on = btn.dataset.value === p[g.dataset.pref];
      btn.classList.toggle('is-selected', on);
      btn.setAttribute('aria-checked', on);
    }
  }
  for (const sw of $$('.switch[data-pref]', root)) sw.setAttribute('aria-checked', p[sw.dataset.pref]);
}

function buildPrefs() {
  $('#prefs').innerHTML = prefsTemplate();
  renderPrefs();
}

function openPrefs() {
  const root = $('#prefs');
  if (!root.hidden) return;
  buildPrefs();
  root.hidden = false;
  $('.prefs-dialog', root).focus();
}

function closePrefs() {
  $('#prefs').hidden = true;
  $('[data-act="open-prefs"]').focus();
}

function applyLanguage() {
  setLanguage(state.prefs.effectiveLanguage);
  applyStaticText();
  buildView();
  if (!$('#prefs').hidden) {
    buildPrefs();
    $('.prefs-dialog').focus();
  }
}

async function setPref(pref, value) {
  const before = state.prefs.effectiveLanguage;
  const patch = { [pref]: value };
  // Al activar "recordar", se guarda de inmediato lo que hay en cada pestaña.
  if (pref === 'remember' && value) {
    patch.tabs = Object.fromEntries(Object.entries(state.tabs)
      .map(([key, st]) => [key, { ...st.settings, outputDir: st.outputDir || '' }]));
  }
  state.prefs = await api.setSettings(patch);
  if (state.prefs.effectiveLanguage !== before) applyLanguage();
  else renderPrefs();
}

async function resetPrefs() {
  state.prefs = await api.resetSettings();
  if (!Object.values(state.tabs).some((st) => st.running)) restoreTabs();
  applyLanguage();
  toast(t('p.resetDone'), { type: 'success' });
}

function onPrefsClick(e) {
  const option = e.target.closest('.seg[data-pref] [data-value]');
  if (option) {
    const pref = option.closest('[data-pref]').dataset.pref;
    if (state.prefs[pref] !== option.dataset.value) setPref(pref, option.dataset.value);
    return;
  }
  const sw = e.target.closest('.switch[data-pref]');
  if (sw) {
    setPref(sw.dataset.pref, !state.prefs[sw.dataset.pref]);
    return;
  }
  const btn = e.target.closest('[data-act]');
  switch (btn?.dataset.act) {
    case 'close-prefs': closePrefs(); break;
    case 'open-repo': api.openRepo(); break;
    case 'reset-prefs': resetPrefs(); break;
  }
}

/* ---------- Eventos ---------- */

function onPanelClick(e) {
  const panel = e.target.closest('.panel');
  if (!panel) return;
  const key = panel.dataset.panel;
  const st = state.tabs[key];

  const option = e.target.closest('[data-setting] [data-value]');
  if (option && !option.disabled && !st.running) {
    const setting = option.closest('[data-setting]').dataset.setting;
    if (setting === 'dest' && option.dataset.value === 'custom') {
      pickFolder(key);
      return;
    }
    st.settings[setting] = option.dataset.value;
    refresh(key);
    persistTab(key);
    return;
  }

  const btn = e.target.closest('[data-act]');
  if (!btn || btn.disabled) return;
  const item = st.items.find((i) => i.id === btn.closest('.item')?.dataset.id);

  switch (btn.dataset.act) {
    case 'pick': pickFiles(key); break;
    case 'folder': if (!st.running) pickFolder(key); break;
    case 'clear':
      st.items = [];
      refresh(key);
      break;
    case 'convert':
      if (st.running) stopQueue(key);
      else startQueue(key);
      break;
    case 'remove':
      st.items = st.items.filter((i) => i !== item);
      refresh(key);
      break;
    case 'cancel': api.cancel(item.id); break;
    case 'reveal': api.reveal(item.output); break;
  }
}

function bindDragAndDrop() {
  let depth = 0;
  const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files');
  const reset = () => { depth = 0; document.body.classList.remove('is-dragging'); };

  document.addEventListener('dragenter', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth++;
    document.body.classList.add('is-dragging');
  });
  document.addEventListener('dragleave', (e) => {
    if (!hasFiles(e)) return;
    depth = Math.max(0, depth - 1);
    if (!depth) reset();
  });
  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  });
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    reset();
    const paths = [...(e.dataTransfer?.files || [])].map((f) => api.pathForFile(f)).filter(Boolean);
    if (paths.length) addFiles(state.active, paths);
  });
}

function bindShortcuts() {
  const keys = Object.keys(TABS);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#prefs').hidden) {
      closePrefs();
      return;
    }
    if (!(e.metaKey || e.ctrlKey)) return;
    const n = Number(e.key);
    if (e.key === ',') {
      e.preventDefault();
      openPrefs();
    } else if (n >= 1 && n <= keys.length) {
      e.preventDefault();
      setTab(keys[n - 1]);
    } else if (e.key.toLowerCase() === 'o') {
      e.preventDefault();
      pickFiles(state.active);
    }
  });
}

/* ---------- Inicio ---------- */

async function init() {
  const [config, prefs] = await Promise.all([api.getConfig(), api.getSettings()]);
  state.accept = config.accept;
  state.platform = config.platform;
  state.prefs = prefs;
  document.body.classList.add(config.platform === 'darwin' ? 'is-mac' : 'is-win');

  setLanguage(prefs.effectiveLanguage);
  restoreTabs();
  applyStaticText();
  buildView();

  $('#view').addEventListener('click', onPanelClick);
  $('#prefs').addEventListener('click', onPrefsClick);
  $('[data-act="open-prefs"]').addEventListener('click', openPrefs);
  for (const tab of $$('.tab')) tab.addEventListener('click', () => setTab(tab.dataset.tab));
  window.addEventListener('resize', moveIndicator);

  api.onProgress(({ id, percent, eta }) => {
    for (const key of Object.keys(TABS)) {
      const st = state.tabs[key];
      const item = st.items.find((i) => i.id === id);
      if (!item || item.status !== 'running') continue;
      item.progress = percent;
      item.eta = eta;
      updateRunningItem(key, item);
      renderFooter(key);
    }
  });

  bindDragAndDrop();
  bindShortcuts();
  requestAnimationFrame(() => document.body.classList.add('is-ready'));
}

init();
