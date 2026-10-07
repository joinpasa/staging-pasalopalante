import { useCallback, useEffect, useRef, useState } from "react";
import { portal } from "./portalClient";
import { useSession } from "./session";
import { uploadMedia, type UploadedMedia } from "./upload";

export type UploadState = "uploading" | "done" | "failed";

export interface UploadItem {
  key: string;
  file: File;
  isVideo: boolean;
  state: UploadState;
  progress: number;
  error?: string;
  result?: UploadedMedia;
}

/**
 * Tracks the photo/video uploads for one form (Log 1 Act) or one row (Bulk
 * Log): start, progress, cancel, retry, remove. Files upload the moment
 * they're picked so the submit itself stays instant.
 */
export function useUploads() {
  const { partner } = useSession();
  const [items, setItems] = useState<UploadItem[]>([]);
  const cancels = useRef(new Map<string, () => void>());

  const patch = (key: string, p: Partial<UploadItem>) =>
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...p } : it)));

  const start = useCallback(
    async (key: string, file: File) => {
      const { data } = await portal.auth.getSession();
      const token = data.session?.access_token;
      if (!partner || !token) {
        patch(key, { state: "failed", error: "Please log in again." });
        return;
      }
      const { promise, cancel } = uploadMedia(file, partner.id, token, (pct) => patch(key, { progress: pct }));
      cancels.current.set(key, cancel);
      try {
        const result = await promise;
        patch(key, { state: "done", progress: 100, result });
      } catch (e) {
        patch(key, { state: "failed", error: e instanceof Error ? e.message : "Upload failed." });
      } finally {
        cancels.current.delete(key);
      }
    },
    [partner],
  );

  const add = useCallback(
    (files: FileList | File[]) => {
      for (const file of Array.from(files)) {
        const key = crypto.randomUUID();
        setItems((prev) => [
          ...prev,
          { key, file, isVideo: file.type.startsWith("video/"), state: "uploading", progress: 0 },
        ]);
        void start(key, file);
      }
    },
    [start],
  );

  const retry = useCallback(
    (key: string) => {
      const item = items.find((i) => i.key === key);
      if (!item) return;
      patch(key, { state: "uploading", progress: 0, error: undefined });
      void start(key, item.file);
    },
    [items, start],
  );

  const remove = useCallback((key: string) => {
    cancels.current.get(key)?.();
    setItems((prev) => prev.filter((i) => i.key !== key));
  }, []);

  useEffect(() => {
    const map = cancels.current;
    return () => map.forEach((cancel) => cancel());
  }, []);

  return {
    items,
    add,
    retry,
    remove,
    uploaded: items.filter((i) => i.state === "done" && i.result).map((i) => i.result!),
    busy: items.some((i) => i.state === "uploading"),
    failed: items.filter((i) => i.state === "failed").length,
  };
}
