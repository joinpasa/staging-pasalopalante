import { useEffect } from "react";

interface SEOProps {
  title: string;
  description: string;
  path: string;
  image?: string;
  /**
   * Canonical origin override — e.g. a page that should always declare
   * itself canonical to https://passkindnessforward.com regardless of
   * which domain actually served the bytes (both domains serve the same
   * static build; see canonicalDomain.ts). Defaults to pasalopalante.com.
   */
  siteUrl?: string;
  /** One or more JSON-LD objects (e.g. FAQPage, Organization) to embed. */
  schema?: object | object[];
}

const SITE_URL = "https://pasalopalante.com";
const DEFAULT_IMAGE = `${SITE_URL}/social-share.webp`;
const JSON_LD_ID = "seo-json-ld";

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

export default function SEO({ title, description, path, image, siteUrl, schema }: SEOProps) {
  const origin = siteUrl ?? SITE_URL;
  const url = `${origin}${path}`;
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

    let script = document.head.querySelector<HTMLScriptElement>(`script[data-id="${JSON_LD_ID}"]`);
    if (schema) {
      if (!script) {
        script = document.createElement("script");
        script.type = "application/ld+json";
        script.dataset.id = JSON_LD_ID;
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(schema);
    } else if (script) {
      script.remove();
    }
  }, [title, description, url, img, schema]);

  return null;
}
