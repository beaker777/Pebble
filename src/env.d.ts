/// <reference path="../.astro/types.d.ts" />

interface PebbleMasteryAPI {
  getAll: () => string[];
  has: (slug: string) => boolean;
  toggle: (slug: string) => boolean;
}

declare global {
  interface Window {
    PebbleMastery?: PebbleMasteryAPI;
  }
}

export {};
