#!/usr/bin/env node
/**
 * First-time setup, safe to run again. It
 *   - creates .env from .env.example when there is none,
 *   - fills in JWT_SECRET (sessions survive restarts only with a stable one) when it is
 *     missing or an obvious placeholder, and never replaces a real value,
 *   - reports which AI provider is configured.
 *
 *   node tools/setup/setup.mjs [--file path]
 */
import { randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const flag = process.argv.indexOf('--file');
const envPath = flag > -1 ? resolve(process.argv[flag + 1] ?? '') : resolve(root, '.env');

const PLACEHOLDER = /change|replace|your-|example|secret-here|xxx/i;

export function isUsableSecret(value) {
  return typeof value === 'string' && value.length >= 32 && !PLACEHOLDER.test(value);
}

export function readValue(text, name) {
  const match = new RegExp(`^${name}=(.*)$`, 'm').exec(text);
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : undefined;
}

export function withSecret(text, secret) {
  if (/^JWT_SECRET=.*$/m.test(text))
    return text.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret}`);
  return `${text.replace(/\n*$/, '\n')}JWT_SECRET=${secret}\n`;
}

export function aiProviderIn(text) {
  const order = [
    ['ANTHROPIC_API_KEY', 'Anthropic'],
    ['OPENAI_API_KEY', 'OpenAI'],
    ['GEMINI_API_KEY', 'Gemini'],
    ['GOOGLE_API_KEY', 'Gemini'],
    ['OLLAMA_HOST', 'Ollama (local)'],
  ];
  for (const [name, label] of order) {
    if ((readValue(text, name) ?? '').length > 0) return label;
  }
  return undefined;
}

export function geminiNeedsModel(text) {
  const usesGemini =
    (readValue(text, 'GEMINI_API_KEY') ?? readValue(text, 'GOOGLE_API_KEY') ?? '').length > 0;
  const earlier = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY'].some(
    (name) => (readValue(text, name) ?? '').length > 0,
  );
  return usesGemini && !earlier && (readValue(text, 'REASONING_LLM_MODEL') ?? '').length === 0;
}

function main() {
  if (!existsSync(envPath)) {
    copyFileSync(resolve(root, '.env.example'), envPath);
    console.log(`Created ${envPath} from .env.example`);
  }

  let text = readFileSync(envPath, 'utf8');
  if (!isUsableSecret(readValue(text, 'JWT_SECRET'))) {
    text = withSecret(text, randomBytes(48).toString('base64url'));
    writeFileSync(envPath, text);
    console.log('Generated a JWT_SECRET so sessions survive restarts');
  }

  const provider = aiProviderIn(text);
  if (provider) {
    console.log(`AI provider: ${provider}`);
    if (geminiNeedsModel(text)) {
      console.log(
        'Gemini also needs REASONING_LLM_MODEL set to a model your key can use (Google retires models on a',
      );
      console.log(
        'schedule, so there is no built-in default). If it is wrong, the app lists the models your key can use.',
      );
    }
    console.log(
      'When the API starts it asks the provider one tiny question to confirm the key and model work.',
    );
  } else {
    console.log(
      'AI provider: none yet. Add ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY or OLLAMA_HOST',
    );
    console.log(`to ${envPath} to write real drafts. Without one the app runs in demo mode.`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
