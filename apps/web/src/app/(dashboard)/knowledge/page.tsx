'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, apiFetch } from '../../../lib/api-client';
import { useAuth } from '../../../lib/auth-context';

interface KnowledgeContentReferenceDto {
  readonly reference: string;
  readonly mimeType: string | null;
}

interface KnowledgeDto {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly description?: string;
  readonly status: string;
  readonly type: string;
  readonly visibility: string;
  readonly labels?: readonly string[];
  readonly contentReferences?: readonly KnowledgeContentReferenceDto[];
  readonly createdAt?: string;
  readonly updatedAt: string;
  readonly properties?: Record<string, string>;
}

const KNOWLEDGE_TYPES = [
  'note',
  'document',
  'webpage',
  'repository',
  'pdf',
  'markdown',
  'image',
  'video',
  'audio',
  'dataset',
  'conversation',
] as const;

const VISIBILITIES = ['private', 'workspace', 'public'] as const;

export default function KnowledgePage() {
  const { session } = useAuth();
  const [items, setItems] = useState<readonly KnowledgeDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Detail State
  const [selectedAsset, setSelectedAsset] = useState<KnowledgeDto | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<(typeof KNOWLEDGE_TYPES)[number]>('note');
  const [visibility, setVisibility] = useState<(typeof VISIBILITIES)[number]>('private');
  const [isCreating, setIsCreating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Upload/Ingest File States
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function renderStatusBadge(val?: string) {
    const status = val || 'active';
    if (status === 'completed' || status === 'active') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
          ● Active
        </span>
      );
    }
    if (status === 'failed') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold bg-rose-500/10 text-rose-700 dark:text-rose-450 border border-rose-500/20">
          ● Failed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-455 border border-amber-500/20 animate-pulse">
        ● Pending
      </span>
    );
  }

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiFetch<readonly KnowledgeDto[]>('/v1/knowledge');
      setItems(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load knowledge assets.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function validateInput(mediumType: string, textContent: string): string | null {
    const trimmed = textContent.trim();
    if (trimmed.length === 0) return null;

    if (mediumType === 'webpage' || mediumType === 'pdf') {
      if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        return 'For webpage/PDF medium, content must be a valid URL starting with http:// or https://';
      }
    }
    if (mediumType === 'video') {
      if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        return 'For video medium, content must be a valid URL starting with http:// or https://';
      }
    }
    return null;
  }

  useEffect(() => {
    setValidationError(validateInput(type, content));
  }, [type, content]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const checkError = validateInput(type, content);
    if (checkError) {
      setValidationError(checkError);
      return;
    }

    setIsCreating(true);
    setError(null);
    try {
      const { knowledgeId } = await apiFetch<{ knowledgeId: string }>('/v1/knowledge', {
        method: 'POST',
        body: { title, type, visibility, sourceKind: 'manual' },
      });

      if (content.trim().length > 0) {
        const { documentId } = await apiFetch<{ documentId: string }>('/v1/documents', {
          method: 'POST',
          body: { content, mimeType: 'text/plain', encoding: 'utf-8' },
        });
        await apiFetch(`/v1/knowledge/${knowledgeId}/content`, {
          method: 'POST',
          body: { reference: documentId, mimeType: 'text/plain' },
        });
      }

      setTitle('');
      setContent('');
      setType('note');
      setVisibility('private');
      setValidationError(null);
      setIsModalOpen(false);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to create knowledge asset.');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUploadSubmit() {
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
      const headers: Record<string, string> = {};
      if (session?.token) {
        headers.authorization = `Bearer ${session.token}`;
      }
      headers['x-tenant-id'] = session?.tenantId ?? '00000000-0000-4000-8000-000000000001';

      const response = await fetch(`${API_URL}/v1/knowledge/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        const errData = text ? JSON.parse(text) : {};
        throw new Error(errData.message ?? `Ingest failed with status ${response.status}`);
      }

      setIsUploadModalOpen(false);
      setSelectedFile(null);
      await load();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Ingestion failed.');
    } finally {
      setIsUploading(false);
    }
  }

  const filteredItems = items.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 border-b border-neutral-200/60 dark:border-neutral-800/60 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">Knowledge Base</h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 max-w-xl leading-relaxed">
            Ingest raw notes, webpage URLs, YouTube scripts, datasets, and markdown assets directly into your active reasoning graph.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setUploadError(null);
              setIsUploadModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-250 dark:border-neutral-800 px-5 py-2.5 text-xs font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
          >
            📥 Ingest File
          </button>

          <button
            type="button"
            onClick={() => {
              setError(null);
              setValidationError(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:opacity-95 transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
          >
            <svg className="h-4 w-4 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Asset
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Filter assets by title, type, or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-md rounded-xl border border-neutral-250 dark:border-neutral-800 px-4 py-2 bg-white dark:bg-neutral-900 text-xs focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500 focus:outline-none transition-all"
        />
        <span className="text-xs font-semibold text-neutral-400">
          Showing {filteredItems.length} of {items.length} assets
        </span>
      </div>

      {error !== null && (
        <div className="rounded-xl bg-rose-500/5 dark:bg-rose-950/10 border border-rose-500/20 p-4 text-sm font-medium text-rose-700 dark:text-rose-455 flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Grid Dashboard items */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="h-[148px] rounded-2xl border border-neutral-200/60 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-900/10 animate-pulse"
            />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 bg-white/40 dark:bg-neutral-950/20">
          <span className="text-3xl block">🗂️</span>
          <p className="mt-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">No knowledge assets found</p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto leading-relaxed">
            Ingest raw text notes or configure data connectors to build out your cognitive index.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const desc = item.description || item.properties?.description || 'No description provided.';
            return (
              <div
                key={item.id}
                onClick={() => setSelectedAsset(item)}
                className="group flex flex-col justify-between rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 shadow-sm hover:shadow-md hover:border-neutral-300 dark:hover:border-neutral-750 transition-all duration-200 cursor-pointer"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 rounded px-1.5 py-0.5 font-mono">
                      {item.type}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 border ${
                      item.visibility === 'public'
                        ? 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20'
                        : item.visibility === 'workspace'
                        ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 border-neutral-200 dark:border-neutral-750'
                    }`}>
                      {item.visibility}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white line-clamp-1 group-hover:text-amber-600 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-450 line-clamp-2 leading-relaxed">
                    {desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-900/60 flex items-center justify-between">
                  <span className="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">
                    {new Date(item.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                  {renderStatusBadge(item.status || item.properties?.parsingStatus)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Asset Detail Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-950/95 p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-900 pb-3">
              <h3 className="text-base font-extrabold text-neutral-900 dark:text-white">{selectedAsset.title}</h3>
              <button
                onClick={() => setSelectedAsset(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-250 cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-bold text-neutral-400 uppercase text-[10px]">ID:</span>{' '}
                <span className="font-mono text-neutral-700 dark:text-neutral-300">{selectedAsset.id}</span>
              </div>
              <div>
                <span className="font-bold text-neutral-400 uppercase text-[10px]">Type:</span>{' '}
                <span className="font-semibold capitalize">{selectedAsset.type}</span>
              </div>
              <div>
                <span className="font-bold text-neutral-400 uppercase text-[10px]">Visibility:</span>{' '}
                <span className="font-semibold capitalize">{selectedAsset.visibility}</span>
              </div>
              <div>
                <span className="font-bold text-neutral-400 uppercase text-[10px]">Status:</span>{' '}
                <span className="font-semibold capitalize">{selectedAsset.status}</span>
              </div>
              {selectedAsset.description && (
                <div>
                  <span className="font-bold text-neutral-400 uppercase text-[10px]">Description:</span>
                  <p className="mt-1 text-neutral-700 dark:text-neutral-300 leading-relaxed bg-neutral-50 dark:bg-neutral-900 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800">
                    {selectedAsset.description}
                  </p>
                </div>
              )}
              {selectedAsset.contentReferences && selectedAsset.contentReferences.length > 0 && (
                <div>
                  <span className="font-bold text-neutral-400 uppercase text-[10px]">Attached Content References:</span>
                  <ul className="mt-1 space-y-1 font-mono text-[11px] text-amber-600 dark:text-amber-400">
                    {selectedAsset.contentReferences.map((ref) => (
                      <li key={ref.reference} className="bg-amber-500/5 p-2 rounded border border-amber-500/20">
                        📄 Document ID: {ref.reference} ({ref.mimeType ?? 'text/plain'})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-neutral-100 dark:border-neutral-900">
              <button
                onClick={() => setSelectedAsset(null)}
                className="rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 px-4 py-2 text-xs font-bold shadow cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Input Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-950/95 p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-900 pb-3">
              <h3 className="text-base font-extrabold text-neutral-900 dark:text-white">Ingest Raw Knowledge</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-250 cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                  Asset Title
                  <input
                    type="text"
                    placeholder="e.g. Q3 Roadmap Review"
                    className="w-full rounded-xl border border-neutral-250/70 dark:border-neutral-800 px-3.5 py-2 bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500 focus:outline-none transition-all"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    required
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                  Visibility
                  <select
                    className="w-full rounded-xl border border-neutral-250/70 dark:border-neutral-800 px-3 py-2 bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500 focus:outline-none transition-all cursor-pointer"
                    value={visibility}
                    onChange={(event) => setVisibility(event.target.value as (typeof VISIBILITIES)[number])}
                  >
                    {VISIBILITIES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="flex flex-col gap-1.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                Medium Type
                <select
                  className="w-full rounded-xl border border-neutral-250/70 dark:border-neutral-800 px-3 py-2 bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500 focus:outline-none transition-all cursor-pointer"
                  value={type}
                  onChange={(event) => setType(event.target.value as (typeof KNOWLEDGE_TYPES)[number])}
                >
                  {KNOWLEDGE_TYPES.map((option) => (
                    <option key={option} value={option}>
                      {option.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                {type === 'webpage' || type === 'pdf' || type === 'video'
                  ? 'Source URL / Link'
                  : 'Source Content (Raw Text, CSV rows, or JSON logs)'}
                <textarea
                  className="min-h-32 w-full rounded-xl border border-neutral-250/70 dark:border-neutral-800 px-3 py-2 bg-transparent font-mono text-xs focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500 focus:outline-none transition-all leading-relaxed"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder={
                    type === 'webpage'
                      ? 'https://example.com/article'
                      : type === 'pdf'
                      ? 'https://example.com/manual.pdf'
                      : type === 'video'
                      ? 'https://youtube.com/watch?v=...'
                      : 'Paste note text, datasets or logs here.'
                  }
                  required={type === 'webpage' || type === 'pdf' || type === 'video'}
                />
              </label>

              {validationError && (
                <div className="rounded-lg bg-rose-500/5 border border-rose-500/20 p-2.5 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                  ⚠️ {validationError}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-neutral-100 dark:border-neutral-800 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-neutral-200 dark:border-neutral-800 px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || validationError !== null}
                  className="rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 px-5 py-2 text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer shadow-md"
                >
                  {isCreating ? 'Ingesting…' : 'Ingest to Graph'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Ingestion Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-950/95 p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-900 pb-3">
              <h3 className="text-base font-extrabold text-neutral-900 dark:text-white">Ingest Local Document</h3>
              <button
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setSelectedFile(null);
                  setUploadError(null);
                }}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-250 cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {uploadError && (
              <div className="text-xs text-rose-600 bg-rose-50/5 border border-rose-500/20 p-3 rounded-xl">
                ⚠️ {uploadError}
              </div>
            )}

            <div className="space-y-4">
              <div className="border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl p-8 text-center bg-neutral-50/20 dark:bg-neutral-950/10 hover:border-neutral-350 transition-colors relative cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,.txt,.md"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                      setUploadError(null);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <span className="text-3xl block">📤</span>
                {selectedFile ? (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate max-w-xs mx-auto">
                      {selectedFile.name}
                    </p>
                    <p className="text-[10px] text-neutral-400 font-mono">
                      {Math.round(selectedFile.size / 1024)} KB
                    </p>
                  </div>
                ) : (
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-neutral-850 dark:text-neutral-250">
                      Choose a file or drag it here
                    </p>
                    <p className="text-[10px] text-neutral-400 mt-0.5 leading-relaxed">
                      Supports PDF, TXT, or MD files (Max 10MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-neutral-100 dark:border-neutral-900">
              <button
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setSelectedFile(null);
                  setUploadError(null);
                }}
                disabled={isUploading}
                className="rounded-xl border border-neutral-200 dark:border-neutral-800 px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleUploadSubmit()}
                disabled={isUploading || !selectedFile}
                className="rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 px-5 py-2 text-xs font-bold shadow-md hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isUploading ? 'Ingesting…' : 'Ingest Document'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
