import { z } from 'zod';

const safeUrl = z.url().refine((value) => {
  const url = new URL(value);
  return url.protocol === 'https:' && !url.username && !url.password;
}, 'Use a public HTTPS URL without credentials.');
const asset = z.string().min(1).refine(
  (value) => /^images\/[\w./-]+$/.test(value) && !value.split('/').includes('..'),
  'Use an image path under images/ without parent traversal.',
);
const link = z.object({ label: z.string().min(1), url: safeUrl });
export const sourceSchema = z.object({
  provider: z.enum(['none', 'spotify', 'apple', 'soundcloud', 'audio']),
  url: z.string().default(''),
}).superRefine((source, ctx) => {
  if (source.provider === 'none') {
    if (source.url) ctx.addIssue({ code: 'custom', message: 'Choose a provider for this URL.' });
    return;
  }
  if (!safeUrl.safeParse(source.url).success) {
    ctx.addIssue({ code: 'custom', message: 'A public HTTPS music URL is required.' });
    return;
  }
  if (source.provider !== 'audio' && !musicEmbed(source)) {
    ctx.addIssue({ code: 'custom', message: 'URL does not match the selected music provider.' });
  }
});
export type MusicSource = z.infer<typeof sourceSchema>;

export function youtubeEmbed(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    let id: string | null = null;
    if (url.hostname === 'youtu.be') id = url.pathname.slice(1);
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)) {
      id = url.pathname === '/watch' ? url.searchParams.get('v')
        : /^\/(?:embed|shorts)\/([^/]+)$/.exec(url.pathname)?.[1] ?? null;
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id)
      ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch {
    return null;
  }
}

export function musicEmbed(source: { provider: string; url: string }): string | null {
  try {
    const url = new URL(source.url);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    if (source.provider === 'spotify' && url.hostname === 'open.spotify.com') {
      const match = /^\/(?:embed\/)?(track|album|playlist|artist)\/([A-Za-z0-9]+)\/?$/.exec(url.pathname);
      return match ? `https://open.spotify.com/embed/${match[1]}/${match[2]}` : null;
    }
    if (source.provider === 'apple' && ['music.apple.com', 'embed.music.apple.com'].includes(url.hostname)) {
      if (!/^\/[a-z]{2}\/(album|playlist|song)\/[^/]+\/[^/]+\/?$/.test(url.pathname)) return null;
      const embed = new URL(`https://embed.music.apple.com${url.pathname}`);
      if (url.searchParams.has('i')) embed.searchParams.set('i', url.searchParams.get('i')!);
      return embed.toString();
    }
    if (source.provider === 'soundcloud' && url.hostname === 'soundcloud.com') {
      if (!/^\/[\w-]+\/[\w-]+(?:\/[\w-]+)?\/?$/.test(url.pathname)) return null;
      return `https://w.soundcloud.com/player/?url=${encodeURIComponent(`https://soundcloud.com${url.pathname}`)}&auto_play=false`;
    }
    return null;
  } catch {
    return null;
  }
}

export const siteSchema = z.object({
  artist: z.object({
    name: z.string().min(1),
    tagline: z.string().min(1),
    description: z.string().min(1),
    bio: z.string().min(1),
    bookingEmail: z.union([z.literal(''), z.email()]).default(''),
    socialLinks: z.array(link).default([]),
  }),
  appearance: z.object({
    theme: z.enum(['midnight', 'paper']),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    heroImage: asset,
  }),
  sections: z.array(z.enum(['music', 'videos', 'about'])).refine(
    (values) => new Set(values).size === values.length, 'Sections must be unique.',
  ).default([]),
  releases: z.array(z.object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().min(1),
    label: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
      const parsed = new Date(value);
      return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
    }, 'Use a valid calendar date.'),
    artwork: asset,
    featured: z.boolean(),
    published: z.boolean(),
    source: sourceSchema,
    streamingLinks: z.array(link).default([]),
  })).default([]),
  videos: z.array(z.object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().min(1),
    description: z.string().default(''),
    url: safeUrl.refine((value) => youtubeEmbed(value) !== null, 'Use a supported YouTube video URL.'),
    thumbnail: asset,
    published: z.boolean(),
  })).default([]),
}).superRefine((site, ctx) => {
  for (const key of ['releases', 'videos'] as const) {
    const ids = site[key].map((item) => item.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: 'custom', path: [key], message: 'Content IDs must be unique.' });
    }
  }
  if (site.releases.filter((release) => release.published && release.featured).length > 1) {
    ctx.addIssue({ code: 'custom', path: ['releases'], message: 'Only one published release may be featured.' });
  }
});

export function assetUrl(path: string, base: string): string {
  return `${base.replace(/\/?$/, '/')}${path}`;
}
