import { DraftDetailClient } from './draft-detail-client';

interface DraftDetailPageProps {
  readonly params: Promise<{ id: string }>;
}

export default async function DraftDetailPage({ params }: DraftDetailPageProps) {
  const { id } = await params;
  return <DraftDetailClient id={id} />;
}
