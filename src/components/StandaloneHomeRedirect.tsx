import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * People who installed the app from the website already have a home-screen
 * icon whose start_url may still be "/" (manifest values are cached at install
 * time). When the app launches standalone on the marketing homepage, send them
 * straight to the app home at /app instead.
 */
export default function StandaloneHomeRedirect() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (pathname !== "/") return;
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (!standalone) return;
    navigate(`/app${search}`, { replace: true });
  }, [pathname, search, navigate]);

  return null;
}
