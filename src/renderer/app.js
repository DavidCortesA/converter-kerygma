'use strict';

const api = window.kerygma;

/* ---------- Configuración de pestañas ---------- */

const AUDIO_FORMATS = [
  { id: 'mp3', label: 'MP3', hint: 'Universal', lossy: true },
  { id: 'm4a', label: 'M4A', hint: 'AAC · Apple', lossy: true },
  { id: 'wav', label: 'WAV', hint: 'Sin compresión', lossy: false },
  { id: 'flac', label: 'FLAC', hint: 'Sin pérdida', lossy: false },
  { id: 'ogg', label: 'OGG', hint: 'Vorbis', lossy: true },
  { id: 'opus', label: 'OPUS', hint: 'Voz · web', lossy: true },
];

const TABS = {
  video: {
    label: 'Video',
    title: 'Convertir video',
    subtitle: 'Convierte tus videos a cualquier formato común.',
    noun: 'videos',
    needs: 'video',
    compact: true,
    formats: [
      { id: 'mp4', label: 'MP4', desc: 'H.264 + AAC. Se reproduce en todo: celulares, web, TV y redes sociales.' },
      { id: 'mov', label: 'MOV', desc: 'Formato de Apple. Ideal para QuickTime, iMovie y Final Cut.' },
      { id: 'mkv', label: 'MKV', desc: 'Contenedor flexible: en modo rápido conserva cualquier códec sin recodificar.' },
      { id: 'webm', label: 'WEBM', desc: 'VP9 + Opus. Pensado para páginas web; codificar tarda un poco más.' },
      { id: 'avi', label: 'AVI', desc: 'MPEG-4 (Xvid) + MP3. Para reproductores y programas antiguos.' },
      { id: 'm4v', label: 'M4V', desc: 'Variante de MP4 para iTunes, Apple TV y dispositivos Apple.' },
      { id: 'wmv', label: 'WMV', desc: 'Windows Media. Para PowerPoint y equipos Windows antiguos.' },
      { id: 'mpg', label: 'MPG', desc: 'MPEG-2. Para DVD y reproductores de mesa.' },
      { id: 'ts', label: 'TS', desc: 'MPEG-TS. Para transmisiones en vivo, IPTV y algunos decodificadores.' },
      { id: 'flv', label: 'FLV', desc: 'Flash Video. Solo para plataformas que todavía lo piden.' },
      { id: '3gp', label: '3GP', desc: 'Para celulares básicos; archivos pequeños.' },
      { id: 'gif', label: 'GIF', desc: 'Animación sin audio. La calidad define la fluidez (20, 15 o 10 cuadros por segundo).' },
    ],
    defaults: { format: 'mp4', mode: 'fast', quality: 'alta', resolution: 'original', dest: 'same' },
  },
  audio: {
    label: 'Audio',
    title: 'Convertir audio',
    subtitle: 'Pasa tus audios al formato que necesites.',
    noun: 'audios',
    needs: 'audio',
    formats: AUDIO_FORMATS,
    defaults: { format: 'mp3', bitrate: '192', dest: 'same' },
  },
  extract: {
    label: 'Video → Audio',
    title: 'Extraer audio de video',
    subtitle: 'Saca la pista de audio de tus videos: mensajes, podcasts, música.',
    noun: 'videos',
    needs: 'audio',
    formats: AUDIO_FORMATS,
    defaults: { format: 'mp3', bitrate: '192', dest: 'same' },
  },
};

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
};

/* ---------- Estado ---------- */

const state = {
  active: 'video',
  accept: {},
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

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const isConvertible = (item) => ['pending', 'canceled', 'error'].includes(item.status);

/* ---------- Plantillas ---------- */

function segTemplate(setting, options) {
  return `<div class="seg" data-setting="${setting}" role="radiogroup">
    ${options.map(([value, label]) => `<button type="button" role="radio" data-value="${value}">${label}</button>`).join('')}
  </div>`;
}

function settingsTemplate(key, cfg) {
  const cols = cfg.compact ? 'cols-4 is-compact' : 'cols-3';
  const formatGroup = `
    <div class="group">
      <div class="group-label">Formato de salida</div>
      <div class="chips ${cols}" data-setting="format" role="radiogroup">
        ${cfg.formats.map((f) => `
          <button type="button" class="chip" role="radio" data-value="${f.id}">
            <strong>${f.label}</strong>${f.hint ? `<span>${f.hint}</span>` : ''}
          </button>`).join('')}
      </div>
      ${cfg.compact ? '<p class="group-hint" data-hint="format"></p>' : ''}
    </div>`;

  const videoGroups = `
    <div class="group" data-group="mode">
      <div class="group-label">Modo</div>
      ${segTemplate('mode', [['fast', 'Rápido'], ['compat', 'Máxima compatibilidad']])}
      <p class="group-hint" data-hint="mode"></p>
    </div>
    <div class="group">
      <div class="group-label">Calidad</div>
      ${segTemplate('quality', [['alta', 'Alta'], ['media', 'Media'], ['baja', 'Ligera']])}
    </div>
    <div class="group">
      <div class="group-label">Resolución</div>
      ${segTemplate('resolution', [['original', 'Original'], ['1080', '1080p'], ['720', '720p'], ['480', '480p']])}
      <p class="group-hint" data-hint="video"></p>
    </div>`;

  const audioGroups = `
    <div class="group" data-group="bitrate">
      <div class="group-label">Calidad <em>kbps</em></div>
      ${segTemplate('bitrate', [['128', '128'], ['192', '192'], ['256', '256'], ['320', '320']])}
      <p class="group-hint" data-hint="bitrate"></p>
    </div>`;

  const destGroup = `
    <div class="group">
      <div class="group-label">Guardar en</div>
      ${segTemplate('dest', [['same', 'Junto al original'], ['custom', 'Otra carpeta…']])}
      <button type="button" class="folder-chip" data-act="folder" hidden>
        ${ICON.folder}<span class="folder-path"></span>
      </button>
    </div>`;

  return formatGroup + (key === 'video' ? videoGroups : audioGroups) + destGroup;
}

function panelTemplate(key) {
  const cfg = TABS[key];
  const exts = state.accept[key] || [];
  return `
  <section class="panel" data-panel="${key}" role="tabpanel" hidden>
    <div class="workspace">
      <div class="panel-head">
        <div>
          <h1>${cfg.title}</h1>
          <p>${cfg.subtitle}</p>
        </div>
        <div class="queue-tools" hidden>
          <span class="queue-count"></span>
          <button type="button" class="btn-ghost" data-act="clear">Limpiar lista</button>
        </div>
      </div>

      <button type="button" class="dropzone" data-act="pick">
        <span class="dz-icon">${ICON.upload}</span>
        <span class="dz-text">
          <strong>Arrastra tus ${cfg.noun} aquí</strong>
          <span>o <u>haz clic para elegirlos</u> de tu equipo</span>
        </span>
        <span class="dz-formats">${exts.filter((e) => e !== 'aif').map((e) => `<i>${e}</i>`).join('')}</span>
      </button>

      <ul class="queue" aria-label="Archivos"></ul>
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
    case 'probing': return '<span class="pill">Analizando…</span>';
    case 'pending': return '<span class="pill">Listo</span>';
    case 'queued': return '<span class="pill">En cola</span>';
    case 'running': return `<span class="pill is-running"><b class="pct">${Math.floor(item.progress || 0)}%</b><small class="eta">${fmtEta(item.eta)}</small></span>`;
    case 'done': return '<span class="pill is-done">Convertido</span>';
    case 'canceled': return '<span class="pill">Cancelado</span>';
    default: return '<span class="pill is-error">Error</span>';
  }
}

function itemTemplate(key, item) {
  const st = state.tabs[key];
  const target = (item.status === 'done' || item.status === 'running' || item.status === 'queued' ? item.target : st.settings.format) || '';
  let meta;
  if (item.status === 'invalid' || item.status === 'error') {
    meta = `<span class="item-error">${esc(item.error)}</span>`;
  } else if (item.status === 'done') {
    meta = `<span>Guardado como <b>${esc(nameOf(item.output))}</b></span><span>${fmtSize(item.outputSize)}</span>`;
  } else {
    meta = [fmtSize(item.size), fmtDuration(item.duration), item.resolution]
      .filter(Boolean).map((m) => `<span>${esc(m)}</span>`).join('')
      + `<span class="route">${esc(item.ext.toUpperCase())}${ICON.arrow}${esc(target.toUpperCase())}</span>`;
  }

  const actions = [];
  if (item.status === 'done') {
    actions.push(`<button type="button" class="icon-btn" data-act="reveal" title="Mostrar en carpeta">${ICON.folder}</button>`);
  }
  if (item.status === 'running') {
    actions.push(`<button type="button" class="icon-btn is-stop" data-act="cancel" title="Cancelar">${ICON.stop}</button>`);
  } else {
    actions.push(`<button type="button" class="icon-btn" data-act="remove" title="Quitar de la lista">${ICON.x}</button>`);
  }

  return `
  <li class="item is-${item.status}" data-id="${item.id}">
    <div class="item-thumb">${esc(item.ext)}</div>
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

  for (const group of $$('[data-setting]', root)) {
    const value = s[group.dataset.setting];
    for (const btn of $$('[data-value]', group)) {
      const on = btn.dataset.value === value;
      btn.classList.toggle('is-selected', on);
      btn.setAttribute('aria-checked', on);
    }
  }

  if (key === 'video') {
    const fmt = TABS.video.formats.find((f) => f.id === s.format);
    const gif = s.format === 'gif';
    $('[data-hint="format"]', root).textContent = fmt.desc;

    const mode = $('[data-group="mode"]', root);
    mode.classList.toggle('is-disabled', gif);
    $$('[data-value]', mode).forEach((b) => { b.disabled = gif; });
    $('[data-hint="mode"]', root).textContent = gif
      ? 'El GIF siempre se genera desde cero con una paleta de colores optimizada.'
      : s.mode === 'fast'
        ? 'Copia el video sin recodificar cuando se puede: muy rápido y sin perder calidad. Si no, lo recodifica.'
        : `Recodifica siempre al códec estándar de ${fmt.label}. Más lento, pero máxima compatibilidad.`;

    $('[data-hint="video"]', root).textContent = gif
      ? (s.resolution === 'original' ? 'Para GIF recomendamos 480p: a resolución original pesan mucho.' : 'Si el video es más pequeño, conserva su tamaño.')
      : s.resolution !== 'original'
        ? 'Cambiar la resolución recodifica el video con la calidad elegida.'
        : '';
  } else {
    const fmt = AUDIO_FORMATS.find((f) => f.id === s.format);
    const group = $('[data-group="bitrate"]', root);
    group.classList.toggle('is-disabled', !fmt.lossy);
    $$('[data-value]', group).forEach((b) => { b.disabled = !fmt.lossy; });
    $('[data-hint="bitrate"]', root).textContent = fmt.lossy
      ? '192 kbps es ideal para la mayoría de usos; 320 para música exigente.'
      : `${fmt.label} conserva toda la calidad del original; no usa bitrate.`;
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
  $('.queue-count', root).textContent = plural(st.items.length, 'archivo', 'archivos');
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
    label.textContent = st.stopRequested ? 'Deteniendo…' : 'Detener';
    text.textContent = `Convirtiendo ${Math.min(st.batch.finished + 1, st.batch.total)} de ${st.batch.total}`;
    bar.classList.add('is-visible');
    $('span', bar).style.width = `${overallProgress(st)}%`;
    return;
  }

  const ready = st.items.filter(isConvertible).length;
  const done = st.items.filter((i) => i.status === 'done').length;
  const probing = st.items.some((i) => i.status === 'probing');

  btn.classList.remove('is-stop');
  btn.disabled = ready === 0;
  label.textContent = ready === 0
    ? (st.items.length ? 'Nada pendiente' : 'Añade archivos para empezar')
    : `Convertir ${ready === 1 ? 'archivo' : plural(ready, 'archivo', 'archivos')}`;

  const parts = [];
  if (probing) parts.push('Analizando archivos…');
  if (ready) parts.push(plural(ready, 'listo', 'listos'));
  if (done) parts.push(plural(done, 'convertido', 'convertidos'));
  text.textContent = parts.join(' · ') || 'Sin archivos todavía';
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
  $('.drop-overlay-target').textContent = `a ${TABS[key].label}`;
  moveIndicator();
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

  if (rejected) {
    toast(`${plural(rejected, 'archivo ignorado', 'archivos ignorados')}: formato no compatible con ${TABS[key].label}.`, { type: 'warn' });
  }
  if (!fresh.length) return;
  refresh(key);

  const infos = await api.probe(fresh.map((i) => i.path));
  const need = TABS[key].needs === 'video' ? 'hasVideo' : 'hasAudio';
  infos.forEach((info, idx) => {
    const item = fresh[idx];
    Object.assign(item, { size: info.size, duration: info.duration, resolution: info.resolution });
    if (info.error) {
      item.status = 'invalid';
      item.error = info.error;
    } else if (!info[need]) {
      item.status = 'invalid';
      item.error = need === 'hasVideo' ? 'Este archivo no tiene pista de video.' : 'Este archivo no tiene pista de audio.';
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
  announce(key, st.batch, st.stopRequested);
}

function stopQueue(key) {
  const st = state.tabs[key];
  st.stopRequested = true;
  if (st.current) api.cancel(st.current.id);
  renderFooter(key);
}

function announce(key, batch, stopped) {
  const { done, failed, lastOutput } = batch;
  if (done) {
    const msg = `${plural(done, 'archivo convertido', 'archivos convertidos')}${failed ? ` · ${failed} con error` : ''}`;
    toast(msg, { type: 'success', action: { label: 'Mostrar', run: () => api.reveal(lastOutput) } });
    if (!document.hasFocus()) new Notification('Converter Kerygma', { body: msg });
  } else if (failed) {
    toast(`No se pudo convertir ${plural(failed, 'archivo', 'archivos')}. Revisa el detalle en la lista.`, { type: 'error' });
  } else if (stopped) {
    toast('Conversión detenida.', { type: 'info' });
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

/* ---------- Eventos ---------- */

function onPanelClick(key, e) {
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
    if (!(e.metaKey || e.ctrlKey)) return;
    const n = Number(e.key);
    if (n >= 1 && n <= keys.length) {
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
  const config = await api.getConfig();
  state.accept = config.accept;
  document.body.classList.add(config.platform === 'darwin' ? 'is-mac' : 'is-win');

  const view = $('#view');
  view.innerHTML = Object.keys(TABS).map(panelTemplate).join('');

  for (const key of Object.keys(TABS)) {
    const st = state.tabs[key];
    st.el = $(`.panel[data-panel="${key}"]`, view);
    st.el.addEventListener('click', (e) => onPanelClick(key, e));
    refresh(key);
  }

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
  setTab('video');
  requestAnimationFrame(() => document.body.classList.add('is-ready'));
}

init();
