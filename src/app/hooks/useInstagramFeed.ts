import { useEffect, useState } from "react";

export type InstagramPost = {
  shortcode: string;
  type: "reel" | "p";
  videoUrl: string | null;
  thumbnail: string | null;
  caption: string;
};

const FALLBACK: InstagramPost[] = [
  { shortcode: "DYfUoFtOC8Z", type: "reel", videoUrl: null, thumbnail: null, caption: "" },
  { shortcode: "DYVH4oHCWo7", type: "p",    videoUrl: null, thumbnail: null, caption: "" },
  { shortcode: "DYQZIH5juNY", type: "p",    videoUrl: null, thumbnail: null, caption: "" },
];

export function useInstagramFeed(count = 3) {
  const [posts, setPosts] = useState<InstagramPost[]>(FALLBACK.slice(0, count));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/instagram-feed?username=viterrainmobiliaria&count=${count}`)
      .then((r) => r.json())
      .then((data: { posts?: InstagramPost[] }) => {
        if (Array.isArray(data?.posts) && data.posts.length > 0) {
          setPosts(data.posts.slice(0, count));
        }
      })
      .catch(() => {/* usa fallback */})
      .finally(() => setLoading(false));
  }, [count]);

  return { posts, loading };
}
