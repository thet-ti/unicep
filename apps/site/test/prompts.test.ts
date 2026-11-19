import { describe, expect, it } from 'vitest';
import { buildPrompt, chatgptUrl, claudeUrl, type Framework } from '../src/lib/prompts';

const frameworks: Framework[] = ['react', 'vue', 'angular', 'node'];
const DOCS = 'https://example.com/llms-full.txt';

describe('buildPrompt', () => {
  it.each(frameworks)(
    'includes the docs link, the API summary and the errors for %s',
    (framework) => {
      const prompt = buildPrompt(framework, 'en', DOCS);
      expect(prompt).toContain(DOCS);
      expect(prompt).toContain('npm install @unicep/');
      expect(prompt).toContain('CepNotFoundError');
      expect(prompt).toContain('AllProvidersFailedError');
    },
  );

  it('names the framework and installs its package', () => {
    expect(buildPrompt('react', 'en', DOCS)).toContain('React');
    expect(buildPrompt('react', 'en', DOCS)).toContain('npm install @unicep/react');
    expect(buildPrompt('vue', 'en', DOCS)).toContain('npm install @unicep/vue');
    expect(buildPrompt('angular', 'en', DOCS)).toContain('npm install @unicep/angular');
    expect(buildPrompt('node', 'en', DOCS)).toContain('npm install @unicep/core');
  });

  it('is written in the requested language', () => {
    expect(buildPrompt('react', 'pt-br', DOCS)).toContain('Implemente a consulta de CEP');
    expect(buildPrompt('react', 'en', DOCS)).toContain('Implement CEP lookup');
  });

  it('numbers the requirements', () => {
    const prompt = buildPrompt('node', 'en', DOCS);
    expect(prompt).toMatch(/1\. A GET \/cep\/:cep endpoint/);
    expect(prompt).toMatch(/\n3\. /);
  });
});

describe('open-in-chat links', () => {
  it('URL-encodes the prompt for Claude and ChatGPT', () => {
    const prompt = 'Implement it & test 100% of it?';
    const encoded = encodeURIComponent(prompt);
    expect(claudeUrl(prompt)).toBe(`https://claude.ai/new?q=${encoded}`);
    expect(chatgptUrl(prompt)).toBe(`https://chatgpt.com/?q=${encoded}`);
    expect(new URL(claudeUrl(prompt)).searchParams.get('q')).toBe(prompt);
  });
});
