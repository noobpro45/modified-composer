import type { ProjectMetadata } from "@/domain/project/metadata";
import type { AudioSource } from "@/stores/audio";
import { buildProjectPrefill } from "@/views/lyrics-import-modal/project-prefill";
import { describe, expect, it } from "vitest";

describe("buildProjectPrefill", () => {
  it("returns null when project metadata is empty and there is no audio source", () => {
    const metadata: Partial<ProjectMetadata> = {};
    expect(buildProjectPrefill(metadata, null)).toBeNull();
  });

  it("extracts track and artist from project metadata", () => {
    const metadata: Partial<ProjectMetadata> = {
      title: "Sukidakara (Re-Recording)",
      artists: ["Yuika"],
    };
    expect(buildProjectPrefill(metadata, null)).toEqual({
      track: "Sukidakara (Re-Recording)",
      artist: "Yuika",
    });
  });

  it("joins multiple artists with commas", () => {
    const metadata: Partial<ProjectMetadata> = {
      title: "Lust for Life",
      artists: ["Lana Del Rey", "The Weeknd"],
    };
    expect(buildProjectPrefill(metadata, null)).toEqual({
      track: "Lust for Life",
      artist: "Lana Del Rey, The Weeknd",
    });
  });

  it("does not treat YouTube videoId as track title while video is still loading", () => {
    const videoId = "dQw4w9WgXcQ";
    const metadata: Partial<ProjectMetadata> = {
      title: videoId,
    };
    const source: AudioSource = { type: "youtube", videoId };
    expect(buildProjectPrefill(metadata, source)).toEqual({
      videoId,
    });
  });

  it("extracts all fields when video is resolved with metadata", () => {
    const videoId = "dQw4w9WgXcQ";
    const metadata: Partial<ProjectMetadata> = {
      title: "Never Gonna Give You Up",
      artists: ["Rick Astley"],
      album: "Whenever You Need Somebody",
      isrc: "GBARL8700045",
      duration: 213,
    };
    const source: AudioSource = { type: "youtube", videoId };
    expect(buildProjectPrefill(metadata, source)).toEqual({
      track: "Never Gonna Give You Up",
      artist: "Rick Astley",
      album: "Whenever You Need Somebody",
      isrc: "GBARL8700045",
      videoId,
      durationSec: 213,
    });
  });

  it("falls back to audio duration when metadata.duration is not set", () => {
    const metadata: Partial<ProjectMetadata> = {
      title: "Test Song",
    };
    expect(buildProjectPrefill(metadata, null, 185.4)).toEqual({
      track: "Test Song",
      durationSec: 185,
    });
  });
});
