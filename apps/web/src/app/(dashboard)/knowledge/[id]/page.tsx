import { KnowledgeDetailClient } from './knowledge-detail-client';

interface KnowledgeDetailPageProps {
  readonly params: Promise<{ id: string }>;
}

export default async function KnowledgeDetailPage({ params }: KnowledgeDetailPageProps) {
  const { id } = await params;
  return <KnowledgeDetailClient id={id} />;
}
