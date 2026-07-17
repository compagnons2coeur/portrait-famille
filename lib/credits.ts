import { FREE_GENERATIONS_PER_DAY } from "./constants";
import { getRedis } from "./redis";

function todayKey(fingerprint: string): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
  return `credit:${fingerprint}-${date}`;
}

function emailKey(fingerprint: string): string {
  return `email:${fingerprint}`;
}

async function getUsedToday(fingerprint: string): Promise<number> {
  const value = await getRedis().get<number>(todayKey(fingerprint));
  return value ?? 0;
}

async function hasEmail(fingerprint: string): Promise<boolean> {
  const value = await getRedis().get<string>(emailKey(fingerprint));
  return Boolean(value);
}

export async function getCreditsUsage(
  fingerprint: string
): Promise<{ used: number; remaining: number }> {
  const used = await getUsedToday(fingerprint);
  return {
    used,
    remaining: Math.max(0, FREE_GENERATIONS_PER_DAY - used),
  };
}

export async function canGenerate(
  fingerprint: string
): Promise<{ allowed: boolean; used: number; needsEmail: boolean }> {
  const used = await getUsedToday(fingerprint);
  const emailRegistered = await hasEmail(fingerprint);

  return {
    allowed: used < FREE_GENERATIONS_PER_DAY,
    used,
    needsEmail: used === 0 && !emailRegistered,
  };
}

export async function recordEmail(
  fingerprint: string,
  email: string
): Promise<void> {
  await getRedis().set(emailKey(fingerprint), email.trim().toLowerCase());
}

export async function incrementUsage(fingerprint: string): Promise<void> {
  const key = todayKey(fingerprint);
  const redis = getRedis();
  await redis.incr(key);
  // expire after 25h to handle timezone edge cases
  await redis.expire(key, 25 * 3600);
}
