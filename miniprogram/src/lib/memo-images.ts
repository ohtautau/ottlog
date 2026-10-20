import Taro from '@tarojs/taro';
import { toolId, type Memo, type MemoImage, type MemoState } from './tool-records';

import { MAX_NOTE_IMAGE_BYTES as MAX_IMAGE_BYTES, isNoteImage, noteStateFits } from './note-image-data';
export { MAX_NOTE_IMAGES as MAX_MEMO_IMAGES } from './note-image-data';
export const memoStateFits = noteStateFits;
export function withMemo(state: MemoState, note: Memo): MemoState {
  return { ...state, notes: [note, ...state.notes.filter(item => item.id !== note.id)] };
}
export const isMemoImage = isNoteImage;
export async function readMemoImage(path: string): Promise<MemoImage> {
  const info = await Taro.getImageInfo({ src: path });
  const longSide = Math.max(info.width, info.height);
  for (const [size, quality] of [[1280, 75], [960, 55], [720, 40]]) {
    const ratio = Math.min(1, size / longSide);
    const compressed = await Taro.compressImage({ src: path, quality, compressedWidth: Math.max(1, Math.round(info.width * ratio)), compressedHeight: Math.max(1, Math.round(info.height * ratio)) });
    const data = await new Promise<string>((resolve, reject) => Taro.getFileSystemManager().readFile({ filePath: compressed.tempFilePath, encoding: 'base64', success: result => resolve(String(result.data)), fail: reject }));
    if (data.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4) continue;
    const mime = data.startsWith('/9j/') ? 'jpeg' : data.startsWith('iVBORw0KGgo') ? 'png' : data.startsWith('UklGR') ? 'webp' : '';
    if (!mime) throw new Error('暂不支持这张图片，请选择 JPG、PNG 或 WebP 图片');
    return { id: toolId(), dataUrl: `data:image/${mime};base64,${data}` };
  }
  throw new Error('图片压缩后仍过大，请裁剪后再插入');
}

export async function previewMemoImages(images: MemoImage[], current: number) {
  const files = Taro.getFileSystemManager();
  // A bounded set of preview files is overwritten on each use. Saved notes keep
  // their image bytes, never temporary device paths, so they survive restarts.
  const urls = await Promise.all(images.map((image, index) => {
    const filePath = `${Taro.env.USER_DATA_PATH}/ottlog-memo-preview-${index}`;
    return new Promise<string>((resolve, reject) => files.writeFile({ filePath, data: image.dataUrl.slice(image.dataUrl.indexOf(',') + 1), encoding: 'base64', success: () => resolve(filePath), fail: reject }));
  }));
  await Taro.previewImage({ current: urls[current], urls });
}
