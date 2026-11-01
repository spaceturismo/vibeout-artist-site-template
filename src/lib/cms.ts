import { z } from 'zod';

export function cmsSettings(repository: string | undefined, authOrigin: string | undefined) {
  if (!authOrigin) return null;
  const repo = z.string().regex(/^[\w.-]+\/[\w.-]+$/).parse(repository);
  const origin = z.url().parse(authOrigin);
  const url = new URL(origin);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('PUBLIC_CMS_AUTH_ORIGIN must be a public HTTPS origin without a path or credentials.');
  }
  return { repository: repo, authOrigin: url.origin };
}

const text = (name: string, label: string, optional = false) => ({
  name, label, widget: 'string', required: !optional,
});
const links = (name: string, label: string) => ({
  name, label, widget: 'list', required: false,
  fields: [text('label', 'Label'), text('url', 'HTTPS URL')],
});
const image = (name: string, label: string) => ({
  name, label, widget: 'image', allow_multiple: false,
});

export function cmsConfig(settings: NonNullable<ReturnType<typeof cmsSettings>>, base: string, siteUrl: string) {
  return {
    backend: {
      name: 'github',
      repo: settings.repository,
      branch: 'main',
      base_url: settings.authOrigin,
      auth_endpoint: 'auth',
    },
    site_url: siteUrl,
    display_url: siteUrl,
    media_folder: 'public/images/uploads',
    public_folder: 'images/uploads',
    publish: true,
    collections: [{
      name: 'site',
      label: 'Artist website',
      files: [{
        name: 'settings',
        label: 'Content & appearance',
        file: 'src/content/site.json',
        format: 'json',
        fields: [
          {
            name: 'artist', label: 'Artist', widget: 'object',
            fields: [
              text('name', 'Artist name'), text('tagline', 'Hero headline'),
              { name: 'description', label: 'Short description', widget: 'text' },
              { name: 'bio', label: 'Biography', widget: 'text' },
              text('bookingEmail', 'Booking email', true),
              links('socialLinks', 'Social links'),
            ],
          },
          {
            name: 'appearance', label: 'Appearance', widget: 'object',
            fields: [
              { name: 'theme', label: 'Default theme', widget: 'select', options: ['midnight', 'paper'] },
              { ...text('accent', 'Midnight accent color'), pattern: ['^#[0-9a-fA-F]{6}$', 'Use a six-digit hex color.'], hint: 'Used for decorative highlights and buttons. Choose a light color for readable dark button text.' },
              image('heroImage', 'Hero artwork'),
            ],
          },
          {
            name: 'sections', label: 'Visible sections (drag to reorder)', widget: 'list',
            field: { name: 'section', label: 'Section', widget: 'select', options: ['music', 'videos', 'about'] },
            hint: 'Remove a section to hide it. Each section may appear only once.',
          },
          {
            name: 'releases', label: 'Music releases', widget: 'list', required: false, summary: '{{fields.title}}',
            fields: [
              { ...text('id', 'Unique ID'), pattern: ['^[a-z0-9-]+$', 'Use lowercase letters, numbers and hyphens.'] },
              text('title', 'Title'), text('label', 'Release label / subtitle'),
              { name: 'date', label: 'Release date', widget: 'datetime', format: 'YYYY-MM-DD', date_format: 'YYYY-MM-DD', time_format: false },
              image('artwork', 'Cover artwork'),
              { name: 'featured', label: 'Featured release (only one)', widget: 'boolean', default: false },
              { name: 'published', label: 'Published', widget: 'boolean', default: false },
              {
                name: 'source', label: 'Music player', widget: 'object',
                fields: [
                  { name: 'provider', label: 'Provider', widget: 'select', options: ['none', 'spotify', 'apple', 'soundcloud', 'audio'], default: 'none' },
                  { ...text('url', 'Music URL', true), hint: 'Paste a share URL, not embed HTML. Audio requires an externally hosted HTTPS file. Choose none and clear this field for no player.' },
                ],
              },
              links('streamingLinks', 'Additional streaming links'),
            ],
          },
          {
            name: 'videos', label: 'YouTube videos', widget: 'list', required: false, summary: '{{fields.title}}',
            fields: [
              { ...text('id', 'Unique ID'), pattern: ['^[a-z0-9-]+$', 'Use lowercase letters, numbers and hyphens.'] },
              text('title', 'Title'),
              { name: 'description', label: 'Description', widget: 'text', required: false },
              text('url', 'YouTube URL'), image('thumbnail', 'Thumbnail artwork'),
              { name: 'published', label: 'Published', widget: 'boolean', default: false },
            ],
          },
        ],
      }],
    }],
    logo_url: `${base.replace(/\/?$/, '/')}images/first-light.svg`,
  };
}
