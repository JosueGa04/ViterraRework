/**
 * Proxy para obtener los últimos posts de Instagram sin restricciones CORS.
 * Devuelve los 3 posts más recientes con videoUrl para reproducción nativa.
 *
 * GET /functions/v1/instagram-feed
 *   ?username=viterrainmobiliaria   (opcional, default fijo)
 *   &count=3                        (opcional, default 3)
 *
 * No requiere autenticación (datos públicos de perfil público).
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

type IgPost = {
  shortcode: string;
  type: "reel" | "p";
  videoUrl: string | null;
  thumbnail: string | null;
  caption: string;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const url = new URL(req.url);
  const username = url.searchParams.get("username") ?? "viterrainmobiliaria";
  const count = Math.min(parseInt(url.searchParams.get("count") ?? "3", 10), 9);

  try {
    const igRes = await fetch(
      `https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
          "x-ig-app-id": "936619743392459",
          "Accept": "application/json",
          "Accept-Language": "es-MX,es;q=0.9",
        },
      }
    );

    if (!igRes.ok) {
      return json({ error: `Instagram responded ${igRes.status}`, posts: [] }, 502);
    }

    const data = await igRes.json();
    const edges: unknown[] =
      data?.data?.user?.edge_owner_to_timeline_media?.edges ?? [];

    const posts: IgPost[] = edges.slice(0, count).map((e: unknown) => {
      const n = (e as { node: Record<string, unknown> }).node;
      const typename = n.__typename as string;
      const isVideo = typename === "GraphVideo";
      const captionEdges = (n.edge_media_to_caption as { edges: { node: { text: string } }[] } | undefined)?.edges ?? [];
      const caption = captionEdges[0]?.node?.text ?? "";

      return {
        shortcode: n.shortcode as string,
        type: isVideo ? "reel" : "p",
        videoUrl: isVideo ? ((n.video_url as string) ?? null) : null,
        thumbnail: (n.thumbnail_src as string | undefined) ?? (n.display_url as string | undefined) ?? null,
        caption: caption.slice(0, 140),
      };
    });

    return json({ posts });
  } catch (err) {
    return json({ error: String(err), posts: [] }, 500);
  }
});
