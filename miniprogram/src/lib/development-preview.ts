// Fixed at build time. Ordinary builds keep the original storage and account.
export const previewMode = typeof MINIPROGRAM_PREVIEW !== 'undefined' && MINIPROGRAM_PREVIEW;
export const previewStorageKey = (key: string) => previewMode ? `ottlog-mini-preview-v1:${key}` : key;
