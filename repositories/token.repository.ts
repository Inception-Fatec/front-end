import { redis } from "@/lib/redis";

const TOKEN_TTL_SECONDS = 15 * 60;

const KEYS = {
  token: (hashedToken: string) => `pwd_reset:token:${hashedToken}`,
  activeToken: (userId: number) => `pwd_reset:user:${userId}:active_token`,
} as const;

export interface TokenPayload {
  userId: number;
  email: string;
  createdAt: string;
}


export async function saveToken(
  hashedToken: string,
  payload: TokenPayload,
): Promise<void> {
  await redis.set(KEYS.token(hashedToken), JSON.stringify(payload), {
    ex: TOKEN_TTL_SECONDS,
  });

  await redis.set(KEYS.activeToken(payload.userId), hashedToken, {
    ex: TOKEN_TTL_SECONDS,
  });
}

export async function findToken(
  hashedToken: string,
): Promise<TokenPayload | null> {
  const data = await redis.get<string>(KEYS.token(hashedToken));

  if (!data) return null;

  try {
    return typeof data === "string"
      ? (JSON.parse(data) as TokenPayload)
      : (data as TokenPayload);
  } catch {
    console.error("[token.repository] Erro ao parsear payload do token.");
    return null;
  }
}

export async function deleteToken(
  hashedToken: string,
  userId: number,
): Promise<void> {
  await redis.del(KEYS.token(hashedToken));
  await redis.del(KEYS.activeToken(userId));
}

export async function invalidatePreviousToken(userId: number): Promise<void> {
  const previousHashedToken = await redis.get<string>(
    KEYS.activeToken(userId),
  );

  if (previousHashedToken) {
    await redis.del(KEYS.token(previousHashedToken));
    await redis.del(KEYS.activeToken(userId));
  }
}