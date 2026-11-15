import { expect, test, type Page } from '@playwright/test';
import rawSite from '../../src/content/site.json' with { type: 'json' };
import { siteSchema, youtubeEmbed } from '../../src/lib/content.ts';

const site = siteSchema.parse(rawSite);
const hasPlaylist = site.sections.includes('videos') && site.videos.some((video) =>
  video.published && youtubeEmbed(video.url)?.includes('/videoseries'));

test.beforeEach(async ({ page }) => {
  if (site.artist.bioSourceUrl) await page.route(site.artist.bioSourceUrl, (route) => route.abort());
});

test('live bio uses plain text and refreshes only after its two-minute cache expires', async ({ page }) => {
  test.skip(!site.artist.bioSourceUrl || !site.sections.includes('about'), 'No live bio configured.');
  await page.clock.install({ time: new Date('2026-11-15T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-11-15T00:00:00Z'));
  let requests = 0;
  let text = 'Live biography from Drive.\n\n<script>window.bioInjected = true</script>';
  await page.route(site.artist.bioSourceUrl, (route) => {
    requests++;
    return route.fulfill({ contentType: 'text/plain; charset=utf-8', body: text });
  });
  await page.goto('./');
  await expect(page.locator('.bio-text p')).toHaveText(['Live biography from Drive.', '<script>window.bioInjected = true</script>']);
  await expect(page.locator('.bio-text script')).toHaveCount(0);
  expect(await page.evaluate('window.bioInjected')).toBeUndefined();
  expect(requests).toBe(1);
  await page.clock.fastForward(119000);
  text = 'Updated biography from Drive.';
  await page.reload();
  await expect(page.locator('.bio-text p').first()).toHaveText('Live biography from Drive.');
  expect(requests).toBe(1);
  await page.clock.fastForward(1000);
  await page.reload();
  await expect(page.locator('.bio-text p')).toHaveText(['Updated biography from Drive.']);
  expect(requests).toBe(2);
});

test('live bio preserves local fallback for invalid responses and works without storage', async ({ page }) => {
  test.skip(!site.artist.bioSourceUrl || !site.sections.includes('about'), 'No live bio configured.');
  for (const response of [
    { status: 403, contentType: 'text/plain', body: 'Access denied' },
    { status: 200, contentType: 'text/html', body: '<p>Sign in to Google</p>' },
    { status: 200, contentType: 'text/plain', body: '   ' },
  ]) {
    await page.route(site.artist.bioSourceUrl, (route) => route.fulfill(response));
    await page.goto('./');
    await expect(page.locator('.bio-text p')).toHaveText(site.artist.bio.split(/\r?\n\s*\r?\n/));
  }
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage blocked'); } });
  });
  await page.route(site.artist.bioSourceUrl, (route) => route.fulfill({ contentType: 'text/plain', body: 'Live bio without browser storage.' }));
  await page.reload();
  await expect(page.locator('.bio-text p')).toHaveText(['Live bio without browser storage.']);
});

test('live bio keeps a stale cached copy when the remote document is unavailable', async ({ page }) => {
  test.skip(!site.artist.bioSourceUrl || !site.sections.includes('about'), 'No live bio configured.');
  await page.addInitScript((source) => {
    localStorage.setItem(`artist-bio:${source}`, JSON.stringify({ text: 'Last known biography.', savedAt: Date.now() - 121000 }));
  }, site.artist.bioSourceUrl);
  await page.goto('./');
  await expect(page.locator('.bio-text p')).toHaveText(['Last known biography.']);
});

async function mockPlaylist(page: Page, ids = ['HlGr0qh7UnA', 'M7lc1UVf-VE', 'bHQqvYy5KYo', 'dQw4w9WgXcQ', 'aqz-KE-bpKQ']) {
  await page.route('https://www.youtube-nocookie.com/**', (route) => route.fulfill({
    contentType: 'text/html', body: '<html><body>Mock video player</body></html>',
  }));
  await page.route('https://i.ytimg.com/**', (route) => route.fulfill({
    contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=', 'base64'),
  }));
  await page.route('https://www.youtube.com/iframe_api', (route) => route.fulfill({
    contentType: 'application/javascript', body: `
      window.playlistCalls = [];
      window.YT = { Player: class {
        constructor(frame, options) {
          this.ids = ${JSON.stringify(ids)}; this.index = 0; this.events = options.events;
          window.playlistMock = this;
          queueMicrotask(() => this.events.onReady({ target: this }));
        }
        getPlaylist() { return this.ids; }
        getPlaylistIndex() { return this.index; }
        cuePlaylist() { window.playlistCalls.push('cue'); }
        playVideoAt(index) {
          window.playlistCalls.push(index); this.index = index;
          this.events.onStateChange({ target: this, data: 1 });
        }
        error(code) { this.events.onError({ target: this, data: code }); }
      }};
      window.onYouTubeIframeAPIReady();
    `,
  }));
}

test('playlist carousel selects live videos with thumbnails, arrows and keyboard controls', async ({ page }) => {
  test.skip(!hasPlaylist, 'No published playlist.');
  const external: string[] = [];
  page.on('request', (request) => { if (/youtube|ytimg/.test(request.url())) external.push(request.url()); });
  await mockPlaylist(page);
  await page.goto('./');
  expect(external).toHaveLength(0);
  await expect(page.getByRole('region', { name: 'Playlist videos' })).toBeHidden();
  await page.locator('.playlist-player .load-player').first().click();
  const strip = page.getByRole('region', { name: 'Playlist videos' }).first();
  await expect(strip.getByRole('button')).toHaveCount(5);
  await expect(strip.locator('img').first()).toHaveAttribute('src', 'https://i.ytimg.com/vi/HlGr0qh7UnA/hqdefault.jpg');
  await expect(strip.getByRole('button').first()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Previous playlist video' }).first()).toBeDisabled();
  expect(await page.evaluate('window.playlistCalls')).toEqual([]);
  await strip.getByRole('button', { name: 'Play playlist video 3', exact: true }).click();
  await expect(strip.getByRole('button').nth(2)).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate('window.playlistCalls')).toEqual([2]);
  await page.getByRole('button', { name: 'Next playlist video' }).first().click();
  await expect(strip.getByRole('button').nth(3)).toHaveAttribute('aria-pressed', 'true');
  await strip.getByRole('button').last().focus();
  await page.keyboard.press('Enter');
  await expect(strip.getByRole('button').last()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Next playlist video' }).first()).toBeDisabled();
  await expect(page.locator('.playlist-position').first()).toHaveText('5 / 5');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await page.evaluate('window.playlistMock.playVideoAt(0)');
  await expect.poll(() => strip.evaluate((element) => element.scrollLeft)).toBeLessThan(10);
  await page.evaluate('window.playlistMock.playVideoAt(4)');
  await expect.poll(() => strip.evaluate((element) => {
    const last = element.lastElementChild!.getBoundingClientRect();
    const bounds = element.getBoundingClientRect();
    return last.right <= bounds.right + 1 && last.left >= bounds.left;
  })).toBe(true);
  await page.evaluate('window.playlistMock.ids.reverse(); window.playlistMock.playVideoAt(0)');
  await expect(strip.locator('img').first()).toHaveAttribute('src', 'https://i.ytimg.com/vi/aqz-KE-bpKQ/hqdefault.jpg');
});

test('playlist carousel reports unavailable videos and recovers on another selection', async ({ page }) => {
  test.skip(!hasPlaylist, 'No published playlist.');
  await mockPlaylist(page);
  await page.goto('./');
  await page.locator('.playlist-player .load-player').first().click();
  await expect(page.locator('.playlist-item')).toHaveCount(5);
  await page.evaluate('window.playlistMock.error(100)');
  await expect(page.getByRole('status').first()).toContainText('private or unavailable');
  await page.getByRole('button', { name: 'Play playlist video 2', exact: true }).click();
  await expect(page.getByRole('status').first()).toBeEmpty();
  await page.evaluate('window.playlistMock.error(150)');
  await expect(page.getByRole('status').first()).toContainText('cannot be embedded');
  await expect(page.getByRole('link', { name: 'Watch on YouTube' }).first()).toHaveAttribute('href', /playlist\?list=/);
});

test('empty playlists and blocked API requests leave a usable source fallback', async ({ page }) => {
  test.skip(!hasPlaylist, 'No published playlist.');
  await page.clock.install();
  await mockPlaylist(page, []);
  await page.goto('./');
  await page.locator('.playlist-player .load-player').first().click();
  await expect(page.getByRole('status').first()).toContainText('Loading playlist videos');
  await page.clock.runFor(13000);
  await expect(page.getByRole('status').first()).toContainText('No playlist videos are available');
  await expect(page.getByRole('region', { name: 'Playlist videos' }).first()).toBeHidden();
  await page.route('https://www.youtube.com/iframe_api', (route) => route.abort());
  await page.reload();
  await page.locator('.playlist-player .load-player').first().click();
  await expect(page.getByRole('status').first()).toContainText('Playlist controls could not load');
  await expect(page.getByRole('link', { name: 'Watch on YouTube' }).first()).toBeVisible();
});

test('artist pages, local assets, theme switch and responsive layout work', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(site.artist.tagline);
  if (site.sections.includes('about')) {
    await expect(page.locator('.about-copy p')).toHaveText(site.artist.bio.split(/\r?\n\s*\r?\n/));
  }
  await expect(page.locator('html')).toHaveAttribute('data-theme', site.appearance.theme);
  await page.getByRole('button', { name: 'Switch to alternate theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', site.appearance.theme === 'midnight' ? 'paper' : 'midnight');
  const release = site.releases.find((item) => item.published);
  if (release && site.sections.includes('music')) await expect(page.getByRole('heading', { name: release.title, exact: true })).toBeVisible();
  for (const image of await page.locator('img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((element) =>
      element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0)).toBe(true);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  if (release && site.sections.includes('music')) {
    await page.getByRole('link', { name: 'Explore the music' }).click();
    await expect(page).toHaveURL(/#music$/);
  }
});

test('YouTube content is not requested until the visitor loads the player', async ({ page }) => {
  const video = site.videos.find((item) => item.published);
  test.skip(!video || !site.sections.includes('videos'), 'No published video section in this configuration.');
  const requests: string[] = [];
  page.on('request', (request) => {
    if (/youtube|ytimg|soundcloud|spotify|apple\.com/.test(request.url())) requests.push(request.url());
  });
  await page.route('https://www.youtube-nocookie.com/**', (route) => route.fulfill({
    contentType: 'text/html', body: '<html><body>Mock video player</body></html>',
  }));
  await page.route('https://www.youtube.com/iframe_api', (route) => route.abort());
  await page.goto('./');
  expect(requests).toHaveLength(0);
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.getByRole('button', { name: 'Load video player' }).first().click();
  const expected = new URL(youtubeEmbed(video!.url)!);
  const actual = new URL((await page.locator('iframe').getAttribute('src'))!);
  expect(actual.origin + actual.pathname).toBe(expected.origin + expected.pathname);
  if (expected.searchParams.has('list')) {
    expect(actual.searchParams.get('list')).toBe(expected.searchParams.get('list'));
    expect(actual.searchParams.get('enablejsapi')).toBe('1');
    expect(actual.searchParams.get('origin')).toBe(new URL(page.url()).origin);
  } else await expect(page.getByRole('status').first()).toContainText('Player loaded');
});

test('unconfigured editor reports missing authentication and offers real repository editing', async ({ page }) => {
  test.skip(Boolean(process.env.PUBLIC_CMS_AUTH_ORIGIN), 'This check applies only before OAuth setup.');
  await page.goto('./admin/');
  await expect(page.getByRole('heading', { name: 'Authentication setup required' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open content editor' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Edit content in GitHub' })).toHaveAttribute('href',
    `https://github.com/${process.env.PUBLIC_GITHUB_REPOSITORY || 'spaceturismo/vibeout-artist-site-template'}/edit/main/src/content/site.json`);
  await page.getByRole('link', { name: /Read the administration guide/ }).click();
  await expect(page.getByRole('heading', { name: 'Updating your artist website' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Publish and verify' })).toBeVisible();
});
