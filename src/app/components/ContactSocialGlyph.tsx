import { Facebook, Globe, Instagram, MessageCircle, Youtube } from "lucide-react";
import type { ContactSocialPlatform } from "../../data/siteContent";
import { cn } from "./ui/utils";

export function ContactSocialGlyph({
  platform,
  className,
}: {
  platform: ContactSocialPlatform;
  className?: string;
}) {
  const strokeIcon = cn("h-5 w-5", className);
  switch (platform) {
    case "facebook":
      return <Facebook className={strokeIcon} strokeWidth={1.5} aria-hidden />;
    case "instagram":
      return <Instagram className={strokeIcon} strokeWidth={1.5} aria-hidden />;
    case "youtube":
      return <Youtube className={strokeIcon} strokeWidth={1.5} aria-hidden />;
    case "whatsapp":
      return <MessageCircle className={strokeIcon} strokeWidth={1.5} aria-hidden />;
    case "tiktok":
    case "threads":
    case "website":
    default:
      return <Globe className={strokeIcon} strokeWidth={1.5} aria-hidden />;
  }
}
