import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Clean raw user-submitted journal entry content before saving to the database.
 * This removes invisible or problematic characters (tabs, Unicode bullets, em dashes)
 * that cause formatting bugs in exported PDFs.
 */
export function cleanJournalEntry(raw: string): string {
  if (!raw) return '';

  return raw
    // Replace Unicode bullet characters and dashes with a regular dash
    .replace(/[\u2022\u2023\u2043\u2219⁃–—−]/g, '-')

    // Replace tabs with two spaces (to preserve basic indentation)
    .replace(/\t/g, '  ')

    // Collapse multiple spaces into a single space
    .replace(/ {2,}/g, ' ')

    // Normalize line breaks (Windows, Mac, etc.)
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')

    // Remove invisible/control characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

    // Trim leading/trailing whitespace from each line
    .split('\n').map(line => line.trimStart()).join('\n')

    // Trim full text
    .trim();
}
