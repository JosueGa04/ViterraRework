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
  const rateBuckets = new Map<string, { count: number; resetAt: number }>();
  const RATE_MAX = 30;
  const RATE_WINDOW_MS = 60_000;

  return {
    name: "instagram-feed-dev",
    configureServer(server) {
      server.middlewares.use(
        "/api/instagram-feed",
        async (req: IncomingMessage, res: ServerResponse) => {
          const origin = req.headers.origin ?? "";
          const allowed =
            origin === "http://localhost:5173" ||
            origin === "http://127.0.0.1:5173" ||
            !origin;
          res.setHeader("Access-Control-Allow-Origin", allowed ? (origin || "http://localhost:5173") : "http://localhost:5173");
          res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
          res.setHeader("Content-Type", "application/json");

          if (req.method === "OPTIONS") {
            res.statusCode = 200;
            res.end();
            return;
          }

          const clientKey = String(req.headers["x-forwarded-for"] ?? req.socket?.remoteAddress ?? "dev");
          const now = Date.now();
          const bucket = rateBuckets.get(clientKey);
          if (!bucket || now > bucket.resetAt) {
            rateBuckets.set(clientKey, { count: 1, resetAt: now + RATE_WINDOW_MS });
          } else {
            bucket.count += 1;
            if (bucket.count > RATE_MAX) {
              res.statusCode = 429;
              res.end(JSON.stringify({ error: "Too many requests", posts: [] }));
              return;
            }
          }

          try {
            const url = new URL(req.url ?? "", "http://localhost");
            const username = url.searchParams.get("username") ?? "viterrainmobiliaria";
            if (!/^[a-zA-Z0-9._]{1,30}$/.test(username)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: "Invalid username", posts: [] }));
              return;
            }
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
          } catch {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: "Instagram feed unavailable", posts: [] }));
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
  build: {
    // vendor-pdf (@react-pdf, ~1.4 MB) es grande por naturaleza pero está aislado y
    // se descarga solo al generar un PDF, así que no cuenta como regresión del bundle inicial.
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Separa vendors pesados estáticos en chunks cacheables independientes.
        // (@react-pdf y @tiptap se separan solos vía lazy() → chunks async on-demand.)
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          // PDF y Excel: compartidos entre chunks lazy → forzarlos a vendor evita que
          // Rollup los "suba" al chunk de AdminWorkspace. Solo se descargan al usarse.
          if (
            id.includes("@react-pdf") ||
            id.includes("fontkit") ||
            id.includes("/yoga-layout") ||
            id.includes("/pdfkit") ||
            id.includes("/restructure") ||
            id.includes("unicode-") ||
            id.includes("/linebreak") ||
            id.includes("/hyphen")
          ) {
            return "vendor-pdf";
          }
          if (id.includes("/xlsx") || id.includes("sheetjs")) return "vendor-xlsx";
          if (id.includes("@tiptap") || id.includes("prosemirror")) return "vendor-editor";
          if (id.includes("recharts") || id.includes("/d3-") || id.includes("victory-vendor")) {
            return "vendor-charts";
          }
          if (id.includes("/leaflet")) return "vendor-maps";
          if (id.includes("react-dnd") || id.includes("dnd-core")) return "vendor-dnd";
          if (id.includes("@radix-ui")) return "vendor-radix";
          if (id.includes("/motion/") || id.includes("framer-motion")) return "vendor-motion";
        },
      },
    },
  },
});
