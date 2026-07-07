interface KnowledgeDetailPageProps {
  readonly params: Promise<{ id: string }>;
}

export default async function KnowledgeDetailPage({ params }: KnowledgeDetailPageProps) {
  const { id } = await params;
  return (
    <div>
      <h1 className="text-2xl font-semibold">Knowledge asset</h1>
      <p className="mt-2 text-neutral-500">
        Viewing asset <span className="font-mono">{id}</span>. This is a routing shell.
      </p>
    </div>
  );
}
