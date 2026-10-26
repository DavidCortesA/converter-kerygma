// Definición de formatos y argumentos de ffmpeg para cada tipo de conversión.

const VIDEO_EXTS = ['mov', 'mp4', 'm4v', 'mkv', 'avi', 'webm', 'wmv', 'flv', 'mpg', 'mpeg', 'ts', 'mts', 'm2ts', '3gp', 'ogv'];
const AUDIO_EXTS = ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'opus', 'wma', 'aiff', 'aif'];

const ACCEPT = {
  video: [...VIDEO_EXTS, 'gif'],
  audio: AUDIO_EXTS,
  extract: VIDEO_EXTS,
};

const AUDIO_FORMATS = {
  mp3: { codec: ['-c:a', 'libmp3lame', '-id3v2_version', '3'], lossy: true },
  m4a: { codec: ['-c:a', 'aac', '-movflags', '+faststart'], lossy: true },
  wav: { codec: ['-c:a', 'pcm_s16le'], lossy: false },
  flac: { codec: ['-c:a', 'flac'], lossy: false },
  ogg: { codec: ['-c:a', 'libvorbis'], lossy: true },
  opus: { codec: ['-c:a', 'libopus'], lossy: true },
};

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

function videoArgs(job, info) {
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
  if (job.kind === 'video' && !Object.hasOwn(VIDEO_FORMATS, job.format)) return 'Formato de video no soportado.';
  if (job.kind !== 'video' && !Object.hasOwn(AUDIO_FORMATS, job.format)) return 'Formato de audio no soportado.';
  return null;
}

function buildArgs(job, info) {
  return job.kind === 'video' ? videoArgs(job, info) : audioArgs(job);
}

module.exports = { ACCEPT, buildArgs, validateJob };
