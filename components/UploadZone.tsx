"use client";

import { useCallback, useRef, useState } from "react";
import { ClipboardPaste, ImageUp, Loader2, ScanText, X } from "lucide-react";
import { SCREENSHOT_TYPES } from "@/lib/constants";
import { extractFromImage } from "@/lib/ocr";
import type { ScreenshotType } from "@/lib/types";
import type { ProcessResult } from "./ConfirmModal";

// Downscale large images in the browser before OCR — smaller image = faster
// scan, and small screenshots are left untouched to preserve text crispness.
const MAX_DIMENSION = 2000;
const KEEP_ORIGINAL_UNDER = 1_200_000; // ~0.9MB data URL

async function fileToDataUrl(file: File): Promise<string> {
  const original = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not decode the image."));
    image.src = original;
  });

  const longest = Math.max(img.width, img.height);
  const scale = Math.min(1, MAX_DIMENSION / longest);
  if (scale === 1 && original.length < KEEP_ORIGINAL_UNDER) return original;

  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return original;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.92);
}

interface Props {
  onResult: (result: ProcessResult) => void;
}

export function UploadZone({ onResult }: Props) {
  const [type, setType] = useState<ScreenshotType>("profile");
  const [preview, setPreview] = useState<string | null>(null); // data URL
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const readFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please provide an image file.");
      return;
    }
    setError(null);
    try {
      setPreview(await fileToDataUrl(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load that image.");
    }
  }, []);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  }

  function onPaste(e: React.ClipboardEvent) {
    const item = Array.from(e.clipboardData.items).find((i) =>
      i.type.startsWith("image/"),
    );
    const file = item?.getAsFile();
    if (file) readFile(file);
  }

  async function submit() {
    if (!preview) return;
    setLoading(true);
    setError(null);
    setProgress(0);
    try {
      const data = await extractFromImage(preview, type, (p) => {
        if (p.status === "recognizing text") {
          setProgress(Math.round(p.progress * 100));
        }
      });
      onResult({ type, data });
      setPreview(null); // reset for the next screenshot
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not read the screenshot.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <ScanText className="h-5 w-5 text-indigo-500" />
          <h2 className="font-semibold text-slate-800">Screenshot import</h2>
        </div>
        <div className="flex rounded-lg bg-slate-100 p-1">
          {SCREENSHOT_TYPES.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setType(opt.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                type === opt.value
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dropzone — focusable so paste works after a click/tab */}
      <div
        tabIndex={0}
        onPaste={onPaste}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !preview && fileInput.current?.click()}
        className={`relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition outline-none focus:ring-2 focus:ring-indigo-300 ${
          dragging
            ? "border-indigo-400 bg-indigo-50"
            : "border-slate-300 bg-slate-50 hover:border-slate-400"
        }`}
      >
        {preview ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Screenshot preview"
              className="max-h-44 rounded-lg shadow"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPreview(null);
              }}
              className="absolute -right-2 -top-2 rounded-full bg-slate-800 p-1 text-white shadow hover:bg-slate-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
              <ImageUp className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">
              Drop an image, tap to browse, or paste from clipboard
            </p>
            <p className="mt-1 flex items-center justify-center gap-1 text-xs text-slate-400">
              <ClipboardPaste className="h-3 w-3" />
              On desktop: click here first, then Cmd/Ctrl + V
            </p>
          </>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) readFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {error && <p className="mt-3 text-sm text-rose-500">{error}</p>}

      <button
        onClick={submit}
        disabled={!preview || loading}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {progress > 0 ? `Reading text… ${progress}%` : "Reading text…"}
          </>
        ) : (
          <>
            <ScanText className="h-4 w-4" />
            Extract text
          </>
        )}
      </button>

      <p className="mt-2 text-center text-[11px] text-slate-400">
        Text is read on your device — nothing is sent to any AI service.
      </p>
    </div>
  );
}
