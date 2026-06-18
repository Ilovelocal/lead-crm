import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { analyzeScreenshot } from "@/lib/gemini";
import { SESSION_COOKIE, verifyToken } from "@/lib/session";
import type { ScreenshotType } from "@/lib/types";

// Vision calls can take several seconds; keep the function alive on serverless.
export const maxDuration = 60;
export const runtime = "nodejs";

interface Body {
  image?: string;
  type?: ScreenshotType;
}

export async function POST(request: Request) {
  // Middleware already gates this, but verify the session here too so the
  // endpoint can never be hit without a valid cookie.
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { image, type } = body;

  if (!image || typeof image !== "string") {
    return NextResponse.json(
      { error: "Missing 'image' (base64 string)." },
      { status: 400 },
    );
  }

  if (type !== "profile" && type !== "chat") {
    return NextResponse.json(
      { error: "'type' must be 'profile' or 'chat'." },
      { status: 400 },
    );
  }

  // Vercel serverless functions reject bodies over ~4.5MB. Images are
  // downscaled client-side, so this is just a backstop. ~4M base64 chars ≈ 3MB.
  if (image.length > 4_000_000) {
    return NextResponse.json(
      { error: "Image too large. Try a smaller screenshot." },
      { status: 413 },
    );
  }

  try {
    const data = await analyzeScreenshot(image, type);
    return NextResponse.json({ type, data });
  } catch (err) {
    console.error("[process-screenshot]", err);
    const message =
      err instanceof Error ? err.message : "Failed to analyze screenshot.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
