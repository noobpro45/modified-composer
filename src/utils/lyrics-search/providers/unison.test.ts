import { unisonProvider } from "@/utils/lyrics-search/providers/unison";
import { afterEach, describe, expect, it, vi } from "vitest";

// -- Constants ----------------------------------------------------------------

const SAMPLE_QUERY = {
  track: "Armed & Dangerous",
  artist: "Alfie Castley",
  durationSec: 160,
  album: "Armed & Dangerous",
};

const SAMPLE_TTML = `<tt xmlns="http://www.w3.org/ns/ttml"><body><div><p begin="0:02.016" end="0:04.356"><span begin="0:02.016" end="0:02.228">You</span> <span begin="0:02.228" end="0:02.654">can't</span></p></div></body></tt>`;

const SAMPLE_LRC = "[00:02.00]First line\n[00:05.00]Second line";

// -- Tests --------------------------------------------------------------------

describe("unisonProvider", () => {
  describe("metadata", () => {
    it("identifies as unison with the Unison source label", () => {
      expect(unisonProvider.name).toBe("unison");
      expect(unisonProvider.sourceLabel).toBe("Unison");
    });
  });

  describe("canSearch", () => {
    it("returns false when query is empty", () => {
      expect(unisonProvider.canSearch({})).toBe(false);
    });

    it("returns true when track is present", () => {
      expect(unisonProvider.canSearch({ track: "Imagine" })).toBe(true);
    });

    it("returns true when videoId is present", () => {
      expect(unisonProvider.canSearch({ videoId: "abc123xyz" })).toBe(true);
    });

    it("returns true when track and artist are present", () => {
      expect(unisonProvider.canSearch({ track: "Imagine", artist: "John Lennon" })).toBe(true);
    });

    it("returns false when track is only whitespace", () => {
      expect(unisonProvider.canSearch({ track: "   " })).toBe(false);
    });

    it("returns true when valid ISRC is present", () => {
      expect(unisonProvider.canSearch({ isrc: "USA2P1624695" })).toBe(true);
    });

    it("returns false when ISRC is invalid and track is missing", () => {
      expect(unisonProvider.canSearch({ isrc: "invalid-isrc" })).toBe(false);
    });
  });

  describe("result mapping", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("maps TTML richsync results correctly", async () => {
      vi.stubGlobal(
        "fetch",
        async (): Promise<Response> =>
          new Response(
            JSON.stringify({
              success: true,
              data: [
                {
                  id: 6682,
                  song: "Armed & Dangerous",
                  artist: "Alfie Castley",
                  album: "Armed & Dangerous",
                  duration: 159,
                  format: "ttml",
                  syncType: "richsync",
                  lyrics: SAMPLE_TTML,
                },
              ],
            }),
            { headers: { "content-type": "application/json" } },
          ),
      );

      const results = await unisonProvider.search(SAMPLE_QUERY, new AbortController().signal);

      expect(results).toHaveLength(1);
      const first = results[0];
      expect(first.id).toBe("unison-6682");
      expect(first.source).toBe("unison");
      expect(first.sourceLabel).toBe("Unison");
      expect(first.track).toBe("Armed & Dangerous");
      expect(first.artist).toBe("Alfie Castley");
      expect(first.album).toBe("Armed & Dangerous");
      expect(first.durationSec).toBe(159);
      expect(first.syncType).toBe("syllable");
      expect(first.payload).toEqual({ kind: "ttml", xml: SAMPLE_TTML });
    });

    it("maps LRC linesync results correctly", async () => {
      vi.stubGlobal(
        "fetch",
        async (): Promise<Response> =>
          new Response(
            JSON.stringify({
              success: true,
              data: [
                {
                  id: 11401,
                  song: "Runtah",
                  artist: "Ade Astrid",
                  album: "Runtah",
                  duration: 457,
                  format: "lrc",
                  syncType: "linesync",
                  lyrics: SAMPLE_LRC,
                },
              ],
            }),
            { headers: { "content-type": "application/json" } },
          ),
      );

      const results = await unisonProvider.search(
        { track: "Runtah", artist: "Ade Astrid" },
        new AbortController().signal,
      );

      expect(results).toHaveLength(1);
      const first = results[0];
      expect(first.id).toBe("unison-11401");
      expect(first.source).toBe("unison");
      expect(first.syncType).toBe("line");
      expect(first.payload).toEqual({ kind: "lrc", synced: SAMPLE_LRC, plain: null });
    });

    it("fetches missing lyrics content when not included in search results", async () => {
      vi.stubGlobal("fetch", async (url: string | URL | Request): Promise<Response> => {
        const urlStr = String(url);
        if (urlStr.includes("/lyrics/search")) {
          return new Response(
            JSON.stringify({
              success: true,
              data: [
                {
                  id: 9999,
                  song: "Fuzzy Song",
                  artist: "Fuzzy Artist",
                  format: "ttml",
                  syncType: "richsync",
                },
              ],
            }),
            { headers: { "content-type": "application/json" } },
          );
        }
        if (urlStr.includes("/lyrics/9999")) {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                id: 9999,
                lyrics: SAMPLE_TTML,
              },
            }),
            { headers: { "content-type": "application/json" } },
          );
        }
        return new Response("Not Found", { status: 404 });
      });

      const results = await unisonProvider.search({ track: "Fuzzy Song" }, new AbortController().signal);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("unison-9999");
      expect(results[0].payload).toEqual({ kind: "ttml", xml: SAMPLE_TTML });
    });

    it("searches and maps ISRC direct lookups with a single data object", async () => {
      vi.stubGlobal("fetch", async (url: string | URL | Request): Promise<Response> => {
        const urlStr = String(url);
        expect(urlStr).toContain("/lyrics?isrc=USA2P1624695");
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id: 230,
              song: "This December",
              artist: "Ricky Montgomery",
              album: "Montgomery Ricky",
              isrc: "USA2P1624695",
              duration: 182,
              format: "ttml",
              syncType: "richsync",
              lyrics: SAMPLE_TTML,
            },
          }),
          { headers: { "content-type": "application/json" } },
        );
      });

      const results = await unisonProvider.search({ isrc: "USA2P1624695" }, new AbortController().signal);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("unison-230");
      expect(results[0].track).toBe("This December");
      expect(results[0].artist).toBe("Ricky Montgomery");
      expect(results[0].payload).toEqual({ kind: "ttml", xml: SAMPLE_TTML });
    });

    it("searches and maps ISRC direct lookups with a single data object", async () => {
      vi.stubGlobal("fetch", async (url: string | URL | Request): Promise<Response> => {
        const urlStr = String(url);
        expect(urlStr).toContain("/lyrics?isrc=USA2P1624695");
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id: 230,
              song: "This December",
              artist: "Ricky Montgomery",
              album: "Montgomery Ricky",
              isrc: "USA2P1624695",
              duration: 182,
              format: "ttml",
              syncType: "richsync",
              lyrics: SAMPLE_TTML,
            },
          }),
          { headers: { "content-type": "application/json" } },
        );
      });

      const results = await unisonProvider.search({ isrc: "USA2P1624695" }, new AbortController().signal);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("unison-230");
      expect(results[0].track).toBe("This December");
      expect(results[0].artist).toBe("Ricky Montgomery");
      expect(results[0].payload).toEqual({ kind: "ttml", xml: SAMPLE_TTML });
    });
  });

  describe("status & error handling", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it("returns [] silently on 404", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.stubGlobal("fetch", async (): Promise<Response> => new Response("Not found", { status: 404 }));

      const results = await unisonProvider.search(SAMPLE_QUERY, new AbortController().signal);
      expect(results).toEqual([]);
      expect(warn).not.toHaveBeenCalled();
    });

    it.each([400, 401, 403, 429, 500, 502, 503])("returns [] and warns on HTTP %i", async (status) => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.stubGlobal("fetch", async (): Promise<Response> => new Response("Error", { status }));

      const results = await unisonProvider.search(SAMPLE_QUERY, new AbortController().signal);
      expect(results).toEqual([]);
      expect(warn).toHaveBeenCalled();
    });

    it("returns [] silently when signal is aborted", async () => {
      const controller = new AbortController();
      controller.abort();
      const results = await unisonProvider.search(SAMPLE_QUERY, controller.signal);
      expect(results).toEqual([]);
    });
  });
});
