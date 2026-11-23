import type { APIRoute } from 'astro';

/** Crawlers behind search engines and AI assistants; allowed explicitly so the intent is clear. */
const crawlers = [
  'Googlebot',
  'Bingbot',
  'DuckDuckBot',
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
];

export const GET: APIRoute = ({ site }) => {
  const origin = (site ?? new URL('http://localhost:4321')).origin;
  const body = [
    '# unicep is open source: search engines and AI assistants are welcome.',
    ...crawlers.map((agent) => `User-agent: ${agent}\nAllow: /`),
    'User-agent: *\nAllow: /',
    `Sitemap: ${origin}/sitemap-index.xml`,
    `# Documentation for LLMs: ${origin}/llms.txt`,
  ].join('\n\n');
  return new Response(`${body}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
