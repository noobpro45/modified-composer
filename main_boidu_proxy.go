package main

import (
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

var boiduProxyClient = &http.Client{
	Timeout: 30 * time.Second,
}

var composerModelsClient = &http.Client{
	Transport: http.DefaultTransport,
}

func handleBoiduLyricsProxy(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "*")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/boidu-lyrics")
	targetURL := "https://lyrics-api.boidu.dev" + path
	if r.URL.RawQuery != "" {
		targetURL += "?" + r.URL.RawQuery
	}

	proxyReq, err := http.NewRequestWithContext(r.Context(), r.Method, targetURL, r.Body)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	proxyReq.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	proxyReq.Header.Set("Origin", "https://composer.betterlyrics.org")
	proxyReq.Header.Set("Referer", "https://composer.betterlyrics.org/")

	resp, err := boiduProxyClient.Do(proxyReq)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if ct := resp.Header.Get("Content-Type"); ct != "" {
		w.Header().Set("Content-Type", ct)
	}
	w.WriteHeader(resp.StatusCode)
	_, _ = io.Copy(w, resp.Body)
}

func handleComposerModelsProxy(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "*")
	w.Header().Set("Access-Control-Expose-Headers", "Content-Length, Content-Type, Content-Range, ETag")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/composer-models")
	targetURL := "https://models.composer.dacubeking.com" + path
	if r.URL.RawQuery != "" {
		targetURL += "?" + r.URL.RawQuery
	}

	proxyReq, err := http.NewRequestWithContext(r.Context(), r.Method, targetURL, r.Body)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if rangeHeader := r.Header.Get("Range"); rangeHeader != "" {
		proxyReq.Header.Set("Range", rangeHeader)
	}

	proxyReq.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	proxyReq.Header.Set("Origin", "https://composer.betterlyrics.org")
	proxyReq.Header.Set("Referer", "https://composer.betterlyrics.org/")

	resp, err := composerModelsClient.Do(proxyReq)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if cl := resp.Header.Get("Content-Length"); cl != "" {
		w.Header().Set("Content-Length", cl)
	}
	if ct := resp.Header.Get("Content-Type"); ct != "" {
		w.Header().Set("Content-Type", ct)
	}
	if cr := resp.Header.Get("Content-Range"); cr != "" {
		w.Header().Set("Content-Range", cr)
	}
	if et := resp.Header.Get("ETag"); et != "" {
		w.Header().Set("ETag", et)
	}
	if ar := resp.Header.Get("Accept-Ranges"); ar != "" {
		w.Header().Set("Accept-Ranges", ar)
	}

	w.WriteHeader(resp.StatusCode)
	_, _ = io.Copy(w, resp.Body)
}

var imageProxyClient = &http.Client{
	Timeout: 15 * time.Second,
}

func handleProxyImage(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "*")
	w.Header().Set("Cross-Origin-Resource-Policy", "cross-origin")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	targetURL := r.URL.Query().Get("url")
	if targetURL == "" || (!strings.HasPrefix(targetURL, "http://") && !strings.HasPrefix(targetURL, "https://")) {
		http.Error(w, "missing or invalid url", http.StatusBadRequest)
		return
	}

	proxyReq, err := http.NewRequestWithContext(r.Context(), r.Method, targetURL, nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	proxyReq.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	proxyReq.Header.Set("Accept", "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8")

	resp, err := imageProxyClient.Do(proxyReq)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if ct := resp.Header.Get("Content-Type"); ct != "" {
		w.Header().Set("Content-Type", ct)
	}
	if cl := resp.Header.Get("Content-Length"); cl != "" {
		w.Header().Set("Content-Length", cl)
	}
	w.Header().Set("Cache-Control", "public, max-age=86400")
	w.WriteHeader(resp.StatusCode)
	_, _ = io.Copy(w, resp.Body)
}

var (
	googleTranslateMu       sync.Mutex
	googleTranslateLastSend time.Time
)

func waitGoogleTranslatePace(r *http.Request, minInterval time.Duration) bool {
	googleTranslateMu.Lock()
	wait := time.Until(googleTranslateLastSend.Add(minInterval))
	if wait > 0 {
		googleTranslateLastSend = googleTranslateLastSend.Add(minInterval)
	} else {
		googleTranslateLastSend = time.Now()
	}
	googleTranslateMu.Unlock()

	if wait <= 0 {
		return true
	}
	select {
	case <-r.Context().Done():
		return false
	case <-time.After(wait):
		return true
	}
}

func handleGoogleTranslateProxy(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "*")
	w.Header().Set("Cross-Origin-Resource-Policy", "cross-origin")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	targetURL := "https://translate.googleapis.com/translate_a/single"
	if r.URL.RawQuery != "" {
		targetURL += "?" + r.URL.RawQuery
	}

	retryDelays := []time.Duration{0, 1 * time.Second, 2500 * time.Millisecond}
	var resp *http.Response
	var err error
	for attempt, delay := range retryDelays {
		if delay > 0 {
			select {
			case <-r.Context().Done():
				return
			case <-time.After(delay):
			}
		}
		if !waitGoogleTranslatePace(r, 150*time.Millisecond) {
			return
		}
		proxyReq, reqErr := http.NewRequestWithContext(r.Context(), r.Method, targetURL, nil)
		if reqErr != nil {
			http.Error(w, reqErr.Error(), http.StatusInternalServerError)
			return
		}
		proxyReq.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

		resp, err = boiduProxyClient.Do(proxyReq)
		if err == nil && resp.StatusCode != http.StatusTooManyRequests && resp.StatusCode < 500 {
			break
		}
		if resp != nil && attempt < len(retryDelays)-1 {
			resp.Body.Close()
		}
	}

	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if ct := resp.Header.Get("Content-Type"); ct != "" {
		w.Header().Set("Content-Type", ct)
	}
	w.WriteHeader(resp.StatusCode)
	_, _ = io.Copy(w, resp.Body)
}
