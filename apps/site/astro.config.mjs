import starlight from '@astrojs/starlight';
import vercel from '@astrojs/vercel';
import { defineConfig } from 'astro/config';
import starlightLlmsTxt from 'starlight-llms-txt';
import starlightPageActions from 'starlight-page-actions';

// Absolute URLs (llms.txt, sitemap) need the public address. SITE_URL wins; otherwise use the
// hostnames Vercel exposes (without protocol): the production domain, then the deployment URL.
const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
const site =
  process.env.SITE_URL ?? (vercelHost ? `https://${vercelHost}` : 'http://localhost:4321');

export default defineConfig({
  site,
  // Static by default; only the status pages opt out with `export const prerender = false`.
  output: 'static',
  adapter: vercel(),
  server: { host: true },
  integrations: [
    starlight({
      title: 'unicep',
      description: 'CEP lookup with automatic provider fallback.',
      favicon: '/favicon.svg',
      defaultLocale: 'root',
      locales: {
        root: { label: 'Português', lang: 'pt-BR' },
        en: { label: 'English', lang: 'en' },
      },
      customCss: ['./src/styles/tokens.css', './src/styles/starlight.css'],
      components: {
        SiteTitle: './src/starlight/SiteTitle.astro',
        SocialIcons: './src/starlight/SocialIcons.astro',
        ThemeSelect: './src/starlight/Empty.astro',
        ThemeProvider: './src/starlight/ThemeProvider.astro',
        Footer: './src/starlight/Footer.astro',
      },
      expressiveCode: {
        themes: ['github-dark'],
        useStarlightDarkModeSwitch: false,
        styleOverrides: {
          borderRadius: '12px',
          borderColor: '#1f1f1f',
          codeBackground: '#0a0a0a',
          codeFontFamily: "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace",
          frames: {
            editorBackground: '#0a0a0a',
            editorTabBarBackground: '#0a0a0a',
            editorActiveTabBackground: '#0a0a0a',
            terminalBackground: '#0a0a0a',
            terminalTitlebarBackground: '#0a0a0a',
            frameBoxShadowCssValue: 'none',
          },
        },
      },
      sidebar: [
        {
          label: 'Começar',
          translations: { en: 'Getting started' },
          items: ['docs/getting-started', 'docs/how-it-works'],
        },
        {
          label: 'Guias',
          translations: { en: 'Guides' },
          items: ['docs/core', 'docs/providers', 'docs/errors'],
        },
        {
          label: 'Frameworks',
          items: ['docs/react', 'docs/vue', 'docs/angular'],
        },
        {
          label: 'IA',
          translations: { en: 'AI' },
          items: ['docs/ai'],
        },
      ],
      plugins: [
        {
          // starlight-page-actions ships "pt" strings, but our Portuguese locale is "pt-BR".
          name: 'unicep-page-actions-i18n',
          hooks: {
            'config:setup'() {},
            'i18n:setup'({ injectTranslations }) {
              injectTranslations({
                'pt-BR': {
                  'prompt.default': 'Leia {url}. Quero fazer perguntas sobre isso.',
                  'copy.markdown': 'Copiar Markdown',
                  open: 'Abrir',
                  'open.chatgpt': 'Abrir no ChatGPT',
                  'open.claude': 'Abrir no Claude',
                  'view.markdown': 'Ver em Markdown',
                },
              });
            },
          },
        },
        starlightLlmsTxt({
          projectName: 'unicep',
          // The AI page only holds copy-paste prompts; keep it out of the abridged llms-small.txt.
          exclude: ['docs/ai', 'en/docs/ai'],
          description:
            'unicep is a TypeScript library for Brazilian CEP (postal code) lookup in browsers and Node.js. It queries several public services (ViaCEP, BrasilAPI, OpenCEP, AwesomeAPI) behind one interface, detects failing services with circuit breakers and falls back to the next one, always returning the same normalized Address.',
          details:
            '- Packages: @unicep/core (framework-agnostic), @unicep/react, @unicep/vue, @unicep/angular.\n- llms-full.txt holds the Portuguese documentation (the default language); the English documentation is in the "English" set below.\n- Every documentation page is also served as Markdown by appending .md to its URL.',
          customSets: [
            {
              label: 'English',
              description: 'the complete documentation for unicep in English',
              paths: ['en/**'],
            },
          ],
        }),
        starlightPageActions({
          prompt:
            'Read {url} so I can ask questions about it, or implement what it describes in my project.',
          locales: {
            root: {
              prompt:
                'Leia {url} para eu poder tirar dúvidas sobre ela ou pedir que você implemente o que ela descreve no meu projeto.',
            },
          },
        }),
      ],
    }),
  ],
});
