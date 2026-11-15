import { useQuery } from "@tanstack/react-query";
import { unisonQueryKeys } from "@/hooks/unison/query-keys";
import { preloadKawarpImage } from "@/lib/kawarp-image-cache";
import type { UnisonProfile } from "@/lib/unison/api-types";
import { fetchProfile } from "@/lib/unison/endpoints";
import { readUnisonSession, saveUnisonSession } from "@/lib/unison/session";

// -- Constants -----------------------------------------------------------------

const LOG_PREFIX = "[UnisonProfile]";
// Unison rebuilds the leaderboard behind these numbers every 5 minutes.
const PROFILE_STALE_TIME_MS = 5 * 60_000;

// -- Helpers -------------------------------------------------------------------

// The banner is decoded as soon as the profile arrives, so the Unison page paints it without a fade from black.
function warmBanner(profile: UnisonProfile, keyId: string): UnisonProfile {
  if (profile.banner) {
    preloadKawarpImage(profile.banner.artworkUrl).catch((error: unknown) =>
      console.warn(LOG_PREFIX, "could not preload the banner", error),
    );
  }
  const session = readUnisonSession();
  if (session && session.keyId === keyId) {
    const nextAvatar = profile.avatarUrl ?? session.avatarUrl;
    const nextName = profile.displayName || session.displayName;
    if (nextAvatar !== session.avatarUrl || nextName !== session.displayName) {
      saveUnisonSession({ ...session, avatarUrl: nextAvatar, displayName: nextName });
    }
  }
  return profile;
}

// -- Hook ----------------------------------------------------------------------

function useUnisonProfile(keyId: string) {
  return useQuery({
    queryKey: unisonQueryKeys.profile(keyId),
    queryFn: ({ signal }) => fetchProfile(keyId, { signal }).then((p) => warmBanner(p, keyId)),
    staleTime: PROFILE_STALE_TIME_MS,
  });
}

// -- Exports -------------------------------------------------------------------

export { useUnisonProfile };
