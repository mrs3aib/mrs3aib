import { useState } from "react";
import type { PhotoSession } from "@/types/session";
import { toneFor } from "./sessionPageUtils";

export function SessionCover({
  session,
  className,
  roundedClassName
}: {
  session: Pick<PhotoSession, "id" | "title" | "coverImageUrl">;
  className: string;
  roundedClassName: string;
}) {
  const [failed, setFailed] = useState(false);

  if (session.coverImageUrl && !failed) {
    return (
      <img
        src={session.coverImageUrl}
        alt={session.title}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`${className} ${roundedClassName} object-cover`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${className} ${roundedClassName} bg-gradient-to-br ${toneFor(session.id)}`}
    />
  );
}
