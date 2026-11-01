import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assetUrl, musicEmbed, siteSchema, sourceSchema, youtubeEmbed } from '../src/lib/content.ts';

const raw = {
  artist: { name: 'Test artist', tagline: 'Test headline', description: 'Test description', bio: 'Test bio', bookingEmail: '', socialLinks: [] },
  appearance: { theme: 'midnight', accent: '#c7fa73', heroImage: 'images/hero.svg' },
  sections: ['music', 'videos', 'about'],
  releases: ['first', 'second'].map((id, index) => ({
    id, title: id, label: 'Test release', date: '2026-11-01', artwork: 'images/first-light.svg',
    featured: index === 0, published: true, source: { provider: 'none', url: '' }, streamingLinks: [],
  })),
  videos: [{ id: 'demo', title: 'Demo', description: '', url: 'https://youtu.be/aqz-KE-bpKQ', thumbnail: 'images/hero.svg', published: true }],
};

test('YouTube URLs normalize to privacy-enhanced embeds without autoplay', () => {
  for (const url of [
    'https://youtu.be/aqz-KE-bpKQ?t=5',
    'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    'https://youtube.com/shorts/aqz-KE-bpKQ',
    'https://www.youtube.com/embed/aqz-KE-bpKQ',
  ]) assert.equal(youtubeEmbed(url), 'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ');
  for (const url of ['javascript:alert(1)', 'https://youtube.com.evil.test/watch?v=aqz-KE-bpKQ', 'https://youtu.be/invalid', 'http://youtu.be/aqz-KE-bpKQ', 'https://user@youtube.com/watch?v=aqz-KE-bpKQ']) {
    assert.equal(youtubeEmbed(url), null);
  }
});

test('music providers build allowlisted embeds and preserve Apple track selection', () => {
  assert.equal(musicEmbed({ provider: 'spotify', url: 'https://open.spotify.com/album/abc123?si=tracking' }), 'https://open.spotify.com/embed/album/abc123');
  assert.equal(musicEmbed({ provider: 'apple', url: 'https://music.apple.com/us/album/example/123?i=456' }), 'https://embed.music.apple.com/us/album/example/123?i=456');
  const soundcloud = musicEmbed({ provider: 'soundcloud', url: 'https://soundcloud.com/artist/track' });
  assert.ok(soundcloud?.startsWith('https://w.soundcloud.com/player/'));
  assert.equal(new URL(soundcloud!).searchParams.get('auto_play'), 'false');
  assert.equal(musicEmbed({ provider: 'spotify', url: 'https://evil.test/album/abc' }), null);
  assert.equal(musicEmbed({ provider: 'spotify', url: 'https://open.spotify.com/not-supported' }), null);
  assert.equal(musicEmbed({ provider: 'audio', url: 'https://cdn.example.com/music.mp3' }), null);
});

test('source validation rejects mismatched providers and supports externally hosted audio', () => {
  assert.equal(sourceSchema.safeParse({ provider: 'spotify', url: 'https://soundcloud.com/artist/track' }).success, false);
  assert.equal(sourceSchema.safeParse({ provider: 'audio', url: 'https://cdn.example.com/music.mp3' }).success, true);
  assert.equal(sourceSchema.safeParse({ provider: 'none', url: 'https://example.com' }).success, false);
});

test('template supports different branding, alternate theme, reordered and hidden sections', () => {
  const secondArtist = structuredClone(raw);
  secondArtist.artist.name = 'A much longer second artist name';
  secondArtist.appearance.theme = 'paper';
  secondArtist.sections = ['about', 'music'];
  secondArtist.releases = [];
  secondArtist.videos = [];
  assert.equal(siteSchema.parse(secondArtist).appearance.theme, 'paper');
  assert.equal(siteSchema.safeParse(raw).success, true);
});

test('invalid content fails validation rather than silently producing broken pages', () => {
  for (const change of [
    (site: typeof raw) => { site.sections.push('music'); },
    (site: typeof raw) => { site.releases[1].id = site.releases[0].id; },
    (site: typeof raw) => { site.releases[1].featured = true; },
    (site: typeof raw) => { site.releases[0].date = '2026-02-30'; },
    (site: typeof raw) => { site.appearance.heroImage = 'images/../secret.svg'; },
    (site: typeof raw) => { site.videos[0].url = 'https://example.com/video'; },
  ]) {
    const site = structuredClone(raw);
    change(site);
    assert.equal(siteSchema.safeParse(site).success, false);
  }
});

test('asset URLs work at the domain root and GitHub Pages repository subpath', () => {
  assert.equal(assetUrl('images/hero.svg', '/'), '/images/hero.svg');
  assert.equal(assetUrl('admin/', '/artist-site/'), '/artist-site/admin/');
  assert.equal(assetUrl('images/hero.svg', '/artist-site'), '/artist-site/images/hero.svg');
});

test('cleared CMS optional fields normalize without changing required-field validation', () => {
  const optional = {
    ...raw,
    artist: { name: 'ArtistB', tagline: 'New sound', bio: 'Biography', description: 'Description' },
    releases: raw.releases.map(({ streamingLinks, ...release }) => release),
  };
  const result = siteSchema.parse(optional);
  assert.equal(result.artist.bookingEmail, '');
  assert.deepEqual(result.artist.socialLinks, []);
  assert.deepEqual(result.releases[0].streamingLinks, []);
  assert.equal(siteSchema.safeParse({ ...optional, artist: { name: '' } }).success, false);
});
