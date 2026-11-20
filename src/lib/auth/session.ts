import "server-only";

/** Usuario con sesión iniciada (etapa 6). */
export type SessionUser = { id: string; email: string | null; username: string; displayName: string; role: string; isBanned: boolean };

export async function getSessionUser(): Promise<SessionUser | null> {
  return null;
}
