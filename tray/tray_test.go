package tray

import (
	"bytes"
	"context"

	"testing"
	"time"

	"github.com/better-lyrics/composer-bridge/internal/bridgestate"
	"github.com/better-lyrics/composer-bridge/tray/icons"
)

func TestNewReturnsNonNilController(t *testing.T) {
	c := New()
	if c == nil {
		t.Fatal("New() returned nil")
	}
}

func TestControllerStartsWithUnsetContext(t *testing.T) {
	c := New()
	if c.HasContext() {
		t.Error("Controller should not have a context before BindContext")
	}
}

func TestBindContextStoresTheContext(t *testing.T) {
	c := New()
	c.BindContext(context.Background())
	if !c.HasContext() {
		t.Error("HasContext should be true after BindContext with a real ctx")
	}
}

func TestContextReturnsBoundContext(t *testing.T) {
	c := New()
	parent := context.WithValue(context.Background(), ctxSentinel{}, "ok")
	c.BindContext(parent)
	got := c.Context()
	if got == nil {
		t.Fatal("Context() returned nil after BindContext")
	}
	if got.Value(ctxSentinel{}) != "ok" {
		t.Errorf("Context() did not preserve bound value")
	}
}

type ctxSentinel struct{}

func TestPickTrayIcon_PicksVariantPerState(t *testing.T) {
	cases := []struct {
		name string
		s    bridgestate.State
		want []byte
		mac  bool
	}{
		{"mac stopped", bridgestate.State{Server: bridgestate.ServerStopped}, icons.MacStopped, true},
		{"mac running idle", bridgestate.State{Server: bridgestate.ServerRunning, Download: bridgestate.DownloadIdle}, icons.MacIdle, true},
		{"mac running downloading", bridgestate.State{Server: bridgestate.ServerRunning, Download: bridgestate.DownloadActive, DownloadVideoID: "abc"}, icons.MacDownloading, true},
		{"mac running with last error", bridgestate.State{Server: bridgestate.ServerRunning, Download: bridgestate.DownloadIdle, LastError: "yt-dlp exit 1"}, icons.MacError, true},
		{"mac starting (dim)", bridgestate.State{Server: bridgestate.ServerStarting}, icons.MacStopped, true},
		{"mac stopping (dim)", bridgestate.State{Server: bridgestate.ServerStopping}, icons.MacStopped, true},
		{"mac downloading wins over last error", bridgestate.State{Server: bridgestate.ServerRunning, Download: bridgestate.DownloadActive, LastError: "old err"}, icons.MacDownloading, true},
		{"mac update pending", bridgestate.State{Server: bridgestate.ServerRunning, Download: bridgestate.DownloadIdle, UpdatePending: true}, icons.MacUpdate, true},
		{"mac downloading wins over update pending", bridgestate.State{Server: bridgestate.ServerRunning, Download: bridgestate.DownloadActive, UpdatePending: true}, icons.MacDownloading, true},
		{"mac error wins over update pending", bridgestate.State{Server: bridgestate.ServerRunning, Download: bridgestate.DownloadIdle, LastError: "boom", UpdatePending: true}, icons.MacError, true},
		{"default stopped", bridgestate.State{Server: bridgestate.ServerStopped}, icons.DefaultStopped, false},
		{"default running idle", bridgestate.State{Server: bridgestate.ServerRunning, Download: bridgestate.DownloadIdle}, icons.DefaultIdle, false},
		{"default downloading", bridgestate.State{Server: bridgestate.ServerRunning, Download: bridgestate.DownloadActive}, icons.DefaultDownloading, false},
		{"default running with last error", bridgestate.State{Server: bridgestate.ServerRunning, Download: bridgestate.DownloadIdle, LastError: "yt-dlp exit 1"}, icons.DefaultError, false},
		{"default update pending", bridgestate.State{Server: bridgestate.ServerRunning, Download: bridgestate.DownloadIdle, UpdatePending: true}, icons.DefaultUpdate, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			tmpl, reg := pickTrayIcon(tc.s, tc.mac)
			got := reg
			if tc.mac {
				got = tmpl
			}
			if !bytes.Equal(got, tc.want) {
				t.Errorf("variant mismatch for %s", tc.name)
			}
		})
	}
}


func TestMaybeStartPulse_StopsWhenStateLeavesActive(t *testing.T) {
	prevInterval := pulseInterval
	pulseInterval = 2 * time.Millisecond
	t.Cleanup(func() { pulseInterval = prevInterval })

	c := New()
	holder := bridgestate.NewHolder()
	c.SetState(holder)
	holder.SetServer(bridgestate.ServerRunning)
	holder.StartDownload("vid")

	c.maybeStartPulse(holder.Snapshot(), false)
	if !c.pulseRunning.Load() {
		t.Fatal("pulseRunning should be true after maybeStartPulse with active state")
	}

	holder.EndDownload("")

	deadline := time.Now().Add(500 * time.Millisecond)
	for time.Now().Before(deadline) {
		if !c.pulseRunning.Load() {
			return
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatal("pulseRunning did not flip back to false within 500ms after state left DownloadActive")
}

func TestMaybeStartPulse_IsIdempotentForActiveState(t *testing.T) {
	prevInterval := pulseInterval
	pulseInterval = 2 * time.Millisecond
	t.Cleanup(func() { pulseInterval = prevInterval })

	c := New()
	holder := bridgestate.NewHolder()
	c.SetState(holder)
	holder.SetServer(bridgestate.ServerRunning)
	holder.StartDownload("vid")
	t.Cleanup(func() {
		holder.EndDownload("")
		deadline := time.Now().Add(500 * time.Millisecond)
		for time.Now().Before(deadline) && c.pulseRunning.Load() {
			time.Sleep(5 * time.Millisecond)
		}
	})

	c.maybeStartPulse(holder.Snapshot(), false)
	c.maybeStartPulse(holder.Snapshot(), false)
	c.maybeStartPulse(holder.Snapshot(), false)
	if !c.pulseRunning.Load() {
		t.Fatal("pulseRunning should remain true after repeated maybeStartPulse calls")
	}
}

func TestRenderStateTitle(t *testing.T) {
	cases := []struct {
		name string
		s    bridgestate.State
		want string
	}{
		{"idle", bridgestate.State{Server: bridgestate.ServerRunning, Download: bridgestate.DownloadIdle}, "Idle"},
		{"downloading", bridgestate.State{Server: bridgestate.ServerRunning, Download: bridgestate.DownloadActive, DownloadVideoID: "abc"}, "Downloading abc"},
		{"stopped", bridgestate.State{Server: bridgestate.ServerStopped}, "Server stopped"},
		{"starting", bridgestate.State{Server: bridgestate.ServerStarting}, "Starting..."},
		{"stopping", bridgestate.State{Server: bridgestate.ServerStopping}, "Stopping..."},
		{"error", bridgestate.State{Server: bridgestate.ServerRunning, Download: bridgestate.DownloadIdle, LastError: "err"}, "Error"},
		{"update pending", bridgestate.State{Server: bridgestate.ServerRunning, Download: bridgestate.DownloadIdle, UpdatePending: true}, "Update pending"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := renderStateTitle(tc.s); got != tc.want {
				t.Errorf("got %q, want %q", got, tc.want)
			}
		})
	}
}
