import { SUPABASE_KEY, SUPABASE_URL } from "./portalClient";

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // matches the partner-media bucket limit

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
export const ACCEPT_ATTR = Object.keys(ALLOWED_TYPES).join(",") + ",.jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.webm";

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
export type UploadErrorReason = "type" | "size" | "network" | "auth" | "cancelled" | "server";

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
  const promise = new Promise<UploadedMedia>((resolve, reject) => {
    const mime = mediaTypeOf(file);
    const kind = ALLOWED_TYPES[mime];
    if (!kind) {
      reject(new UploadError("type"));
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      reject(new UploadError("size"));
      return;
    }
    const ext = Object.entries(EXT_TYPES).find(([, m]) => m === mime)?.[0] ?? (kind === "video" ? "mp4" : "jpg");
    const month = new Date().toISOString().slice(0, 7);
    const path = `${partnerId}/${month}/${crypto.randomUUID()}.${ext}`;

    xhr.open("POST", `${SUPABASE_URL}/storage/v1/object/partner-media/${path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("apikey", SUPABASE_KEY);
    xhr.setRequestHeader("Content-Type", mime);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
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
        detail = `${body.statusCode ?? ""} ${body.error ?? ""} ${body.message ?? ""}`.toLowerCase();
      } catch {
        /* not JSON */
      }
      console.error("partner-media upload failed", xhr.status, xhr.responseText);
      if (xhr.status === 413 || detail.includes("413") || detail.includes("too large")) reject(new UploadError("size"));
      else if (xhr.status === 415 || detail.includes("mime") || detail.includes("invalid_mime")) reject(new UploadError("type"));
      else if (xhr.status === 401 || xhr.status === 403 || detail.includes("security policy") || detail.includes("unauthorized"))
        reject(new UploadError("auth"));
      else reject(new UploadError("server"));
    };
    xhr.onerror = () => reject(new UploadError("network"));
    xhr.onabort = () => reject(new UploadError("cancelled"));
    xhr.send(file);
  });
  return { promise, cancel: () => xhr.abort() };
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
