import { PublishedContentClient } from './published-content-client';

interface PublishedContentPageProps {
  readonly params: Promise<{ id: string }>;
}

export default async function PublishedContentPage({ params }: PublishedContentPageProps) {
  const { id } = await params;
  return <PublishedContentClient id={id} />;
}
