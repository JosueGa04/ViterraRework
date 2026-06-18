/**
 * Vercel Serverless Function — proxy Instagram (sin dependencia @vercel/node).
 */
import https from "node:https";
import type { IncomingMessage, ServerResponse } from "node:http";

const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_MAX = 30;
const RATE_WINDOW_MS = 60_000;

type IgPost = {
  shortcode: string;
  type: "reel" | "p";
  videoUrl: string | null;
  thumbnail: string | null;
  caption: string;
};

function corsOrigin(req: IncomingMessage): string {
  const origin = req.headers.origin ?? "";
  if (typeof origin === "string" && ALLOWED_ORIGINS.has(origin)) return origin;
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl && typeof origin === "string" && origin.endsWith(vercelUrl)) return origin;
  return "https://viterra.mx";
}

function httpsGet(url: string, headers: Record<string, string>): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      let body = "";
      res.on("data", (chunk: Buffer) => {
        body += chunk.toString();
      });
      res.on("end", () => resolve(body));
    });
    req.on("error", reject);
  });
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= RATE_MAX;
}

function readQuery(req: IncomingMessage): URLSearchParams {
  const raw = req.url ?? "";
  const q = raw.includes("?") ? raw.slice(raw.indexOf("?")) : "";
  return new URLSearchParams(q);
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const origin = corsOrigin(req);
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

  const clientKey = String(req.headers["x-forwarded-for"] ?? req.socket?.remoteAddress ?? "unknown");
  if (!checkRateLimit(clientKey)) {
    res.statusCode = 429;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Too many requests", posts: [] }));
    return;
  }

  const params = readQuery(req);
  const username = params.get("username") ?? "viterrainmobiliaria";
  const count = Math.min(parseInt(params.get("count") ?? "3", 10), 9);

  if (!/^[a-zA-Z0-9._]{1,30}$/.test(username)) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Invalid username", posts: [] }));
    return;
  }

  try {
    const body = await httpsGet(
      `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
      {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
        "x-ig-app-id": "936619743392459",
        Accept: "application/json",
        "Accept-Language": "es-MX,es;q=0.9",
        Referer: "https://www.instagram.com/",
      },
    );

    const data = JSON.parse(body) as {
      data: { user: { edge_owner_to_timeline_media: { edges: { node: Record<string, unknown> }[] } } };
    };

    const edges = data?.data?.user?.edge_owner_to_timeline_media?.edges ?? [];

    const posts: IgPost[] = edges.slice(0, count).map(({ node: n }) => {
      const isVideo = n.__typename === "GraphVideo";
      const captionEdges =
        (n.edge_media_to_caption as { edges: { node: { text: string } }[] } | undefined)?.edges ?? [];
      const caption = captionEdges[0]?.node?.text ?? "";

      return {
        shortcode: n.shortcode as string,
        type: isVideo ? "reel" : "p",
        videoUrl: isVideo ? ((n.video_url as string) ?? null) : null,
        thumbnail: (n.thumbnail_src ?? n.display_url ?? null) as string | null,
        caption: caption.slice(0, 140),
      };
    });

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "s-maxage=300");
    res.end(JSON.stringify({ posts }));
  } catch {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Instagram feed unavailable", posts: [] }));
  }
}
