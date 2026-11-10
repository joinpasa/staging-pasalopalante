import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * A page that was open before a deploy still points at the old, hashed
 * JavaScript files, which no longer exist once the new build is live. The
 * next navigation that needs one of them fails with one of these messages.
 * That is not a real bug, just a stale tab, so reload once to pick up the
 * new build instead of showing an error.
 */
const STALE_CHUNK = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS|ChunkLoadError|Loading chunk [\w-]+ failed/i;
const RELOAD_KEY = "ppl-stale-chunk-reload";

/** Reloads the page once per 30 s for a stale-build error. True if it reloaded. */
export function reloadOnceForStaleBuild(error: unknown): boolean {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error ?? "");
  if (!STALE_CHUNK.test(message)) return false;
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < 30_000) return false; // already tried: show the normal error screen
    window.sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

/**
 * Without this, any render-time error anywhere in the tree (a bad value, a
 * third-party library edge case on some phone's browser, a race condition)
 * unmounts the entire app to a blank white screen with no way back short of
 * force-quitting and reopening — which is exactly what a "can't access my
 * QR code" / "the app just doesn't load" report looks like from the outside.
 * This contains that to the one screen and offers a reload instead.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (reloadOnceForStaleBuild(error)) return;
    console.error("Uncaught render error", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-warm-cream px-6 text-center">
          <p className="text-lg font-semibold text-foreground">Something went wrong.</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Give it another try — your account and progress are safe either way.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
