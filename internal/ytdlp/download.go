package ytdlp

import (
	"bytes"
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
)

// FormatSelector maps a user-facing format key (opus / m4a / webm / mp3) to the
// yt-dlp -f expression we hand to the subprocess. Every selector ends in
// `bestaudio/best` so a video with no preferred codec still falls back to
// whatever audio (or audio+video) yt-dlp can produce. Unknown keys behave like
// opus.
//
// The opus chain is the wide one because the bridge's player_client config
// (web_music, android_vr, web_safari) frequently does not expose itag 251
// (WebM-Opus); the only audio-bearing formats those clients return are HLS
// m3u8 (MPEG-TS) plus a single non-HLS mp4 with bundled AAC. So:
//
//  1. itag 251 if available (WebM-Opus, smallest playable)
//  2. any audio-only WebM (covers itag 249/250 / opus-low)
//  3. any audio-only non-HLS format (avoids the MPEG-TS trap)
//  4. any non-HLS format at all (catches videos where only a combined
//     mp4 is exposed; the browser ignores the video track and plays the
//     bundled AAC just fine in an <audio> element)
//  5. bestaudio (last resort: even HLS audio is better than nothing)
//  6. best (would be a combined HLS format; effectively a no-go but
//     keeps the selector total)
//
// MPEG-TS-over-HLS is intentionally pushed to the last two rungs because no
// browser <audio> element can decode video/mp2t natively, so saving it to
// disk would just reproduce the v1.4.x cache-broken state.
func FormatSelector(format string) string {
	switch format {
	case "m4a":
		return "bestaudio[ext=m4a]/bestaudio/best"
	case "webm":
		return "bestaudio[ext=webm]/bestaudio/best"
	case "mp3":
		return "bestaudio/best"
	case "opus", "":
		return "bestaudio[acodec=opus][ext=webm]/bestaudio[ext=webm]/bestaudio[protocol!*=m3u8]/best[protocol!*=m3u8]/bestaudio/best"
	default:
		return "bestaudio[acodec=opus][ext=webm]/bestaudio[ext=webm]/bestaudio[protocol!*=m3u8]/best[protocol!*=m3u8]/bestaudio/best"
	}
}

// FormatExtension is the file extension yt-dlp will produce for a given format key.
func FormatExtension(format string) string {
	switch format {
	case "m4a":
		return "m4a"
	case "webm":
		return "webm"
	case "mp3":
		return "mp3"
	default:
		return "opus"
	}
}

// DownloadToFile runs yt-dlp to fetch audio for videoID using the chosen format
// and writes it to destPath. Returns the resulting file size in bytes. Honors
// ctx cancellation and rejects malformed video IDs before forking. An empty
// cookiesPath omits the --cookies flag. When preferPremium is true, the
// extractor-args chain tries YouTube Music's higher quality tier first.
// dataDir is used to locate the managed ffmpeg binary for metadata embedding;
// pass an empty string to skip the managed-path probe and rely on system PATH.
func DownloadToFile(ctx context.Context, ytdlpPath, videoID, format, destPath, cookiesPath, dataDir string, preferPremium bool) (int64, error) {
	if err := validateVideoID(videoID); err != nil {
		return 0, err
	}
	args := []string{
		"-f", FormatSelector(format),
		"-o", destPath,
		"--no-warnings",
		"--no-playlist",
		"--force-overwrites",
		"--geo-bypass",
		"--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36",
		"--referer", "https://www.youtube.com/",
		"--extractor-args", BuildExtractorArgs(preferPremium),
	}
	if cookiesPath != "" {
		args = append(args, "--cookies", cookiesPath)
	}
	// Embed metadata and thumbnail when ffmpeg is available. Prefer the managed
	// binary installed by bootstrapFfmpeg; fall back to any system ffmpeg on PATH.
	ffmpegPath := ""
	if dataDir != "" {
		managed := ffmpegBinaryPath(dataDir)
		if _, err := os.Stat(managed); err == nil {
			ffmpegPath = managed
		}
	}
	if ffmpegPath == "" {
		ffmpegPath, _ = exec.LookPath(ffmpegBinaryName())
	}
	baseArgs := args
	if ffmpegPath != "" {
		// First attempt: full quality with embedded metadata + cover art.
		// --convert-thumbnails jpg converts YouTube's webp thumbnail to jpeg
		// before embedding so mp3/m4a containers accept it.
		fullArgs := append(append([]string{}, baseArgs...),
			"--ffmpeg-location", ffmpegPath,
			"--extract-audio",
			"--audio-format", format,
			"--audio-quality", "0",
			"--embed-metadata",
			"--convert-thumbnails", "jpg",
			"--embed-thumbnail",
			videoURL(videoID),
		)
		cmd := exec.CommandContext(ctx, ytdlpPath, fullArgs...)
		cmd.WaitDelay = killWaitDelay
		cmd.Env = execEnv()
		var stderr bytes.Buffer
		cmd.Stderr = &stderr
		if err := cmd.Run(); err == nil {
			// Success with thumbnail — stat and return.
			stat, err := os.Stat(destPath)
			if err != nil {
				return 0, fmt.Errorf("stat downloaded file: %w", err)
			}
			return stat.Size(), nil
		}
		// Thumbnail embedding failed (e.g. webp decoder unavailable in this
		// ffmpeg build). Fall through to metadata-only retry.
		slog.Warn("yt-dlp thumbnail embedding failed, retrying without cover art",
			"videoID", videoID, "stderr", stderrTail(&stderr))
		// Clean up any partial output before retry.
		_ = os.Remove(destPath)

		// Second attempt: metadata only, no thumbnail.
		args = append(baseArgs,
			"--ffmpeg-location", ffmpegPath,
			"--extract-audio",
			"--audio-format", format,
			"--audio-quality", "0",
			"--embed-metadata",
			videoURL(videoID),
		)
	} else {
		args = append(args, videoURL(videoID))
	}

	cmd := exec.CommandContext(ctx, ytdlpPath, args...)
	cmd.WaitDelay = killWaitDelay
	cmd.Env = execEnv()
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return 0, fmt.Errorf("yt-dlp download %s: %w (stderr: %s)", videoID, err, stderrTail(&stderr))
	}
	stat, err := os.Stat(destPath)
	if err != nil {
		return 0, fmt.Errorf("stat downloaded file: %w", err)
	}
	return stat.Size(), nil
}
