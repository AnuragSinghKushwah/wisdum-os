import { OpportunityDetailClient } from './opportunity-detail-client';

interface OpportunityDetailPageProps {
  readonly params: Promise<{ id: string }>;
}

export default async function OpportunityDetailPage({ params }: OpportunityDetailPageProps) {
  const { id } = await params;
  return <OpportunityDetailClient id={id} />;
}
