# Converter Kerygma

Convertidor de video y audio de escritorio para **Mac y Windows**. Funciona 100 % offline: ffmpeg viene incluido dentro de la app y tus archivos nunca salen de tu equipo.

| Pestaña | Qué hace | Entradas | Salidas |
|---|---|---|---|
| **Video** | MOV ⇄ MP4 | MOV, MP4, M4V, MKV, AVI, WEBM | MP4, MOV |
| **Audio** | De un formato de audio a otro | MP3, WAV, M4A, AAC, FLAC, OGG, OPUS, WMA, AIFF | MP3, M4A, WAV, FLAC, OGG, OPUS |
| **Video → Audio** | Extrae la pista de audio | MOV, MP4, M4V, MKV, AVI, WEBM | MP3, M4A, WAV, FLAC, OGG, OPUS |

- Arrastra y suelta varios archivos a la vez (o `Ctrl/⌘ + O`).
- **Modo rápido** en video: copia la imagen sin recodificar cuando el formato lo permite (segundos, sin pérdida). Si no se puede, recodifica automáticamente.
- **Máxima compatibilidad**: recodifica a H.264 + AAC, con calidad y resolución configurables.
- Elige bitrate para audio (128–320 kbps) y la carpeta de destino.
- Nunca sobrescribe: si el archivo ya existe, guarda como `nombre (1).mp4`.
- Tema claro/oscuro automático según el sistema. Atajos `Ctrl/⌘ + 1/2/3` para cambiar de pestaña.

## Desarrollo

Requisitos: [Node.js](https://nodejs.org) 20 o superior.

```bash
npm install
npm start
```

## Generar instaladores

En tu propia máquina (genera para el sistema donde lo ejecutes):

```bash
npm run dist
```

Los archivos quedan en `dist/`:

- **Windows**: instalador `.exe` (NSIS) y un `.exe` **portable** que no requiere instalación.
- **Mac**: `.dmg` y `.zip`.

Para obtener ambos sistemas sin tener una Mac, sube el repo a GitHub y crea un tag; el workflow de [`.github/workflows/build.yml`](.github/workflows/build.yml) compila Windows, Mac Apple Silicon y Mac Intel, y deja los instaladores en la pestaña **Actions → Artifacts**:

```bash
git tag v0.1.0
git push origin v0.1.0
```

> **Mac:** la app no está firmada con un certificado de Apple, así que la primera vez hay que abrirla con clic derecho → **Abrir**.

## Estructura

```
src/
  main/       proceso principal de Electron
    main.js     ventana, diálogos e IPC
    ffmpeg.js   análisis, conversión con progreso y cancelación
    presets.js  formatos y argumentos de ffmpeg
  preload/    puente seguro entre la interfaz y el sistema
  renderer/   interfaz (HTML, CSS y JS sin dependencias)
```

## Licencias

El código de la app es MIT. El binario de ffmpeg incluido (vía [`ffmpeg-static`](https://github.com/eugeneware/ffmpeg-static)) se distribuye bajo GPL; si distribuyes la app, incluye esa licencia.
