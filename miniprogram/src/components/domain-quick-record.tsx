import EntryComposer from './entry-composer';

/** All progress entry points use the shared creator and its account-local draft. */
export default function DomainQuickRecord({ onClose, defaultDomainId }: { onClose: () => void; defaultDomainId?: string }) {
  return <EntryComposer initialMode='progress' initialDomainId={defaultDomainId} onClose={onClose} />;
}
