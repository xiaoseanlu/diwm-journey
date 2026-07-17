import { prototypes as committedPrototypes, type PrototypeEntry } from "./registry";

const localRegistryModules = import.meta.glob<{ localPrototypes?: PrototypeEntry[] }>(
  "./registry.local.tsx",
  { eager: true }
);
const localPrototypes = Object.values(localRegistryModules).flatMap(
  (mod) => mod.localPrototypes ?? []
);

export const prototypes: PrototypeEntry[] = [...committedPrototypes, ...localPrototypes];
