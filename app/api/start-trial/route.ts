import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export async function POST(req: Request) {
  const headersList = await headers();

  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0].trim() ||
    headersList.get("x-real-ip") ||
    "unknown";

  const key = `trial:${ip}`;

  const existing = await redis.get<{ startTime: number }>(key);

  if (existing) {
    return Response.json({ startTime: existing.startTime });
  }

  const startTime = Date.now();

  await redis.set(key, { startTime });

  return Response.json({ startTime });
}