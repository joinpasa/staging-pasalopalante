import { SUPABASE_KEY, SUPABASE_URL } from "./portalClient";

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // matches the partner-media bucket limit

export interface UploadedMedia {
  path: string;
  type: "image" | "video";
  name: string;
}

export class UploadError extends Error {}

/**
 * Uploads one photo/video into the school's own folder of the private
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
    const isVideo = file.type.startsWith("video/");
    if (!isVideo && !file.type.startsWith("image/")) {
      reject(new UploadError("Only photos and videos can be uploaded."));
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      reject(new UploadError("That file is over 50 MB. Try a shorter clip or a smaller photo."));
      return;
    }
    const ext = (file.name.split(".").pop() || (isVideo ? "mp4" : "jpg")).toLowerCase().replace(/[^a-z0-9]/g, "");
    const month = new Date().toISOString().slice(0, 7);
    const path = `${partnerId}/${month}/${crypto.randomUUID()}.${ext}`;

    xhr.open("POST", `${SUPABASE_URL}/storage/v1/object/partner-media/${path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("apikey", SUPABASE_KEY);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve({ path, type: isVideo ? "video" : "image", name: file.name });
      } else {
        reject(new UploadError("Upload failed."));
      }
    };
    xhr.onerror = () => reject(new UploadError("Upload failed — check your connection."));
    xhr.onabort = () => reject(new UploadError("Upload cancelled."));
    xhr.send(file);
  });
  return { promise, cancel: () => xhr.abort() };
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
