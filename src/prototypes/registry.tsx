import type { ComponentType, ReactNode } from "react";

// Prototype registry — committed + team-shared entries.
//
// This file starts EMPTY in a freshly scaffolded prototype. It's the
// share-with-the-team registry; per-user flows go in `registry.local.tsx`
// (gitignored). The merge happens in `index.ts`.
//
// When you want to promote a local flow so teammates see it on a fresh
// clone of this prototype, move the flow file from `local/` into a new
// `examples/` folder you create, then add its entry here.

export type Platform = "web" | "mweb" | "ios" | "android";

export type PrototypeEntry = {
  slug: string;
  title: string;
  description: string;
  section: string;
  platforms: Partial<Record<Platform, PlatformEntry>>;
};

export type PlatformEntry = {
  route: string;
  render: () => ReactNode;
};

export type FlowComponent = ComponentType<Record<string, never>>;

export const prototypes: PrototypeEntry[] = [];
