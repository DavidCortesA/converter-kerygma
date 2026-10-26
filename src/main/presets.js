// Definición de formatos y argumentos de ffmpeg para cada tipo de conversión.

const VIDEO_EXTS = ['mov', 'mp4', 'm4v', 'mkv', 'avi', 'webm'];
const AUDIO_EXTS = ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'opus', 'wma', 'aiff', 'aif'];

const ACCEPT = {
  video: VIDEO_EXTS,
  audio: AUDIO_EXTS,
  extract: VIDEO_EXTS,
};

const VIDEO_FORMATS = ['mp4', 'mov'];

const AUDIO_FORMATS = {
  mp3: { codec: ['-c:a', 'libmp3lame', '-id3v2_version', '3'], lossy: true },
  m4a: { codec: ['-c:a', 'aac', '-movflags', '+faststart'], lossy: true },
  wav: { codec: ['-c:a', 'pcm_s16le'], lossy: false },
  flac: { codec: ['-c:a', 'flac'], lossy: false },
  ogg: { codec: ['-c:a', 'libvorbis'], lossy: true },
  opus: { codec: ['-c:a', 'libopus'], lossy: true },
};

const QUALITY_CRF = { alta: 18, media: 23, baja: 28 };
const RESOLUTIONS = { original: null, '1080': 1080, '720': 720, '480': 480 };
const BITRATES = ['128', '192', '256', '320'];

// Códecs que cada contenedor acepta sin recodificar (modo rápido).
const COPY_OK = {
  mp4: {
    video: new Set(['h264', 'hevc', 'mpeg4', 'av1']),
    audio: new Set(['aac', 'mp3', 'ac3', 'eac3', 'alac']),
  },
  mov: {
    video: new Set(['h264', 'hevc', 'mpeg4', 'prores', 'mjpeg']),
    audio: new Set(['aac', 'mp3', 'ac3', 'alac']),
  },
};

function canCopyAudio(format, acodec) {
  if (!acodec) return false;
  if (format === 'mov' && acodec.startsWith('pcm_')) return true;
  return COPY_OK[format].audio.has(acodec);
}

function videoArgs(job, info) {
  const scale = RESOLUTIONS[job.resolution] ?? null;
  const crf = QUALITY_CRF[job.quality] ?? QUALITY_CRF.alta;
  const fast = job.mode === 'fast';
  const copyVideo = fast && !scale && COPY_OK[job.format].video.has(info.vcodec);

  const args = ['-map', '0:v:0', '-map', '0:a:0?'];

  if (copyVideo) {
    args.push('-c:v', 'copy');
    // QuickTime y los dispositivos Apple solo reproducen HEVC con la etiqueta hvc1.
    if (info.vcodec === 'hevc') args.push('-tag:v', 'hvc1');
  } else {
    args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', String(crf), '-pix_fmt', 'yuv420p');
    if (scale) args.push('-vf', `scale=-2:'min(${scale},ih)'`);
  }

  if (info.hasAudio) {
    if (fast && canCopyAudio(job.format, info.acodec)) args.push('-c:a', 'copy');
    else args.push('-c:a', 'aac', '-b:a', '192k');
  }

  args.push('-map_metadata', '0', '-movflags', '+faststart');
  return args;
}

function audioArgs(job) {
  const fmt = AUDIO_FORMATS[job.format];
  const bitrate = BITRATES.includes(job.bitrate) ? job.bitrate : '192';
  const args = ['-map', '0:a:0', '-vn', ...fmt.codec];
  if (fmt.lossy) args.push('-b:a', `${bitrate}k`);
  args.push('-map_metadata', '0');
  return args;
}

function validateJob(job) {
  if (!job || typeof job.input !== 'string') return 'Archivo de entrada inválido.';
  if (!ACCEPT[job.kind]) return 'Tipo de conversión desconocido.';
  if (job.kind === 'video' && !VIDEO_FORMATS.includes(job.format)) return 'Formato de video no soportado.';
  if (job.kind !== 'video' && !AUDIO_FORMATS[job.format]) return 'Formato de audio no soportado.';
  return null;
}

function buildArgs(job, info) {
  return job.kind === 'video' ? videoArgs(job, info) : audioArgs(job);
}

module.exports = { ACCEPT, buildArgs, validateJob };
