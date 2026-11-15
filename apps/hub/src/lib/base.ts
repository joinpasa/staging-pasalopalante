// Where the hub is served from. Locally that is "/"; on the website it is "/hub/" (see
// scripts/build-combined.mjs), so every link and picture goes through these two helpers.

export const BASE: string = import.meta.env.BASE_URL || "/";

/** A file in the hub's public folder: asset("kf-logo.webp") → "/hub/kf-logo.webp" on the website. */
export const asset = (file: string) => `${BASE}${file.replace(/^\//, "")}`;

/** A full link to one of the hub's own pages, to copy and send: hubUrl("/kit"). */
export const hubUrl = (page: string) => `${window.location.origin}${BASE.replace(/\/$/, "")}${page}`;
