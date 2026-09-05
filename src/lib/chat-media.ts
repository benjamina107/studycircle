export const MEDIA_LIMIT = 10 * 1024 * 1024;
export function mediaError(files: readonly { size: number; type: string }[]): string | null {
  if (files.length > 5) return "Choose up to 5 files at a time.";
  if (files.some(file => !["image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain"].includes(file.type))) return "Choose a JPG, PNG, WebP, PDF, or text file.";
  if (files.some(file => file.size === 0 || file.size > MEDIA_LIMIT)) return "Each file must contain data and be 10 MB or smaller.";
  return null;
}
