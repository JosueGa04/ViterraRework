import { defineConfig, type Plugin } from "vite";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { IncomingMessage, ServerResponse } from "node:http";
import https from "node:https";

function figmaAssetResolver() {
  return {
    name: "figma-asset-resolver",
    resolveId(id: string) {
      if (id.startsWith("figma:asset/")) {
        const filename = id.replace("figma:asset/", "");
        return path.resolve(__dirname, "src/assets", filename);
      }
    },
  };
}

/** Dev-only: sirve /api/instagram-feed desde Node.js (sin CORS) */
function instagramFeedDev(): Plugin {
  return {
    name: "instagram-feed-dev",
    configureServer(server) {
      server.middlewares.use(
        "/api/instagram-feed",
        async (req: IncomingMessage, res: ServerResponse) => {
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Content-Type", "application/json");
          try {
            const url = new URL(req.url ?? "", "http://localhost");
            const username = url.searchParams.get("username") ?? "viterrainmobiliaria";
            const count = Math.min(parseInt(url.searchParams.get("count") ?? "3", 10), 9);

            // Use https module instead of fetch — Node.js fetch adds Sec-Fetch-* headers that Instagram blocks
            const rawBody = await new Promise<string>((resolve, reject) => {
              const req = https.get(
                `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
                {
                  headers: {
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
                    "x-ig-app-id": "936619743392459",
                    "Accept": "application/json",
                    "Accept-Language": "es-MX,es;q=0.9",
                    "Referer": "https://www.instagram.com/",
                  },
                },
                (igRes) => {
                  let body = "";
                  igRes.on("data", (chunk: Buffer) => { body += chunk.toString(); });
                  igRes.on("end", () => resolve(body));
                }
              );
              req.on("error", reject);
            });

            const data = JSON.parse(rawBody) as {
              data: { user: { edge_owner_to_timeline_media: { edges: { node: Record<string, unknown> }[] } } };
            };
            const edges = data?.data?.user?.edge_owner_to_timeline_media?.edges ?? [];

            const posts = edges.slice(0, count).map(({ node: n }) => {
              const isVideo = n.__typename === "GraphVideo";
              const captionEdges = (n.edge_media_to_caption as { edges: { node: { text: string } }[] } | undefined)?.edges ?? [];
              return {
                shortcode: n.shortcode,
                type: isVideo ? "reel" : "p",
                videoUrl: isVideo ? (n.video_url ?? null) : null,
                thumbnail: n.thumbnail_src ?? n.display_url ?? null,
                caption: (captionEdges[0]?.node?.text ?? "").slice(0, 140),
              };
            });

            res.end(JSON.stringify({ posts }));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: String(err), posts: [] }));
          }
        }
      );
    },
  };
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    react(),
    tailwindcss(),
    instagramFeedDev(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  assetsInclude: ["**/*.svg", "**/*.csv"],
});
