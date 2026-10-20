import type { PropsWithChildren } from 'react';
import Taro, { useLaunch } from '@tarojs/taro';
import { previewMode } from './lib/development-preview';
import './app.css';
export default function App({ children }: PropsWithChildren) {
  useLaunch(() => { if (previewMode) void Taro.navigateTo({ url: '/pages/preview-data/index' }); });
  return children;
}
