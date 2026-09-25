package ytdlp

import (
	"archive/zip"
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

// ffmpegLatestAPI is the GitHub Releases endpoint for BtbN's static ffmpeg builds.
// Declared as var so tests can redirect it at an httptest.Server.URL.
var ffmpegLatestAPI = "https://api.github.com/repos/BtbN/FFmpeg-Builds/releases/latest"

// ffmpegFetchTimeout bounds the per-attempt HTTP read. ffmpeg zips are ~50-120 MiB.
const ffmpegFetchTimeout = 10 * time.Minute

// ffmpegBinSubdir is the dir under dataDir where the bundled ffmpeg binary lives.
const ffmpegBinSubdir = "bin"

// FfmpegBinDir returns the managed ffmpeg binary directory for dataDir.
func FfmpegBinDir(dataDir string) string {
	return filepath.Join(dataDir, ffmpegBinSubdir)
}

func ffmpegBinaryName() string {
	if runtime.GOOS == "windows" {
		return "ffmpeg.exe"
	}
	return "ffmpeg"
}

func ffmpegBinaryPath(dataDir string) string {
	return filepath.Join(FfmpegBinDir(dataDir), ffmpegBinaryName())
}

// resolveFfmpegAssetName returns the ffmpeg release asset name for a given OS/arch.
// BtbN publishes GPL-essentials static builds; this variant includes full codec
// support (libmp3lame, libwebp decoder, etc.) needed for audio conversion and
// thumbnail embedding.
func resolveFfmpegAssetName(goos, goarch string) (string, error) {
	switch goos {
	case "windows":
		switch goarch {
		case "amd64":
			return "ffmpeg-master-latest-win64-gpl-essentials.zip", nil
		case "arm64":
			return "ffmpeg-master-latest-winarm64-gpl-essentials.zip", nil
		}
	case "linux":
		switch goarch {
		case "amd64":
			return "ffmpeg-master-latest-linux64-gpl-essentials.tar.xz", nil
		case "arm64":
			return "ffmpeg-master-latest-linuxarm64-gpl-essentials.tar.xz", nil
		}
	case "darwin":
		// BtbN does not publish macOS builds; ffmpeg is widely available
		// via Homebrew, so we skip auto-install on macOS.
		return "", fmt.Errorf("auto-install not supported on macOS; install ffmpeg via Homebrew")
	}
	return "", fmt.Errorf("no ffmpeg build for %s/%s", goos, goarch)
}

// EnsureFfmpeg installs ffmpeg into <dataDir>/bin on first run. Subsequent
// calls are no-ops. Returns the path to the ffmpeg binary. Errors are
// non-fatal: missing ffmpeg only skips metadata embedding, not the download.
func EnsureFfmpeg(dataDir string) (string, error) {
	binPath := ffmpegBinaryPath(dataDir)
	if _, err := os.Stat(binPath); err == nil {
		return binPath, nil // already installed
	}
	if _, err := resolveFfmpegAssetName(runtime.GOOS, runtime.GOARCH); err != nil {
		// Unsupported platform (e.g. macOS): log info and continue silently.
		slog.Info("ffmpeg auto-install skipped", "reason", err)
		return "", nil
	}
	if err := os.MkdirAll(FfmpegBinDir(dataDir), 0o755); err != nil {
		return "", fmt.Errorf("mkdir ffmpeg bin dir: %w", err)
	}
	slog.Info("ffmpeg not found, downloading", "path", binPath)
	if err := downloadLatestFfmpeg(context.Background(), binPath); err != nil {
		return "", fmt.Errorf("download ffmpeg: %w", err)
	}
	return binPath, nil
}

func downloadLatestFfmpeg(ctx context.Context, binPath string) error {
	assetName, err := resolveFfmpegAssetName(runtime.GOOS, runtime.GOARCH)
	if err != nil {
		return err
	}
	rel, err := fetchLatestRelease(ctx, ffmpegLatestAPI)
	if err != nil {
		return err
	}
	var assetURL string
	for _, a := range rel.Assets {
		if a.Name == assetName {
			assetURL = a.DownloadURL
			break
		}
	}
	if assetURL == "" {
		return fmt.Errorf("asset %q not found in ffmpeg release %s", assetName, rel.TagName)
	}
	if err := downloadFfmpegAsset(ctx, assetURL, binPath); err != nil {
		return err
	}
	writeVersionSidecar(binPath, rel.TagName)
	slog.Info("ffmpeg installed", "version", rel.TagName, "path", binPath)
	return nil
}

func downloadFfmpegAsset(ctx context.Context, assetURL, binPath string) error {
	return withRetry(ctx, func() error {
		reqCtx, cancel := context.WithTimeout(ctx, ffmpegFetchTimeout)
		defer cancel()
		req, _ := http.NewRequestWithContext(reqCtx, http.MethodGet, assetURL, nil)
		req.Header.Set("User-Agent", "composer-bridge/"+BridgeVersion)
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			return err
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			return &retryableHTTPError{status: resp.StatusCode}
		}
		var buf bytes.Buffer
		if _, err := io.Copy(&buf, resp.Body); err != nil {
			return err
		}
		return extractFfmpegBinary(buf.Bytes(), binPath)
	})
}

// extractFfmpegBinary scans the release zip for the ffmpeg binary
// (located at e.g. ffmpeg-master-latest-win64-lgpl-essentials/bin/ffmpeg.exe)
// and installs it atomically at binPath.
func extractFfmpegBinary(zipBytes []byte, binPath string) error {
	zr, err := zip.NewReader(bytes.NewReader(zipBytes), int64(len(zipBytes)))
	if err != nil {
		return fmt.Errorf("open ffmpeg zip: %w", err)
	}
	want := ffmpegBinaryName()
	for _, f := range zr.File {
		// Match the binary anywhere inside the zip (e.g. .../bin/ffmpeg.exe)
		if filepath.Base(f.Name) != want {
			continue
		}
		// Make sure it's actually inside a "bin/" directory, not ffprobe/ffplay
		if !strings.Contains(f.Name, "/bin/") && !strings.Contains(f.Name, `\bin\`) {
			continue
		}
		rc, err := f.Open()
		if err != nil {
			return fmt.Errorf("open zip entry %s: %w", f.Name, err)
		}
		err = installBinary(binPath, rc)
		_ = rc.Close()
		return err
	}
	return errors.New("ffmpeg binary not found in release zip")
}
