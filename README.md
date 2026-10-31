<p align="center">
  <img src="public/logo.svg" width="90" height="90" alt="Composer Logo" />
</p>

<h1 align="center">Composer (Modified Edition)</h1>

<p align="center">
  <b>A fast, beautiful, and DAW-grade editor for word-synced lyrics (TTML, LRC, QRC, SRT).</b><br/>
  Enhanced with a native Windows desktop app, Unison provider, smart syllable merging, and timeline controls.
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
  <a href="#key-enhancements"><b>Key Enhancements</b></a> •
  <a href="#core-features"><b>Core Features</b></a> •
  <a href="#quick-start"><b>Quick Start</b></a> •
  <a href="#upstream--credits"><b>Credits</b></a>
</p>

<p align="center">
  <img src="public/og-image.png" alt="Composer Preview Banner" width="90%" style="border-radius: 8px;" />
</p>

---

## Key Enhancements

This repository is an enhanced distribution of [Better Lyrics Composer](https://github.com/better-lyrics/composer), introducing native desktop packaging and workflow improvements for lyrics syncers:

### 💻 Native Windows Desktop Application
* Built as a high-performance, standalone Windows x64 binary with [Wails v2](https://wails.io).
* Runs locally with hardware-accelerated WebGPU/DirectX rendering, free of browser memory and storage limitations.
* Integrated desktop window controls (Minimize, Maximize, Close) elevated above modals and preview popups.

### 🔍 Extended Lyrics Search (Unison Provider)
* Added the **Unison** provider alongside LRCLib and Binimum for searching synced lyrics.
* Supports exact **ISRC** queries and standard Track / Artist searches to automatically find matching synced lyrics.

### 🗣️ Smart Word Merge & Pronunciation Protection
* Merging words or split syllables preserves existing phonetic transliterations and pronunciations without corrupting custom edits.
* Line transliterations updated manually are tagged with `manual` origin to prevent accidental overwrites from Google Auto-Refresh.

### 🎛️ Timeline Zoom & Smooth Audio Scrubbing
* Predictable timeline zoom stepping (20% intervals) anchored precisely around the playhead and cursor.
* Ultra-smooth time-stretched audio scrubbing powered by [Signalsmith Stretch](https://signalsmith-audio.co.uk/code/stretch/), with a toggle for classic snippet playback.

### 🌐 Bilingual Timeline Display
* View original text, romanization / transliteration, or both simultaneously directly on the timeline word blocks.
* Optimized for syncing international songs (Japanese, Korean, Chinese, etc.).

---

## Core Features

Composer provides a linear, intuitive path: **Import → Edit → Sync → Export**.

### 1. Syncing
* **Tap-to-sync**: Tap <kbd>Space</kbd> in time with the music to stamp words, or hold to stretch syllable timing.
* **DAW-Style Timeline**: Drag word blocks directly on the audio waveform, multi-select, and proportionally stretch regions.
* **Snapping**: Snap to neighboring words, the playhead, custom markers, and detected vocal onsets.
* **Syllable Splitting**: Split words into individual syllables so every phoneme gets precise timing.
* **Linked Groups**: Synchronize repeated sections (e.g. choruses). Edit timing or text on one instance and all other instances update automatically.
* **In-Browser Vocal Separation**: Extract vocal stems with the HTDemucs AI model to sync against vocals cleanly.

### 2. Lyrics & Roles
* Multiple singers with dedicated color badges and custom vocal agent roles.
* Background vocals exported with the standard TTML `x-bg` role.
* Automatic translations and romanizations via Google Language Provider.
* Integrated Lyric Best Practices linter to catch common timing and formatting issues.

### 3. Import & Export
* Import lyrics from `.ttml`, `.lrc`, `.srt`, `.qrc`, and `.txt` files.
* Export standardized, publication-ready TTML 1 (W3C subset) compatible with Apple Music and Better Lyrics players.
* Built-in format converters between TTML, LRC, SRT, and QRC.
* Self-contained `.composer` project files and backup bundles.

---

## Quick Start

### Download Desktop App (Windows)
1. Go to the [Latest Release](https://github.com/noobpro45/modified-composer/releases/latest).
2. Download `composer-windows-x64.zip`.
3. Extract and launch `composer.exe`. No installation required!

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

# Build production web bundle
pnpm build
```

### Building Desktop App (Wails)

Prerequisites: Go 1.22+ and Wails CLI.

```bash
# Run desktop dev mode
wails dev

# Build standalone Windows executable
wails build -platform windows/amd64
```

Output binary is located at `build/bin/composer.exe`.

---

## TTML Standards

Composer outputs a subset of **TTML 1** ([W3C Recommendation, Nov 2018](https://www.w3.org/TR/2018/REC-ttml1-20181108/)). Word-span times are absolute, timestamps omit the zero hours field, and linked groups use non-conflicting foreign namespace attributes (`itunes:key`, `composer:*`).

---

## Upstream & Credits

This project is a fork of [Composer](https://github.com/better-lyrics/composer), created and maintained by [@boidushya](https://github.com/boidushya) for the [Better Lyrics](https://betterlyrics.org) ecosystem.

* Upstream Repository: [better-lyrics/composer](https://github.com/better-lyrics/composer)
* Licensed under [AGPL-3.0](LICENSE).
