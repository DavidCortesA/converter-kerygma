// Definición de formatos y argumentos de ffmpeg para cada tipo de conversión.

const VIDEO_EXTS = ['mov', 'mp4', 'm4v', 'mkv', 'avi', 'webm', 'wmv', 'flv', 'mpg', 'mpeg', 'ts', 'mts', 'm2ts', '3gp', 'ogv'];
const AUDIO_EXTS = ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'opus', 'wma', 'aiff', 'aif'];
const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tif', 'tiff', 'gif', 'ico'];

const ACCEPT = {
  video: [...VIDEO_EXTS, 'gif'],
  audio: AUDIO_EXTS,
  extract: VIDEO_EXTS,
  image: IMAGE_EXTS,
};

// ext: extensión si difiere del id. rates: únicas frecuencias que admite el códec.
// maxMono: bitrate máximo (kbps) que el códec acepta en mono.
const AUDIO_FORMATS = {
  mp3: { codec: ['-c:a', 'libmp3lame', '-id3v2_version', '3'], lossy: true },
  m4a: { codec: ['-c:a', 'aac', '-movflags', '+faststart'], lossy: true },
  aac: { codec: ['-c:a', 'aac', '-f', 'adts'], lossy: true },
  wav: { codec: ['-c:a', 'pcm_s16le'] },
  flac: { codec: ['-c:a', 'flac'] },
  alac: { ext: 'm4a', codec: ['-c:a', 'alac', '-movflags', '+faststart'] },
  aiff: { codec: ['-c:a', 'pcm_s16be', '-write_id3v2', '1'] },
  ogg: { codec: ['-c:a', 'libvorbis'], lossy: true, maxMono: 192 },
  opus: { codec: ['-c:a', 'libopus'], lossy: true, rates: [48000], maxMono: 256 },
  wma: { codec: ['-c:a', 'wmav2'], lossy: true },
  ac3: { codec: ['-c:a', 'ac3'], lossy: true, rates: [48000, 44100, 32000] },
  // Tono de iPhone: AAC en contenedor iPod, máximo 40 segundos (el corte lo aplica outputWindow).
  m4r: { codec: ['-c:a', 'aac', '-f', 'ipod'], lossy: true, maxSeconds: 40 },
};

const SAMPLE_RATES = { original: null, '44100': 44100, '48000': 48000 };
const CHANNELS = { original: null, '2': '2', '1': '1' };

const RESOLUTIONS = { original: null, '1080': 1080, '720': 720, '480': 480 };
const BITRATES = ['128', '192', '256', '320'];

// Codificadores de video: argumentos según la calidad elegida (alta, media, baja).
const VIDEO_ENCODERS = {
  h264: (q) => ['-c:v', 'libx264', '-preset', 'medium', '-crf', { alta: '18', media: '23', baja: '28' }[q], '-pix_fmt', 'yuv420p'],
  vp9: (q) => ['-c:v', 'libvpx-vp9', '-crf', { alta: '30', media: '34', baja: '38' }[q], '-b:v', '0',
    '-deadline', 'good', '-cpu-used', '4', '-row-mt', '1', '-pix_fmt', 'yuv420p'],
  mpeg4: (q) => ['-c:v', 'mpeg4', '-q:v', { alta: '2', media: '4', baja: '7' }[q], '-tag:v', 'XVID', '-pix_fmt', 'yuv420p'],
  wmv2: (q) => ['-c:v', 'wmv2', '-q:v', { alta: '2', media: '4', baja: '7' }[q], '-pix_fmt', 'yuv420p'],
  mpeg2: (q) => ['-c:v', 'mpeg2video', '-q:v', { alta: '2', media: '4', baja: '7' }[q], '-pix_fmt', 'yuv420p'],
};

const AUDIO_ENCODERS = {
  aac: ['-c:a', 'aac', '-b:a', '192k'],
  opus: ['-c:a', 'libopus', '-b:a', '160k'],
  mp3: ['-c:a', 'libmp3lame', '-b:a', '192k'],
  wma: ['-c:a', 'wmav2', '-b:a', '192k'],
  mp2: ['-c:a', 'mp2', '-b:a', '224k'],
};

// Cada contenedor: con qué codifica y qué códecs acepta tal cual en modo rápido
// (ANY = cualquiera; 'pcm_*' = cualquier variante PCM).
const ANY = null;
const VIDEO_FORMATS = {
  mp4: { video: 'h264', audio: 'aac', copyVideo: ['h264', 'hevc', 'mpeg4', 'av1'], copyAudio: ['aac', 'mp3', 'ac3', 'eac3', 'alac'], apple: true },
  mov: { video: 'h264', audio: 'aac', copyVideo: ['h264', 'hevc', 'mpeg4', 'prores', 'mjpeg'], copyAudio: ['aac', 'mp3', 'ac3', 'alac', 'pcm_*'], apple: true },
  m4v: { video: 'h264', audio: 'aac', copyVideo: ['h264', 'hevc'], copyAudio: ['aac', 'ac3', 'alac'], apple: true, muxer: 'mp4' },
  mkv: { video: 'h264', audio: 'aac', copyVideo: ANY, copyAudio: ANY },
  webm: { video: 'vp9', audio: 'opus', copyVideo: ['vp8', 'vp9', 'av1'], copyAudio: ['opus', 'vorbis'] },
  avi: { video: 'mpeg4', audio: 'mp3', copyVideo: ['mpeg4', 'mjpeg'], copyAudio: ['mp3', 'ac3', 'pcm_*'] },
  wmv: { video: 'wmv2', audio: 'wma', copyVideo: ['wmv1', 'wmv2', 'wmv3', 'vc1'], copyAudio: ['wmav1', 'wmav2', 'wmapro'] },
  mpg: { video: 'mpeg2', audio: 'mp2', copyVideo: ['mpeg1video', 'mpeg2video'], copyAudio: ['mp2', 'mp3'] },
  ts: { video: 'h264', audio: 'aac', copyVideo: ['h264', 'hevc', 'mpeg2video'], copyAudio: ['aac', 'mp3', 'ac3', 'mp2'] },
  flv: { video: 'h264', audio: 'aac', copyVideo: ['h264'], copyAudio: ['aac', 'mp3'] },
  '3gp': { video: 'h264', audio: 'aac', copyVideo: ['h264', 'h263', 'mpeg4'], copyAudio: ['aac', 'amr_nb'], apple: true },
  gif: { gif: true },
};

const GIF_FPS = { alta: 20, media: 15, baja: 10 };

function accepts(list, codec) {
  if (!codec) return false;
  if (list === ANY) return true;
  return list.some((c) => (c.endsWith('*') ? codec.startsWith(c.slice(0, -1)) : c === codec));
}

function gifArgs(job, scale) {
  const fps = GIF_FPS[job.quality] ?? GIF_FPS.media;
  const size = scale ? `scale=-1:'min(${scale},ih)':flags=lanczos,` : '';
  // Paleta propia por video: colores mucho más fieles que la paleta GIF genérica.
  const filter = `fps=${fps},${size}split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`;
  return ['-map', '0:v:0', '-vf', filter, '-an', '-loop', '0'];
}

// ---------- Presets por destino (siempre MP4 H.264 + AAC) ----------
// limitMB: tamaño máximo del archivo; el bitrate se calcula con la duración y la resolución
// baja por la escalera [kbps mínimos de video, lado corto] hasta que la calidad sea razonable.
// maxK: por encima de este bitrate no se gana calidad visible; se usa CRF con ese techo.
const VIDEO_PRESETS = {
  whatsapp: { limitMB: 16, audioK: 96, maxK: 2000, ladder: [[1200, 720], [500, 480], [0, 360]] },
  email: { limitMB: 20, audioK: 128, maxK: 4000, ladder: [[2500, 1080], [1200, 720], [500, 480], [0, 360]] },
  youtube: { crf: 18, audioK: 384, rate: 48000 },
  instagram: { crf: 20, audioK: 128, rate: 44100, shortSide: 1080, maxrateK: 8000 },
};
const MIN_VIDEO_K = 100; // por debajo el video no se ve: mejor pedir que se recorte
const SIZE_MARGIN = 0.92; // x264 en una pasada puede pasarse unos puntos del objetivo
const EVEN_SIZE = 'scale=trunc(iw/2)*2:trunc(ih/2)*2';

// Limita el lado corto (sirve igual para videos horizontales y verticales de celular).
const shortSideScale = (px) => `scale='if(gte(iw,ih),-2,min(${px},trunc(iw/2)*2))':'if(gte(iw,ih),min(${px},trunc(ih/2)*2),-2)'`;

class JobError extends Error {
  constructor(code, detail) {
    super(code);
    this.code = code;
    this.detail = detail;
  }
}

const presetLimitBytes = (job) => {
  const p = job.kind === 'video' && VIDEO_PRESETS[job.preset];
  return p && p.limitMB ? p.limitMB * 1024 * 1024 : null;
};

// attempt > 0 cuando el intento anterior se pasó del tamaño: cada reintento usa un 15 % menos.
function presetArgs(job, info, attempt) {
  const p = VIDEO_PRESETS[job.preset];
  const args = ['-map', '0:v:0', '-map', '0:a:0?', '-c:v', 'libx264', '-preset', 'medium', '-profile:v', 'high', '-pix_fmt', 'yuv420p'];
  const audioK = info.hasAudio ? p.audioK : 0;
  let filter = EVEN_SIZE;

  if (p.limitMB) {
    const seconds = Math.max(info.duration, 1);
    const budgetBits = p.limitMB * 1024 * 1024 * 8 * SIZE_MARGIN * 0.85 ** attempt;
    const videoK = Math.floor(budgetBits / seconds / 1000 - audioK - 8);
    if (videoK < MIN_VIDEO_K) {
      // Detalle: segundos que caben aproximadamente con la calidad mínima.
      throw new JobError('TOO_LONG', Math.floor(budgetBits / ((MIN_VIDEO_K + audioK + 8) * 1000)));
    }
    filter = shortSideScale(p.ladder.find(([k]) => videoK >= k)[1]);
    // Calidad constante con techo: un video simple sale liviano (no "llena" el límite) y uno
    // complejo queda limitado por maxrate. Si aun así se pasa, convert() reintenta con menos.
    const capK = Math.min(videoK, p.maxK);
    args.push('-crf', '23', '-maxrate', `${capK}k`, '-bufsize', `${capK * 2}k`, '-fpsmax', '30');
  } else {
    args.push('-crf', String(p.crf));
    if (p.shortSide) filter = shortSideScale(p.shortSide);
    if (p.maxrateK) args.push('-maxrate', `${p.maxrateK}k`, '-bufsize', `${p.maxrateK * 2}k`, '-fpsmax', '30');
  }

  args.push('-vf', filter);
  if (info.hasAudio) {
    args.push('-c:a', 'aac', '-b:a', `${p.audioK}k`);
    if (p.rate) args.push('-ar', String(p.rate));
  }
  args.push('-map_metadata', '0', '-movflags', '+faststart');
  return args;
}

function videoArgs(job, info, attempt) {
  if (VIDEO_PRESETS[job.preset]) return presetArgs(job, info, attempt);
  const fmt = VIDEO_FORMATS[job.format];
  const scale = RESOLUTIONS[job.resolution] ?? null;
  const quality = ['alta', 'media', 'baja'].includes(job.quality) ? job.quality : 'alta';
  if (fmt.gif) return gifArgs(job, scale);

  const fast = job.mode === 'fast';
  const copyVideo = fast && !scale && accepts(fmt.copyVideo, info.vcodec);
  const args = ['-map', '0:v:0', '-map', '0:a:0?'];

  if (copyVideo) {
    args.push('-c:v', 'copy');
    // QuickTime y los dispositivos Apple solo reproducen HEVC con la etiqueta hvc1.
    if (fmt.apple && info.vcodec === 'hevc') args.push('-tag:v', 'hvc1');
  } else {
    args.push(...VIDEO_ENCODERS[fmt.video](quality));
    // yuv420p exige ancho y alto pares; -2 y trunc() lo garantizan.
    args.push('-vf', scale
      ? `scale=-2:'min(${scale},trunc(ih/2)*2)'`
      : 'scale=trunc(iw/2)*2:trunc(ih/2)*2');
  }

  if (info.hasAudio) {
    if (fast && accepts(fmt.copyAudio, info.acodec)) args.push('-c:a', 'copy');
    else args.push(...AUDIO_ENCODERS[fmt.audio]);
  }

  args.push('-map_metadata', '0');
  if (fmt.apple) args.push('-movflags', '+faststart');
  if (fmt.muxer) args.push('-f', fmt.muxer);
  return args;
}

// Fotos: lado más largo máximo en píxeles (null = tamaño original).
const IMAGE_SIZES = { original: null, '3840': 3840, '1920': 1920, '1280': 1280, '800': 800 };

// flatten: el formato no admite transparencia; se pone fondo blanco en vez de negro.
// image2: muxer de un solo archivo, necesita -update 1.
const IMAGE_FORMATS = {
  jpg: { flatten: true, image2: true, codec: (q) => ['-c:v', 'mjpeg', '-q:v', { alta: '2', media: '4', baja: '8' }[q], '-pix_fmt', q === 'alta' ? 'yuvj444p' : 'yuvj420p'] },
  png: { image2: true, codec: () => ['-c:v', 'png'] },
  webp: { codec: (q) => ['-c:v', 'libwebp', '-quality', { alta: '90', media: '80', baja: '65' }[q], '-compression_level', '6'] },
  avif: { flatten: true, codec: (q) => ['-c:v', 'libaom-av1', '-still-picture', '1', '-crf', { alta: '18', media: '28', baja: '38' }[q], '-cpu-used', '6', '-pix_fmt', 'yuv444p'] },
  tiff: { image2: true, codec: () => ['-c:v', 'tiff', '-compression_algo', 'deflate'] },
  bmp: { flatten: true, image2: true, codec: () => ['-c:v', 'bmp', '-pix_fmt', 'bgr24'] },
  gif: { palette: true, codec: () => ['-c:v', 'gif'] },
  ico: { maxSize: 256, codec: () => ['-c:v', 'png', '-pix_fmt', 'rgba'] },
};

function imageArgs(job) {
  const fmt = IMAGE_FORMATS[job.format];
  const quality = ['alta', 'media', 'baja'].includes(job.quality) ? job.quality : 'alta';
  const size = Math.min(IMAGE_SIZES[job.size] ?? Infinity, fmt.maxSize ?? Infinity);

  // ffmpeg ya endereza las fotos según su orientación EXIF.
  const filters = [];
  if (Number.isFinite(size)) filters.push(`scale=w='min(iw,${size})':h='min(ih,${size})':force_original_aspect_ratio=decrease`);
  if (fmt.flatten) filters.push('format=rgba,split[a][b];[a]drawbox=c=white:t=fill:replace=1[bg];[bg][b]overlay=format=auto');
  if (fmt.palette) filters.push('split[a][b];[a]palettegen=reserve_transparent=1[p];[b][p]paletteuse');

  const args = ['-map', '0:v:0', '-frames:v', '1'];
  if (filters.length) args.push('-vf', filters.join(','));
  args.push(...fmt.codec(quality), '-map_metadata', '-1');
  if (fmt.image2) args.push('-update', '1');
  return args;
}

function audioArgs(job, info) {
  const fmt = AUDIO_FORMATS[job.format];
  const normalize = job.normalize === 'on';
  const mono = job.channels === '1' || (!CHANNELS[job.channels] && /^(mono|1 channels)$/.test(info.channels));
  let bitrate = Number(BITRATES.includes(job.bitrate) ? job.bitrate : '192');
  if (mono && fmt.maxMono) bitrate = Math.min(bitrate, fmt.maxMono);

  // loudnorm trabaja a 192 kHz internamente, así que hay que fijar la frecuencia de salida.
  // Los formatos con pérdida no pasan de 48 kHz (MP3, OGG y WMA fallan con 96 kHz).
  let rate = SAMPLE_RATES[job.rate] ?? null;
  if (!rate && (normalize || (fmt.lossy && info.sampleRate > 48000))) rate = info.sampleRate || 48000;
  if (rate && fmt.lossy) rate = Math.min(rate, 48000);
  if (rate && fmt.rates && !fmt.rates.includes(rate)) rate = fmt.rates[0];

  const args = ['-map', '0:a:0', '-vn', ...fmt.codec];
  if (fmt.lossy) args.push('-b:a', `${bitrate}k`);
  if (CHANNELS[job.channels]) args.push('-ac', CHANNELS[job.channels]);
  if (rate) args.push('-ar', String(rate));
  // Volumen estándar de podcasts y streaming (-16 LUFS).
  if (normalize) args.push('-af', 'loudnorm=I=-16:TP=-1.5:LRA=11');
  args.push('-map_metadata', '0');
  return args;
}

const isAudioJob = (job) => job.kind === 'audio' || job.kind === 'extract';

function outputExt(job) {
  if (job.kind === 'video' && VIDEO_PRESETS[job.preset]) return 'mp4';
  return (isAudioJob(job) && AUDIO_FORMATS[job.format].ext) || job.format;
}

// Tramo del original que se convierte: el recorte del usuario y, en M4R, como máximo 40 s.
// Devuelve { start, length } en segundos; length es null si llega hasta el final.
function outputWindow(job, duration) {
  let start = 0;
  let end = duration || Infinity;
  const trim = job.kind !== 'image' && job.trim;
  if (trim && Number.isFinite(trim.start) && Number.isFinite(trim.end)) {
    start = Math.max(0, Math.min(trim.start, end));
    end = Math.max(start, Math.min(trim.end, end));
    if (end - start < 0.1) { start = 0; end = duration || Infinity; }
  }
  const max = isAudioJob(job) && AUDIO_FORMATS[job.format].maxSeconds;
  if (max) end = Math.min(end, start + max);
  const toEnd = !Number.isFinite(end) || end >= (duration || Infinity) - 0.01;
  return { start, length: toEnd ? null : end - start };
}

function validateJob(job) {
  if (!job || typeof job.input !== 'string' || !ACCEPT[job.kind]) return 'INVALID_JOB';
  const formats = { video: VIDEO_FORMATS, image: IMAGE_FORMATS }[job.kind] ?? AUDIO_FORMATS;
  if (!Object.hasOwn(formats, job.format)) return 'UNSUPPORTED_FORMAT';
  if (job.preset && job.preset !== 'custom' && !Object.hasOwn(VIDEO_PRESETS, job.preset)) return 'UNSUPPORTED_FORMAT';
  if (job.trim != null && (typeof job.trim !== 'object' || !(job.trim.end > job.trim.start))) return 'INVALID_JOB';
  return null;
}

function buildArgs(job, info, attempt = 0) {
  if (job.kind === 'video') return videoArgs(job, info, attempt);
  if (job.kind === 'image') return imageArgs(job);
  return audioArgs(job, info);
}

module.exports = { ACCEPT, JobError, buildArgs, validateJob, outputExt, outputWindow, presetLimitBytes };
