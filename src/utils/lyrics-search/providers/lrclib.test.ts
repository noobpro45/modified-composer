import { lrclibProvider } from "@/utils/lyrics-search/providers/lrclib";
import { LyricsSearchError } from "@/utils/lyrics-search/types";
import { afterEach, describe, expect, it, vi } from "vitest";

// -- Tests --------------------------------------------------------------------

describe("lrclibProvider", () => {
  // -- Metadata --------------------------------------------------------------

  describe("metadata", () => {
    it("identifies as lrclib with the LRCLib source label", () => {
      expect(lrclibProvider.name).toBe("lrclib");
      expect(lrclibProvider.sourceLabel).toBe("LRCLib");
    });
  });

  // -- canSearch -------------------------------------------------------------

  describe("canSearch", () => {
    it("returns false when track is undefined", () => {
      expect(lrclibProvider.canSearch({})).toBe(false);
    });

    it("returns false when track is an empty string", () => {
      expect(lrclibProvider.canSearch({ track: "" })).toBe(false);
    });

    it("returns false when track is whitespace only", () => {
      expect(lrclibProvider.canSearch({ track: "   \t  " })).toBe(false);
    });

    it("returns true for any non-empty track", () => {
      expect(lrclibProvider.canSearch({ track: "Bohemian Rhapsody" })).toBe(true);
    });

    it("returns true when only track is supplied (artist/album/duration optional)", () => {
      expect(lrclibProvider.canSearch({ track: "Imagine" })).toBe(true);
    });
  });

  // -- search: abort handling ------------------------------------------------

  describe("abort handling", () => {
    it("resolves to [] when called with a pre-aborted signal", async () => {
      const controller = new AbortController();
      controller.abort();
      const results = await lrclibProvider.search({ track: "Bohemian Rhapsody", artist: "Queen" }, controller.signal);
      expect(results).toEqual([]);
    });
  });

  // -- LyricsSearchError export contract -------------------------------------

  describe("LyricsSearchError contract", () => {
    it("constructs a LyricsSearchError with provider 'lrclib'", () => {
      const error = new LyricsSearchError("lrclib", "boom");
      expect(error.provider).toBe("lrclib");
      expect(error.message).toBe("boom");
      expect(error.name).toBe("LyricsSearchError");
    });
  });
});

// -- Duration mapping (stubbed transport, never reaches the network) ----------

describe("lrclibProvider duration mapping", () => {
  const SEARCH_HIT = {
    id: 3396226,
    trackName: "Bohemian Rhapsody",
    artistName: "Queen",
    albumName: "A Night at the Opera",
    instrumental: false,
    plainLyrics: "Is this the real life?",
    syncedLyrics: "[00:00.00] Is this the real life?",
  } as const;

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubSearchBody(body: unknown): void {
    vi.stubGlobal(
      "fetch",
      async (): Promise<Response> =>
        new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } }),
    );
  }

  async function searchWithDuration(hit: Record<string, unknown>): Promise<number | undefined> {
    stubSearchBody([hit]);
    const results = await lrclibProvider.search({ track: "Bohemian Rhapsody" }, new AbortController().signal);
    expect(results).toHaveLength(1);
    return results[0].durationSec;
  }

  it("rounds a usable duration to whole seconds", async () => {
    expect(await searchWithDuration({ ...SEARCH_HIT, duration: 354.6 })).toBe(355);
  });

  it("reports no duration when the response omits the field", async () => {
    expect(await searchWithDuration({ ...SEARCH_HIT })).toBeUndefined();
  });

  it("reports no duration when the response sends null", async () => {
    expect(await searchWithDuration({ ...SEARCH_HIT, duration: null })).toBeUndefined();
  });

  it("reports no duration when the response sends a non-numeric value", async () => {
    expect(await searchWithDuration({ ...SEARCH_HIT, duration: "355" })).toBeUndefined();
    expect(await searchWithDuration({ ...SEARCH_HIT, duration: 0 })).toBeUndefined();
  });
});

// -- 4xx/5xx status handling (stubbed transport) ------------------------------

describe("lrclibProvider 4xx/5xx handling", () => {
  const QUERY = { track: "Bohemian Rhapsody", artist: "Queen" } as const;

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function stubStatus(status: number): void {
    vi.stubGlobal("fetch", async (): Promise<Response> => new Response("body", { status }));
  }

  it.each([400, 401, 403, 422, 429, 500, 503])("returns [] without throwing on %i", async (status) => {
    stubStatus(status);
    const results = await lrclibProvider.search(QUERY, new AbortController().signal);
    expect(results).toEqual([]);
  });

  it("logs a warning on a non-404 4xx instead of surfacing an error", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    stubStatus(403);
    await lrclibProvider.search(QUERY, new AbortController().signal);
    expect(warn).toHaveBeenCalled();
  });

  it("stays silent on a plain 404 miss", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    stubStatus(404);
    const results = await lrclibProvider.search(QUERY, new AbortController().signal);
    expect(results).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
  });

  it("returns [] and warns on 5xx instead of throwing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    stubStatus(503);
    const results = await lrclibProvider.search(QUERY, new AbortController().signal);
    expect(results).toEqual([]);
    expect(warn).toHaveBeenCalled();
  });
});

// -- Regression: cascading search relaxation -----------------------------------

describe("regression: cascading search relaxation", () => {
  const HIT = {
    id: 12345,
    trackName: "あの日のままのぼくら",
    artistName: "Aqua",
    albumName: "Anime Song-Box",
    duration: 190,
    instrumental: false,
    plainLyrics: "lyrics",
    syncedLyrics: "[00:10.00] lyrics",
  };

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("regression: falls back to relaxed search when strict query with album and duration yields no results", async () => {
    const urlsRequested: string[] = [];
    vi.stubGlobal("fetch", async (input: RequestInfo | URL): Promise<Response> => {
      const urlStr = String(input);
      urlsRequested.push(urlStr);
      if (urlStr.includes("duration=199")) {
        return new Response(JSON.stringify([]), { headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify([HIT]), { headers: { "content-type": "application/json" } });
    });

    const results = await lrclibProvider.search(
      {
        track: "あの日のままのぼくら",
        artist: "Aqua",
        album: "Different Album",
        durationSec: 199,
      },
      new AbortController().signal,
    );

    expect(results).toHaveLength(1);
    expect(results[0].track).toBe("あの日のままのぼくら");
    expect(urlsRequested.some((u) => !u.includes("duration="))).toBe(true);
  });

  it("regression: falls back to cleaned artist when voice-actor artist tags yield no results", async () => {
    const urlsRequested: string[] = [];
    vi.stubGlobal("fetch", async (input: RequestInfo | URL): Promise<Response> => {
      const urlStr = String(input);
      urlsRequested.push(urlStr);
      if (urlStr.includes("CV%3A") || urlStr.includes("CV:")) {
        return new Response(JSON.stringify([]), { headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify([HIT]), { headers: { "content-type": "application/json" } });
    });

    const results = await lrclibProvider.search(
      {
        track: "あの日のままのぼくら",
        artist: "Aqua (CV: Sora Amamiya), Megumin (CV: Rie Takahashi) & Darkness (CV: Ai Kayano)",
      },
      new AbortController().signal,
    );

    expect(results).toHaveLength(1);
    expect(results[0].track).toBe("あの日のままのぼくら");
    expect(urlsRequested.some((u) => u.includes("artist_name=Aqua"))).toBe(true);
  });
});

// -- Regression: cascading search relaxation -----------------------------------

describe("regression: cascading search relaxation", () => {
  const HIT = {
    id: 12345,
    trackName: "あの日のままのぼくら",
    artistName: "Aqua",
    albumName: "Anime Song-Box",
    duration: 190,
    instrumental: false,
    plainLyrics: "lyrics",
    syncedLyrics: "[00:10.00] lyrics",
  };

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("regression: falls back to relaxed search when strict query with album and duration yields no results", async () => {
    const urlsRequested: string[] = [];
    vi.stubGlobal("fetch", async (input: RequestInfo | URL): Promise<Response> => {
      const urlStr = String(input);
      urlsRequested.push(urlStr);
      if (urlStr.includes("duration=199")) {
        return new Response(JSON.stringify([]), { headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify([HIT]), { headers: { "content-type": "application/json" } });
    });

    const results = await lrclibProvider.search(
      {
        track: "あの日のままのぼくら",
        artist: "Aqua",
        album: "Different Album",
        durationSec: 199,
      },
      new AbortController().signal,
    );

    expect(results).toHaveLength(1);
    expect(results[0].track).toBe("あの日のままのぼくら");
    expect(urlsRequested.some((u) => !u.includes("duration="))).toBe(true);
  });

  it("regression: falls back to cleaned artist when voice-actor artist tags yield no results", async () => {
    const urlsRequested: string[] = [];
    vi.stubGlobal("fetch", async (input: RequestInfo | URL): Promise<Response> => {
      const urlStr = String(input);
      urlsRequested.push(urlStr);
      if (urlStr.includes("CV%3A") || urlStr.includes("CV:")) {
        return new Response(JSON.stringify([]), { headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify([HIT]), { headers: { "content-type": "application/json" } });
    });

    const results = await lrclibProvider.search(
      {
        track: "あの日のままのぼくら",
        artist: "Aqua (CV: Sora Amamiya), Megumin (CV: Rie Takahashi) & Darkness (CV: Ai Kayano)",
      },
      new AbortController().signal,
    );

    expect(results).toHaveLength(1);
    expect(results[0].track).toBe("あの日のままのぼくら");
    expect(urlsRequested.some((u) => u.includes("artist_name=Aqua"))).toBe(true);
  });
});
