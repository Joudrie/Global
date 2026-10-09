// Virtual modules from the world-map Vite plugin (scripts/world-paths.mjs).
declare module "virtual:world-coarse" {
  /** "0 0 1010 666" */
  export const WORLD_VIEWBOX: string
  /** [country id, path] for the whole world, in drawing order. */
  export const WORLD_COARSE: [string, string][]
}

declare module "virtual:world-outlines" {
  export const WORLD_VIEWBOX: string
  /** Country id → its own chunk holding the detailed path. */
  export const OUTLINES: Record<string, () => Promise<{ default: string }>>
}
