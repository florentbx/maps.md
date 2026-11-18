// The catalog of types of maps.md (skills/maps/types/), bundled into the plugin by build.ts: each type by its name,
// with the texts of its definition, its layout and its style.
declare module 'maps-md:catalog' {
  const types: Record<string, { md: string; layout?: string; css?: string }>;
  export default types;
}
