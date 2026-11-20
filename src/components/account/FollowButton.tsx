"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleFollow } from "@/lib/actions/social";

export function FollowButton({ creatorId, initial, loggedIn, path }: { creatorId: string; initial: boolean; loggedIn: boolean; path: string }) {
  const router = useRouter();
  const [following, setFollowing] = useState(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  if (!loggedIn)
    return (
      <Link href={`/entrar?siguiente=${encodeURIComponent(path)}`} className="boton boton-principal boton-chico">
        Seguir
      </Link>
    );
  return (
    <>
      <button
        type="button"
        className={`boton ${following ? "boton-secundario" : "boton-principal"} boton-chico`}
        aria-pressed={following}
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError("");
            const r = await toggleFollow(creatorId);
            if (!r.ok) return setError(r.error);
            setFollowing(!!r.following);
            router.refresh();
          })
        }
      >
        {following ? "Siguiendo" : "Seguir"}
      </button>
      {error && <span role="alert" style={{ color: "var(--error)", fontSize: "var(--t-xs)" }}>{error}</span>}
    </>
  );
}
