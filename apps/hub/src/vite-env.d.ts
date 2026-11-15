/// <reference types="vite/client" />

/** The preview's private data, from src/private (git-ignored). Empty in a real build. */
declare module "virtual:hub-private" {
  const data: { plan: unknown; inbox: unknown };
  export default data;
}
