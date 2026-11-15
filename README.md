<p align="center">
  <img src="public/logo.svg" width="90" height="90" alt="Composer Logo" />
</p>

<h1 align="center">Composer (Modified Desktop Edition)</h1>

<p align="center">
  <b>A fast, beautiful, and DAW-grade editor for word-synced lyrics (TTML, LRC, QRC, SRT).</b><br/>
  Enhanced with a native Windows desktop app, official Unison integration, AI vocal separation, auto-alignment, and timeline controls.
</p>

<p align="center">
  <a href="https://github.com/noobpro45/modified-composer/releases/latest"><img src="https://img.shields.io/github/v/release/noobpro45/modified-composer?color=F50032&style=flat-square&label=Release" alt="Latest Release" /></a>
  <a href="https://github.com/noobpro45/modified-composer/actions/workflows/test.yml"><img src="https://img.shields.io/github/actions/workflow/status/noobpro45/modified-composer/test.yml?branch=master&style=flat-square&label=CI%20Build" alt="CI Build Status" /></a>
  <a href="https://github.com/noobpro45/modified-composer/releases"><img src="https://img.shields.io/badge/Platform-Windows%20x64%20|%20Web-blue?style=flat-square" alt="Platform" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL%203.0-2196f3?style=flat-square" alt="AGPL 3.0 License" /></a>
  <a href="https://github.com/better-lyrics/composer"><img src="https://img.shields.io/badge/Upstream-better--lyrics%2Fcomposer-black?style=flat-square" alt="Upstream" /></a>
</p>

<p align="center">
  <a href="https://github.com/noobpro45/modified-composer/releases/latest"><b>Download for Windows (.zip)</b></a> •
  <a href="#why-composer"><b>Why Composer</b></a> •
  <a href="#features"><b>Features</b></a> •
  <a href="#quick-start"><b>Quick Start</b></a> •
  <a href="#upstream--credits"><b>Credits</b></a>
</p>

---

## Why Composer

You don't need to know TTML to use Composer. Import a song, paste the lyrics and sync them, by tapping along or by dragging words on the Timeline. Use the step-by-step tabs or the Timeline, whichever suits you. They edit the same project.

The heavy tools are there when a song asks for them. Composer can separate the vocals (via Mel-Band RoFormer or HTDemucs) and align each word to the voice (HubertFA CTC alignment), leaving you fixing what it missed instead of timing every syllable manually. A pitch line, a tile-cached spectrum / 144fps spectrogram, a beat grid, and choruses that share timing are all built in.

### 💻 Native Desktop Enhancements

- **Standalone Windows Application**: Packaged with [Wails v2](https://wails.io) as a native Windows x64 binary.
- **Hardware-accelerated WebGPU/DirectX**: Bypasses browser memory quotas and persistent storage limitations.
- **Local Proxy Bridge**: Built-in Go bridge proxies external API requests and model downloads, bypassing Cloudflare/CORS origin blocks seamlessly.
- **Bilingual Timeline Display**: View original lyrics and romanization simultaneously directly on the word blocks.

## How it works

1. **Import** an audio file (MP3, WAV, M4A, OGG, FLAC) or paste a YouTube link
2. **Edit** the lyrics, assign singers, and add background vocals
3. **Sync** by tapping along with the music, or by dragging word blocks on the Timeline
4. **Export** TTML, publish to Unison, or keep working later from your projects library

Your work saves automatically as you go. Audio files you load stay on your machine.

## Features

### Syncing

- Tap-to-sync: press Space in time with the music to stamp each word, or hold to stretch it. Works with touch too.
- Timeline editor: a DAW-style view with draggable word blocks on a waveform, multi-select, and proportional stretch.
- Snapping to neighboring words, the playhead, your own markers, and detected vocal onsets.
- Syllable splitting, so each part of a word gets its own timing.
- Linked groups for repeated sections like choruses. Edit one instance and the others follow, timing included.
- Vocal separation that isolates the vocal stem in the browser, so you can sync against the voice alone.
- HubertFA auto-alignment for automatic word timing from tapped line timing (English, Japanese, Chinese).

### Unison Ecosystem

- **Official Unison Integration**: Search lyrics created by the community, view wanted songs, and manage your published synced lyrics directly inside the app.
- Search by artist, title, or exact ISRC.
- One-click publishing to Unison with authentication and review status tracking.

### Audio Tools

- **Vocal Separation**: Mel-Band RoFormer (high-quality) and HTDemucs v4, running in-browser/desktop via ONNX Runtime Web with WebGPU acceleration and automatic CPU fallback.
- **Pitch Tracking**: Swift-F0 neural pitch estimation displayed alongside your waveform.
- **Beat & Tempo Detection**: Beat-This neural beat grid alignment.
- **Spectrum & Spectrogram**: Switch between native tile-cached Spectrum, classic waveform, or high-frame-rate Spectrogram.
- **Smooth Audio Scrubbing**: Time-stretched scrubbing powered by Signalsmith Stretch with classic playback option.

### Lyrics & Import / Export

- Multiple singers, each with their own color badge, plus background vocals exported with TTML `x-bg`.
- Automatic and manual translations / romanizations with pronunciation protection.
- Import from `.ttml`, `.lrc`, `.srt`, `.qrc`, and `.txt` files.
- Export standardized TTML 1 (W3C subset) compatible with Apple Music and Better Lyrics players.
- Built-in format converters between TTML, LRC, SRT, and QRC.

---

## Quick Start

### Download Desktop App (Windows)

1. Go to the [Latest Release](https://github.com/noobpro45/modified-composer/releases/latest).
2. Download `composer-windows-x64.zip`.
3. Extract and run `composer.exe`. No installation required!

### Running Web / Dev Build Locally

Prerequisites: Node 24 and pnpm 10.

```bash
# Clone the repository
git clone https://github.com/noobpro45/modified-composer.git
cd modified-composer

# Install dependencies
pnpm install

# Start local dev server (Web)
pnpm dev

# Run verification checks
pnpm typecheck
pnpm test
```

### Building Desktop App (Wails)

Prerequisites: Go 1.22+ and Wails CLI (`go install github.com/wailsapp/wails/v2/cmd/wails@latest`).

```bash
# Run desktop dev mode
wails dev

# Build standalone Windows executable
wails build -platform windows/amd64
```

Output binary is generated at `build/bin/composer.exe`.

---

## TTML Standards

Composer outputs a subset of **TTML 1** ([W3C Recommendation, Nov 2018](https://www.w3.org/TR/2018/REC-ttml1-20181108/)). Word-span times are absolute, timestamps omit the zero hours field, and linked groups use non-conflicting foreign namespace attributes (`itunes:key`, `composer:*`).

---

## Upstream & Credits

This project is a fork of [Composer](https://github.com/better-lyrics/composer), created and maintained by [@boidushya](https://github.com/boidushya) for the [Better Lyrics](https://betterlyrics.org) ecosystem.

- Upstream Repository: [better-lyrics/composer](https://github.com/better-lyrics/composer)
- Licensed under [AGPL-3.0](LICENSE).
