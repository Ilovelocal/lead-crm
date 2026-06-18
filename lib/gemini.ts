import { GoogleGenAI, Type } from "@google/genai";
import type {
  AiExtraction,
  ChatExtraction,
  ProfileExtraction,
  ScreenshotType,
} from "./types";

if (!process.env.GEMINI_API_KEY) {
  // Fail loudly at import time in dev rather than getting a cryptic 500 later.
  console.warn("[gemini] GEMINI_API_KEY is not set — /api/process-screenshot will fail.");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Pinned to the model you requested. Newer flash models exist (e.g. 3.x);
// bump this single string to upgrade.
const MODEL = "gemini-2.5-flash";

const PROFILE_PROMPT = `Analyze this business profile screenshot. Extract the business name, email, phone number, and website URL. Return the data strictly as a JSON object matching this schema: { business_name: string, email: string, phone: string, website: string }. If a field is missing, return null.`;

const CHAT_PROMPT = `Analyze this chat conversation between me and a business lead. Provide a 2-sentence summary of our current status. If the client agreed to a pricing model, specified a problem, or provided contact info, extract it. Return a JSON object matching this schema: { summary: string, extracted_details: string, status_update_suggestion: string }.`;

// Response schemas make the JSON contract explicit to the model, which is
// far more reliable than relying on the prompt alone. `nullable` lets the
// model omit fields it can't find without breaking JSON parsing.
const PROFILE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    business_name: { type: Type.STRING, nullable: true },
    email: { type: Type.STRING, nullable: true },
    phone: { type: Type.STRING, nullable: true },
    website: { type: Type.STRING, nullable: true },
  },
  required: ["business_name", "email", "phone", "website"],
};

const CHAT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING, nullable: true },
    extracted_details: { type: Type.STRING, nullable: true },
    status_update_suggestion: { type: Type.STRING, nullable: true },
  },
  required: ["summary", "extracted_details", "status_update_suggestion"],
};

/**
 * Send a base64 image to Gemini and get back structured JSON.
 * `image` may be a raw base64 string or a full data URL — the prefix is stripped.
 */
export async function analyzeScreenshot(
  image: string,
  type: ScreenshotType,
): Promise<AiExtraction> {
  const { mimeType, data } = parseImageInput(image);

  const isProfile = type === "profile";
  const prompt = isProfile ? PROFILE_PROMPT : CHAT_PROMPT;
  const responseSchema = isProfile ? PROFILE_SCHEMA : CHAT_SCHEMA;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType, data } },
          { text: prompt },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.2,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Gemini returned non-JSON output: ${text.slice(0, 200)}`);
  }

  return isProfile
    ? (parsed as ProfileExtraction)
    : (parsed as ChatExtraction);
}

/** Split a data URL into mimeType + base64, or assume PNG for a bare string. */
function parseImageInput(image: string): { mimeType: string; data: string } {
  const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/s);
  if (match) {
    return { mimeType: match[1], data: match[2] };
  }
  return { mimeType: "image/png", data: image };
}
