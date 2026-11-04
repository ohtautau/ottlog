import Taro from '@tarojs/taro';

export type NativeAlphaRequest = { canvasId: string; isCurrent: () => boolean };
const cancelled = () => new Error('图片处理已取消');
const unavailable = () => new Error('当前原生 Canvas 不可用，无法保留透明度缩放，请更新微信后重试');
// Every asynchronous SDK step is bounded, including SDKs which never call back.
function bounded<T>(work: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('透明图片处理超时，请重试')), 15000);
    work.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}
export async function nativeAlphaImage(path: string, width: number, height: number, request: NativeAlphaRequest, read: (path: string) => Promise<string>, fits: (data: string) => boolean): Promise<string> {
  const check = () => { if (!request.isCurrent()) throw cancelled(); };
  let node: Taro.Canvas | undefined;
  let image: ReturnType<Taro.Canvas['createImage']> | undefined;
  try {
    check();
    if (typeof Taro.createSelectorQuery !== 'function' || typeof Taro.canvasToTempFilePath !== 'function') throw unavailable();
    node = await bounded(new Promise<Taro.Canvas>((resolve, reject) => {
      Taro.createSelectorQuery().select(`#${request.canvasId}`).fields({ node: true }).exec(results => {
        const candidate = results?.[0]?.node;
        if (!request.isCurrent()) { reject(cancelled()); return; }
        if (!candidate || typeof candidate.createImage !== 'function' || typeof candidate.getContext !== 'function') { reject(unavailable()); return; }
        resolve(candidate);
      });
    }));
    check();
    image = node.createImage();
    await bounded(new Promise<void>((resolve, reject) => {
      image!.onload = () => resolve();
      image!.onerror = () => reject(new Error('透明图片加载失败，请重试'));
      image!.src = path;
    }));
    check();
    const context = node.getContext('2d');
    if (!context || !('clearRect' in context) || typeof context.clearRect !== 'function' || !('drawImage' in context) || typeof context.drawImage !== 'function') throw unavailable();
    for (const size of [1280, 960, 720, 512, 360, 256]) {
      check();
      const ratio = Math.min(1, size / Math.max(width, height));
      const w = Math.max(1, Math.round(width * ratio)), h = Math.max(1, Math.round(height * ratio));
      node.width = w; node.height = h;
      context.clearRect(0, 0, w, h);
      context.drawImage(image, 0, 0, w, h);
      const output = await bounded(Taro.canvasToTempFilePath({ canvas: node, fileType: 'png', x: 0, y: 0, width: w, height: h, destWidth: w, destHeight: h }));
      check();
      const data = await bounded(read(output.tempFilePath));
      check();
      if (!data.startsWith('iVBORw0KGgo')) throw new Error('透明图片未能导出 PNG，请重试');
      if (fits(data)) return data;
    }
    throw new Error('透明图片缩小后仍超过 180KB，请裁剪后再插入');
  } finally {
    if (image) { image.onload = () => {}; image.onerror = () => {}; }
    if (node) { node.width = 1; node.height = 1; }
  }
}
