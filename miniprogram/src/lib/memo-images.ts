import Taro from '@tarojs/taro';
import { nativeAlphaImage, type NativeAlphaRequest } from './native-alpha-canvas';
import { toolId, type Memo, type MemoImage, type MemoState } from './tool-records';

import { MAX_NOTE_IMAGE_BYTES as MAX_IMAGE_BYTES, isNoteImage, noteStateFits } from './note-image-data';
export { MAX_NOTE_IMAGES as MAX_MEMO_IMAGES } from './note-image-data';
export const memoStateFits = noteStateFits;
export function withMemo(state: MemoState, note: Memo): MemoState {
  return { ...state, notes: [note, ...state.notes.filter(item => item.id !== note.id)] };
}
export const isMemoImage = isNoteImage;
// Bound source reads and decoded dimensions before any canvas/compression work.
export const MAX_SOURCE_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_SOURCE_PIXELS = 24 * 1024 * 1024;
const readBase64 = (path: string) => new Promise<string>((resolve, reject) => Taro.getFileSystemManager().readFile({ filePath: path, encoding: 'base64', success: result => resolve(String(result.data)), fail: reject }));
const imageMime = (data: string) => data.startsWith('/9j/') ? 'jpeg' : data.startsWith('iVBORw0KGgo') ? 'png' : data.startsWith('UklGR') ? 'webp' : '';
const fits = (data: string) => Math.floor(data.length * 3 / 4) - (data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0) <= MAX_IMAGE_BYTES;
export async function readMemoImage(path: string, sourceBytes?: number, nativeRequest?: NativeAlphaRequest): Promise<MemoImage> {
  if (!sourceBytes || sourceBytes > MAX_SOURCE_IMAGE_BYTES) throw new Error('图片原文件过大或大小不可用，请选择 12MB 以内的图片');
  const info = await Taro.getImageInfo({ src: path });
  if (!(info.width > 0 && info.height > 0) || info.width * info.height > MAX_SOURCE_PIXELS || Math.max(info.width, info.height) > 16384) throw new Error('图片尺寸过大，请裁剪后再插入');
  const original = await readBase64(path), mime = imageMime(original);
  if (!mime) throw new Error('暂不支持这张图片，请选择 JPG、PNG 或 WebP 图片');
  const longSide = Math.max(info.width, info.height);
  // PNG/WebP may contain alpha. Never send them through native compressImage,
  // whose contract supplies no alpha-preserving output format selection.
  if (mime !== 'jpeg' && fits(original) && longSide <= 1280) return { id: toolId(), dataUrl: `data:image/${mime};base64,${original}` };
  if (mime !== 'jpeg' && Taro.getEnv() !== Taro.ENV_TYPE.WEB) {
    if (!nativeRequest) throw new Error('当前原生 Canvas 不可用，无法保留透明度缩放');
    const data = await nativeAlphaImage(path, info.width, info.height, nativeRequest, readBase64, fits);
    return { id: toolId(), dataUrl: `data:image/png;base64,${data}` };
  }
  for (const [size, quality] of [[1280, 75], [960, 55], [720, 40]]) {
    const ratio = Math.min(1, size / longSide);
    const compressed = await Taro.compressImage({ src: path, quality, compressedWidth: Math.max(1, Math.round(info.width * ratio)), compressedHeight: Math.max(1, Math.round(info.height * ratio)) });
    const data = await readBase64(compressed.tempFilePath), outputMime = imageMime(data);
    if (!fits(data)) continue;
    if (!outputMime || mime !== 'jpeg' && outputMime === 'jpeg') throw new Error('图片透明格式未能保留，请缩小原图后重试');
    return { id: toolId(), dataUrl: `data:image/${outputMime};base64,${data}` };
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
