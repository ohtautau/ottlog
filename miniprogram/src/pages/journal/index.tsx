import Taro, { useDidShow } from '@tarojs/taro';
import { View } from '@tarojs/components';

/** Compatibility for old shares/shortcuts; the article list has one owner. */
export default function JournalRedirect() {
  useDidShow(() => { void Taro.redirectTo({ url: '/pages/articles/index' }); });
  return <View />;
}
