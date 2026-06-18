import type {
  ChatExtraction,
  ProfileExtraction,
  ScreenshotType,
} from "./types";

// Runs entirely in the browser — no API key, no server call, no Vercel limits.
// Tesseract downloads its worker/core/language data from CDN on first use and
// the browser caches it afterward (so the first scan is the slow one).

export interface OcrProgress {
  status: string;
  progress: number; // 0..1, meaningful while status === "recognizing text"
}

export async function extractFromImage(
  image: string,
  type: ScreenshotType,
  onProgress?: (p: OcrProgress) => void,
): Promise<ProfileExtraction | ChatExtraction> {
  const text = await runOcr(image, onProgress);
  return type === "profile" ? parseProfile(text) : parseChat(text);
}

async function runOcr(
  image: string,
  onProgress?: (p: OcrProgress) => void,
): Promise<string> {
  // Lazy-loaded so tesseract.js is only fetched/evaluated in the browser when
  // a scan actually runs (keeps it out of the initial bundle and off the server).
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (m: { status: string; progress: number }) =>
      onProgress?.({ status: m.status, progress: m.progress ?? 0 }),
  });
  try {
    const {
      data: { text },
    } = await worker.recognize(image);
    return text;
  } finally {
    await worker.terminate();
  }
}

// --- Parsing ---------------------------------------------------------------
// OCR gives raw text; these pull structured fields out heuristically. They're
// intentionally lenient — you review and fix everything in the modal before
// saving, so "close enough" is the goal.

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

function parseProfile(text: string): ProfileExtraction {
  const email = text.match(EMAIL_RE)?.[0] ?? null;
  return {
    business_name: extractBusinessName(text),
    email,
    phone: extractPhone(text),
    website: extractWebsite(text, email),
  };
}

function parseChat(text: string): ChatExtraction {
  const cleaned = text.replace(/\n{3,}/g, "\n\n").trim();
  // No AI summary anymore — the raw conversation text goes into the summary box
  // for you to trim/rewrite before saving.
  return {
    summary: cleaned || null,
    extracted_details: null,
    status_update_suggestion: null,
  };
}

function extractPhone(text: string): string | null {
  const candidates = text.match(/\+?\d[\d\s().-]{6,}\d/g) ?? [];
  for (const c of candidates) {
    const digits = c.replace(/\D/g, "");
    if (digits.length >= 7 && digits.length <= 15) return c.trim();
  }
  return null;
}

function extractWebsite(text: string, email: string | null): string | null {
  const candidates =
    text.match(
      /((https?:\/\/)?(www\.)?[A-Za-z0-9-]+(\.[A-Za-z0-9-]{2,})+(\/[^\s]*)?)/g,
    ) ?? [];
  const emailDomain = email ? email.split("@")[1]?.toLowerCase() : null;
  const tld =
    /\.(com|net|org|ph|io|co|info|biz|shop|store|dev|app|me|asia|xyz)(\b|\/|$)/i;
  for (const raw of candidates) {
    const c = raw.trim().replace(/[.,);]+$/, "");
    if (c.includes("@")) continue;
    if (emailDomain && c.toLowerCase() === emailDomain) continue;
    if (/^https?:\/\//i.test(c) || /^www\./i.test(c) || tld.test(c)) return c;
  }
  return null;
}

function extractBusinessName(text: string): string | null {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  // Common Facebook UI labels that are not the business name.
  const skip =
    /^(about|home|posts|photos|videos|reviews|more|intro|page|likes?|followers?|following|message|call|like|share|create post|see all)$/i;
  for (const line of lines) {
    if (line.includes("@")) continue;
    if (/^\+?\d[\d\s().-]{6,}\d$/.test(line)) continue;
    if (skip.test(line)) continue;
    if (line.replace(/[^A-Za-z]/g, "").length < 2) continue;
    return line;
  }
  return lines[0] ?? null;
}
