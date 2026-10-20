/** Shared persistent image format and limits; no native APIs in data validation. */
export const MAX_NOTE_IMAGES = 6;
export const MAX_NOTE_IMAGE_BYTES = 180 * 1024;
export function isNoteImage(image: unknown): image is { id: string; dataUrl: string } {
  if (!image || typeof image !== 'object') return false;
  const row = image as { id: string; dataUrl: string };
  return typeof row.id === 'string' && typeof row.dataUrl === 'string' && row.dataUrl.length <= MAX_NOTE_IMAGE_BYTES * 4 / 3 + 100
    && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(row.dataUrl);
}
export function validNoteImages(images: unknown) {
  return images === undefined || Array.isArray(images) && images.length <= MAX_NOTE_IMAGES && images.every(isNoteImage)
    && new Set(images.map(image => image.id)).size === images.length;
}
export function noteStateFits(state: unknown) {
  // Reserve space for the local envelope below the existing 1 MB tool limit.
  return encodeURIComponent(JSON.stringify(state)).replace(/%[A-F\d]{2}/g, '_').length <= 900 * 1024;
}
