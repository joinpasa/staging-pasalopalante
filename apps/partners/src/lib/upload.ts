import { SUPABASE_KEY, SUPABASE_URL } from "./portalClient";

/** Videos upload as-is, so this is the real cap (matches the partner-media bucket limit). */
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
/** Photos are shrunk in the browser before upload (see compressImage), so a big phone photo is fine. */
export const MAX_PHOTO_BYTES = 25 * 1024 * 1024;

// Shrink photos to what the Wall can actually show: ≤2000px on the long
// side, JPEG ~0.82. A 4–12 MB phone photo becomes ~0.3–1 MB — several times
// faster on venue Wi-Fi and far less storage. Small images are left alone.
const COMPRESS_OVER_BYTES = 1.5 * 1024 * 1024;
const MAX_DIMENSION = 2000;
const JPEG_QUALITY = 0.82;

/** What the walls can actually show: common web photo formats + phone video formats. */
export const ALLOWED_TYPES: Record<string, "image" | "video"> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/gif": "image",
  "video/mp4": "video",
  "video/quicktime": "video", // .mov — what iPhones record
  "video/webm": "video",
};
export const ACCEPT_ATTR =
  Object.keys(ALLOWED_TYPES).join(",") +
  ",.jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.webm";

const EXT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

export interface UploadedMedia {
  path: string;
  type: "image" | "video";
  name: string;
}

/** Why an upload failed, as a key into the portal copy (see i18n `uploadErrors`). */
export type UploadErrorReason =
  | "type"
  | "size"
  | "network"
  | "auth"
  | "cancelled"
  | "server";

export class UploadError extends Error {
  constructor(public reason: UploadErrorReason) {
    super(reason);
  }
}

/** Some browsers leave file.type empty (e.g. .mov on Windows) — fall back to the extension. */
export function mediaTypeOf(file: File): string {
  if (file.type && ALLOWED_TYPES[file.type]) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TYPES[ext] ?? file.type ?? "";
}

/** Returns a smaller JPEG for large photos; the original for small ones, GIFs, or if the browser can't decode it. */
export async function compressImage(
  file: File,
  mime: string,
): Promise<{ blob: Blob; mime: string }> {
  if (mime === "image/gif" || typeof createImageBitmap !== "function")
    return { blob: file, mime };
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return { blob: file, mime };
  }
  const longSide = Math.max(bitmap.width, bitmap.height);
  if (file.size <= COMPRESS_OVER_BYTES && longSide <= MAX_DIMENSION) {
    bitmap.close();
    return { blob: file, mime };
  }
  const scale = Math.min(1, MAX_DIMENSION / longSide);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return { blob: file, mime };
  }
  ctx.fillStyle = "#ffffff"; // transparent PNG areas become white, not black
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((res) =>
    canvas.toBlob(res, "image/jpeg", JPEG_QUALITY),
  );
  if (!blob || blob.size >= file.size) return { blob: file, mime };
  return { blob, mime: "image/jpeg" };
}

/**
 * Uploads one photo/video into the organization's own folder of the private
 * partner-media bucket. Uses XHR rather than supabase-js so the UI can show
 * real progress (the design's percentage bar) — supabase-js's upload()
 * doesn't report any.
 */
export function uploadMedia(
  file: File,
  partnerId: string,
  accessToken: string,
  onProgress: (pct: number) => void,
): { promise: Promise<UploadedMedia>; cancel: () => void } {
  const xhr = new XMLHttpRequest();
  let cancelled = false;
  const promise = (async (): Promise<UploadedMedia> => {
    const originalMime = mediaTypeOf(file);
    const kind = ALLOWED_TYPES[originalMime];
    if (!kind) throw new UploadError("type");
    if (file.size > (kind === "video" ? MAX_VIDEO_BYTES : MAX_PHOTO_BYTES))
      throw new UploadError("size");
    const { blob, mime } =
      kind === "image"
        ? await compressImage(file, originalMime)
        : { blob: file as Blob, mime: originalMime };
    if (cancelled) throw new UploadError("cancelled");
    const ext =
      Object.entries(EXT_TYPES).find(([, m]) => m === mime)?.[0] ??
      (kind === "video" ? "mp4" : "jpg");
    const month = new Date().toISOString().slice(0, 7);
    const path = `${partnerId}/${month}/${crypto.randomUUID()}.${ext}`;

    return new Promise<UploadedMedia>((resolve, reject) => {
      xhr.open(
        "POST",
        `${SUPABASE_URL}/storage/v1/object/partner-media/${path}`,
      );
      xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
      xhr.setRequestHeader("apikey", SUPABASE_KEY);
      xhr.setRequestHeader("Content-Type", mime);
      xhr.setRequestHeader("x-upsert", "false");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable)
          onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(100);
          resolve({ path, type: kind, name: file.name });
          return;
        }
        // Storage answers with JSON like {"statusCode":"413","error":"Payload too large","message":"…"}.
        let detail = "";
        try {
          const body = JSON.parse(xhr.responseText || "{}");
          detail =
            `${body.statusCode ?? ""} ${body.error ?? ""} ${body.message ?? ""}`.toLowerCase();
        } catch {
          /* not JSON */
        }
        console.error(
          "partner-media upload failed",
          xhr.status,
          xhr.responseText,
        );
        if (
          xhr.status === 413 ||
          detail.includes("413") ||
          detail.includes("too large")
        )
          reject(new UploadError("size"));
        else if (
          xhr.status === 415 ||
          detail.includes("mime") ||
          detail.includes("invalid_mime")
        )
          reject(new UploadError("type"));
        else if (
          xhr.status === 401 ||
          xhr.status === 403 ||
          detail.includes("security policy") ||
          detail.includes("unauthorized")
        )
          reject(new UploadError("auth"));
        else reject(new UploadError("server"));
      };
      xhr.onerror = () => reject(new UploadError("network"));
      xhr.onabort = () => reject(new UploadError("cancelled"));
      xhr.send(blob);
    });
  })();
  return {
    promise,
    cancel: () => {
      cancelled = true;
      xhr.abort();
    },
  };
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
