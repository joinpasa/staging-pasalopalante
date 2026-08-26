import { useEffect } from "react";

interface SEOProps {
  title: string;
  description: string;
  path: string;
  image?: string;
}

const SITE_URL = "https://pasalopalante.com";
const DEFAULT_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/nBBqTqafpbTS4KRb7ci12U6orRD2/social-images/social-1780335651701-social-1773740565066-Untitled-1.webp";

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export default function SEO({ title, description, path, image }: SEOProps) {
  const url = `${SITE_URL}${path}`;
  const img = image ?? DEFAULT_IMAGE;

  useEffect(() => {
    document.title = title;
    setMeta("name", "description", description);
    setLink("canonical", url);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", url);
    setMeta("property", "og:image", img);
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", img);
  }, [title, description, url, img]);

  return null;
}
