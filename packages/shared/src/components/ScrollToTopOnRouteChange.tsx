import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { captureReferralFromUrl } from "@shared/lib/referral";

const ScrollToTopOnRouteChange = () => {
  const { pathname, hash, search } = useLocation();

  // Stash any ?r= referral code and strip it from the URL.
  useEffect(() => {
    captureReferralFromUrl();
  }, [pathname, search]);

  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, hash]);

  return null;
};

export default ScrollToTopOnRouteChange;
