/**
 * Which of the channel's streams is live right now, for the /live page.
 *
 * YouTube's "embed/live_stream?channel=" embed picks a stream by its own rule
 * and fails with "This video is unavailable" when two streams are live or the
 * one it picks can't be embedded. This asks the official YouTube Data API
 * instead (2 quota units per refresh), picks the live stream we want, and the
 * page embeds that exact video. Public, read-only, cached for 30 seconds so
 * viewer traffic never turns into API traffic.
 *
 * Needs the YOUTUBE_API_KEY function secret (a YouTube Data API v3 key).
 * Optional: YOUTUBE_CHANNEL_ID (defaults to @passkindnessforward).
 *
 * Response: { status: "live", videoId, title, embeddable } or { status: "none" }.
 * When several streams are live, one whose title mentions "broadcast" or
 * "segment" wins; ties go to the most recently started.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const API_KEY = Deno.env.get("YOUTUBE_API_KEY") ?? "";
const CHANNEL_ID = Deno.env.get("YOUTUBE_CHANNEL_ID") ?? "UC2vk63vLFjSt-lgUhqFjr3Q";
// Every channel's uploads playlist is the channel ID with "UC" swapped for "UU".
const UPLOADS_PLAYLIST = `UU${CHANNEL_ID.slice(2)}`;
const TTL_MS = 30_000;
const PREFERRED_TITLE = /broadcast|segment/i;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=15" },
  });
}

interface Result {
  status: "live" | "none";
  videoId?: string;
  title?: string;
  embeddable?: boolean;
}

let cache: { at: number; data: Result } | null = null;

async function yt(path: string, params: Record<string, string>) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", API_KEY);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube API ${path} ${res.status}`);
  return await res.json();
}

async function findLive(): Promise<Result> {
  // Streams show up in the uploads playlist as soon as they are created.
  const list = await yt("playlistItems", { part: "contentDetails", playlistId: UPLOADS_PLAYLIST, maxResults: "25" });
  const ids: string[] = (list.items ?? []).map((i: { contentDetails?: { videoId?: string } }) => i.contentDetails?.videoId).filter(Boolean);
  if (ids.length === 0) return { status: "none" };

  const vids = await yt("videos", { part: "snippet,liveStreamingDetails,status", id: ids.join(",") });
  const live = (vids.items ?? []).filter(
    (v: { snippet?: { liveBroadcastContent?: string } }) => v.snippet?.liveBroadcastContent === "live",
  );
  if (live.length === 0) return { status: "none" };

  const started = (v: { liveStreamingDetails?: { actualStartTime?: string } }) =>
    Date.parse(v.liveStreamingDetails?.actualStartTime ?? "") || 0;
  live.sort(
    (a: { snippet: { title?: string }; liveStreamingDetails?: { actualStartTime?: string } },
     b: { snippet: { title?: string }; liveStreamingDetails?: { actualStartTime?: string } }) => {
      const pa = PREFERRED_TITLE.test(a.snippet.title ?? "") ? 1 : 0;
      const pb = PREFERRED_TITLE.test(b.snippet.title ?? "") ? 1 : 0;
      return pb - pa || started(b) - started(a);
    },
  );
  const pick = live[0] as { id: string; snippet: { title?: string }; status?: { embeddable?: boolean } };
  return { status: "live", videoId: pick.id, title: pick.snippet.title, embeddable: pick.status?.embeddable !== false };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!API_KEY) return json({ error: "not_configured" }, 503);

  if (cache && Date.now() - cache.at < TTL_MS) return json(cache.data);
  try {
    const data = await findLive();
    cache = { at: Date.now(), data };
    return json(data);
  } catch (e) {
    console.error("live-stream lookup failed", e);
    // Serve the last good answer for a few minutes rather than failing the page.
    if (cache && Date.now() - cache.at < 5 * 60_000) return json(cache.data);
    return json({ error: "lookup_failed" }, 502);
  }
});
