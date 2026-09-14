import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
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
