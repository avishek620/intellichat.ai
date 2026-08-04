import { Redis } from "@upstash/redis";
import { headers, cookies } from "next/headers";
import { randomUUID } from "crypto";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export async function POST(req: Request) {
  const headersList = await headers();
  const cookieStore = await cookies();

  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0].trim() ||
    headersList.get("x-real-ip") ||
    "unknown";

  let deviceId = cookieStore.get("intellichat-device-id")?.value;
  const isNewDevice = !deviceId;

  if (!deviceId) {
    deviceId = randomUUID();
  }

  const ipKey = `trial:ip:${ip}`;
  const deviceKey = `trial:device:${deviceId}`;

  const existingByIp = await redis.get<{ startTime: number }>(ipKey);
  const existingByDevice = await redis.get<{ startTime: number }>(deviceKey);

  let startTime: number;

  if (existingByIp || existingByDevice) {
    // Use whichever record is older, so the trial window is measured from the very first time this IP or device was seen
    const ipTime = existingByIp?.startTime ?? Infinity;
    const deviceTime = existingByDevice?.startTime ?? Infinity;
    startTime = Math.min(ipTime, deviceTime);
  } else {
    startTime = Date.now();
  }

  // Make sure both records are in sync going forward
  await redis.set(ipKey, { startTime });
  await redis.set(deviceKey, { startTime });

  const response = Response.json({ startTime });

  if (isNewDevice) {
    response.headers.set(
      "Set-Cookie",
      `intellichat-device-id=${deviceId}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`
    );
  }

  return response;
}