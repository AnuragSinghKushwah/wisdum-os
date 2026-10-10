#!/usr/bin/env node
/**
 * A tiny OpenAI-compatible server for exercising "create content from source"
 * without a real model. It answers every chat completion with a clearly
 * labelled stub that reports what it received, so a person (or a test) can see
 * that the source text, platform format and author instructions reached the model.
 *
 *   node tools/stub-llm/stub-llm.mjs            # listens on :4010
 *   OPENAI_API_KEY=stub OPENAI_BASE_URL=http://localhost:4010/v1 npm run dev:api
 *
 * It does NOT write anything useful. Use a real provider key for real drafts.
 */
import { createServer } from 'node:http';

const port = Number(process.env.STUB_LLM_PORT ?? 4010);

const FORMATS = [
  ['LINKEDIN POST', 'LinkedIn post'],
  ['X (TWITTER) THREAD', 'X thread'],
  ['EMAIL NEWSLETTER', 'Newsletter'],
  ['TELEPROMPTER VIDEO SCRIPT', 'YouTube script'],
  ['PODCAST SHOW OUTLINE', 'Podcast outline'],
];

function describe(prompt) {
  const format = FORMATS.find(([marker]) => prompt.includes(marker))?.[1] ?? 'Document';
  const block = prompt.match(/SOURCE MATERIAL[^\n]*\n\n\[S1\][^\n]*\n"""\n([\s\S]*?)\n"""/);
  const source = block?.[1] ?? '';
  const instructions = prompt.match(/instructions for angle, audience and emphasis: ([^\n]*)/)?.[1];
  return [
    `# [STUB MODEL] ${format}`,
    '',
    '> This is not a real AI response. It only reports what the model was sent.',
    '',
    `- Platform format: **${format}**`,
    `- Source received: **${source.length} characters**`,
    source.length > 0
      ? `- First line of the source: "${source.split('\n')[0].slice(0, 160)}"`
      : '- No source material was included in the prompt.',
    instructions !== undefined
      ? `- Author instructions: "${instructions}"`
      : '- No author instructions.',
  ].join('\n');
}

createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' }).end('{"status":"ok"}');
    return;
  }
  if (req.method !== 'POST' || !req.url?.endsWith('/chat/completions')) {
    res.writeHead(404, { 'content-type': 'application/json' }).end('{"error":"not found"}');
    return;
  }
  let raw = '';
  req.on('data', (chunk) => (raw += chunk));
  req.on('end', () => {
    const body = JSON.parse(raw || '{}');
    const prompt = (body.messages ?? []).map((m) => m.content).join('\n');
    const content = describe(prompt);
    res.writeHead(200, { 'content-type': 'application/json' }).end(
      JSON.stringify({
        id: 'stub-1',
        object: 'chat.completion',
        created: 0,
        model: body.model ?? 'stub',
        choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
        usage: { prompt_tokens: prompt.length, completion_tokens: content.length, total_tokens: 0 },
      }),
    );
  });
}).listen(port, () => console.log(`stub-llm listening on :${port}`));
