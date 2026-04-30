/**
 * colorUtils.js — Color generation and contrast utilities
 *
 * generateColor: Deterministic HSL color from a string seed (username/socketId).
 *   Uses a simple djb2-style hash so the same user always gets the same color
 *   across page refreshes (within the same session seed).
 *
 * getContrastColor: WCAG-compliant contrast check — returns black or white
 *   depending on the background's relative luminance.
 */

/**
 * Simple non-cryptographic string hash (djb2 variant).
 */
function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

/**
 * Generate a vibrant, distinct HSL color from any string seed.
 * Saturation 70–90%, Lightness 50–65% → always vivid, never too dark/washed.
 */
export function generateColor(seed) {
  const hash = hashString(String(seed));
  const hue = hash % 360;
  const saturation = 70 + (hash % 20); // 70–89%
  const lightness = 50 + (hash % 15);  // 50–64%
  return hslToHex(hue, saturation, lightness);
}

/**
 * Convert HSL to hex string.
 */
export function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Parse a hex color string to { r, g, b }.
 */
export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

/**
 * Returns '#000000' or '#ffffff' based on WCAG relative luminance.
 * Ensures readable text on any background color.
 */
export function getContrastColor(hex) {
  const { r, g, b } = hexToRgb(hex);
  // Relative luminance formula from WCAG 2.1
  const luminance = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const L = 0.2126 * luminance(r) + 0.7152 * luminance(g) + 0.0722 * luminance(b);
  return L > 0.179 ? '#000000' : '#ffffff';
}

/**
 * Pre-defined vibrant color palette for the username modal color picker.
 * Hand-picked for diversity and vibrancy on dark backgrounds.
 */
export const PRESET_COLORS = [
  '#e5ff00', // electric yellow (brand accent)
  '#ff4d6d', // coral red
  '#00f5d4', // cyber teal
  '#c77dff', // lavender purple
  '#ff9f1c', // vivid orange
  '#00bbf9', // sky blue
  '#f4f1de', // warm white
  '#06d6a0', // emerald green
];

/**
 * Format timestamp as "X seconds/minutes/hours ago".
 */
export function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
