import type { User } from "../../../contexts/AuthContext";
import { userInitials } from "../../../lib/adminWorkspaceSearch";
import { cn } from "../../ui/utils";

type Props = {
  user: Pick<User, "name" | "profile">;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClass = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-10 w-10 text-xs",
  lg: "h-12 w-12 text-sm",
} as const;

export function getUserPictureSrc(user: Pick<User, "profile">): string {
  return user.profile?.picture?.trim() ?? "";
}

export function KpiUserAvatar({ user, size = "md", className }: Props) {
  const picture = getUserPictureSrc(user);
  const initials = userInitials(user.name || "?");

  if (picture) {
    return (
      <img
        src={picture}
        alt=""
        className={cn(
          "shrink-0 rounded-full object-cover ring-2 ring-white",
          sizeClass[size],
          className,
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-800 font-semibold text-white ring-2 ring-white border border-slate-600/20 shadow-sm",
        sizeClass[size],
        className,
      )}
    >
      {initials}
    </span>
  );
}
