'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiFetch } from '../../../../lib/api-client';

interface ContentDraftDto {
  readonly id: string;
  readonly opportunityId: string;
  readonly title: string;
  readonly body: string;
  readonly status: string;
  readonly updatedAt: string;
}

interface PublishResult {
  readonly publishedId: string;
  readonly slug: string;
  readonly externalUrl?: string;
}

export function DraftDetailClient({ id }: { id: string }) {
  const [draft, setDraft] = useState<ContentDraftDto | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [bodyDraft, setBodyDraft] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [published, setPublished] = useState<PublishResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [oppType, setOppType] = useState<string>('blog_post');
  const [activeEditorTab, setActiveEditorTab] = useState<'rich' | 'source'>('rich');
  const [currentSlide, setCurrentSlide] = useState(0);

  // Structured workspace states
  const [slides, setSlides] = useState<string[]>([]);
  const [scriptHook, setScriptHook] = useState('');
  const [scriptDialogue, setScriptDialogue] = useState('');
  const [scriptHashtags, setScriptHashtags] = useState('');
  const [higgsfieldPrompt, setHiggsfieldPrompt] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedDraft, setCopiedDraft] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const found = await apiFetch<ContentDraftDto>(`/v1/drafts/${id}`);
      setDraft(found);
      setTitleDraft(found.title);
      setBodyDraft(found.body);

      // Resolve opportunity type
      try {
        const opp = await apiFetch<{ type: string }>(`/v1/opportunities/${found.opportunityId}`);
        setOppType(opp.type);
      } catch {
        setOppType('blog_post');
      }

      // Parse structured states
      let displayBody = found.body;
      if (found.body.startsWith('---')) {
        const parts = found.body.split('---');
        if (parts.length >= 3) {
          displayBody = parts.slice(2).join('---').trim();
        }
      }

      // Parse Slides
      const parsedSlides = displayBody
        .split('---')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      setSlides(parsedSlides.length > 0 ? parsedSlides : ['# Slide 1\n- Point A\n- Point B']);

      // Parse Video Scripts
      const lines = displayBody
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      const hookLines = lines.filter(
        (l) => !l.startsWith('#') && !l.startsWith('**') && !l.startsWith('*Host'),
      );
      const dialogueLines = lines.filter((l) => l.startsWith('*Host') || l.startsWith('**['));
      const hashtagLine = lines.find((l) => l.includes('#') && !l.startsWith('# '));

      setScriptHook(
        hookLines.slice(0, 3).join('\n') || 'Enter your video hook/intro paragraph here.',
      );
      setScriptDialogue(
        dialogueLines.join('\n') ||
          '*Host*: Welcome to the video script.\n**[Visual: Camera pans to host]**',
      );
      setScriptHashtags(hashtagLine || '#AI #KnowledgeOS #DeveloperLeverage');

      // Dynamic Higgsfield Video Generation Prompt construction
      setHiggsfieldPrompt(
        `Dynamic Higgsfield motion graphics style: photorealistic digital neural connection nodes glowing in gold and cyan, concept lines spreading across a dark sleek grid, cinematic camera zoom and rotations, high contrast, smooth 60fps render.`,
      );
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Failed to load this draft.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Serializes structured editor fields back to Markdown before saving
  async function handleSave() {
    setIsSaving(true);
    setError(null);

    let finalBody = bodyDraft;

    // Serialize LinkedIn Post/Carousel
    if (oppType === 'linkedin_post' || oppType === 'marketing_campaign') {
      finalBody = [
        '---',
        `title: "${titleDraft}"`,
        'seo_description: "Ingested Carousel Deck"',
        'seo_keywords: "Carousel, Slide Deck"',
        'target_audience: "LinkedIn Network"',
        '---',
        '',
        slides.join('\n\n---\n\n'),
      ].join('\n');
    }
    // Serialize YouTube Video Script
    else if (oppType === 'youtube_script' || oppType === 'podcast_outline') {
      finalBody = [
        '---',
        `title: "${titleDraft}"`,
        'seo_description: "Video script dialogue log"',
        'seo_keywords: "Script, Teleprompter"',
        'target_audience: "Video Viewers"',
        '---',
        '',
        '# Hook & Intro',
        scriptHook,
        '',
        '# Script Dialogue & Visuals',
        scriptDialogue,
        '',
        scriptHashtags,
      ].join('\n');
    }

    try {
      await apiFetch(`/v1/drafts/${id}`, {
        method: 'PUT',
        body: { title: titleDraft, body: finalBody },
      });
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Failed to save this draft.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleCopyDraft() {
    void navigator.clipboard.writeText(bodyDraft).then(() => {
      setCopiedDraft(true);
      setTimeout(() => setCopiedDraft(false), 2000);
    });
  }

  async function handlePublish() {
    setIsPublishing(true);
    setError(null);
    try {
      const result = await apiFetch<PublishResult>(`/v1/drafts/${id}/publish`, { method: 'POST' });
      setPublished(result);
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Failed to publish this draft.');
    } finally {
      setIsPublishing(false);
    }
  }

  function handleExportMarkdown() {
    const blob = new Blob([`# ${titleDraft}\n\n${bodyDraft}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${titleDraft.replace(/\s+/g, '-').toLowerCase() || 'draft'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportPDF() {
    window.print();
  }

  // Helper to copy Higgsfield prompt to clipboard
  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(higgsfieldPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  // Helper for Markdown editor quick actions
  const insertMarkdown = (syntax: string) => {
    const textarea = document.getElementById('markdown-editor') as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const selected = text.substring(start, end) || 'text';

    let replacement = '';
    if (syntax === 'bold') replacement = `**${selected}**`;
    else if (syntax === 'italic') replacement = `*${selected}*`;
    else if (syntax === 'h1') replacement = `# ${selected}`;
    else if (syntax === 'h2') replacement = `## ${selected}`;
    else if (syntax === 'code') replacement = `\`\`\`typescript\n${selected}\n\`\`\``;
    else if (syntax === 'mermaid')
      replacement = `\`\`\`mermaid\ngraph TD\n  A[Start] --> B[Process]\n\`\`\``;

    setBodyDraft(before + replacement + after);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 50);
  };

  function renderPreview() {
    let displayBody = bodyDraft;
    const frontmatter: Record<string, string> = {};

    if (bodyDraft.startsWith('---')) {
      const parts = bodyDraft.split('---');
      if (parts.length >= 3) {
        displayBody = parts.slice(2).join('---').trim();
        parts[1].split('\n').forEach((line) => {
          const colonIdx = line.indexOf(':');
          if (colonIdx > 0) {
            const key = line.slice(0, colonIdx).trim();
            const val = line
              .slice(colonIdx + 1)
              .trim()
              .replace(/^["']|["']$/g, '');
            if (key) frontmatter[key] = val;
          }
        });
      }
    }

    if (oppType === 'linkedin_post' || oppType === 'marketing_campaign') {
      const slideIndex = Math.min(currentSlide, slides.length - 1);
      const slideText = slides[slideIndex] || '';
      const lines = slideText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      const slideHeader = lines[0] || 'Slide';
      const slideContent = lines.slice(1);

      return (
        <div className="flex flex-col h-full justify-between min-h-[350px]">
          <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
            <span className="font-semibold uppercase text-neutral-500">Carousel Preview</span>
            <span>
              Slide {slideIndex + 1} of {slides.length}
            </span>
          </div>

          <div className="flex-1 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 p-8 flex flex-col justify-center items-center text-center shadow-lg border border-slate-800 min-h-[250px]">
            <h3 className="text-xl sm:text-2xl font-bold text-white leading-snug max-w-md">
              {slideHeader.replace(/^#+\s*/, '')}
            </h3>
            {slideContent.length > 0 && (
              <ul className="mt-4 text-sm text-neutral-300 space-y-2 max-w-sm">
                {slideContent.map((line, idx) => (
                  <li key={idx} className="flex items-center justify-center gap-1.5">
                    <span>{line.replace(/^-\s*/, '')}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4 flex justify-between gap-4">
            <button
              onClick={() => setCurrentSlide((prev) => Math.max(0, prev - 1))}
              disabled={slideIndex === 0}
              className="px-3 py-1.5 text-xs font-semibold rounded border border-neutral-300 dark:border-neutral-700 disabled:opacity-50 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentSlide((prev) => Math.min(slides.length - 1, prev + 1))}
              disabled={slideIndex === slides.length - 1}
              className="px-3 py-1.5 text-xs font-semibold rounded bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      );
    }

    if (oppType === 'youtube_script' || oppType === 'podcast_outline') {
      const lines = scriptDialogue
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      return (
        <div className="flex flex-col h-full min-h-[350px] gap-3">
          <div className="text-xs text-neutral-400 uppercase font-semibold">
            Teleprompter / Script Preview
          </div>
          <div className="border border-neutral-100 dark:border-neutral-800 rounded-lg p-3 bg-neutral-50/50 dark:bg-neutral-950/20 max-h-[120px] overflow-y-auto">
            <span className="text-[10px] text-neutral-400 uppercase font-bold">Hook & Intro</span>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 italic mt-1 leading-relaxed">
              {scriptHook}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[220px] pr-2 space-y-3 border border-neutral-100 dark:border-neutral-800 rounded-lg p-3 bg-neutral-50/50 dark:bg-neutral-950/20">
            <span className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
              Timeline & Speech
            </span>
            {lines.map((line, idx) => {
              if (line.startsWith('#')) {
                return (
                  <h4
                    key={idx}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-2 uppercase tracking-wider border-b border-neutral-100 dark:border-neutral-850 pb-1"
                  >
                    {line.replace(/^#+\s*/, '')}
                  </h4>
                );
              }
              if (line.startsWith('**[')) {
                return (
                  <div
                    key={idx}
                    className="text-[10px] italic bg-neutral-100 dark:bg-neutral-800/65 text-neutral-500 rounded px-2 py-1 border-l border-neutral-400"
                  >
                    {line.replace(/^\*\*\[|\]\*\*$/g, '')}
                  </div>
                );
              }
              if (line.startsWith('*Host')) {
                const speech = line.replace(/^\*Host.*?\*:/, '').trim();
                return (
                  <div key={idx} className="flex gap-2">
                    <span className="text-[8px] font-bold uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded px-1 py-0.5 h-fit mt-0.5">
                      Host
                    </span>
                    <p className="text-xs leading-relaxed text-neutral-700 dark:text-neutral-300 font-mono">
                      {speech}
                    </p>
                  </div>
                );
              }
              return (
                <p
                  key={idx}
                  className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400"
                >
                  {line}
                </p>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full min-h-[350px] overflow-y-auto max-h-[450px] pr-2">
        {Object.keys(frontmatter).length > 0 && (
          <div className="mb-6 rounded-lg bg-neutral-50 dark:bg-neutral-950 p-4 border border-neutral-100 dark:border-neutral-900 text-xs">
            <span className="font-semibold text-neutral-400 uppercase tracking-wider text-[10px] block mb-2">
              SEO & Metadata
            </span>
            <div className="grid grid-cols-1 gap-2">
              {frontmatter.title && (
                <div>
                  <span className="font-semibold text-neutral-500">Title:</span> {frontmatter.title}
                </div>
              )}
              {frontmatter.seo_description && (
                <div>
                  <span className="font-semibold text-neutral-500">Description:</span>{' '}
                  {frontmatter.seo_description}
                </div>
              )}
              {frontmatter.seo_keywords && (
                <div>
                  <span className="font-semibold text-neutral-500">Keywords:</span>{' '}
                  {frontmatter.seo_keywords}
                </div>
              )}
              {frontmatter.target_audience && (
                <div>
                  <span className="font-semibold text-neutral-500">Audience:</span>{' '}
                  {frontmatter.target_audience}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="prose prose-sm dark:prose-invert max-w-none text-neutral-700 dark:text-neutral-300">
          {displayBody.split('\n').map((line, idx) => {
            const trimmed = line.trim();
            if (trimmed.startsWith('# ')) {
              return (
                <h1
                  key={idx}
                  className="text-xl font-bold mt-4 mb-2 text-neutral-900 dark:text-neutral-50 border-b pb-1 border-neutral-100 dark:border-neutral-800"
                >
                  {trimmed.replace('# ', '')}
                </h1>
              );
            }
            if (trimmed.startsWith('## ')) {
              return (
                <h2
                  key={idx}
                  className="text-lg font-semibold mt-4 mb-2 text-neutral-900 dark:text-neutral-100"
                >
                  {trimmed.replace('## ', '')}
                </h2>
              );
            }
            if (trimmed.startsWith('### ')) {
              return (
                <h3
                  key={idx}
                  className="text-base font-semibold mt-3 mb-1 text-neutral-800 dark:text-neutral-200"
                >
                  {trimmed.replace('### ', '')}
                </h3>
              );
            }
            if (trimmed.startsWith('```mermaid')) {
              return null;
            }
            if (
              trimmed.startsWith('graph ') ||
              trimmed.startsWith('sequenceDiagram') ||
              (trimmed.includes('-->') && !line.includes('http'))
            ) {
              return (
                <div
                  key={idx}
                  className="my-4 rounded-lg bg-neutral-900 text-neutral-200 border border-neutral-850 p-4 font-mono text-[11px] overflow-x-auto shadow-inner flex flex-col gap-1.5"
                >
                  <span className="text-[10px] text-amber-500 uppercase tracking-widest font-semibold">
                    Mermaid Graph Structure
                  </span>
                  <div className="border-t border-neutral-800 pt-1.5 leading-normal">{trimmed}</div>
                </div>
              );
            }
            if (trimmed === '```') return null;
            if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
              return (
                <li key={idx} className="ml-4 list-disc text-sm my-0.5">
                  {trimmed.replace(/^[*+-]\s*/, '')}
                </li>
              );
            }
            if (trimmed.length === 0) return <div key={idx} className="h-2" />;
            return (
              <p key={idx} className="text-sm leading-relaxed my-1.5">
                {trimmed}
              </p>
            );
          })}
        </div>
      </div>
    );
  }

  // Renders the editor panel dynamically based on draft type
  function renderEditor() {
    if (oppType === 'linkedin_post' || oppType === 'marketing_campaign') {
      // Social Slide Carousel Deck Editor
      return (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Title
            <input
              className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 bg-transparent text-sm"
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              disabled={isPublished}
            />
          </label>

          <div className="flex items-center justify-between mt-2">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-neutral-500 uppercase tracking-wider text-[11px]">
                Slides Manager
              </span>
              <span className="text-[10px] text-neutral-400 font-medium">
                {slides.join(' ').trim().split(/\s+/).filter(Boolean).length} words across{' '}
                {slides.length} slides
              </span>
            </div>
            <button
              onClick={() => {
                setSlides((prev) => [...prev, '# New Slide\n- Bullet point detail']);
                setCurrentSlide(slides.length);
              }}
              disabled={isPublished}
              className="px-2.5 py-1 text-xs font-semibold rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-750 text-neutral-850 dark:text-neutral-100"
            >
              + Add Slide
            </button>
          </div>

          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
            {slides.map((slide, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border ${idx === currentSlide ? 'border-blue-500 bg-blue-50/5 dark:bg-blue-950/5' : 'border-neutral-200 dark:border-neutral-800'} flex flex-col gap-2 relative`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-neutral-400">Slide {idx + 1}</span>
                  <button
                    onClick={() => {
                      if (slides.length <= 1) return;
                      const copy = [...slides];
                      copy.splice(idx, 1);
                      setSlides(copy);
                      setCurrentSlide(Math.max(0, idx - 1));
                    }}
                    disabled={isPublished || slides.length <= 1}
                    className="text-xs text-red-500 hover:underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
                <textarea
                  className="w-full min-h-24 rounded border border-neutral-300 dark:border-neutral-700 px-3 py-2 font-mono text-xs bg-transparent focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  value={slide}
                  onFocus={() => setCurrentSlide(idx)}
                  onChange={(event) => {
                    const copy = [...slides];
                    copy[idx] = event.target.value;
                    setSlides(copy);
                  }}
                  disabled={isPublished}
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (oppType === 'youtube_script' || oppType === 'podcast_outline') {
      // Video Script Editor Layout
      return (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Video Title
            <input
              className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 bg-transparent text-sm"
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              disabled={isPublished}
            />
          </label>

          <div className="text-[10px] font-mono text-neutral-400">
            {[scriptHook, scriptDialogue].join(' ').trim().split(/\s+/).filter(Boolean).length}{' '}
            words •{' '}
            {Math.ceil(
              [scriptHook, scriptDialogue].join(' ').trim().split(/\s+/).filter(Boolean).length /
                130,
            )}{' '}
            min script (~130 wpm speaking rate)
          </div>

          <label className="flex flex-col gap-1 text-sm font-medium">
            Hook & Introduction
            <textarea
              className="min-h-16 rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 bg-transparent leading-relaxed"
              value={scriptHook}
              onChange={(event) => setScriptHook(event.target.value)}
              disabled={isPublished}
              placeholder="e.g. In this video, we deep dive into concepts..."
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium">
            Script Dialogue & Scene Cues
            <textarea
              className="min-h-[160px] rounded border border-neutral-300 px-3 py-2 font-mono text-xs dark:border-neutral-700 bg-transparent leading-relaxed"
              value={scriptDialogue}
              onChange={(event) => setScriptDialogue(event.target.value)}
              disabled={isPublished}
              placeholder="*Host*: Hello world!\n**[Visual: Screen shares graph]**"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium">
            Hashtags
            <input
              className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 bg-transparent text-xs font-mono"
              value={scriptHashtags}
              onChange={(event) => setScriptHashtags(event.target.value)}
              disabled={isPublished}
              placeholder="#DeveloperTools #Automation"
            />
          </label>

          {/* Higgsfield Prompt Card */}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/20 p-4 flex flex-col gap-2 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Higgsfield AI Video Prompt
              </span>
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                {copiedPrompt ? 'Copied!' : 'Copy Prompt'}
              </button>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed italic bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-850 p-2.5 rounded-lg">
              {higgsfieldPrompt}
            </p>
          </div>
        </div>
      );
    }

    // Default: Styled Editor with Formatting Toolbar (Blog Posts / Newsletters / etc.)
    const wordCount = bodyDraft.trim().split(/\s+/).filter(Boolean).length;
    const readTime = Math.ceil(wordCount / 200) || 1;

    return (
      <div className="flex flex-col gap-4">
        {/* Editor Tabs & Controls */}
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
          <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-900 p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-850">
            <button
              type="button"
              onClick={() => setActiveEditorTab('rich')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                activeEditorTab === 'rich'
                  ? 'bg-white dark:bg-neutral-850 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-850 dark:hover:text-neutral-350'
              }`}
            >
              ✍️ Rich Editor
            </button>
            <button
              type="button"
              onClick={() => setActiveEditorTab('source')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                activeEditorTab === 'source'
                  ? 'bg-white dark:bg-neutral-850 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-850 dark:hover:text-neutral-350'
              }`}
            >
              ⚙️ Markdown Source
            </button>
          </div>

          {/* Quick Stats */}
          <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
            {wordCount} words • {readTime} min read
          </span>
        </div>

        <label className="flex flex-col gap-1 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
          Document Title
          <input
            className="rounded-xl border border-neutral-300 px-3.5 py-2.5 dark:border-neutral-700 bg-transparent text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500"
            value={titleDraft}
            onChange={(event) => setTitleDraft(event.target.value)}
            disabled={isPublished}
          />
        </label>

        {/* Formatting Toolbar */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl border border-neutral-250 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
          <button
            type="button"
            onClick={() => insertMarkdown('bold')}
            className="px-2.5 py-1 text-xs font-bold rounded border border-transparent hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-850 transition-colors"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('italic')}
            className="px-2.5 py-1 text-xs italic rounded border border-transparent hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-850 transition-colors"
          >
            I
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('h1')}
            className="px-2.5 py-1 text-xs font-bold rounded border border-transparent hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-850 transition-colors"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('h2')}
            className="px-2.5 py-1 text-xs font-bold rounded border border-transparent hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-850 transition-colors"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('code')}
            className="px-2.5 py-1 text-xs font-mono rounded border border-transparent hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-850 transition-colors"
          >
            Code
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('mermaid')}
            className="px-2.5 py-1 text-xs font-bold rounded border border-transparent hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-850 transition-colors"
          >
            Mermaid
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
            Content Body
          </span>
          {activeEditorTab === 'rich' ? (
            <textarea
              id="markdown-editor"
              className="w-full min-h-[420px] rounded-2xl border border-neutral-350 px-5 py-4 font-serif text-base leading-relaxed dark:border-neutral-750 bg-neutral-50/20 dark:bg-neutral-900/10 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-inner"
              placeholder="Start writing in rich proportional layout..."
              value={bodyDraft}
              onChange={(event) => setBodyDraft(event.target.value)}
              disabled={isPublished}
            />
          ) : (
            <textarea
              id="markdown-editor"
              className="w-full min-h-[420px] rounded-2xl border border-neutral-350 px-4 py-3 font-mono text-sm leading-relaxed dark:border-neutral-750 bg-neutral-50/40 dark:bg-neutral-900/20 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-inner"
              placeholder="# Heading 1\nWrite markdown raw source syntax here..."
              value={bodyDraft}
              onChange={(event) => setBodyDraft(event.target.value)}
              disabled={isPublished}
            />
          )}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <p className="text-sm text-neutral-500">Loading…</p>;
  }

  if (draft === null) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error ?? 'Not found.'}</p>;
  }

  const isPublished = draft.status === 'published';

  return (
    <div>
      <h1 className="text-2xl font-semibold">Edit Content Draft</h1>
      <p className="mt-1 font-mono text-xs text-neutral-500">{draft.id}</p>

      {/* Grid Layout: Editor on the left, Rich Preview on the right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
        {/* Left Side: Dynamic Workspace Editor */}
        <div className="flex flex-col gap-4">
          {renderEditor()}

          {error !== null && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}

          {published !== null && (
            <p className="mt-1 text-sm">
              Published:{' '}
              <Link
                href={published.externalUrl || `/published/${published.publishedId}`}
                className="underline text-blue-600 dark:text-blue-400 font-semibold"
                target="_blank"
              >
                {published.externalUrl || `/published/${published.publishedId}`}
              </Link>
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isSaving || isPublished}
              onClick={() => void handleSave()}
              className="rounded border border-neutral-350 px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-neutral-750 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              disabled={isPublishing || isPublished}
              onClick={() => void handlePublish()}
              className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90 transition-opacity"
            >
              {isPublished ? 'Published' : isPublishing ? 'Publishing…' : 'Publish'}
            </button>
            <button
              type="button"
              onClick={handleCopyDraft}
              className="rounded border border-neutral-350 px-4 py-2 text-sm font-medium dark:border-neutral-750 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
            >
              {copiedDraft ? '✓ Copied' : 'Copy text'}
            </button>
            <button
              type="button"
              onClick={handleExportMarkdown}
              className="rounded border border-neutral-350 px-4 py-2 text-sm font-medium dark:border-neutral-750 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
            >
              📋 Export .md
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              className="rounded border border-neutral-350 px-4 py-2 text-sm font-medium dark:border-neutral-750 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
            >
              📄 Export PDF
            </button>
          </div>
        </div>

        {/* Right Side: Visual Preview */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40 p-6 shadow-sm flex flex-col min-h-[450px]">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Layout Preview
            </h2>
            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
              {oppType.replace('_', ' ')}
            </span>
          </div>

          <div className="mt-4 flex-1">{renderPreview()}</div>
        </div>
      </div>
    </div>
  );
}
