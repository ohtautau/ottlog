import { useEffect, useRef } from 'react';
import { appMessageEpoch, captureAppMessageScope, releaseAppNoticeSource } from '../lib/app-dialog';

/** No layout; unchanged errors never restart the timer. Empty then repeated errors notify again. */
export function useMessageNotice(message?: string, enabled = true) {
  const source = useRef(Symbol());
  const epoch = useRef(appMessageEpoch());
  const scope = useRef<ReturnType<typeof captureAppMessageScope> | null>(null);
  useEffect(() => {
    // Children mount before the page host effect. Defer once, and bind to that page/session.
    const timer = setTimeout(() => {
      if (!message?.trim()) { epoch.current = appMessageEpoch(); scope.current = captureAppMessageScope(); return; }
      if (epoch.current !== appMessageEpoch()) return;
      scope.current ||= captureAppMessageScope();
      if (enabled && message?.trim()) scope.current({ title: message, kind: 'error' }, source.current);
    }, 0);
    return () => { clearTimeout(timer); releaseAppNoticeSource(source.current); };
  }, [message, enabled]);

}

export default function MessageNotice({ message, enabled = true }: { message?: string; enabled?: boolean }) { useMessageNotice(message, enabled); return null; }
