package main

import (
	"bytes"
	"net/http"
	"path/filepath"
	goruntime "runtime"
	"strconv"
	"strings"
)

// htmlBufferingWriter captures the response from the inner asset handler so
// platformInjectMiddleware can rewrite the body before flushing to the real
// ResponseWriter. We don't use httptest.ResponseRecorder because that package
// is conceptually test-only and importing it in main feels off.
type htmlBufferingWriter struct {
	header http.Header
	body   bytes.Buffer
	status int
}

func (w *htmlBufferingWriter) Header() http.Header {
	if w.header == nil {
		w.header = make(http.Header)
	}
	return w.header
}

func (w *htmlBufferingWriter) Write(b []byte) (int, error) {
	if w.status == 0 {
		w.status = http.StatusOK
	}
	return w.body.Write(b)
}

func (w *htmlBufferingWriter) WriteHeader(status int) {
	w.status = status
}

func isSPARoute(path string) bool {
	if path == "/" || path == "/index.html" {
		return true
	}
	if strings.HasPrefix(path, "/wails/") ||
		strings.HasPrefix(path, "/audio/") ||
		strings.HasPrefix(path, "/thumb/") ||
		strings.HasPrefix(path, "/debug/") ||
		strings.HasPrefix(path, "/boidu-lyrics/") ||
		path == "/health" ||
		path == "/import" {
		return false
	}
	// Static assets with extensions (.js, .css, .wasm, .png, etc.) pass through
	if filepath.Ext(path) != "" {
		return false
	}
	return true
}

// platformInjectMiddleware stamps the served index.html with `window.__platform`
// set to Go's `runtime.GOOS`. The React app reads this synchronously, before
// any other JS runs, to render correct window-chrome insets on the first
// paint (the macOS title-bar inset is wasted space on Windows and Linux).
func platformInjectMiddleware(next http.Handler) http.Handler {
	script := []byte(`<script>window.__platform=` + strconv.Quote(goruntime.GOOS) + `;</script>`)
	closingHead := []byte("</head>")
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if isSPARoute(r.URL.Path) {
			r.URL.Path = "/"
		}
		if r.URL.Path != "/" && r.URL.Path != "/index.html" && !strings.HasSuffix(r.URL.Path, ".html") {
			next.ServeHTTP(w, r)
			return
		}

		buf := &htmlBufferingWriter{}
		next.ServeHTTP(buf, r)

		body := bytes.Replace(buf.body.Bytes(), closingHead, append(script, closingHead...), 1)
		for k, vv := range buf.Header() {
			for _, v := range vv {
				w.Header().Add(k, v)
			}
		}
		w.Header().Set("Content-Length", strconv.Itoa(len(body)))
		status := buf.status
		if status == 0 {
			status = http.StatusOK
		}
		w.WriteHeader(status)
		_, _ = w.Write(body)
	})
}

