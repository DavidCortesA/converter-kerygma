// Ejecuta ffmpeg: análisis de archivos, conversión con progreso y cancelación.

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { buildArgs, validateJob, outputExt, outputDuration } = require('./presets');

// Dentro del paquete, el binario vive en app.asar.unpacked (ver "asarUnpack" en package.json).
const ffmpegPath = require('ffmpeg-static').replace(/app\.asar(?!\.unpacked)/, 'app.asar.unpacked');

const running = new Map(); // id -> { proc, output, canceled }

function run(args, opts = {}) {
  return spawn(ffmpegPath, args, { windowsHide: true, ...opts });
}

function parseTime(h, m, s) {
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

// ffmpeg -i sin salida imprime la información del archivo en stderr y termina.
function probe(file) {
  return new Promise((resolve) => {
    let stat;
    try {
      stat = fs.statSync(file);
    } catch {
      return resolve({ path: file, error: 'No se encontró el archivo.' });
    }

    const proc = run(['-hide_banner', '-i', file]);
    let err = '';
    proc.stderr.on('data', (d) => { err += d; });
    proc.on('error', (e) => resolve({ path: file, error: e.message }));
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

      if (!info.hasVideo && !info.hasAudio) info.error = 'No es un archivo de audio o video válido.';
      resolve(info);
    });
  });
}

function uniqueOutput(dir, base, ext) {
  let out = path.join(dir, `${base}.${ext}`);
  for (let n = 1; fs.existsSync(out) || [...running.values()].some((r) => r.output === out); n++) {
    out = path.join(dir, `${base} (${n}).${ext}`);
  }
  return out;
}

function safeUnlink(file) {
  fs.rm(file, { force: true }, () => {});
}

function lastErrorLine(stderr) {
  const lines = stderr.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines[lines.length - 1] || 'ffmpeg terminó con un error.';
}

async function convert(job, onProgress) {
  const invalid = validateJob(job);
  if (invalid) return { ok: false, error: invalid };

  const info = await probe(job.input);
  if (info.error) return { ok: false, error: info.error };
  const needsVideo = job.kind === 'video' || job.kind === 'image';
  if (needsVideo && !info.hasVideo) return { ok: false, error: job.kind === 'image' ? 'No es una imagen válida.' : 'El archivo no contiene video.' };
  if (!needsVideo && !info.hasAudio) return { ok: false, error: 'El archivo no contiene audio.' };

  const outDir = job.outputDir || path.dirname(job.input);
  try {
    fs.mkdirSync(outDir, { recursive: true });
  } catch (e) {
    return { ok: false, error: `No se puede escribir en la carpeta de destino: ${e.message}` };
  }
  const base = path.basename(job.input, path.extname(job.input));
  const output = uniqueOutput(outDir, base, outputExt(job));
  const total = outputDuration(job, info.duration);

  const args = [
    '-hide_banner', '-y', '-i', job.input,
    ...buildArgs(job, info),
    '-progress', 'pipe:1', '-nostats',
    output,
  ];

  return new Promise((resolve) => {
    const proc = run(args);
    const entry = { proc, output, canceled: false };
    running.set(job.id, entry);

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
      onProgress({ id: job.id, percent, eta, speed });
    });

    proc.on('error', (e) => {
      running.delete(job.id);
      resolve({ ok: false, error: e.message });
    });

    proc.on('close', (code) => {
      running.delete(job.id);
      if (entry.canceled) {
        safeUnlink(output);
        resolve({ ok: false, canceled: true });
      } else if (code === 0) {
        let size = 0;
        try { size = fs.statSync(output).size; } catch { /* sin tamaño */ }
        onProgress({ id: job.id, percent: 100, eta: 0 });
        resolve({ ok: true, output, size });
      } else {
        safeUnlink(output);
        resolve({ ok: false, error: lastErrorLine(stderr) });
      }
    });
  });
}

function cancel(id) {
  const entry = running.get(id);
  if (!entry) return false;
  entry.canceled = true;
  entry.proc.kill('SIGKILL');
  return true;
}

function cancelAll() {
  for (const id of running.keys()) cancel(id);
}

module.exports = { probe, convert, cancel, cancelAll };
