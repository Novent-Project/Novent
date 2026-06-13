import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, "child"> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, "children"> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };
export function formatGame(raw: string): string {
  if (!raw) return "Unknown Game";
  // AC 1 final version is 1.16.4. Anything starting with 1.16 is AC.
  if (raw.startsWith("1.16")) return "Assetto Corsa";
  // ACC usually reports as a 1.8.x version or just "ACC"
  if (raw.toUpperCase().includes("ACC") || raw.startsWith("1.8")) return "Assetto Corsa Competizione";
  return raw;
}

export function formatName(raw: string): string {
  if (!raw) return "Unknown";

  // 1. Explicit Overrides (For names that the auto-formatter gets slightly wrong)
  const overrides: Record<string, string> = {
    "ks_porsche_919_hybrid": "Porsche 919 Hybrid",
    "ks_red_bull_ring": "Red Bull Ring",
    "imola": "Imola Circuit",
    "spa": "Circuit de Spa-Francorchamps"
    // Add more manual overrides here as you find them!
  };

  if (overrides[raw]) return overrides[raw];

  // 2. Auto-Formatter (Handles 99% of Kunos and Mod content)
  return raw
    .replace(/^ks_/, "")      // Strip official Kunos prefix
    .replace(/^acu_/, "")     // Strip common modding prefix
    .replace(/^rt_/, "")      // Strip Reboot Team prefix
    .split("_")               // Split by underscores
    .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
    .join(" ");               // Stitch back together with spaces
}