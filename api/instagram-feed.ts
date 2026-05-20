/**
 * Vercel Serverless Function — proxy para Instagram sin restricciones CORS.
 * GET /api/instagram-feed?username=viterrainmobiliaria&count=3
 *
 * Usa https module en lugar de fetch porque Node.js fetch agrega Sec-Fetch-* headers
 * que Instagram bloquea con 400 "SecFetch Policy violation".
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import https from "https";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

type IgPost = {
  shortcode: string;
  type: "reel" | "p";
  videoUrl: string | null;
  thumbnail: string | null;
  caption: string;
};

function httpsGet(url: string, headers: Record<string, string>): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      let body = "";
      res.on("data", (chunk: Buffer) => { body += chunk.toString(); });
      res.on("end", () => resolve(body));
    });
    req.on("error", reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const username = (req.query.username as string) ?? "viterrainmobiliaria";
  const count = Math.min(parseInt((req.query.count as string) ?? "3", 10), 9);

  try {
    const body = await httpsGet(
      `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
      {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
        "x-ig-app-id": "936619743392459",
        "Accept": "application/json",
        "Accept-Language": "es-MX,es;q=0.9",
        "Referer": "https://www.instagram.com/",
      }
    );

    const data = JSON.parse(body) as {
      data: { user: { edge_owner_to_timeline_media: { edges: { node: Record<string, unknown> }[] } } };
    };

    const edges = data?.data?.user?.edge_owner_to_timeline_media?.edges ?? [];

    const posts: IgPost[] = edges.slice(0, count).map(({ node: n }) => {
      const isVideo = n.__typename === "GraphVideo";
      const captionEdges = (n.edge_media_to_caption as { edges: { node: { text: string } }[] } | undefined)?.edges ?? [];
      const caption = captionEdges[0]?.node?.text ?? "";

      return {
        shortcode: n.shortcode as string,
        type: isVideo ? "reel" : "p",
        videoUrl: isVideo ? ((n.video_url as string) ?? null) : null,
        thumbnail: (n.thumbnail_src ?? n.display_url ?? null) as string | null,
        caption: caption.slice(0, 140),
      };
    });

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "s-maxage=300");
    return res.status(200).json({ posts });
  } catch (err) {
    res.setHeader("Content-Type", "application/json");
    return res.status(500).json({ error: String(err), posts: [] });
  }
}
