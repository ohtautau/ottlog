import ToolWorkspace from '@/components/tool-workspace';
export const metadata = { title: '领域详情' };
export default async function DomainDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ToolWorkspace page='domain-detail' query={id === 'uncategorized' ? 'uncategorized=1' : `id=${encodeURIComponent(id)}`} />;
}
