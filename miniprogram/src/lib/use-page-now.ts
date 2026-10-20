import { useEffect, useState } from 'react';
import { useDidHide, useDidShow } from '@tarojs/taro';

/** Refresh local-day projections on return and while the page remains visible. */
export default function usePageNow(): number {
  const [, setNow] = useState(Date.now);
  const [visible, setVisible] = useState(true);
  useDidShow(() => { setNow(Date.now()); setVisible(true); });
  useDidHide(() => setVisible(false));
  useEffect(() => {
    if (!visible) return;
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, [visible]);
  // A just-saved record can be newer than the last minute tick.
  return Date.now();
}
