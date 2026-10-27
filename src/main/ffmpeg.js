// Ejecuta ffmpeg: análisis de archivos, conversión con progreso y cancelación.

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { JobError, buildArgs, validateJob, outputExt, outputWindow, presetLimitBytes } = require('./presets');

// Dentro del paquete, el binario vive en app.asar.unpacked (ver "asarUnpack" en package.json).
const ffmpegPath = require('ffmpeg-static').replace(/app\.asar(?!\.unpacked)/, 'app.asar.unpacked');

const running = new Map(); // id -> { proc, output, canceled }

function run(args, opts = {}) {
  return spawn(ffmpegPath, args, { windowsHide: true, ...opts });
}

function parseTime(h, m, s) {
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

// Los errores se devuelven como { code, detail }: la interfaz los traduce al idioma elegido.
const fail = (code, detail) => ({ ok: false, error: { code, detail } });

// ffmpeg -i sin salida imprime la información del archivo en stderr y termina.
function probe(file) {
  return new Promise((resolve) => {
    let stat;
    try {
      stat = fs.statSync(file);
    } catch {
      return resolve({ path: file, error: { code: 'NOT_FOUND' } });
    }

    const proc = run(['-hide_banner', '-i', file]);
    let err = '';
    proc.stderr.on('data', (d) => { err += d; });
    proc.on('error', (e) => resolve({ path: file, error: { code: 'FFMPEG', detail: e.message } }));
    proc.on('close', () => {
      const info = { path: file, size: stat.size, duration: 0, hasVideo: false, hasAudio: false, vcodec: null, acodec: null };
      // URL para miniaturas; realpath expande rutas cortas de Windows (DAVIDC~1) que Chromium no carga.
      try { info.url = pathToFileURL(fs.realpathSync.native(file)).href; } catch { /* sin miniatura */ }
      const dur = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(err);
      if (dur) info.duration = parseTime(dur[1], dur[2], dur[3]);

      for (const line of err.split(/\r?\n/)) {
        const m = /Stream #\d+:\d+\S*: (Video|Audio): (\w+)/.exec(line);
        if (!m) continue;
        if (m[1] === 'Video' && !info.hasVideo && !line.includes('attached pic')) {
          info.hasVideo = true;
          info.vcodec = m[2];
          const res = /, (\d{2,5})x(\d{2,5})/.exec(line);
          if (res) info.resolution = `${res[1]}×${res[2]}`;
        } else if (m[1] === 'Audio' && !info.hasAudio) {
          info.hasAudio = true;
          info.acodec = m[2];
          const hz = /, (\d{4,6}) Hz/.exec(line);
          if (hz) info.sampleRate = Number(hz[1]);
          const ch = /Hz, ([^,]+),/.exec(line);
          if (ch) info.channels = ch[1];
        }
      }

      if (!info.hasVideo && !info.hasAudio) info.error = { code: 'INVALID_MEDIA' };
      resolve(info);
    });
  });
}

const samePath = (a, b) => (process.platform === 'win32' || process.platform === 'darwin'
  ? path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase()
  : path.resolve(a) === path.resolve(b));

const reserved = (file) => [...running.values()].some((r) => samePath(r.output, file));

// Nombre final. Con overwrite se reutiliza el nombre aunque exista, salvo que sea el propio
// archivo de entrada (ffmpeg no puede leer y escribir el mismo archivo) u otra conversión en curso.
function outputPath(dir, base, ext, input, overwrite) {
  const first = path.join(dir, `${base}.${ext}`);
  if (overwrite && !samePath(first, input) && !reserved(first)) return first;
  let out = first;
  for (let n = 1; fs.existsSync(out) || reserved(out) || samePath(out, input); n++) {
    out = path.join(dir, `${base} (${n}).${ext}`);
  }
  return out;
}

function safeUnlink(file) {
  fs.rm(file, { force: true }, () => {});
}

function lastErrorLine(stderr) {
  const lines = stderr.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines[lines.length - 1] || '';
}

async function convert(job, onProgress, { overwrite = false } = {}) {
  const invalid = validateJob(job);
  if (invalid) return fail(invalid);

  const info = await probe(job.input);
  if (info.error) return { ok: false, error: info.error };
  const needsVideo = job.kind === 'video' || job.kind === 'image';
  if (needsVideo && !info.hasVideo) return fail(job.kind === 'image' ? 'NOT_IMAGE' : 'NO_VIDEO');
  if (!needsVideo && !info.hasAudio) return fail('NO_AUDIO');

  const outDir = job.outputDir || path.dirname(job.input);
  try {
    fs.mkdirSync(outDir, { recursive: true });
  } catch (e) {
    return fail('OUTPUT_DIR', e.message);
  }
  const ext = outputExt(job);
  const base = path.basename(job.input, path.extname(job.input));
  const output = outputPath(outDir, base, ext, job.input, overwrite);
  // Se escribe en un temporal con la misma extensión (ffmpeg elige el formato por ella) y se
  // renombra al terminar: un fallo nunca deja un archivo a medias ni pisa uno existente.
  const temp = path.join(outDir, `.${base}.${job.id}.part.${ext}`);

  // -ss antes de -i busca rápido; al recodificar el corte es exacto, al copiar cae en un fotograma clave.
  const { start, length } = outputWindow(job, info.duration);
  const total = length ?? Math.max(0, info.duration - start);
  const seek = start > 0 ? ['-ss', start.toFixed(3)] : [];
  const cut = length != null ? ['-t', length.toFixed(3)] : [];

  // Destinos con tamaño máximo: si el resultado se pasa, se reintenta con menos bitrate.
  const limit = presetLimitBytes(job);
  const attempts = limit ? 3 : 1;
  const entry = { proc: null, output, canceled: false };
  running.set(job.id, entry);

  for (let attempt = 0; attempt < attempts; attempt++) {
    let codecArgs;
    try {
      codecArgs = buildArgs(job, { ...info, duration: total }, attempt);
    } catch (e) {
      running.delete(job.id);
      if (e instanceof JobError) return fail(e.code, e.detail);
      throw e;
    }
    const args = [
      '-hide_banner', '-y', ...seek, '-i', job.input, ...cut,
      ...codecArgs,
      '-progress', 'pipe:1', '-nostats',
      temp,
    ];
    const result = await runFfmpeg(args, entry, job.id, total, onProgress);

    if (entry.canceled) {
      running.delete(job.id);
      safeUnlink(temp);
      return { ok: false, canceled: true };
    }
    if (result.error) {
      running.delete(job.id);
      safeUnlink(temp);
      return fail('FFMPEG', result.error);
    }
    if (limit && attempt < attempts - 1 && fs.statSync(temp).size > limit) continue;
    break;
  }

  running.delete(job.id);
  try {
    if (limit && fs.statSync(temp).size > limit) throw new JobError('TOO_LONG', Math.floor(total * 0.8));
    fs.renameSync(temp, output);
  } catch (e) {
    safeUnlink(temp);
    // Típico en Windows si el archivo a reemplazar está abierto en otro programa.
    return e instanceof JobError ? fail(e.code, e.detail) : fail('OUTPUT_LOCKED', e.message);
  }
  let size = 0;
  try { size = fs.statSync(output).size; } catch { /* sin tamaño */ }
  onProgress({ id: job.id, percent: 100, eta: 0 });
  return { ok: true, output, size };
}

// Ejecuta ffmpeg informando el progreso; resuelve { error } si termina mal.
function runFfmpeg(args, entry, id, total, onProgress) {
  return new Promise((resolve) => {
    // Cancelado entre un reintento y el siguiente: no se lanza otro proceso.
    if (entry.canceled) return resolve({});
    const proc = run(args);
    entry.proc = proc;

    let stderr = '';
    let buffer = '';
    const started = Date.now();

    proc.stderr.on('data', (d) => {
      stderr = (stderr + d).slice(-8000);
    });

    proc.stdout.on('data', (d) => {
      buffer += d;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop();
      const values = {};
      for (const line of lines) {
        const i = line.indexOf('=');
        if (i > 0) values[line.slice(0, i)] = line.slice(i + 1);
      }
      const us = Number(values.out_time_us ?? values.out_time_ms);
      if (!Number.isFinite(us) || !total) return;
      const seconds = us / 1e6;
      const percent = Math.min(99.5, (seconds / total) * 100);
      const speed = parseFloat(values.speed) || seconds / Math.max(0.001, (Date.now() - started) / 1000);
      const eta = speed > 0 ? Math.max(0, (total - seconds) / speed) : null;
      onProgress({ id, percent, eta, speed });
    });

    proc.on('error', (e) => resolve({ error: e.message }));
    proc.on('close', (code) => resolve(code === 0 || entry.canceled ? {} : { error: lastErrorLine(stderr) }));
  });
}

// Versión del ffmpeg incluido, para la sección "Acerca de".
let versionCache = null;
function version() {
  if (versionCache) return versionCache;
  versionCache = new Promise((resolve) => {
    const proc = run(['-version']);
    let out = '';
    proc.stdout.on('data', (d) => { out += d; });
    proc.on('error', () => resolve(''));
    proc.on('close', () => resolve(/ffmpeg version (\S+)/.exec(out)?.[1]?.replace(/-.*$/, '') || ''));
  });
  return versionCache;
}

function cancel(id) {
  const entry = running.get(id);
  if (!entry) return false;
  entry.canceled = true;
  entry.proc?.kill('SIGKILL');
  return true;
}

function cancelAll() {
  for (const id of running.keys()) cancel(id);
}

module.exports = { probe, convert, cancel, cancelAll, version };
