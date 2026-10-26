// Preferencias del usuario, guardadas como JSON en la carpeta de datos de la app.

const { app } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

// Valores permitidos para cada preferencia; el primero es el predeterminado.
const CHOICES = {
  theme: ['system', 'light', 'dark'],
  language: ['system', 'es', 'en'],
  existing: ['copy', 'overwrite'],
};
const FLAGS = { remember: true, notify: true, openFolder: false };
const TAB_KEYS = ['video', 'audio', 'extract', 'image'];

const DEFAULTS = {
  ...Object.fromEntries(Object.entries(CHOICES).map(([k, v]) => [k, v[0]])),
  ...FLAGS,
  tabs: {},
};

const file = () => path.join(app.getPath('userData'), 'settings.json');
let current = null;

// Descarta claves desconocidas y valores fuera de rango (archivo editado a mano, versión vieja, etc.).
function sanitize(raw) {
  const out = { ...DEFAULTS, tabs: {} };
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, values] of Object.entries(CHOICES)) if (values.includes(raw[k])) out[k] = raw[k];
  for (const k of Object.keys(FLAGS)) if (typeof raw[k] === 'boolean') out[k] = raw[k];
  if (raw.tabs && typeof raw.tabs === 'object') {
    for (const key of TAB_KEYS) {
      const tab = raw.tabs[key];
      if (!tab || typeof tab !== 'object') continue;
      // La interfaz valida cada opción contra sus formatos; aquí solo se aceptan textos.
      out.tabs[key] = Object.fromEntries(Object.entries(tab).filter(([, v]) => typeof v === 'string'));
    }
  }
  return out;
}

function load() {
  if (current) return current;
  try {
    current = sanitize(JSON.parse(fs.readFileSync(file(), 'utf8')));
  } catch {
    current = sanitize(null);
  }
  return current;
}

function save() {
  const target = file();
  const tmp = `${target}.tmp`;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  // Escribir y renombrar evita dejar un archivo a medias si la app se cierra en ese momento.
  fs.writeFileSync(tmp, JSON.stringify(current, null, 2));
  fs.renameSync(tmp, target);
}

function update(patch) {
  const base = load();
  const merged = { ...base, ...patch, tabs: { ...base.tabs } };
  if (patch && patch.tabs && typeof patch.tabs === 'object') {
    for (const [key, value] of Object.entries(patch.tabs)) {
      if (value === null) delete merged.tabs[key];
      else merged.tabs[key] = value;
    }
  }
  if (merged.remember === false) merged.tabs = {};
  current = sanitize(merged);
  save();
  return current;
}

function reset() {
  current = sanitize(null);
  save();
  return current;
}

// Idioma efectivo: el elegido, o el del sistema (español si empieza por "es", si no inglés).
function language() {
  const choice = load().language;
  if (choice !== 'system') return choice;
  return app.getLocale().toLowerCase().startsWith('es') ? 'es' : 'en';
}

module.exports = { load, update, reset, language };
