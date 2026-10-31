import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';
let lastKeyboardHeight = 0;

/** Keyboard overlap with the content viewport, excluding native navigation/tab bars. */
export function keyboardOverlap(height: number, screenHeight: number, windowHeight: number, statusBarHeight: number, menuTop: number, menuHeight: number): number {
  if (height <= 0) return 0;
  const contentTop = statusBarHeight + Math.max(0, menuTop - statusBarHeight) * 2 + menuHeight;
  return Math.max(0, Math.min(height, contentTop + windowHeight - (screenHeight - height)));
}

export default function useKeyboardDock() {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    if (typeof Taro.getEnv !== 'function' || Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) return;
    let height = lastKeyboardHeight;
    const update = () => {
      const info = Taro.getWindowInfo(), menu = Taro.getMenuButtonBoundingClientRect();
      setInset(keyboardOverlap(height, info.screenHeight, info.windowHeight, info.statusBarHeight ?? 0, menu.top, menu.height));
    };
    const change = (event: { height: number }) => { height = lastKeyboardHeight = event.height; update(); };
    Taro.onKeyboardHeightChange(change); Taro.onWindowResize(update);
    update();
    return () => { Taro.offKeyboardHeightChange(change); Taro.offWindowResize(update); };
  }, []);
  return inset;
}
