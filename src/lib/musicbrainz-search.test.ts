import { resetMusicBrainzQueue } from "@/lib/musicbrainz-client";
import { lookupRecordingIsrc, searchRecordings } from "@/lib/musicbrainz-search";
import { YOUR_POWER_SEARCH } from "@/test/musicbrainz-search-fixtures";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("searchRecordings", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetMusicBrainzQueue();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe("regressions", () => {
    it("regression: falls back to title and artist when MusicBrainz does not know the ISRC", async () => {
      const requested: string[] = [];
      vi.stubGlobal("fetch", async (url: string) => {
        requested.push(new URL(url).pathname);
        return url.includes("/isrc/") ? json({ error: "Not Found" }, 404) : json(YOUR_POWER_SEARCH);
      });
      const result = searchRecordings({ title: "Your Power", artist: "Billie Eilish", isrc: "ZZZZZ9999999" });
      await vi.runAllTimersAsync();
      await expect(result).resolves.toEqual(YOUR_POWER_SEARCH);
      expect(requested).toEqual(["/ws/2/isrc/ZZZZZ9999999", "/ws/2/recording"]);
    });
  });

  describe("error paths", () => {
    it("still fails on a server error from the ISRC endpoint", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.stubGlobal("fetch", async () => json({}, 500));
      const assertion = expect(
        searchRecordings({ title: "Your Power", artist: "Billie Eilish", isrc: "ZZZZZ9999999" }),
      ).rejects.toThrow("500");
      await vi.runAllTimersAsync();
      await assertion;
    });
  });
});

describe("lookupRecordingIsrc", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetMusicBrainzQueue();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("returns null when title is empty", async () => {
    const isrc = await lookupRecordingIsrc({ title: "   " });
    expect(isrc).toBeNull();
  });

  it("returns ISRC found from title and artist query", async () => {
    vi.stubGlobal("fetch", async () =>
      json({
        recordings: [
          {
            id: "rec-1",
            title: "Your Power",
            score: 100,
            isrcs: ["USUM72104782"],
          },
        ],
      }),
    );

    const promise = lookupRecordingIsrc({ title: "Your Power", artist: "Billie Eilish" });
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe("USUM72104782");
  });

  it("falls back to title-only search when title + artist yields no matches", async () => {
    const urls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      urls.push(url);
      if (url.includes("artist")) {
        return json({ recordings: [] });
      }
      return json({
        recordings: [
          {
            id: "rec-fallback",
            title: "あの日のままのぼくら",
            score: 100,
            isrcs: ["JPCO02340920"],
          },
        ],
      });
    });

    const promise = lookupRecordingIsrc({
      title: "あの日のままのぼくら",
      artist: "AQUA (CV: Sora Amamiya)",
    });
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe("JPCO02340920");
    expect(urls.length).toBe(2);
  });

  it("regression: splits candidate titles when full title includes romanized subtitle or video tags", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      // Full title with subtitle returns 0
      if (url.includes("Chiisana")) {
        return json({ recordings: [] });
      }
      // Candidate part "ちいさな冒険者" matches
      if (url.includes(encodeURIComponent('"ちいさな冒険者"'))) {
        return json({
          recordings: [
            {
              id: "rec-chiisana",
              title: "ちいさな冒険者",
              score: 100,
              isrcs: ["JPJ901605740"],
            },
          ],
        });
      }
      return json({ recordings: [] });
    });

    const promise = lookupRecordingIsrc({
      title: "ちいさな冒険者 - Chiisana Boukensha",
    });
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe("JPJ901605740");
  });

  it("fetches recording details when search recordings lack isrcs field", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.includes("/ws/2/recording?")) {
        return json({
          recordings: [
            {
              id: "rec-detail-needed",
              title: "Bohemian Rhapsody",
              score: 100,
            },
          ],
        });
      }
      return json({
        id: "rec-detail-needed",
        title: "Bohemian Rhapsody",
        isrcs: ["GBUM71029604"],
      });
    });

    const promise = lookupRecordingIsrc({ title: "Bohemian Rhapsody", artist: "Queen" });
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe("GBUM71029604");
  });

  it("returns null when no recordings or ISRCs exist", async () => {
    vi.stubGlobal("fetch", async () => json({ recordings: [] }));
    const promise = lookupRecordingIsrc({ title: "Unknown Song That Does Not Exist" });
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBeNull();
  });
});
