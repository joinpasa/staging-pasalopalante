import { useCallback, useEffect, useRef, useState } from "react";
import { portal } from "./portalClient";
import { useSession } from "./session";
import { mediaTypeOf, uploadMedia, UploadError, type UploadErrorReason, type UploadedMedia } from "./upload";

export type UploadState = "uploading" | "done" | "failed";

export interface UploadItem {
  key: string;
  name: string;
  /** Unknown for files that were uploaded in an earlier session (editing). */
  size?: number;
  /** Present for files picked in this session (needed to retry). */
  file?: File;
  isVideo: boolean;
  state: UploadState;
  progress: number;
  reason?: UploadErrorReason;
  result?: UploadedMedia;
}

/**
 * Tracks the photo/video uploads for one form (Log 1 Act) or one row (Bulk
 * Log): start, progress, cancel, retry, remove. Files upload the moment
 * they're picked so the submit itself stays instant. `initial` seeds it with
 * an act's already-uploaded media when editing a "Needs Changes" act.
 */
export function useUploads(initial: UploadedMedia[] = []) {
  const { partner } = useSession();
  const [items, setItems] = useState<UploadItem[]>(() =>
    initial.map((m) => ({
      key: m.path,
      name: m.name || m.path.split("/").pop() || "file",
      isVideo: m.type === "video",
      state: "done",
      progress: 100,
      result: m,
    })),
  );
  const cancels = useRef(new Map<string, () => void>());

  const patch = (key: string, p: Partial<UploadItem>) =>
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...p } : it)));

  const start = useCallback(
    async (key: string, file: File) => {
      const { data } = await portal.auth.getSession();
      const token = data.session?.access_token;
      if (!partner || !token) {
        patch(key, { state: "failed", reason: "auth" });
        return;
      }
      const { promise, cancel } = uploadMedia(file, partner.id, token, (pct) => patch(key, { progress: pct }));
      cancels.current.set(key, cancel);
      try {
        const result = await promise;
        patch(key, { state: "done", progress: 100, result });
      } catch (e) {
        patch(key, { state: "failed", reason: e instanceof UploadError ? e.reason : "server" });
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
          {
            key,
            name: file.name,
            size: file.size,
            file,
            isVideo: mediaTypeOf(file).startsWith("video/"),
            state: "uploading",
            progress: 0,
          },
        ]);
        void start(key, file);
      }
    },
    [start],
  );

  const retry = useCallback(
    (key: string) => {
      const item = items.find((i) => i.key === key);
      if (!item?.file) return;
      patch(key, { state: "uploading", progress: 0, reason: undefined });
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
